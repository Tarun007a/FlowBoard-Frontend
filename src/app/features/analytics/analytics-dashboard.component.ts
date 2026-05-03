import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { WorkspaceOverviewDto } from '../../core/models/analytics.models';
import { AnalyticsService } from '../../core/services/analytics.service';
import { StatusDoughnutComponent } from './status-doughnut.component';

@Component({
  selector: 'app-analytics-dashboard',
  standalone: true,
  imports: [CommonModule, StatusDoughnutComponent],
  templateUrl: './analytics-dashboard.component.html',
  styleUrl: './analytics.component.css'
})
export class AnalyticsDashboardComponent implements OnInit {
  private readonly analyticsService = inject(AnalyticsService);
  private readonly router = inject(Router);

  workspaces: WorkspaceOverviewDto[] = [];
  loading = false;

  ngOnInit(): void {
    this.loadOverview();
  }

  openWorkspace(workspaceId: number): void {
    this.router.navigate(['/analytics/workspace', workspaceId]).catch((err) => console.error(err));
  }

  trackByWorkspaceId(_: number, workspace: WorkspaceOverviewDto): number {
    return workspace.workspaceId;
  }

  private loadOverview(): void {
    this.loading = true;
    this.analyticsService.getWorkspaceOverview()
      .subscribe({
        next: (workspaces) => {
          this.workspaces = workspaces ?? [];
          this.loading = false;
        },
        error: (err) => {
          console.error(err);
          this.workspaces = [];
          this.loading = false;
        }
      });
  }
}
