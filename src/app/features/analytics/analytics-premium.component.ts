import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

type PremiumFeature = {
  title: string;
  description: string;
};

@Component({
  selector: 'app-analytics-premium',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './analytics-premium.component.html',
  styleUrl: './analytics-premium.component.css'
})
export class AnalyticsPremiumComponent {
  readonly features: PremiumFeature[] = [
    {
      title: 'Workspace intelligence',
      description: 'See board health, member load, task progress, and delivery movement in one view.'
    },
    {
      title: 'Smart filtering',
      description: 'Find overdue, due-today, priority, assignee, board, and status based cards faster.'
    },
    {
      title: 'Member performance',
      description: 'Understand who is carrying what, what is blocked, and where work needs attention.'
    },
    {
      title: 'Board analytics',
      description: 'Compare list distribution, completion status, and board-level delivery patterns.'
    }
  ];
}
