import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AttachmentResponse, CommentResponse } from '../../core/models/comment.models';
import { AttachmentService } from '../../core/services/attachment.service';
import { AuthStoreService } from '../../core/services/auth-store.service';
import { CommentService } from '../../core/services/comment.service';
import { readErrorMessage } from '../../core/utils/error.utils';

@Component({
  selector: 'app-comments-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './comments.component.html',
  styleUrl: './comments.component.css'
})
export class CommentsComponent {
  private readonly fb = inject(FormBuilder);
  private readonly commentService = inject(CommentService);
  private readonly attachmentService = inject(AttachmentService);
  private readonly authStore = inject(AuthStoreService);

  error = '';
  message = '';
  comments: CommentResponse[] = [];
  attachments: AttachmentResponse[] = [];
  count: number | null = null;
  selectedFile: File | null = null;

  form = this.fb.nonNullable.group({
    commentId: [null as number | null],
    cardId: [null as number | null, [Validators.required]],
    authorId: [null as number | null, [Validators.required]],
    parentCommentId: [null as number | null],
    content: ['', [Validators.required]]
  });

  cardLookup = this.fb.nonNullable.control<number | null>(null);
  replyLookup = this.fb.nonNullable.control<number | null>(null);
  attachmentCardLookup = this.fb.nonNullable.control<number | null>(null);
  attachmentId = this.fb.nonNullable.control<number | null>(null);
  uploaderId = this.fb.nonNullable.control<number | null>(this.authStore.snapshot()?.userId ?? null);
  page = this.fb.nonNullable.control(0);
  size = this.fb.nonNullable.control(10);
  sortBy = this.fb.nonNullable.control('createdAt');
  direction = this.fb.nonNullable.control<'ASC' | 'DESC'>('DESC');

  edit(item: CommentResponse): void {
    this.form.patchValue({
      commentId: item.commentId,
      cardId: item.cardId,
      authorId: item.authorId,
      parentCommentId: item.parentCommentId,
      content: item.content
    });
    this.cardLookup.setValue(item.cardId);
    this.attachmentCardLookup.setValue(item.cardId);
  }

  saveComment(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const payload = {
      cardId: value.cardId as number,
      authorId: value.authorId as number,
      content: value.content,
      parentCommentId: value.parentCommentId || null
    };

    const request$ = value.commentId ? this.commentService.update({ commentId: value.commentId, content: value.content }) : this.commentService.add(payload);
    request$.subscribe({
      next: (comment) => {
        this.message = value.commentId ? 'Comment updated' : 'Comment added';
        this.comments = [comment, ...this.comments.filter((item) => item.commentId !== comment.commentId)];
      },
      error: (err) => (this.error = readErrorMessage(err))
    });
  }

  loadByCard(): void {
    const cardId = this.cardLookup.value || this.form.controls.cardId.value;
    if (!cardId) {
      this.error = 'Card id is required';
      return;
    }
    this.commentService.getByCard(cardId, this.page.value, this.size.value, this.sortBy.value, this.direction.value).subscribe({ next: (page) => (this.comments = page.content), error: (err) => (this.error = readErrorMessage(err)) });
  }

  loadReplies(): void {
    const commentId = this.replyLookup.value || this.form.controls.commentId.value;
    if (!commentId) {
      this.error = 'Comment id is required';
      return;
    }
    this.commentService.getReplies(commentId, this.page.value, this.size.value, this.sortBy.value, this.direction.value).subscribe({ next: (page) => (this.comments = page.content), error: (err) => (this.error = readErrorMessage(err)) });
  }

  countComments(): void {
    const cardId = this.cardLookup.value || this.form.controls.cardId.value;
    if (!cardId) {
      this.error = 'Card id is required';
      return;
    }
    this.commentService.count(cardId).subscribe({ next: (count) => (this.count = count), error: (err) => (this.error = readErrorMessage(err)) });
  }

  deleteComment(): void {
    const commentId = this.form.controls.commentId.value;
    if (!commentId) {
      this.error = 'Comment id is required';
      return;
    }
    this.commentService.delete(commentId).subscribe({ next: (message) => (this.message = message), error: (err) => (this.error = readErrorMessage(err)) });
  }

  onFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.selectedFile = target.files?.[0] ?? null;
  }

  loadAttachments(): void {
    const cardId = this.attachmentCardLookup.value || this.cardLookup.value || this.form.controls.cardId.value;
    if (!cardId) {
      this.error = 'Card id is required';
      return;
    }
    this.attachmentService.getByCard(cardId).subscribe({ next: (items) => (this.attachments = items), error: (err) => (this.error = readErrorMessage(err)) });
  }

  uploadAttachment(): void {
    const cardId = this.attachmentCardLookup.value || this.cardLookup.value || this.form.controls.cardId.value;
    const uploaderId = this.uploaderId.value;

    if (!cardId || !uploaderId || !this.selectedFile) {
      this.error = 'Card id, uploader id, and file are required';
      return;
    }

    this.attachmentService.upload(this.selectedFile, cardId, uploaderId).subscribe({
      next: (attachment) => {
        this.message = 'Attachment uploaded';
        this.attachments = [attachment, ...this.attachments.filter((item) => item.attachmentId !== attachment.attachmentId)];
      },
      error: (err) => (this.error = readErrorMessage(err))
    });
  }

  selectAttachment(item: AttachmentResponse): void {
    this.attachmentId.setValue(item.attachmentId);
  }

  deleteAttachment(): void {
    const attachmentId = this.attachmentId.value;
    if (!attachmentId) {
      this.error = 'Attachment id is required';
      return;
    }

    this.attachmentService.delete(attachmentId).subscribe({
      next: (message) => {
        this.message = message;
        this.attachments = this.attachments.filter((item) => item.attachmentId !== attachmentId);
      },
      error: (err) => (this.error = readErrorMessage(err))
    });
  }
}