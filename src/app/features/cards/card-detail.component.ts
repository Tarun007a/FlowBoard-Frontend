import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AttachmentResponse, CommentResponse } from '../../core/models/comment.models';
import { AuthSession, UserDto } from '../../core/models/auth.models';
import { CardResponse } from '../../core/models/card.models';
import { AttachmentService } from '../../core/services/attachment.service';
import { CommentService } from '../../core/services/comment.service';
import { NotificationService } from '../../core/services/notification.service';
import { UserService } from '../../core/services/user.service';
import { readErrorMessage } from '../../core/utils/error.utils';

@Component({
  selector: 'app-card-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="detail-overlay" (click)="close()">
      <aside class="detail-drawer panel" (click)="$event.stopPropagation()">
        <header class="detail-head">
          <div>
            <div class="badge">Card Detail</div>
            <h2>{{ card.title }}</h2>
          </div>
          <div class="actions">
            <button class="button secondary" type="button" (click)="requestEdit.emit(card)">Edit</button>
            <button class="button secondary" type="button" (click)="close()">Close</button>
          </div>
        </header>

        <section class="detail-section stack">
          <h3 class="section-title">Card Information</h3>
          <div class="info-grid">
            <article class="info-item">
              <span class="info-label">Title</span>
              <strong>{{ card.title }}</strong>
            </article>
            <article class="info-item">
              <span class="info-label">Description</span>
              <strong>{{ card.description || '-' }}</strong>
            </article>
            <article class="info-item">
              <span class="info-label">Status</span>
              <strong>{{ card.status || '-' }}</strong>
            </article>
            <article class="info-item">
              <span class="info-label">Assignee</span>
              <strong>{{ assigneeName || (card.assigneeId ? ('User ' + card.assigneeId) : '-') }}</strong>
            </article>
            <article class="info-item">
              <span class="info-label">Due Date</span>
              <strong>{{ formatDate(card.dueDate) }}</strong>
            </article>
          </div>
        </section>

        <section class="detail-section stack">
          <div class="section-row">
            <h3 class="section-title">Attachments</h3>
            <div class="actions">
              <button class="button secondary" type="button" (click)="fileInput.click()">Upload Attachment</button>
              <input #fileInput type="file" hidden (change)="onFileSelected($event)" />
              <button class="button accent" type="button" [disabled]="!selectedFile || uploadingAttachment" (click)="uploadAttachment()">
                {{ uploadingAttachment ? 'Uploading...' : 'Save Upload' }}
              </button>
            </div>
          </div>

          <p class="muted" *ngIf="selectedFile">Selected: {{ selectedFile.name }}</p>
          <p class="error" *ngIf="attachmentError">{{ attachmentError }}</p>

          <div class="empty-state" *ngIf="!attachments.length && !loadingAttachments">
            <p class="muted">No attachments yet.</p>
          </div>

          <div class="attachment-list" *ngIf="attachments.length">
            <article class="attachment-item" *ngFor="let item of attachments">
              <div>
                <strong>{{ item.fileName }}</strong>
                <p class="muted">Uploaded {{ formatDate(item.uploadedAt) }}</p>
              </div>
              <div class="actions">
                <a class="button secondary" [href]="item.fileUrl" target="_blank" rel="noreferrer">View</a>
                <button class="button danger" type="button" *ngIf="canDeleteAttachment(item)" (click)="deleteAttachment(item)">Delete</button>
              </div>
            </article>
          </div>
        </section>

        <section class="detail-section stack">
          <h3 class="section-title">Comments</h3>

          <form class="stack" [formGroup]="commentForm" (ngSubmit)="addComment()">
            <div class="field">
              <label for="commentBox">Write a comment...</label>
              <textarea id="commentBox" formControlName="content" placeholder="Add details, updates, or blockers"></textarea>
            </div>

            <div class="actions">
              <button class="button accent" type="submit" [disabled]="commentForm.invalid || postingComment">
                {{ postingComment ? 'Posting...' : 'Post Comment' }}
              </button>
              <button class="button secondary" type="button" (click)="commentForm.reset({ content: '' })">Cancel</button>
            </div>
          </form>

          <p class="error" *ngIf="commentError">{{ commentError }}</p>

          <div class="empty-state" *ngIf="!comments.length && !loadingComments">
            <p class="muted">No comments yet.</p>
          </div>

          <div class="comment-list" *ngIf="comments.length">
            <article class="comment-item" *ngFor="let item of comments">
              <header class="comment-head">
                <strong>{{ commentAuthor(item.authorId) }}</strong>
                <time>{{ formatDate(item.createdAt) }}</time>
              </header>

              <div *ngIf="editingCommentId !== item.commentId; else editBox">
                <p>{{ item.content }}</p>
                <div class="actions" *ngIf="canManageComment(item)">
                  <button class="button secondary" type="button" (click)="startEditComment(item)">Edit</button>
                  <button class="button danger" type="button" (click)="deleteComment(item)">Delete</button>
                </div>
              </div>

              <ng-template #editBox>
                <div class="field">
                  <textarea [value]="editContent" (input)="onEditContentChange($event)"></textarea>
                </div>
                <div class="actions">
                  <button class="button accent" type="button" (click)="saveEditComment(item)">Save</button>
                  <button class="button secondary" type="button" (click)="cancelEditComment()">Cancel</button>
                </div>
              </ng-template>
            </article>
          </div>
        </section>
      </aside>
    </div>
  `,
  styles: [
    `
      .detail-overlay {
        position: fixed;
        inset: 0;
        z-index: 90;
        background: rgba(15, 23, 42, 0.26);
        display: flex;
        justify-content: flex-end;
      }

      .detail-drawer {
        width: min(740px, 100%);
        height: 100%;
        overflow-y: auto;
        border-radius: 0;
        border-left: 1px solid #d0e1f4;
        padding: 16px;
        display: grid;
        align-content: flex-start;
        gap: 14px;
        background: #f9fcff;
      }

      .detail-head {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 10px;
      }

      .detail-head h2 {
        margin: 10px 0 0;
      }

      .detail-section {
        border: 1px solid #d6e4f5;
        border-radius: 12px;
        background: #ffffff;
        padding: 12px;
      }

      .section-row {
        display: flex;
        justify-content: space-between;
        gap: 8px;
        align-items: center;
        flex-wrap: wrap;
      }

      .info-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
      }

      .info-item {
        border: 1px solid #e1ebf8;
        border-radius: 10px;
        background: #f8fbff;
        padding: 10px;
        display: grid;
        gap: 4px;
      }

      .info-label {
        font-size: 0.74rem;
        color: #5d748f;
        text-transform: uppercase;
        font-weight: 700;
      }

      .attachment-list,
      .comment-list {
        display: grid;
        gap: 8px;
      }

      .attachment-item,
      .comment-item {
        border: 1px solid #e1ebf8;
        border-radius: 10px;
        background: #fbfdff;
        padding: 10px;
        display: grid;
        gap: 6px;
      }

      .attachment-item {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        align-items: center;
      }

      .attachment-item p,
      .comment-item p {
        margin: 0;
      }

      .comment-head {
        display: flex;
        justify-content: space-between;
        gap: 8px;
      }

      .comment-head time {
        color: #6f84a0;
        font-size: 0.76rem;
      }

      @media (max-width: 760px) {
        .info-grid {
          grid-template-columns: 1fr;
        }
      }
    `
  ]
})
export class CardDetailComponent implements OnChanges {
  private readonly attachmentService = inject(AttachmentService);
  private readonly commentService = inject(CommentService);
  private readonly notify = inject(NotificationService);
  private readonly userService = inject(UserService);
  private readonly fb = inject(FormBuilder);

  @Input({ required: true }) card!: CardResponse;
  @Input() session: AuthSession | null = null;
  @Input() assigneeName: string | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() requestEdit = new EventEmitter<CardResponse>();

  attachments: AttachmentResponse[] = [];
  comments: CommentResponse[] = [];
  selectedFile: File | null = null;
  loadingAttachments = false;
  loadingComments = false;
  uploadingAttachment = false;
  postingComment = false;
  attachmentError = '';
  commentError = '';
  authorMap: Record<number, UserDto> = {};

  editingCommentId: number | null = null;
  editContent = '';

  commentForm = this.fb.nonNullable.group({
    content: ['', [Validators.required, Validators.minLength(1)]]
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['card'] && this.card?.cardId) {
      this.selectedFile = null;
      this.commentForm.reset({ content: '' });
      this.cancelEditComment();
      this.loadAttachments();
      this.loadComments();
    }
  }

  close(): void {
    this.closed.emit();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] ?? null;
  }

  uploadAttachment(): void {
    this.attachmentError = '';

    if (!this.selectedFile) {
      return;
    }

    if (!this.session?.userId) {
      this.attachmentError = 'Unable to identify logged-in user.';
      this.notify.error(this.attachmentError);
      return;
    }

    this.uploadingAttachment = true;
    this.attachmentService.upload(this.selectedFile, this.card.cardId, this.session.userId).subscribe({
      next: (attachment) => {
        this.attachments = [attachment, ...this.attachments.filter((item) => item.attachmentId !== attachment.attachmentId)];
        this.sortAttachments();
        this.selectedFile = null;
        this.uploadingAttachment = false;
        this.notify.success('Attachment uploaded successfully');
      },
      error: (err) => {
        const message = readErrorMessage(err);
        this.attachmentError = message;
        this.uploadingAttachment = false;
        this.notify.error(message || 'Failed to upload attachment');
      }
    });
  }

  deleteAttachment(item: AttachmentResponse): void {
    this.attachmentService.delete(item.attachmentId).subscribe({
      next: () => {
        this.attachments = this.attachments.filter((entry) => entry.attachmentId !== item.attachmentId);
        this.notify.success('Attachment deleted');
      },
      error: (err) => {
        const message = readErrorMessage(err);
        this.notify.error(message || 'Failed to delete attachment');
      }
    });
  }

  canDeleteAttachment(item: AttachmentResponse): boolean {
    if (!this.session) {
      return false;
    }

    return this.session.role === 'ADMIN' || this.session.userId === item.uploaderId;
  }

  addComment(): void {
    this.commentError = '';

    if (this.commentForm.invalid) {
      this.commentForm.markAllAsTouched();
      this.notify.error('Please enter a valid comment.');
      return;
    }

    if (!this.session?.userId) {
      this.commentError = 'Unable to identify logged-in user.';
      this.notify.error(this.commentError);
      return;
    }

    const content = this.commentForm.getRawValue().content.trim();
    this.postingComment = true;
    this.commentService.add({
      cardId: this.card.cardId,
      authorId: this.session.userId,
      content,
      parentCommentId: null
    }).subscribe({
      next: (comment) => {
        this.comments = [...this.comments, comment];
        this.sortComments();
        this.commentForm.reset({ content: '' });
        this.postingComment = false;
        this.resolveAuthors();
        this.notify.success('Comment added');
      },
      error: (err) => {
        const message = readErrorMessage(err);
        this.commentError = message;
        this.postingComment = false;
        this.notify.error(message || 'Failed to add comment');
      }
    });
  }

  deleteComment(item: CommentResponse): void {
    this.commentService.delete(item.commentId).subscribe({
      next: () => {
        this.comments = this.comments.filter((entry) => entry.commentId !== item.commentId);
        this.notify.success('Comment deleted');
      },
      error: (err) => {
        const message = readErrorMessage(err);
        this.notify.error(message || 'Failed to delete comment');
      }
    });
  }

  startEditComment(item: CommentResponse): void {
    this.editingCommentId = item.commentId;
    this.editContent = item.content;
  }

  onEditContentChange(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    this.editContent = target.value;
  }

  cancelEditComment(): void {
    this.editingCommentId = null;
    this.editContent = '';
  }

  saveEditComment(item: CommentResponse): void {
    const content = this.editContent.trim();
    if (!content) {
      this.notify.error('Comment content cannot be empty.');
      return;
    }

    this.commentService.update({ commentId: item.commentId, content }).subscribe({
      next: (updated) => {
        this.comments = this.comments.map((entry) => (entry.commentId === updated.commentId ? updated : entry));
        this.sortComments();
        this.cancelEditComment();
        this.notify.success('Comment updated');
      },
      error: (err) => {
        const message = readErrorMessage(err);
        this.notify.error(message || 'Failed to update comment');
      }
    });
  }

  canManageComment(item: CommentResponse): boolean {
    if (!this.session) {
      return false;
    }

    return this.session.role === 'ADMIN' || this.session.userId === item.authorId;
  }

  commentAuthor(authorId: number): string {
    return this.authorMap[authorId]?.fullName || `User ${authorId}`;
  }

  formatDate(value: string | null): string {
    if (!value) {
      return '-';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString();
  }

  private loadAttachments(): void {
    this.attachmentError = '';
    this.loadingAttachments = true;

    this.attachmentService.getByCard(this.card.cardId).subscribe({
      next: (items) => {
        this.attachments = items;
        this.sortAttachments();
        this.loadingAttachments = false;
      },
      error: (err) => {
        this.attachmentError = readErrorMessage(err);
        this.loadingAttachments = false;
      }
    });
  }

  private loadComments(): void {
    this.commentError = '';
    this.loadingComments = true;

    this.commentService.getByCard(this.card.cardId, 0, 100, 'createdAt', 'ASC').subscribe({
      next: (page) => {
        this.comments = page.content;
        this.sortComments();
        this.loadingComments = false;
        this.resolveAuthors();
      },
      error: (err) => {
        this.commentError = readErrorMessage(err);
        this.loadingComments = false;
      }
    });
  }

  private sortAttachments(): void {
    this.attachments = [...this.attachments].sort((left, right) => {
      const leftTime = new Date(left.uploadedAt).getTime();
      const rightTime = new Date(right.uploadedAt).getTime();
      return rightTime - leftTime;
    });
  }

  private sortComments(): void {
    this.comments = [...this.comments].sort((left, right) => {
      const leftTime = new Date(left.createdAt).getTime();
      const rightTime = new Date(right.createdAt).getTime();
      return leftTime - rightTime;
    });
  }

  private resolveAuthors(): void {
    const authorIds = Array.from(new Set(this.comments.map((item) => item.authorId)));
    const missingIds = authorIds.filter((id) => !this.authorMap[id]);

    if (!missingIds.length) {
      return;
    }

    this.userService.getBulk(missingIds).subscribe({
      next: (users) => {
        const nextMap = { ...this.authorMap };
        for (const user of users) {
          nextMap[user.userId] = user;
        }
        this.authorMap = nextMap;
      },
      error: () => {
        // Leave fallback labels if user lookup fails.
      }
    });
  }
}