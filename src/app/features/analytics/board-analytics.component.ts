import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AnalyticsStatusFilter, BoardAnalyticsDto, CardDto, DueFilter, ListDto } from '../../core/models/analytics.models';
import { AnalyticsService } from '../../core/services/analytics.service';
import { ListBarChartComponent, ListBarChartItem } from './list-bar-chart.component';
import { StatusDoughnutComponent } from './status-doughnut.component';

@Component({
  selector: 'app-board-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule, StatusDoughnutComponent, ListBarChartComponent],
  templateUrl: './board-analytics.component.html',
  styleUrl: './analytics.component.css'
})
export class BoardAnalyticsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly analyticsService = inject(AnalyticsService);

  readonly statusOptions: AnalyticsStatusFilter[] = ['ALL', 'TO_DO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];
  readonly dueOptions: DueFilter[] = ['ALL', 'TODAY', 'THIS_WEEK', 'OVERDUE'];

  board: BoardAnalyticsDto | null = null;
  lists: ListDto[] = [];
  cards: CardDto[] = [];
  listCardCounts: ListBarChartItem[] = [];
  statusFilter: AnalyticsStatusFilter = 'ALL';
  dueFilter: DueFilter = 'ALL';
  loading = false;
  cardsLoading = false;
  workspaceId = 0;
  boardId = 0;

  ngOnInit(): void {
    this.boardId = Number(this.route.snapshot.paramMap.get('boardId'));
    this.workspaceId = Number(this.route.snapshot.queryParamMap.get('workspaceId'));
    if (!this.boardId || !this.workspaceId) {
      console.error('Missing workspaceId or boardId for board analytics');
      return;
    }
    this.loadBoard();
  }

  onFiltersChanged(): void {
    this.loadCards();
  }

  statusClass(status: string): string {
    return `status-${status.replace('_', '-').toLowerCase()}`;
  }

  dueClass(value: string | null): string {
    if (!value) return '';
    const due = new Date(value);
    const now = new Date();
    if (Number.isNaN(due.getTime())) return '';
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
    const diffDays = Math.round((dueDay.getTime() - today.getTime()) / 86400000);
    if (diffDays < 0) return 'due-overdue';
    if (diffDays === 0) return 'due-today';
    if (diffDays <= 7) return 'due-this-week';
    return '';
  }

  trackByListId(_: number, list: ListDto): number {
    return list.listId;
  }

  trackByCardId(_: number, card: CardDto): number {
    return card.cardId;
  }

  private loadBoard(): void {
    this.loading = true;
    forkJoin({
      board: this.analyticsService.getBoardAnalytics(this.workspaceId, this.boardId),
      lists: this.analyticsService.getBoardLists(this.workspaceId, this.boardId)
    })
      .subscribe({
        next: ({ board, lists }) => {
          this.board = board;
          this.lists = lists ?? [];
          this.loading = false;
          this.loadCards();
        },
        error: (err) => {
          console.error(err);
          this.board = null;
          this.lists = [];
          this.cards = [];
          this.listCardCounts = [];
          this.loading = false;
          this.cardsLoading = false;
        }
      });
  }

  private loadCards(): void {
    this.cardsLoading = true;
    this.cards = [];
    this.analyticsService.getCards({
      workspaceId: this.workspaceId,
      boardId: this.boardId,
      status: this.statusFilter === 'ALL' ? undefined : this.statusFilter,
      due: this.dueFilter === 'ALL' ? undefined : this.dueFilter
    })
      .subscribe({
        next: (cards) => {
          this.cards = cards ?? [];
          this.listCardCounts = this.lists.map((list) => ({
            label: list.name,
            value: this.cards.filter((card) => card.listId === list.listId).length
          }));
          this.cardsLoading = false;
        },
        error: (err) => {
          console.error(err);
          this.cards = [];
          this.listCardCounts = this.lists.map((list) => ({ label: list.name, value: 0 }));
          this.cardsLoading = false;
        }
      });
  }
}
