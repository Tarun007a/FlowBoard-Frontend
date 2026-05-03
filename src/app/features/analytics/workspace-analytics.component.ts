import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { BoardDto, WorkspaceAnalyticsResponseDto, WorkspaceMemberDto } from '../../core/models/analytics.models';
import { AnalyticsService } from '../../core/services/analytics.service';
import { StatusDoughnutComponent } from './status-doughnut.component';

@Component({
  selector: 'app-workspace-analytics',
  standalone: true,
  imports: [CommonModule, StatusDoughnutComponent],
  templateUrl: './workspace-analytics.component.html',
  styleUrl: './analytics.component.css'
})
export class WorkspaceAnalyticsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly analyticsService = inject(AnalyticsService);

  workspace: WorkspaceAnalyticsResponseDto | null = null;
  members: WorkspaceMemberDto[] = [];
  boards: BoardDto[] = [];
  loading = false;
  workspaceId = 0;

  ngOnInit(): void {
    this.workspaceId = Number(this.route.snapshot.paramMap.get('id'));
    if (!this.workspaceId) {
      console.error('Missing workspace id');
      return;
    }
    this.loadWorkspace();
  }

  openMember(userId: number): void {
    this.router.navigate(['/analytics/member', userId], { queryParams: { workspaceId: this.workspaceId } }).catch((err) => console.error(err));
  }

  openBoard(boardId: number): void {
    this.router.navigate(['/analytics/board', boardId], { queryParams: { workspaceId: this.workspaceId } }).catch((err) => console.error(err));
  }

  trackByMemberId(_: number, member: WorkspaceMemberDto): number {
    return member.memberId;
  }

  trackByBoardId(_: number, board: BoardDto): number {
    return board.boardId;
  }

  private loadWorkspace(): void {
    this.loading = true;
    forkJoin({
      workspace: this.analyticsService.getWorkspaceAnalytics(this.workspaceId),
      members: this.analyticsService.getWorkspaceMembers(this.workspaceId),
      boards: this.analyticsService.getWorkspaceBoards(this.workspaceId)
    })
      .subscribe({
        next: ({ workspace, members, boards }) => {
          this.workspace = workspace;
          this.members = members ?? [];
          this.boards = boards ?? [];
          this.loading = false;
        },
        error: (err) => {
          console.error(err);
          this.workspace = null;
          this.members = [];
          this.boards = [];
          this.loading = false;
        }
      });
  }
}
