import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MemberAnalyticsDto } from '../../core/models/analytics.models';
import { AnalyticsService } from '../../core/services/analytics.service';
import { StatusDoughnutComponent } from './status-doughnut.component';

@Component({
  selector: 'app-member-analytics',
  standalone: true,
  imports: [CommonModule, StatusDoughnutComponent],
  templateUrl: './member-analytics.component.html',
  styleUrl: './analytics.component.css'
})
export class MemberAnalyticsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly analyticsService = inject(AnalyticsService);

  member: MemberAnalyticsDto | null = null;
  loading = false;

  ngOnInit(): void {
    const memberId = Number(this.route.snapshot.paramMap.get('userId'));
    const workspaceId = Number(this.route.snapshot.queryParamMap.get('workspaceId'));
    if (!memberId || !workspaceId) {
      console.error('Missing workspaceId or memberId for member analytics');
      return;
    }
    this.loadMember(workspaceId, memberId);
  }

  avatarFallback(): string {
    return this.member?.name?.charAt(0).toUpperCase() || 'U';
  }

  private loadMember(workspaceId: number, memberId: number): void {
    this.loading = true;
    this.analyticsService.getMemberAnalytics(workspaceId, memberId)
      .subscribe({
        next: (member) => {
          this.member = member;
          this.loading = false;
        },
        error: (err) => {
          console.error(err);
          this.member = null;
          this.loading = false;
        }
      });
  }
}
