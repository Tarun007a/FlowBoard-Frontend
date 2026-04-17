import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthSession, UserDto } from '../../core/models/auth.models';
import { BoardResponse } from '../../core/models/board.models';
import { CardResponse, Priority, Status } from '../../core/models/card.models';
import { TaskListResponse } from '../../core/models/list.models';
import { AuthStoreService } from '../../core/services/auth-store.service';
import { BoardService } from '../../core/services/board.service';
import { CardService } from '../../core/services/card.service';
import { ListService } from '../../core/services/list.service';
import { NotificationService } from '../../core/services/notification.service';
import { UserService } from '../../core/services/user.service';
import { readErrorMessage } from '../../core/utils/error.utils';
import { CardDetailComponent } from './card-detail.component';

@Component({
  selector: 'app-cards-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, CardDetailComponent],
  template: `
    <div class="board-page" *ngIf="board; else loadingBoard">
      <section class="panel board-top">
        <div class="board-title-block">
          <div class="board-chip">Board</div>
          <h1>{{ board.name }}</h1>
          <p class="muted">{{ board.description }}</p>
        </div>

        <div class="board-actions">
          <a class="button secondary" [routerLink]="['/workspace', board.workspaceId]">Back</a>
          <button class="button secondary" type="button" (click)="toggleMembersPanel()">Members</button>
          <button class="button accent" type="button" (click)="openListModal()">Add List</button>
        </div>
      </section>

      <section class="lane-scroller" *ngIf="orderedLists().length; else emptyListState">
        <article
          class="lane"
          *ngFor="let list of orderedLists()"
          [style.border-top-color]="list.color"
          (dragover)="$event.preventDefault()"
          (drop)="dropOnList(list.listId)">
          <header class="lane-head">
            <div>
              <h2>{{ list.name }}</h2>
              <p>{{ cardsByList(list.listId).length }} cards</p>
            </div>
            <button class="lane-menu" type="button" (click)="openCardModal(list.listId)">+</button>
          </header>

          <div class="lane-cards">
            <article
              class="task-card"
              *ngFor="let card of cardsByList(list.listId)"
              draggable="true"
              (dragstart)="startDrag(card.cardId)"
              (click)="openCardDetail(card)">
              <h3>{{ card.title }}</h3>
              <p *ngIf="card.description">{{ card.description }}</p>

              <div class="card-meta-row" *ngIf="card.assigneeId || card.dueDate">
                <div class="assignee" *ngIf="card.assigneeId as assigneeId">
                  <span class="avatar">{{ assigneeInitial(assigneeId) }}</span>
                  <span>{{ assigneeName(assigneeId) }}</span>
                </div>
                <span class="due" *ngIf="card.dueDate">Due {{ formatDueDate(card.dueDate) }}</span>
              </div>

              <div class="tag-row">
                <span class="tag" *ngIf="card.priority">{{ card.priority }}</span>
                <span class="tag" *ngIf="card.status">{{ readableStatus(card.status) }}</span>
              </div>
            </article>
          </div>

          <button class="lane-add-card" type="button" (click)="openCardModal(list.listId)">+ Add a card</button>
        </article>
      </section>

      <ng-template #emptyListState>
        <section class="panel empty-list">
          <div class="board-chip">No Lists</div>
          <h2>Create your first list</h2>
          <p class="muted">Add a list to start building a Trello-style workflow.</p>
          <button class="button accent" type="button" (click)="openListModal()">Create List</button>
        </section>
      </ng-template>

      <p class="error" *ngIf="error">{{ error }}</p>
    </div>

    <ng-template #loadingBoard>
      <section class="panel empty-list">
        <div class="board-chip">Loading</div>
        <h2>Loading board</h2>
        <p class="muted">Please wait while board data is fetched.</p>
      </section>
    </ng-template>

    <div class="modal-overlay" *ngIf="showListModal" (click)="closeModals()">
      <section class="panel modal-card" (click)="$event.stopPropagation()">
        <header class="modal-head">
          <div>
            <div class="board-chip">List</div>
            <h2>Create list</h2>
          </div>
          <button class="button secondary" type="button" (click)="closeModals()">Close</button>
        </header>

        <form class="stack" [formGroup]="listForm" (ngSubmit)="saveList()">
          <div class="field">
            <label>List Name</label>
            <input type="text" formControlName="name" placeholder="To Do" />
          </div>

          <div class="field">
            <label>Color</label>
            <input type="text" formControlName="color" placeholder="#7fb4f0" />
          </div>

          <div class="actions">
            <button class="button accent" type="submit" [disabled]="listForm.invalid">Create List</button>
          </div>
        </form>
      </section>
    </div>

    <div class="modal-overlay" *ngIf="showCardModal" (click)="closeModals()">
      <section class="panel modal-card" (click)="$event.stopPropagation()">
        <header class="modal-head">
          <div>
            <div class="board-chip">Card</div>
            <h2>{{ cardForm.controls.cardId.value ? 'Update card' : 'Add card' }}</h2>
          </div>
          <button class="button secondary" type="button" (click)="closeModals()">Close</button>
        </header>

        <form class="stack" [formGroup]="cardForm" (ngSubmit)="saveCard()">
          <div class="field">
            <label>Title</label>
            <input type="text" formControlName="title" placeholder="Implement notifications panel" />
          </div>

          <div class="field">
            <label>Description</label>
            <textarea formControlName="description" placeholder="Add summary, acceptance criteria, and notes."></textarea>
          </div>

          <div class="grid cols-2">
            <div class="field">
              <label>List</label>
              <select formControlName="listId" [disabled]="!!cardForm.controls.cardId.value">
                <option *ngFor="let list of orderedLists()" [ngValue]="list.listId">{{ list.name }}</option>
              </select>
            </div>

            <div class="field">
              <label>Assignee ID</label>
              <input type="number" formControlName="assigneeId" placeholder="Optional" [disabled]="!!cardForm.controls.cardId.value" />
            </div>

            <div class="field">
              <label>Priority</label>
              <select formControlName="priority">
                <option [ngValue]="null">None</option>
                <option *ngFor="let item of priorities" [ngValue]="item">{{ item }}</option>
              </select>
            </div>

            <div class="field">
              <label>Status</label>
              <select formControlName="status">
                <option [ngValue]="null">None</option>
                <option *ngFor="let item of statuses" [ngValue]="item">{{ item }}</option>
              </select>
            </div>

            <div class="field">
              <label>Start Date</label>
              <input type="datetime-local" formControlName="startDate" />
            </div>

            <div class="field">
              <label>Due Date</label>
              <input type="datetime-local" formControlName="dueDate" />
            </div>
          </div>

          <div class="actions">
            <button class="button accent" type="submit" [disabled]="cardForm.invalid">
              {{ cardForm.controls.cardId.value ? 'Update Card' : 'Create Card' }}
            </button>
          </div>
        </form>
      </section>
    </div>

    <div class="members-overlay" *ngIf="showMembersPanel" (click)="closeMembersPanel()">
      <aside class="members-panel" (click)="$event.stopPropagation()">
        <header>
          <div>
            <div class="board-chip dark-chip">Members</div>
            <h2>Board members</h2>
            <p class="muted" *ngIf="memberLoadError">{{ memberLoadError }}</p>
          </div>
          <button class="button secondary" type="button" (click)="closeMembersPanel()">Close</button>
        </header>

        <form class="stack" [formGroup]="memberForm" (ngSubmit)="addBoardMember()" *ngIf="canManageMembers">
          <div class="field">
            <label>User ID</label>
            <input type="number" formControlName="userId" placeholder="Enter user id" />
          </div>
          <button class="button accent" type="submit" [disabled]="memberForm.invalid">Add Member</button>
        </form>

        <section class="member-list" *ngIf="boardMembers.length; else emptyMemberList">
          <article class="member-row" *ngFor="let member of boardMembers">
            <div class="member-main">
              <span class="avatar">{{ memberInitial(member) }}</span>
              <div>
                <strong>{{ member.fullName || ('User ' + member.userId) }}</strong>
                <p>{{ member.email || 'Email unavailable' }}</p>
              </div>
            </div>

            <button class="button danger" type="button" *ngIf="canManageMembers" (click)="removeBoardMember(member.userId)">Remove</button>
          </article>
        </section>

        <ng-template #emptyMemberList>
          <section class="empty-member-state">
            <p class="muted">No members available.</p>
          </section>
        </ng-template>
      </aside>
    </div>

    <app-card-detail
      *ngIf="selectedCard"
      [card]="selectedCard"
      [session]="session"
      [assigneeName]="selectedCard.assigneeId ? assigneeName(selectedCard.assigneeId) : null"
      (closed)="closeCardDetail()"
      (requestEdit)="openEditFromDetail($event)" />
  `,
  styles: [
    `
      .board-page {
        display: grid;
        gap: 1rem;
      }

      .board-top {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 0.9rem;
        padding: 1rem 1.15rem;
        background: linear-gradient(128deg, #eff7ff, #ddecff);
        color: #1f3a5a;
      }

      .board-title-block h1 {
        margin: 0.4rem 0;
        font-family: 'Sora', 'Space Grotesk', 'Segoe UI', sans-serif;
      }

      .board-title-block .muted {
        margin: 0;
        color: #597494;
      }

      .board-chip {
        width: fit-content;
        border-radius: 999px;
        border: 1px solid #c7dcf6;
        background: #eaf4ff;
        color: #2a5f97;
        font-size: 0.72rem;
        text-transform: uppercase;
        letter-spacing: 0.02em;
        font-weight: 700;
        padding: 0.26rem 0.58rem;
      }

      .board-actions {
        display: flex;
        gap: 0.55rem;
        flex-wrap: wrap;
        justify-content: flex-end;
      }

      .lane-scroller {
        display: grid;
        grid-auto-flow: column;
        grid-auto-columns: minmax(290px, 320px);
        gap: 0.9rem;
        overflow-x: auto;
        padding-bottom: 0.35rem;
      }

      .lane {
        border-top: 4px solid #335f69;
        border-radius: 14px;
        background: #eef5ff;
        color: #1f3650;
        padding: 0.8rem;
        display: grid;
        gap: 0.65rem;
        align-content: start;
        min-height: 320px;
      }

      .lane-head {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 0.4rem;
      }

      .lane-head h2 {
        margin: 0;
        font-size: 1rem;
      }

      .lane-head p {
        margin: 0.2rem 0 0;
        font-size: 0.8rem;
        color: #5a7392;
      }

      .lane-menu {
        border: 0;
        border-radius: 10px;
        width: 28px;
        height: 28px;
        background: #dcecff;
        color: #21578f;
        cursor: pointer;
        font-size: 1.05rem;
        line-height: 1;
      }

      .lane-cards {
        display: grid;
        gap: 0.55rem;
      }

      .task-card {
        display: grid;
        gap: 0.45rem;
        padding: 0.66rem 0.68rem;
        border-radius: 12px;
        background: #ffffff;
        border: 1px solid #d2e3f7;
        cursor: grab;
      }

      .task-card h3 {
        margin: 0;
        font-size: 0.95rem;
      }

      .task-card p {
        margin: 0;
        color: #556f8f;
        font-size: 0.85rem;
      }

      .card-meta-row {
        display: flex;
        justify-content: space-between;
        gap: 0.35rem;
        flex-wrap: wrap;
      }

      .assignee {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        font-size: 0.77rem;
      }

      .avatar {
        width: 22px;
        height: 22px;
        border-radius: 999px;
        display: grid;
        place-items: center;
        background: #d5e8ff;
        color: #124d89;
        font-size: 0.71rem;
        font-weight: 800;
      }

      .due {
        font-size: 0.74rem;
        color: #2f649d;
      }

      .tag-row {
        display: flex;
        gap: 0.35rem;
        flex-wrap: wrap;
      }

      .tag {
        border-radius: 999px;
        border: 1px solid #c6dbf5;
        background: #eaf3ff;
        color: #2b5f95;
        font-size: 0.67rem;
        font-weight: 700;
        padding: 0.2rem 0.45rem;
      }

      .lane-add-card {
        margin-top: auto;
        border: 0;
        border-radius: 10px;
        background: #dcecff;
        color: #295d94;
        text-align: left;
        padding: 0.5rem 0.56rem;
        font-weight: 700;
        cursor: pointer;
      }

      .empty-list {
        display: grid;
        gap: 0.65rem;
        justify-items: flex-start;
        padding: 1rem 1.15rem;
      }

      .empty-list h2 {
        margin: 0;
      }

      .modal-overlay {
        position: fixed;
        inset: 0;
        z-index: 80;
        display: grid;
        place-items: center;
        background: rgba(15, 23, 42, 0.24);
        padding: 1rem;
      }

      .modal-card {
        width: min(620px, 100%);
        padding: 1rem;
      }

      .modal-head {
        display: flex;
        justify-content: space-between;
        gap: 0.7rem;
        margin-bottom: 0.8rem;
      }

      .modal-head h2 {
        margin: 0.4rem 0 0;
      }

      .members-overlay {
        position: fixed;
        inset: 0;
        z-index: 82;
        background: rgba(15, 23, 42, 0.24);
        display: flex;
        justify-content: flex-end;
      }

      .members-panel {
        width: min(420px, 100%);
        height: 100%;
        overflow-y: auto;
        background: #f9fcff;
        border-left: 1px solid #d5e3f4;
        padding: 1rem;
        display: grid;
        gap: 0.75rem;
        align-content: flex-start;
      }

      .members-panel header {
        display: flex;
        justify-content: space-between;
        gap: 0.7rem;
      }

      .members-panel h2 {
        margin: 0.45rem 0 0.18rem;
      }

      .dark-chip {
        color: #28598d;
        border-color: #c5daf2;
        background: #eaf3ff;
      }

      .member-list {
        display: grid;
        gap: 0.55rem;
      }

      .member-row {
        border: 1px solid #d5e3f4;
        border-radius: 12px;
        background: #ffffff;
        padding: 0.55rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 0.5rem;
      }

      .member-main {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .member-main p {
        margin: 0.18rem 0 0;
        font-size: 0.77rem;
        color: #54617c;
      }

      .empty-member-state {
        border-radius: 12px;
        border: 1px dashed #c7daf1;
        padding: 0.7rem;
      }

      @media (max-width: 980px) {
        .board-top {
          flex-direction: column;
        }
      }
    `
  ]
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
  private readonly destroyRef = inject(DestroyRef);

  boardId = 0;
  board: BoardResponse | null = null;
  session: AuthSession | null = null;

  lists: TaskListResponse[] = [];
  cards: CardResponse[] = [];
  boardMembers: UserDto[] = [];
  assigneeMap: Record<number, UserDto> = {};
  selectedCardId: number | null = null;
  selectedCard: CardResponse | null = null;

  showListModal = false;
  showCardModal = false;
  showMembersPanel = false;

  draggedCardId: number | null = null;
  memberLoadError = '';
  error = '';

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

  get canManageMembers(): boolean {
    if (!this.board || !this.session) {
      return false;
    }

    return this.session.role === 'ADMIN' || this.board.createdById === this.session.userId;
  }

  ngOnInit(): void {
    this.boardId = Number(this.route.snapshot.paramMap.get('id') ?? 0);
    this.session = this.authStore.restore();

    this.listService
      .getLists()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((items) => {
        this.lists = items.filter((item) => Number(item.boardId) === this.boardId && !item.isArchived);

        if (this.lists.length && !this.cardForm.controls.listId.value) {
          this.cardForm.patchValue({ listId: this.lists[0].listId });
        }
      });

    this.cardService
      .getCards()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((items) => {
        this.cards = items.filter((item) => item.boardId === this.boardId && !item.isArchived);
        this.syncSelectedCard();
        this.resolveAssignees();
      });

    this.boardService
      .getBoardMembers()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((items) => {
        this.boardMembers = items;
      });

    if (!this.boardId) {
      this.error = 'Board id is required.';
      return;
    }

    this.loadBoard();
    this.refreshCanvas();
    this.loadMembers();
  }

  toggleMembersPanel(): void {
    this.showMembersPanel = !this.showMembersPanel;

    if (this.showMembersPanel) {
      this.loadMembers();
    }
  }

  closeMembersPanel(): void {
    this.showMembersPanel = false;
  }

  openListModal(): void {
    this.showListModal = true;
    this.showCardModal = false;
  }

  openCardModal(listId: number): void {
    this.showCardModal = true;
    this.showListModal = false;

    this.cardForm.reset({
      cardId: null,
      listId,
      title: '',
      description: '',
      priority: null,
      status: null,
      dueDate: '',
      startDate: '',
      assigneeId: null
    });
  }

  closeModals(): void {
    this.showListModal = false;
    this.showCardModal = false;
  }

  saveList(): void {
    if (this.listForm.invalid) {
      this.listForm.markAllAsTouched();
      return;
    }

    const value = this.listForm.getRawValue();
    this.listService.create({ boardId: this.boardId, name: value.name, color: value.color }).subscribe({
      next: () => {
        this.notify.success('List created');
        this.listForm.reset({ name: '', color: '#7fb4f0' });
        this.closeModals();
      },
      error: (err) => {
        const message = readErrorMessage(err);
        this.error = message;
        this.notify.error(message);
      }
    });
  }

  saveCard(): void {
    if (this.cardForm.invalid) {
      this.cardForm.markAllAsTouched();
      return;
    }

    const value = this.cardForm.getRawValue();
    const cardId = value.cardId;

    if (cardId) {
      this.cardService.update(cardId, {
        title: value.title,
        description: value.description,
        priority: value.priority,
        status: value.status,
        dueDate: this.normalizeDate(value.dueDate),
        startDate: this.normalizeDate(value.startDate)
      }).subscribe({
        next: () => {
          this.notify.success('Card updated');
          this.closeModals();
        },
        error: (err) => {
          const message = readErrorMessage(err);
          this.error = message;
          this.notify.error(message);
        }
      });
      return;
    }

    const listId = value.listId;
    if (!listId) {
      return;
    }

    this.cardService.create({
      listId,
      boardId: this.boardId,
      title: value.title,
      description: value.description,
      priority: value.priority,
      status: value.status,
      dueDate: this.normalizeDate(value.dueDate),
      startDate: this.normalizeDate(value.startDate),
      assigneeId: value.assigneeId
    }).subscribe({
      next: () => {
        this.notify.success('Card created');
        this.closeModals();
      },
      error: (err) => {
        const message = readErrorMessage(err);
        this.error = message;
        this.notify.error(message);
      }
    });
  }

  addBoardMember(): void {
    if (!this.canManageMembers) {
      this.notifyPermissionDenied();
      return;
    }

    if (this.memberForm.invalid) {
      this.memberForm.markAllAsTouched();
      return;
    }

    const userId = this.memberForm.getRawValue().userId;
    if (!userId) {
      return;
    }

    this.boardService.addMember({ boardId: this.boardId, userId }).subscribe({
      next: () => {
        this.notify.success('Member added');
        this.memberForm.reset({ userId: null });
        this.loadMembers();
      },
      error: (err) => {
        const message = readErrorMessage(err);
        this.notify.error(message);
      }
    });
  }

  removeBoardMember(userId: number): void {
    if (!this.canManageMembers) {
      this.notifyPermissionDenied();
      return;
    }

    this.boardService.removeMember(this.boardId, userId).subscribe({
      next: () => {
        this.notify.info('Member removed');
      },
      error: (err) => {
        const message = readErrorMessage(err);
        this.notify.error(message);
      }
    });
  }

  orderedLists(): TaskListResponse[] {
    return [...this.lists].sort((left, right) => left.position - right.position);
  }

  cardsByList(listId: number): CardResponse[] {
    return this.cards
      .filter((card) => card.listId === listId)
      .sort((left, right) => left.position - right.position);
  }

  openCardDetail(card: CardResponse): void {
    this.selectedCardId = card.cardId;
    this.selectedCard = card;
  }

  closeCardDetail(): void {
    this.selectedCardId = null;
    this.selectedCard = null;
  }

  openEditFromDetail(card: CardResponse): void {
    this.closeCardDetail();
    this.editCard(card);
  }

  editCard(card: CardResponse): void {
    this.showCardModal = true;
    this.showListModal = false;

    this.cardForm.patchValue({
      cardId: card.cardId,
      listId: card.listId,
      title: card.title,
      description: card.description,
      priority: card.priority,
      status: card.status,
      dueDate: this.toDateInput(card.dueDate),
      startDate: this.toDateInput(card.startDate),
      assigneeId: card.assigneeId
    });
  }

  startDrag(cardId: number): void {
    this.draggedCardId = cardId;
  }

  dropOnList(targetListId: number): void {
    if (!this.draggedCardId) {
      return;
    }

    const targetCount = this.cardsByList(targetListId).length;
    this.cardService.move(this.draggedCardId, targetListId, targetCount).subscribe({
      next: () => {
        this.notify.info('Card moved');
        this.draggedCardId = null;
      },
      error: (err) => {
        const message = readErrorMessage(err);
        this.error = message;
        this.notify.error(message);
      }
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

  readableStatus(status: Status): string {
    return status.replace(/_/g, ' ');
  }

  formatDueDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString();
  }

  private loadBoard(): void {
    this.boardService.get(this.boardId).subscribe({
      next: (board) => {
        this.board = board;
      },
      error: (err) => {
        const message = readErrorMessage(err);
        this.error = message;
        this.notify.error(message);
      }
    });
  }

  private refreshCanvas(): void {
    this.listService.getByBoard(this.boardId).subscribe({
      error: (err) => {
        const message = readErrorMessage(err);
        this.error = message;
      }
    });

    this.cardService.getByBoard(this.boardId).subscribe({
      error: (err) => {
        const message = readErrorMessage(err);
        this.error = message;
      }
    });
  }

  private loadMembers(): void {
    this.memberLoadError = '';

    this.boardService
      .getMembers(this.boardId, 0, 100)
      .pipe(catchError((err) => {
        this.memberLoadError = readErrorMessage(err);
        return of({
          pageSize: 0,
          pageNumber: 0,
          numberOfElements: 0,
          totalPages: 0,
          totalNumberOfElements: 0,
          content: [],
          last: true,
          first: true
        });
      }))
      .subscribe();
  }

  private resolveAssignees(): void {
    const assigneeIds = Array.from(
      new Set(
        this.cards
          .map((item) => item.assigneeId)
          .filter((id): id is number => typeof id === 'number')
      )
    );

    const missing = assigneeIds.filter((id) => !this.assigneeMap[id]);
    if (!missing.length) {
      return;
    }

    this.userService.getBulk(missing).pipe(
      map((users) => {
        const next = { ...this.assigneeMap };
        for (const user of users) {
          next[user.userId] = user;
        }
        return next;
      }),
      catchError(() => of(this.assigneeMap)),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((nextMap) => {
      this.assigneeMap = nextMap;

      if (!this.boardMembers.length) {
        const fallbackMembers = Object.values(this.assigneeMap);
        if (fallbackMembers.length) {
          this.boardMembers = fallbackMembers;
        }
      }
    });
  }

  private toDateInput(value: string | null): string {
    if (!value) {
      return '';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    const hours = `${date.getHours()}`.padStart(2, '0');
    const minutes = `${date.getMinutes()}`.padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  private normalizeDate(value: string): string | null {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  private syncSelectedCard(): void {
    if (!this.selectedCardId) {
      return;
    }

    const latest = this.cards.find((item) => item.cardId === this.selectedCardId) ?? null;
    this.selectedCard = latest;

    if (!latest) {
      this.selectedCardId = null;
    }
  }

  private notifyPermissionDenied(): void {
    this.notify.error('You do not have permission for this action');
  }
}
