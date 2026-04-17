import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { AttachmentResponse } from '../models/comment.models';

@Injectable({ providedIn: 'root' })
export class AttachmentService {
  constructor(private readonly api: ApiService) {}

  upload(file: File, cardId: number, uploaderId: number) {
    const formData = new FormData();
    formData.append('file', file);

    return this.api.upload<AttachmentResponse>('/api/v1/attachments/upload', formData, { cardId, uploaderId });
  }

  getByCard(cardId: number) {
    return this.api.get<AttachmentResponse[]>(`/api/v1/attachments/card/${cardId}`);
  }

  delete(attachmentId: number) {
    return this.api.deleteText(`/api/v1/attachments/delete/${attachmentId}`);
  }
}