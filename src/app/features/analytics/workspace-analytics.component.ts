import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { BoardDto, WorkspaceAnalyticsResponseDto, WorkspaceMemberDto } from '../../core/models/analytics.models';
import { AnalyticsService } from '../../core/services/analytics.service';
import { ListBarChartComponent, ListBarChartItem } from './list-bar-chart.component';
import { StatusDoughnutComponent } from './status-doughnut.component';

@Component({
  selector: 'app-workspace-analytics',
  standalone: true,
  imports: [CommonModule, StatusDoughnutComponent, ListBarChartComponent],
  templateUrl: './workspace-analytics.component.html',
  styleUrls: ['./analytics.component.css', './workspace-smart-filter.component.css']
})
export class WorkspaceAnalyticsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly analyticsService = inject(AnalyticsService);

  data: WorkspaceAnalyticsResponseDto | null = null;
  members: WorkspaceMemberDto[] = [];
  boards: BoardDto[] = [];
  loading = false;
  workspaceId = 0;
  private apiCalled = false;

  get statusChartItems(): ListBarChartItem[] {
    const summary = this.data?.cardsSummary;
    return [
      { label: 'TO_DO', value: summary?.toDo ?? 0 },
      { label: 'IN_PROGRESS', value: summary?.inProgress ?? 0 },
      { label: 'IN_REVIEW', value: summary?.inReview ?? 0 },
      { label: 'DONE', value: summary?.done ?? 0 }
    ];
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    console.log('Workspace ID:', id);

    if (!id) {
      console.error('Invalid workspace id');
      return;
    }

    this.workspaceId = +id;
    this.loadWorkspace(this.workspaceId);
  }

  loadWorkspace(id: number): void {
    if (this.loading || this.apiCalled) return;

    this.apiCalled = true;
    this.loading = true;
    console.log('API CALLED');

    forkJoin({
      workspace: this.analyticsService.getWorkspaceAnalytics(id),
      members: this.analyticsService.getWorkspaceMembers(id).pipe(catchError(() => of([] as WorkspaceMemberDto[]))),
      boards: this.analyticsService.getWorkspaceBoards(id).pipe(catchError(() => of([] as BoardDto[])))
    })
      .subscribe({
        next: ({ workspace, members, boards }) => {
          console.log('Response:', workspace);
          this.data = workspace;
          this.members = members ?? [];
          this.boards = boards ?? [];
          this.loading = false;
        },
        error: (err) => {
          console.error(err);
          this.data = null;
          this.members = [];
          this.boards = [];
          this.loading = false;
        }
      });
  }

  openMember(member: WorkspaceMemberDto): void {
    this.router.navigate(['/analytics/member', member.userId], { queryParams: { workspaceId: this.workspaceId } });
  }

  openBoard(board: BoardDto): void {
    this.router.navigate(['/analytics/board', board.boardId], { queryParams: { workspaceId: this.workspaceId } });
  }

  openFilter(): void {
    this.router.navigate(['/analytics/filter', this.workspaceId]);
  }

  trackByMemberId(_: number, member: WorkspaceMemberDto): number {
    return member.memberId;
  }

  trackByBoardId(_: number, board: BoardDto): number {
    return board.boardId;
  }
}
