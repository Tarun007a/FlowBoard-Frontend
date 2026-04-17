import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import { CardActivityResponse, CardRequest, CardResponse, CardUpdateRequest, Priority, Status } from '../models/card.models';
import { ApiPage } from '../models/api-page.model';

@Injectable({ providedIn: 'root' })
export class CardService {
  private readonly cardsSubject = new BehaviorSubject<CardResponse[]>([]);

  constructor(private readonly api: ApiService) {}

  getCards(): Observable<CardResponse[]> {
    return this.cardsSubject.asObservable();
  }

  setCards(items: CardResponse[]): void {
    this.cardsSubject.next(items);
  }

  create(request: CardRequest) {
    return this.api.post<CardResponse>('/api/v1/cards/create', request).pipe(
      tap((card) => {
        const next = [card, ...this.cardsSubject.value.filter((item) => item.cardId !== card.cardId)];
        this.cardsSubject.next(next);
      })
    );
  }

  get(cardId: number) {
    return this.api.get<CardResponse>(`/api/v1/cards/get/${cardId}`);
  }

  getByList(listId: number) {
    return this.api.get<CardResponse[]>(`/api/v1/cards/get/list/${listId}`).pipe(
      tap((cards) => this.cardsSubject.next(cards))
    );
  }

  getByBoard(boardId: number) {
    return this.api.get<CardResponse[]>(`/api/v1/cards/get/board/${boardId}`).pipe(
      tap((cards) => this.cardsSubject.next(cards))
    );
  }

  getByAssignee(assigneeId: number) {
    return this.api.get<CardResponse[]>(`/api/v1/cards/get/assignee/${assigneeId}`).pipe(
      tap((cards) => this.cardsSubject.next(cards))
    );
  }

  update(cardId: number, request: CardUpdateRequest) {
    return this.api.put<CardResponse>(`/api/v1/cards/update/${cardId}`, request).pipe(
      tap((card) => {
        const next = this.cardsSubject.value.map((item) => (item.cardId === card.cardId ? card : item));
        this.cardsSubject.next(next);
      })
    );
  }

  delete(cardId: number) {
    return this.api.deleteText(`/api/v1/cards/delete/${cardId}`).pipe(
      tap(() => {
        this.cardsSubject.next(this.cardsSubject.value.filter((item) => item.cardId !== cardId));
      })
    );
  }

  move(cardId: number, targetListId: number, position: number) {
    return this.api.put<CardResponse>(`/api/v1/cards/${cardId}/move`, null, { targetListId, position }).pipe(
      tap((card) => {
        const existing = this.cardsSubject.value;
        const mapped = existing.some((item) => item.cardId === card.cardId)
          ? existing.map((item) => (item.cardId === card.cardId ? card : item))
          : [card, ...existing];
        this.cardsSubject.next(mapped);
      })
    );
  }

  reorder(listId: number, orderedCardIds: number[]) {
    return this.api.putText(`/api/v1/cards/list/${listId}/reorder`, orderedCardIds).pipe(
      tap(() => {
        const indexById = new Map<number, number>();
        orderedCardIds.forEach((id, index) => indexById.set(id, index));

        const next = this.cardsSubject.value.map((card) => {
          if (!indexById.has(card.cardId)) {
            return card;
          }

          return { ...card, position: indexById.get(card.cardId) as number };
        });

        this.cardsSubject.next(next);
      })
    );
  }

  assign(cardId: number, assigneeId: number) {
    return this.api.put<CardResponse>(`/api/v1/cards/${cardId}/assign`, null, { assigneeId }).pipe(
      tap((card) => {
        const next = this.cardsSubject.value.map((item) => (item.cardId === card.cardId ? card : item));
        this.cardsSubject.next(next);
      })
    );
  }

  updatePriority(cardId: number, priority: Priority) {
    return this.api.put<CardResponse>(`/api/v1/cards/${cardId}/priority`, null, { priority }).pipe(
      tap((card) => {
        const next = this.cardsSubject.value.map((item) => (item.cardId === card.cardId ? card : item));
        this.cardsSubject.next(next);
      })
    );
  }

  updateStatus(cardId: number, status: Status) {
    return this.api.put<CardResponse>(`/api/v1/cards/${cardId}/status`, null, { status }).pipe(
      tap((card) => {
        const next = this.cardsSubject.value.map((item) => (item.cardId === card.cardId ? card : item));
        this.cardsSubject.next(next);
      })
    );
  }

  archive(cardId: number) {
    return this.api.putText(`/api/v1/cards/${cardId}/archive`, {}).pipe(
      tap(() => {
        const next = this.cardsSubject.value.map((item) => (item.cardId === cardId ? { ...item, isArchived: true } : item));
        this.cardsSubject.next(next);
      })
    );
  }

  unarchive(cardId: number) {
    return this.api.putText(`/api/v1/cards/${cardId}/unarchive`, {}).pipe(
      tap(() => {
        const next = this.cardsSubject.value.map((item) => (item.cardId === cardId ? { ...item, isArchived: false } : item));
        this.cardsSubject.next(next);
      })
    );
  }

  getOverdue() {
    return this.api.get<CardResponse[]>('/api/v1/cards/overdue').pipe(
      tap((cards) => this.cardsSubject.next(cards))
    );
  }

  getActivities(cardId: number, page = 0, size = 10, sortBy = 'createdAt', direction = 'DESC') {
    return this.api.get<ApiPage<CardActivityResponse>>(`/api/v1/cards/card/${cardId}`, { page, size, sortBy, direction });
  }
}