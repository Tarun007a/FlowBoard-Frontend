import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { CommentRequest, CommentResponse, CommentUpdateRequest } from '../models/comment.models';
import { ApiPage } from '../models/api-page.model';

@Injectable({ providedIn: 'root' })
export class CommentService {
  constructor(private readonly api: ApiService) {}

  add(request: CommentRequest) {
    return this.api.post<CommentResponse>('/api/v1/comments/add', request);
  }

  getByCard(cardId: number, page = 0, size = 10, sortBy = 'createdAt', direction = 'DESC') {
    return this.api.get<ApiPage<CommentResponse>>(`/api/v1/comments/card/${cardId}`, { page, size, sortBy, direction });
  }

  get(commentId: number) {
    return this.api.get<CommentResponse>(`/api/v1/comments/get/${commentId}`);
  }

  getReplies(commentId: number, page = 0, size = 10, sortBy = 'createdAt', direction = 'DESC') {
    return this.api.get<ApiPage<CommentResponse>>(`/api/v1/comments/replies/${commentId}`, { page, size, sortBy, direction });
  }

  update(request: CommentUpdateRequest) {
    return this.api.patch<CommentResponse>('/api/v1/comments/update', request);
  }

  count(cardId: number) {
    return this.api.get<number>(`/api/v1/comments/count/${cardId}`);
  }

  delete(commentId: number) {
    return this.api.deleteText(`/api/v1/comments/delete/${commentId}`);
  }
}