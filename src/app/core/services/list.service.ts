import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import { TaskListOrderRequest, TaskListRequest, TaskListResponse, TaskListUpdateRequest } from '../models/list.models';
import { ApiPage } from '../models/api-page.model';

@Injectable({ providedIn: 'root' })
export class ListService {
  private readonly listsSubject = new BehaviorSubject<TaskListResponse[]>([]);

  constructor(private readonly api: ApiService) {}

  getLists(): Observable<TaskListResponse[]> {
    return this.listsSubject.asObservable();
  }

  setLists(items: TaskListResponse[]): void {
    this.listsSubject.next(items);
  }

  create(request: TaskListRequest) {
    return this.api.post<TaskListResponse>('/api/v1/lists/create', request).pipe(
      tap((list) => {
        const next = [list, ...this.listsSubject.value.filter((item) => item.listId !== list.listId)];
        this.listsSubject.next(next);
      })
    );
  }

  getById(listId: number) {
    return this.api.get<TaskListResponse>(`/api/v1/lists/${listId}`);
  }

  getByBoard(boardId: number) {
    return this.api.get<TaskListResponse[]>(`/api/v1/lists/board/${boardId}`).pipe(
      tap((items) => this.listsSubject.next(items))
    );
  }

  update(listId: number, request: TaskListUpdateRequest) {
    return this.api.put<TaskListResponse>(`/api/v1/lists/update/${listId}`, request).pipe(
      tap((list) => {
        const next = this.listsSubject.value.map((item) => (item.listId === list.listId ? list : item));
        this.listsSubject.next(next);
      })
    );
  }

  reorder(boardId: number, order: TaskListOrderRequest[]) {
    return this.api.put<TaskListResponse[]>(`/api/v1/lists/board/${boardId}/reorder`, order).pipe(
      tap((items) => this.listsSubject.next(items))
    );
  }

  archive(listId: number) {
    return this.api.patchText(`/api/v1/lists/${listId}/archive`).pipe(
      tap(() => {
        const next = this.listsSubject.value.map((item) => (item.listId === listId ? { ...item, isArchived: true } : item));
        this.listsSubject.next(next);
      })
    );
  }

  unarchive(listId: number) {
    return this.api.patchText(`/api/v1/lists/${listId}/unarchive`).pipe(
      tap(() => {
        const next = this.listsSubject.value.map((item) => (item.listId === listId ? { ...item, isArchived: false } : item));
        this.listsSubject.next(next);
      })
    );
  }

  delete(listId: number) {
    return this.api.deleteText(`/api/v1/lists/delete/${listId}`).pipe(
      tap(() => {
        this.listsSubject.next(this.listsSubject.value.filter((item) => item.listId !== listId));
      })
    );
  }

  getArchived(boardId: number) {
    return this.api.get<TaskListResponse[]>(`/api/v1/lists/board/${boardId}/archived`).pipe(
      tap((items) => this.listsSubject.next(items))
    );
  }

  getPublic(boardId: number) {
    return this.api.get<TaskListResponse[]>(`/api/v1/lists/public/${boardId}`).pipe(
      tap((items) => this.listsSubject.next(items))
    );
  }

  getBoardId(listId: number) {
    return this.api.get<number>(`/api/v1/lists/get-boardId/${listId}`);
  }
}