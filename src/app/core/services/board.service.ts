import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { ApiPage } from '../models/api-page.model';
import { BoardMemberRequest, BoardMemberResponse, BoardRequest, BoardResponse, BoardUpdateRequest } from '../models/board.models';
import { ApiService } from './api.service';
import { UserDto } from '../models/auth.models';

@Injectable({ providedIn: 'root' })
export class BoardService {
  private readonly boardsSubject = new BehaviorSubject<BoardResponse[]>([]);
  private readonly membersSubject = new BehaviorSubject<UserDto[]>([]);

  constructor(private readonly api: ApiService) {}

  getBoards(): Observable<BoardResponse[]> {
    return this.boardsSubject.asObservable();
  }

  setBoards(items: BoardResponse[]): void {
    this.boardsSubject.next(items);
  }

  getBoardMembers(): Observable<UserDto[]> {
    return this.membersSubject.asObservable();
  }

  setBoardMembers(items: UserDto[]): void {
    this.membersSubject.next(items);
  }

  create(request: BoardRequest) {
    return this.api.post<BoardResponse>('/api/v1/boards/create', request).pipe(
      tap((board) => {
        const next = [board, ...this.boardsSubject.value.filter((item) => item.boardId !== board.boardId)];
        this.boardsSubject.next(next);
      })
    );
  }

  update(boardId: number, request: BoardUpdateRequest) {
    return this.api.put<BoardResponse>(`/api/v1/boards/update/${boardId}`, request).pipe(
      tap((board) => {
        const next = this.boardsSubject.value.map((item) => (item.boardId === board.boardId ? board : item));
        this.boardsSubject.next(next);
      })
    );
  }

  delete(boardId: number) {
    return this.api.deleteText(`/api/v1/boards/delete/${boardId}`).pipe(
      tap(() => {
        this.boardsSubject.next(this.boardsSubject.value.filter((item) => item.boardId !== boardId));
      })
    );
  }

  deleteBoard(boardId: number) {
    return this.delete(boardId);
  }

  get(boardId: number) {
    return this.api.get<BoardResponse>(`/api/v1/boards/get/${boardId}`);
  }

  getPublicBoards(workspaceId: number, page = 0, size = 10, by = 'boardId', direction = 'ASC') {
    return this.api.get<ApiPage<BoardResponse>>(`/api/v1/boards/get/workspace/${workspaceId}/public`, { page, size, by, direction }).pipe(
      tap((result) => this.boardsSubject.next(result.content))
    );
  }

  getPublicBoardsForLoggedUser(workspaceId: number, page = 0, size = 10, by = 'boardId', direction = 'ASC') {
    return this.api.get<ApiPage<BoardResponse>>(`/api/v1/boards/workspace/${workspaceId}/member/public`, { page, size, by, direction }).pipe(
      tap((result) => this.boardsSubject.next(result.content))
    );
  }

  getPrivateBoards(workspaceId: number, page = 0, size = 10, by = 'boardId', direction = 'ASC') {
    return this.api.get<ApiPage<BoardResponse>>(`/api/v1/boards/workspace/${workspaceId}/private`, { page, size, by, direction }).pipe(
      tap((result) => this.boardsSubject.next(result.content))
    );
  }

  close(boardId: number) {
    return this.api.putText(`/api/v1/boards/${boardId}/close`, {}).pipe(
      tap(() => {
        const next = this.boardsSubject.value.map((item) => (item.boardId === boardId ? { ...item, isClosed: true } : item));
        this.boardsSubject.next(next);
      })
    );
  }

  open(boardId: number) {
    return this.api.putText(`/api/v1/boards/${boardId}/open`, {}).pipe(
      tap(() => {
        const next = this.boardsSubject.value.map((item) => (item.boardId === boardId ? { ...item, isClosed: false } : item));
        this.boardsSubject.next(next);
      })
    );
  }

  getWorkspaceId(boardId: number) {
    return this.api.get<number>(`/api/v1/boards/workspace/${boardId}`);
  }

  isPrivate(boardId: number) {
    return this.api.get<boolean>(`/api/v1/boards/is-private/${boardId}`);
  }

  addMemberToBoard(request: BoardMemberRequest) {
    return this.api.post<BoardMemberResponse>('/api/v1/board-members/add', request);
  }

  addMember(request: BoardMemberRequest) {
    return this.addMemberToBoard(request);
  }

  removeMember(boardId: number, memberUserId: number) {
    return this.api.deleteText(`/api/v1/board-members/remove/${boardId}/${memberUserId}`).pipe(
      tap(() => {
        this.membersSubject.next(this.membersSubject.value.filter((item) => item.userId !== memberUserId));
      })
    );
  }

  getMembers(boardId: number, page = 0, size = 10, by = 'userId', direction = 'ASC') {
    return this.api.get<ApiPage<UserDto>>(`/api/v1/board-members/get/${boardId}`, { page, size, by, direction }).pipe(
      tap((result) => this.membersSubject.next(result.content))
    );
  }

  isMember(boardId: number, userId: number) {
    return this.api.get<boolean>(`/api/v1/board-members/${boardId}/is-member/${userId}`);
  }
}
