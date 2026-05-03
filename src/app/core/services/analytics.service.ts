import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  AnalyticsStatusFilter,
  BoardAnalyticsDto,
  BoardDto,
  CardDto,
  DueFilter,
  ListDto,
  MemberAnalyticsDto,
  WorkspaceAnalyticsResponseDto,
  WorkspaceMemberDto,
  WorkspaceOverviewDto
} from '../models/analytics.models';
import { ApiService } from './api.service';

type AnalyticsCardParams = {
  workspaceId: number;
  boardId?: number;
  status?: Exclude<AnalyticsStatusFilter, 'ALL'>;
  due?: Exclude<DueFilter, 'ALL'>;
  assigneeId?: number;
};

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly api = inject(ApiService);

  getWorkspaceOverview(): Observable<WorkspaceOverviewDto[]> {
    return this.api.get<WorkspaceOverviewDto[]>('/api/v1/analytics/me');
  }

  getWorkspaceAnalytics(workspaceId: number): Observable<WorkspaceAnalyticsResponseDto> {
    return this.api.get<WorkspaceAnalyticsResponseDto>(`/api/v1/analytics/workspace/${workspaceId}`);
  }

  getWorkspaceMembers(workspaceId: number): Observable<WorkspaceMemberDto[]> {
    return this.api.get<WorkspaceMemberDto[]>(`/api/v1/analytics/workspace/members/${workspaceId}`);
  }

  getWorkspaceBoards(workspaceId: number): Observable<BoardDto[]> {
    return this.api.get<BoardDto[]>(`/api/v1/analytics/workspace/boards/${workspaceId}`);
  }

  getMemberAnalytics(workspaceId: number, memberId: number): Observable<MemberAnalyticsDto> {
    return this.api.get<MemberAnalyticsDto>(`/api/v1/analytics/workspace/${workspaceId}/member/${memberId}`);
  }

  getBoardAnalytics(workspaceId: number, boardId: number): Observable<BoardAnalyticsDto> {
    return this.api.get<BoardAnalyticsDto>(`/api/v1/analytics/workspace/${workspaceId}/board/${boardId}`);
  }

  getBoardLists(workspaceId: number, boardId: number): Observable<ListDto[]> {
    return this.api.get<ListDto[]>(`/api/v1/analytics/board/list/${workspaceId}/${boardId}`);
  }

  getCards(params: AnalyticsCardParams): Observable<CardDto[]> {
    return this.api.get<CardDto[]>('/api/v1/analytics/cards', params);
  }
}
