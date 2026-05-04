import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { ApiPage } from '../models/api-page.model';
import { WorkspaceMemberRequest, WorkspaceMemberResponse, WorkspaceRequest, WorkspaceResponse } from '../models/workspace.models';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class WorkspaceService {
  private readonly workspacesSubject = new BehaviorSubject<WorkspaceResponse[]>([]);
  private readonly membersSubject = new BehaviorSubject<WorkspaceMemberResponse[]>([]);

  constructor(private readonly api: ApiService) {}

  getWorkspaces(): Observable<WorkspaceResponse[]> {
    return this.workspacesSubject.asObservable();
  }

  setWorkspaces(items: WorkspaceResponse[]): void {
    this.workspacesSubject.next(items);
  }

  getWorkspaceMembers(): Observable<WorkspaceMemberResponse[]> {
    return this.membersSubject.asObservable();
  }

  setWorkspaceMembers(items: WorkspaceMemberResponse[]): void {
    this.membersSubject.next(items);
  }

  create(request: WorkspaceRequest) {
    return this.api.post<WorkspaceResponse>('/api/v1/workspaces/create', request).pipe(
      tap((workspace) => {
        const next = [workspace, ...this.workspacesSubject.value.filter((item) => item.workspaceId !== workspace.workspaceId)];
        this.workspacesSubject.next(next);
      })
    );
  }

  createWorkspace(request: WorkspaceRequest) {
    return this.create(request);
  }

  updateWorkspace(id: number, request: WorkspaceRequest) {
    return this.api.put<WorkspaceResponse>(`/api/v1/workspaces/update/${id}`, request).pipe(
      tap((workspace) => {
        const next = this.workspacesSubject.value.map((item) => (item.workspaceId === workspace.workspaceId ? workspace : item));
        this.workspacesSubject.next(next);
      })
    );
  }

  deleteWorkspace(id: number) {
    return this.api.deleteText(`/api/v1/workspaces/delete/${id}`).pipe(
      tap(() => {
        this.workspacesSubject.next(this.workspacesSubject.value.filter((item) => item.workspaceId !== id));
      })
    );
  }

  validateAccess(workspaceId: number) {
    return this.api.get<boolean>(`/api/v1/workspaces/access/${workspaceId}`);
  }

  getWorkspaceById(workspaceId: number) {
    return this.api.get<WorkspaceResponse>(`/api/v1/workspaces/${workspaceId}`);
  }

  // Backward-compatible wrappers used by existing components.
  update(id: number, request: WorkspaceRequest) {
    return this.updateWorkspace(id, request);
  }

  delete(id: number) {
    return this.deleteWorkspace(id);
  }

  getMyWorkspaces(page = 0, size = 10, sort = 'workspaceId', direction = 'asc') {
    return this.api.get<ApiPage<WorkspaceResponse>>('/api/v1/workspaces/me', { page, size, sort, direction }).pipe(
      tap((result) => this.workspacesSubject.next(result.content))
    );
  }

  getJoinedWorkspaces(page = 0, size = 10, sort = 'workspaceId', direction = 'asc') {
    return this.api.get<ApiPage<WorkspaceResponse>>('/api/v1/workspaces/joined', { page, size, sort, direction }).pipe(
      tap((result) => this.workspacesSubject.next(result.content))
    );
  }

  getPublicWorkspaces(page = 0, size = 10, sort = 'workspaceId', direction = 'asc') {
    return this.api.get<ApiPage<WorkspaceResponse>>('/api/v1/workspaces/public', { page, size, sort, direction }).pipe(
      tap((result) => this.workspacesSubject.next(result.content))
    );
  }

  getOwnerId(workspaceId: number) {
    return this.api.get<number>(`/api/v1/workspaces/owner/${workspaceId}`);
  }

  isMember(workspaceId: number, memberId: number) {
    return this.api.get<boolean>(`/api/v1/workspaces/${workspaceId}/member/${memberId}`);
  }

  isPrivate(workspaceId: number) {
    return this.api.get<boolean>(`/api/v1/workspaces/private/${workspaceId}`);
  }

  addMember(request: WorkspaceMemberRequest) {
    return this.api.post<WorkspaceMemberResponse>('/api/v1/workspaces/add', request).pipe(
      tap((member) => {
        const next = [member, ...this.membersSubject.value.filter((item) => item.memberId !== member.memberId)];
        this.membersSubject.next(next);
      })
    );
  }

  removeMember(workspaceId: number, userId: number) {
    return this.api.deleteText(`/api/v1/workspaces/${workspaceId}/members/${userId}`).pipe(
      tap(() => {
        this.membersSubject.next(this.membersSubject.value.filter((item) => item.userId !== userId));
      })
    );
  }

  getMembers(workspaceId: number, page = 0, size = 10, sort = 'memberId', direction = 'asc') {
    return this.api.get<ApiPage<WorkspaceMemberResponse>>(`/api/v1/workspaces/${workspaceId}/members`, { page, size, sort, direction }).pipe(
      tap((result) => this.membersSubject.next(result.content))
    );
  }
}
