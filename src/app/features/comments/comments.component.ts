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
  template: `
    <div class="stack">
      <section class="hero">
        <div class="badge">Comment APIs</div>
        <h1>Comment threads and attachments</h1>
        <p class="muted">Create comments, page through replies, inspect deletion state, and manage file attachments on the same card.</p>
      </section>

      <section class="grid cols-2">
        <div class="panel section-card stack">
          <h2 class="section-title">Add / update comment</h2>
          <form class="stack" [formGroup]="form" (ngSubmit)="saveComment()">
            <div class="grid cols-2">
              <div class="field"><label>Comment ID</label><input type="number" formControlName="commentId" /></div>
              <div class="field"><label>Card ID</label><input type="number" formControlName="cardId" /></div>
              <div class="field"><label>Author ID</label><input type="number" formControlName="authorId" /></div>
              <div class="field"><label>Parent comment ID</label><input type="number" formControlName="parentCommentId" /></div>
              <div class="field"><label>Content</label><textarea formControlName="content"></textarea></div>
            </div>
            <div class="actions">
              <button class="button accent" type="submit">Save</button>
              <button class="button secondary" type="button" (click)="loadByCard()">By card</button>
              <button class="button secondary" type="button" (click)="loadReplies()">Replies</button>
              <button class="button secondary" type="button" (click)="countComments()">Count</button>
              <button class="button secondary" type="button" (click)="loadAttachments()">Attachments</button>
              <button class="button danger" type="button" (click)="deleteComment()">Delete</button>
            </div>
          </form>
        </div>

        <div class="panel section-card stack">
          <h2 class="section-title">Lookup and filters</h2>
          <div class="grid cols-2">
            <div class="field"><label>Card ID</label><input type="number" [formControl]="cardLookup" /></div>
            <div class="field"><label>Reply comment ID</label><input type="number" [formControl]="replyLookup" /></div>
            <div class="field"><label>Page</label><input type="number" [formControl]="page" /></div>
            <div class="field"><label>Size</label><input type="number" [formControl]="size" /></div>
            <div class="field"><label>Sort by</label><input type="text" [formControl]="sortBy" /></div>
            <div class="field"><label>Direction</label><select [formControl]="direction"><option value="ASC">ASC</option><option value="DESC">DESC</option></select></div>
          </div>
        </div>
      </section>

      <section class="grid cols-2">
        <div class="panel section-card stack">
          <h2 class="section-title">Attachment uploader</h2>
          <div class="grid cols-2">
            <div class="field"><label>Card ID</label><input type="number" [formControl]="attachmentCardLookup" /></div>
            <div class="field"><label>Uploader ID</label><input type="number" [formControl]="uploaderId" /></div>
            <div class="field full"><label>File</label><input type="file" (change)="onFileSelected($event)" /></div>
          </div>
          <div class="actions">
            <button class="button accent" type="button" (click)="uploadAttachment()">Upload</button>
            <button class="button secondary" type="button" (click)="loadAttachments()">Refresh</button>
          </div>
        </div>

        <div class="panel section-card stack">
          <h2 class="section-title">Attachment actions</h2>
          <div class="field"><label>Attachment ID</label><input type="number" [formControl]="attachmentId" /></div>
          <div class="actions">
            <button class="button danger" type="button" (click)="deleteAttachment()">Delete attachment</button>
          </div>
        </div>
      </section>

      <section class="panel section-card stack">
        <p class="error" *ngIf="error">{{ error }}</p>
        <p class="success" *ngIf="message">{{ message }}</p>
        <div class="muted" *ngIf="count !== null">Comment count: {{ count }}</div>
        <table class="table" *ngIf="comments.length">
          <thead><tr><th>ID</th><th>Card</th><th>Author</th><th>Parent</th><th>Status</th><th>Created</th><th>Updated</th><th>Content</th></tr></thead>
          <tbody>
            <tr *ngFor="let item of comments" (click)="edit(item)">
              <td>{{ item.commentId }}</td>
              <td>{{ item.cardId }}</td>
              <td>{{ item.authorId }}</td>
              <td>{{ item.parentCommentId || '-' }}</td>
              <td>{{ item.isDeleted ? 'Deleted' : 'Active' }}</td>
              <td>{{ item.createdAt }}</td>
              <td>{{ item.updatedAt }}</td>
              <td>{{ item.content }}</td>
            </tr>
          </tbody>
        </table>

        <table class="table" *ngIf="attachments.length">
          <thead><tr><th>ID</th><th>File</th><th>Type</th><th>Size KB</th><th>Uploaded</th></tr></thead>
          <tbody>
            <tr *ngFor="let item of attachments" (click)="selectAttachment(item)">
              <td>{{ item.attachmentId }}</td>
              <td><a [href]="item.fileUrl" target="_blank" rel="noreferrer">{{ item.fileName }}</a></td>
              <td>{{ item.fileType }}</td>
              <td>{{ item.sizeKb }}</td>
              <td>{{ item.uploadedAt }}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  `,
  styles: [` .section-card { padding: 18px; } `]
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