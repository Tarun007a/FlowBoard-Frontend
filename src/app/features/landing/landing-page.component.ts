import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

type LandingFeature = {
  title: string;
  description: string;
  icon: 'workspace' | 'board' | 'team';
};

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.css'
})
export class LandingPageComponent {
  private readonly router = inject(Router);

  readonly features: LandingFeature[] = [
    {
      title: 'Workspaces',
      description: 'Bring projects, departments, and priorities into focused spaces.',
      icon: 'workspace'
    },
    {
      title: 'Boards & Tasks',
      description: 'Plan work visually, track progress, and keep every task moving.',
      icon: 'board'
    },
    {
      title: 'Team Collaboration',
      description: 'Coordinate teammates with shared context and cleaner handoffs.',
      icon: 'team'
    }
  ];

  getStarted(): void {
    this.router.navigate(['/login']);
  }
}
