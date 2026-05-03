import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { CardActivityResponse } from '../../core/models/card.models';
import { CardService } from '../../core/services/card.service';

@Component({
  selector: 'app-card-activity',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './card-activity.component.html',
  styleUrl: './card-activity.component.css'
})
export class CardActivityComponent implements OnChanges {
  private readonly cardService = inject(CardService);

  @Input({ required: true }) cardId!: number;
  @Output() closed = new EventEmitter<void>();

  activities: CardActivityResponse[] = [];
  loading = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['cardId'] && this.cardId) {
      this.loadActivities();
    }
  }

  close(): void {
    this.closed.emit();
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

  private loadActivities(): void {
    this.loading = true;
    this.cardService.getCardActivities(this.cardId).subscribe({
      next: (page) => {
        this.activities = [...page.content].sort((left, right) =>
          new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
        );
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
      }
    });
  }
}
