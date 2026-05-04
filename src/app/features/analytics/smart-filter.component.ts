import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { BoardDto, CardDto, WorkspaceMemberDto } from '../../core/models/analytics.models';
import { AnalyticsService } from '../../core/services/analytics.service';

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

  members: WorkspaceMemberDto[] = [];
  boards: BoardDto[] = [];
  cards: CardDto[] = [];
  selectedCard: CardDto | null = null;
  loading = false;
  cardsLoading = false;
  error = '';
  workspaceId = 0;
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
        this.members = members ?? [];
        this.boards = boards ?? [];
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.members = [];
        this.boards = [];
        this.loading = false;
      }
    });
  }
}
