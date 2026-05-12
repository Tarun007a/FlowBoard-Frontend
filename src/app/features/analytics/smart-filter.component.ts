import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { UserDto } from '../../core/models/auth.models';
import { BoardDto, CardDto, WorkspaceMemberDto } from '../../core/models/analytics.models';
import { AnalyticsService } from '../../core/services/analytics.service';
import { UserService } from '../../core/services/user.service';

type WorkspaceMemberView = WorkspaceMemberDto & {
  name: string | null;
  email: string | null;
};

type SmartFilterState = {
  status: '' | 'TO_DO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
  due: '' | 'TODAY' | 'THIS_WEEK' | 'OVERDUE';
  boardId: string;
  assigneeId: string;
};

@Component({
  selector: 'app-smart-filter',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './smart-filter.component.html',
  styleUrl: './smart-filter.component.css'
})
export class SmartFilterComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly analyticsService = inject(AnalyticsService);
  private readonly userService = inject(UserService);

  members: WorkspaceMemberView[] = [];
  boards: BoardDto[] = [];
  cards: CardDto[] = [];
  selectedCard: CardDto | null = null;
  loading = false;
  cardsLoading = false;
  error = '';
  workspaceId = 0;
  private readonly userDirectory: Record<number, UserDto> = {};
  filter: SmartFilterState = {
    status: '',
    due: '',
    boardId: '',
    assigneeId: ''
  };

  ngOnInit(): void {
    this.workspaceId = Number(this.route.snapshot.paramMap.get('workspaceId'));

    if (!this.workspaceId) {
      console.error('Invalid workspace id');
      this.router.navigate(['/analytics']);
      return;
    }

    this.loadFilterOptions();
    this.fetchCards();
  }

  fetchCards(): void {
    this.cardsLoading = true;
    this.error = '';

    const params: {
      workspaceId: number;
      status?: Exclude<SmartFilterState['status'], ''>;
      due?: Exclude<SmartFilterState['due'], ''>;
      boardId?: number;
      assigneeId?: number;
    } = {
      workspaceId: this.workspaceId
    };

    if (this.filter.status) params.status = this.filter.status;
    if (this.filter.due) params.due = this.filter.due;
    if (this.filter.boardId) params.boardId = Number(this.filter.boardId);
    if (this.filter.assigneeId) params.assigneeId = Number(this.filter.assigneeId);

    this.analyticsService.getCards(params).subscribe({
      next: (res) => {
        this.cards = res ?? [];
        this.resolveUserDirectory(this.collectCardUserIds(this.cards));
        this.cardsLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.cards = [];
        this.error = 'Could not load matching cards.';
        this.cardsLoading = false;
      }
    });
  }

  openCard(card: CardDto): void {
    this.selectedCard = card;
  }

  assigneeLabel(card: CardDto): string {
    if (card.assigneeId === null) {
      return 'Not assigned';
    }

    return this.userDirectory[card.assigneeId]?.fullName || String(card.assigneeId);
  }

  createdByLabel(card: CardDto): string {
    return this.userDirectory[card.createdById]?.fullName || String(card.createdById);
  }

  statusClass(status: string): string {
    return `status-${status.replace('_', '-').toLowerCase()}`;
  }

  trackByBoardId(_: number, board: BoardDto): number {
    return board.boardId;
  }

  trackByMemberId(_: number, member: WorkspaceMemberDto): number {
    return member.memberId;
  }

  trackByCardId(_: number, card: CardDto): number {
    return card.cardId;
  }

  private loadFilterOptions(): void {
    this.loading = true;

    forkJoin({
      members: this.analyticsService.getWorkspaceMembers(this.workspaceId).pipe(catchError(() => of([] as WorkspaceMemberDto[]))),
      boards: this.analyticsService.getWorkspaceBoards(this.workspaceId).pipe(catchError(() => of([] as BoardDto[])))
    }).subscribe({
      next: ({ members, boards }) => {
        this.resolveMemberDetails(members ?? []);
        this.boards = boards ?? [];
      },
      error: (err) => {
        console.error(err);
        this.members = [];
        this.boards = [];
        this.loading = false;
      }
    });
  }

  private resolveMemberDetails(members: WorkspaceMemberDto[]): void {
    const uniqueIds = Array.from(new Set(members.map((member) => member.userId)));
    if (!uniqueIds.length) {
      this.members = [];
      this.loading = false;
      return;
    }

    this.userService.getBulk(uniqueIds).pipe(
      catchError((err) => {
        console.error(err);
        return of([] as UserDto[]);
      })
    ).subscribe((users) => {
      this.storeUsers(users);
      const userMap = new Map<number, UserDto>(users.map((user) => [user.userId, user]));
      this.members = members.map((member) => {
        const user = userMap.get(member.userId);
        return {
          ...member,
          name: user?.fullName ?? null,
          email: user?.email ?? null
        };
      });
      this.loading = false;
    });
  }

  private resolveUserDirectory(userIds: number[]): void {
    const missingIds = userIds.filter((userId) => !this.userDirectory[userId]);
    if (!missingIds.length) {
      return;
    }

    this.userService.getBulk(missingIds).pipe(
      catchError((err) => {
        console.error(err);
        return of([] as UserDto[]);
      })
    ).subscribe((users) => {
      this.storeUsers(users);
    });
  }

  private storeUsers(users: UserDto[]): void {
    for (const user of users) {
      this.userDirectory[user.userId] = user;
    }
  }

  private collectCardUserIds(cards: CardDto[]): number[] {
    return Array.from(new Set(
      cards.flatMap((card) => {
        const ids = [card.createdById];
        if (card.assigneeId !== null) {
          ids.push(card.assigneeId);
        }
        return ids;
      })
    ));
  }
}
