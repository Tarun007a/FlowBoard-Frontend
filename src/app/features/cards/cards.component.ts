import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, finalize, map, of, switchMap } from 'rxjs';
import { AuthSession, UserDto } from '../../core/models/auth.models';
import { BoardResponse } from '../../core/models/board.models';
import { CardResponse, CardUpdateRequest, Priority, Status } from '../../core/models/card.models';
import { TaskListResponse } from '../../core/models/list.models';
import { AuthStoreService } from '../../core/services/auth-store.service';
import { BoardService } from '../../core/services/board.service';
import { CardService } from '../../core/services/card.service';
import { ListService } from '../../core/services/list.service';
import { NotificationService } from '../../core/services/notification.service';
import { UserService } from '../../core/services/user.service';
import { isAdminRole } from '../../core/utils/admin.utils';
import { readErrorMessage } from '../../core/utils/error.utils';
import { CardDetailComponent } from './card-detail.component';

@Component({
  selector: 'app-cards-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, CardDetailComponent],
  templateUrl: './cards.component.html',
  styleUrl: './cards.component.css'
})
export class CardsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly authStore = inject(AuthStoreService);
  private readonly boardService = inject(BoardService);
  private readonly listService = inject(ListService);
  private readonly cardService = inject(CardService);
  private readonly userService = inject(UserService);
  private readonly notify = inject(NotificationService);
  // destroyRef auto-cancels subscriptions when this component is destroyed
  private readonly destroyRef = inject(DestroyRef);

  boardId = 0;
  board: BoardResponse | null = null;
  session: AuthSession | null = null;

  lists: TaskListResponse[] = [];
  cards: CardResponse[] = [];
  boardMembers: UserDto[] = [];
  assigneeMap: Record<number, UserDto> = {};  // key: userId → user info (for displaying assignee names)
  selectedCardId: number | null = null;
  selectedCard: CardResponse | null = null;

  showListModal = false;
  showCardModal = false;
  showMembersPanel = false;

  draggedCardId: number | null = null;
  togglingCardId: number | null = null;
  deletingListId: number | null = null;
  memberLoadError = '';
  error = '';

  // Available options for dropdowns
  priorities: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  statuses: Status[] = ['TO_DO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];

  listForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    color: ['#7fb4f0', [Validators.required]]
  });

  cardForm = this.fb.nonNullable.group({
    cardId: [null as number | null],
    listId: [null as number | null, [Validators.required]],
    title: ['', [Validators.required, Validators.minLength(1)]],
    description: [''],
    priority: [null as Priority | null],
    status: [null as Status | null],
    dueDate: [''],
    startDate: [''],
    assigneeId: [null as number | null]
  });

  memberForm = this.fb.nonNullable.group({
    userId: [null as number | null, [Validators.required, Validators.min(1)]]
  });

  // Only board owners and admins can manage members
  get canManageMembers(): boolean {
    if (!this.board || !this.session) return false;
    return isAdminRole(this.session.role) || this.board.createdById === this.session.userId;
  }

  ngOnInit(): void {
    this.boardId = Number(this.route.snapshot.paramMap.get('id') ?? 0);
    this.session = this.authStore.restore();

    // Subscribe to shared lists - filter to only this board's active (non-archived) lists
    this.listService.getLists()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((items) => {
        this.lists = items.filter((item) => Number(item.boardId) === this.boardId && !item.isArchived);
        // Auto-select the first list in the card form if none is selected yet
        if (this.lists.length && !this.cardForm.controls.listId.value) {
          this.cardForm.patchValue({ listId: this.lists[0].listId });
        }
      });

    // Subscribe to shared cards - filter to only this board's active cards
    this.cardService.getCards()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((items) => {
        this.cards = items.filter((item) => item.boardId === this.boardId && !item.isArchived);
        this.syncSelectedCard();
        this.resolveAssignees();
      });

    // Subscribe to shared board members list
    this.boardService.getBoardMembers()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((items) => { this.boardMembers = items; });

    if (!this.boardId) { this.error = 'Board id is required.'; return; }

    this.loadBoard();
    this.refreshCanvas();
    this.loadMembers();
  }

  toggleMembersPanel(): void {
    this.showMembersPanel = !this.showMembersPanel;
    if (this.showMembersPanel) this.loadMembers();
  }

  closeMembersPanel(): void { this.showMembersPanel = false; }

  openListModal(): void { this.showListModal = true; this.showCardModal = false; }

  openCardModal(listId: number): void {
    this.showCardModal = true;
    this.showListModal = false;
    this.setCardFormEditMode(false);
    // Reset the card form with the chosen list pre-selected
    this.cardForm.reset({ cardId: null, listId, title: '', description: '', priority: null, status: null, dueDate: '', startDate: '', assigneeId: null });
  }

  closeModals(): void { this.showListModal = false; this.showCardModal = false; }

  saveList(): void {
    if (this.listForm.invalid) { this.listForm.markAllAsTouched(); return; }

    const value = this.listForm.getRawValue();
    this.listService.create({ boardId: this.boardId, name: value.name, color: value.color }).subscribe({
      next: () => {
        this.notify.success('List created');
        this.listForm.reset({ name: '', color: '#7fb4f0' });
        this.closeModals();
      },
      error: (err) => { const message = readErrorMessage(err); this.error = message; this.notify.error(message); }
    });
  }

  saveCard(): void {
    if (this.cardForm.invalid) { this.cardForm.markAllAsTouched(); return; }

    const value = this.cardForm.getRawValue();
    const cardId = value.cardId;

    // If cardId is set, we're updating an existing card
    if (cardId) {
      const existing = this.cards.find((item) => item.cardId === cardId) ?? null;
      const payload = this.buildUpdateRequest(value, existing);
      const nextAssigneeId = this.normalizeAssigneeId(value.assigneeId);
      const assigneeChanged = nextAssigneeId !== (existing?.assigneeId ?? null);

      this.cardService.update(cardId, payload).pipe(
        switchMap((updatedCard) => {
          if (!assigneeChanged) {
            return of(updatedCard);
          }

          if (nextAssigneeId === null) {
            // No API currently supports unassigning through update flow.
            console.log('Assignee cleared in form, but backend does not expose unassign endpoint.');
            return of(updatedCard);
          }

          return this.cardService.assign(cardId, nextAssigneeId);
        })
      ).subscribe({
        next: (updatedCard) => {
          this.syncUpdatedCard(updatedCard);
          console.log('Card updated', updatedCard.cardId);
          this.closeModals();
        },
        error: (err) => { const message = readErrorMessage(err); this.error = message; this.notify.error(message); }
      });
      return;
    }

    // Otherwise, create a new card
    const listId = value.listId;
    if (!listId) return;

    // Backend currently rejects null assigneeId on create, so default to current user.
    const assigneeId = value.assigneeId ?? this.session?.userId ?? null;
    if (!assigneeId) {
      this.notify.error('Unable to determine assignee. Please sign in again.');
      return;
    }

    this.cardService.create({
      listId, boardId: this.boardId,
      title: value.title, description: value.description,
      priority: value.priority, status: value.status ?? 'TO_DO',
      dueDate: this.normalizeDate(value.dueDate), startDate: this.normalizeDate(value.startDate),
      assigneeId
    }).subscribe({
      next: () => { this.notify.success('Card created'); this.closeModals(); },
      error: (err) => { const message = readErrorMessage(err); this.error = message; this.notify.error(message); }
    });
  }

  addBoardMember(): void {
    if (!this.canManageMembers) return;
    if (this.memberForm.invalid) { this.memberForm.markAllAsTouched(); return; }

    const userId = this.memberForm.getRawValue().userId;
    if (!userId) return;

    this.boardService.addMember({ boardId: this.boardId, userId }).subscribe({
      next: () => { this.notify.success('Member added'); this.memberForm.reset({ userId: null }); this.loadMembers(); },
      error: (err) => this.notify.error(readErrorMessage(err))
    });
  }

  removeBoardMember(userId: number): void {
    if (!this.canManageMembers) return;
    this.boardService.removeMember(this.boardId, userId).subscribe({
      next: () => void 0,
      error: (err) => this.notify.error(readErrorMessage(err))
    });
  }

  // Returns lists sorted by their position field
  orderedLists(): TaskListResponse[] {
    return [...this.lists].sort((left, right) => left.position - right.position);
  }

  // Returns cards for a specific list, sorted by position
  cardsByList(listId: number): CardResponse[] {
    return this.cards
      .filter((card) => card.listId === listId)
      .sort((left, right) => left.position - right.position);
  }

  openCardDetail(card: CardResponse): void {
    this.selectedCardId = card.cardId;
    this.selectedCard = card;
  }

  closeCardDetail(): void { this.selectedCardId = null; this.selectedCard = null; }

  openEditFromDetail(card: CardResponse): void {
    this.closeCardDetail();
    this.editCard(card);
  }

  deleteCardFromDetail(card: CardResponse): void {
    this.cardService.delete(card.cardId).subscribe({
      next: () => {
        this.closeCardDetail();
      },
      error: (err) => {
        console.error(err);
      }
    });
  }

  editCard(card: CardResponse): void {
    this.showCardModal = true;
    this.showListModal = false;
    this.setCardFormEditMode(false);
    this.cardForm.patchValue({
      cardId: card.cardId, listId: card.listId,
      title: card.title, description: card.description,
      priority: card.priority, status: card.status,
      dueDate: this.toDateInput(card.dueDate), startDate: this.toDateInput(card.startDate),
      assigneeId: card.assigneeId
    });
    this.setCardFormEditMode(true);
  }

  // Called when drag starts - remember which card is being dragged
  startDrag(cardId: number): void { this.draggedCardId = cardId; }

  // Called when card is dropped on a list - moves the card to that list
  dropOnList(targetListId: number): void {
    if (!this.draggedCardId) return;
    const targetCount = this.cardsByList(targetListId).length;
    this.cardService.move(this.draggedCardId, targetListId, targetCount).subscribe({
      next: () => { this.draggedCardId = null; },
      error: (err) => { const message = readErrorMessage(err); this.error = message; this.notify.error(message); }
    });
  }

  deleteList(list: TaskListResponse, event: Event): void {
    event.stopPropagation();
    if (this.deletingListId !== null) return;

    const confirmed = window.confirm('Delete this list?');
    if (!confirmed) return;

    this.error = '';
    this.deletingListId = list.listId;

    this.listService.delete(list.listId)
      .pipe(finalize(() => { this.deletingListId = null; }))
      .subscribe({
        next: () => {
          console.log('List deleted', list.listId);
          if (this.selectedCard?.listId === list.listId) {
            this.closeCardDetail();
          }
        },
        error: (err) => {
          console.error(err);
          this.error = 'Unable to delete list. Remove cards first.';
        }
      });
  }

  isCardDone(card: CardResponse): boolean {
    return card.status === 'DONE';
  }

  toggleCardDone(card: CardResponse, event: Event): void {
    event.stopPropagation();
    if (this.togglingCardId !== null) return;

    const nextStatus: Status = this.isCardDone(card) ? 'TO_DO' : 'DONE';
    this.togglingCardId = card.cardId;

    this.cardService.updateStatus(card.cardId, nextStatus)
      .pipe(finalize(() => { this.togglingCardId = null; }))
      .subscribe({
        next: (updatedCard) => this.syncUpdatedCard(updatedCard),
        error: (err) => { const message = readErrorMessage(err); this.error = message; this.notify.error(message); }
      });
  }

  assigneeName(assigneeId: number): string {
    return this.assigneeMap[assigneeId]?.fullName || `User ${assigneeId}`;
  }

  assigneeInitial(assigneeId: number): string {
    const name = this.assigneeName(assigneeId).trim();
    return name.charAt(0).toUpperCase() || 'U';
  }

  memberInitial(member: UserDto): string {
    const seed = member.fullName || member.email || String(member.userId);
    return seed.trim().charAt(0).toUpperCase() || 'U';
  }

  // Converts "TO_DO" → "TO DO" for display
  readableStatus(status: Status): string {
    return status.replace(/_/g, ' ');
  }

  formatDueDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString();
  }

  private loadBoard(): void {
    this.boardService.get(this.boardId).subscribe({
      next: (board) => { this.board = board; },
      error: (err) => { const message = readErrorMessage(err); this.error = message; this.notify.error(message); }
    });
  }

  private refreshCanvas(): void {
    this.listService.getByBoard(this.boardId).subscribe({ error: (err) => { this.error = readErrorMessage(err); } });
    this.cardService.getByBoard(this.boardId).subscribe({ error: (err) => { this.error = readErrorMessage(err); } });
  }

  private loadMembers(): void {
    this.memberLoadError = '';
    this.boardService.getMembers(this.boardId, 0, 100).pipe(
      catchError((err) => {
        this.memberLoadError = readErrorMessage(err);
        return of({ pageSize: 0, pageNumber: 0, numberOfElements: 0, totalPages: 0, totalNumberOfElements: 0, content: [], last: true, first: true });
      })
    ).subscribe();
  }

  // Fetches full user info for any card assignees we don't have yet
  private resolveAssignees(): void {
    const assigneeIds = Array.from(new Set(
      this.cards.map((item) => item.assigneeId).filter((id): id is number => typeof id === 'number')
    ));
    const missing = assigneeIds.filter((id) => !this.assigneeMap[id]);
    if (!missing.length) return;

    this.userService.getBulk(missing).pipe(
      map((users) => {
        const next = { ...this.assigneeMap };
        for (const user of users) next[user.userId] = user;
        return next;
      }),
      catchError(() => of(this.assigneeMap)),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((nextMap) => {
      this.assigneeMap = nextMap;
      if (!this.boardMembers.length) {
        const fallbackMembers = Object.values(this.assigneeMap);
        if (fallbackMembers.length) this.boardMembers = fallbackMembers;
      }
    });
  }

  // Converts an ISO date string to the format that datetime-local inputs need (YYYY-MM-DDTHH:MM)
  private toDateInput(value: string | null): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    const hours = `${date.getHours()}`.padStart(2, '0');
    const minutes = `${date.getMinutes()}`.padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  private normalizeDate(value: string): string | null {
    const trimmed = value.trim();
    if (!trimmed) return null;

    // datetime-local values may omit seconds; ensure backend LocalDateTime parsing is consistent.
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)) {
      return `${trimmed}:00`;
    }

    return trimmed;
  }

  // Keeps the selectedCard in sync when the cards array is updated
  private syncSelectedCard(): void {
    if (!this.selectedCardId) return;
    const latest = this.cards.find((item) => item.cardId === this.selectedCardId) ?? null;
    this.selectedCard = latest;
    if (!latest) this.selectedCardId = null;
  }

  private syncUpdatedCard(updatedCard: CardResponse): void {
    if (this.selectedCardId === updatedCard.cardId) {
      this.selectedCard = updatedCard;
    }
  }

  private buildUpdateRequest(
    value: ReturnType<CardsComponent['cardForm']['getRawValue']>,
    existing: CardResponse | null
  ): CardUpdateRequest {
    return {
      title: value.title.trim(),
      description: value.description.trim(),
      priority: value.priority,
      status: value.status ?? existing?.status ?? 'TO_DO',
      dueDate: this.normalizeDate(value.dueDate),
      startDate: this.normalizeDate(value.startDate)
    };
  }

  private normalizeAssigneeId(value: number | null): number | null {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return null;
    }

    if (value <= 0) {
      return null;
    }

    return Math.trunc(value);
  }

  private setCardFormEditMode(isEditing: boolean): void {
    const listIdControl = this.cardForm.controls.listId;
    const assigneeControl = this.cardForm.controls.assigneeId;

    if (isEditing) {
      listIdControl.disable({ emitEvent: false });
      assigneeControl.enable({ emitEvent: false });
      return;
    }

    listIdControl.enable({ emitEvent: false });
    assigneeControl.enable({ emitEvent: false });
  }
}
