import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CardActivityResponse, CardResponse } from '../../core/models/card.models';
import { CardService } from '../../core/services/card.service';

@Component({
  selector: 'app-card-activity',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './card-activity.component.html',
  styleUrl: './card-activity.component.css'
})
export class CardActivityComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cardService = inject(CardService);

  cardId = 0;
  card: CardResponse | null = null;
  assigneeName: string | null = null;

  activities: CardActivityResponse[] = [];
  loading = false;
  loadingCard = false;
  page = 0;
  size = 10;
  totalPages = 0;
  totalElements = 0;

  ngOnInit(): void {
    this.cardId = Number(this.route.snapshot.paramMap.get('cardId') ?? 0);
    const navigationState = this.router.getCurrentNavigation()?.extras.state as {
      card?: CardResponse;
      assigneeName?: string | null;
    } | undefined;

    this.card = navigationState?.card ?? history.state?.card ?? null;
    this.assigneeName = navigationState?.assigneeName ?? history.state?.assigneeName ?? null;

    if (!this.cardId) {
      return;
    }

    if (!this.card || this.card.cardId !== this.cardId) {
      this.loadCard();
    }

    this.loadActivities();
  }

  get boardLink(): Array<string | number> {
    if (this.card?.boardId) {
      return ['/board', this.card.boardId];
    }

    return ['/workspaces'];
  }

  nextPage(): void {
    if (this.page + 1 >= this.totalPages) return;

    this.page++;
    this.loadActivities();
  }

  prevPage(): void {
    if (this.page === 0) return;

    this.page--;
    this.loadActivities();
  }

  formatActivityType(value: string): string {
    return value ? value.replace(/_/g, ' ').toUpperCase() : '-';
  }

  formatDate(value: string | null): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  readableStatus(value: string | null): string {
    return value ? value.replace(/_/g, ' ') : '-';
  }

  private loadActivities(): void {
    this.loading = true;
    this.cardService.getCardActivities(this.cardId, this.page, this.size).subscribe({
      next: (page) => {
        this.activities = page.content;
        this.totalPages = page.totalPages;
        this.totalElements = page.totalNumberOfElements;
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
      }
    });
  }

  private loadCard(): void {
    this.loadingCard = true;
    this.cardService.get(this.cardId).subscribe({
      next: (card) => {
        this.card = card;
        this.loadingCard = false;
      },
      error: (err) => {
        console.error(err);
        this.loadingCard = false;
      }
    });
  }
}
