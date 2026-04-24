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
import { isAdminRole } from '../../core/utils/admin.utils';
import { readErrorMessage } from '../../core/utils/error.utils';

@Component({
  selector: 'app-card-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './card-detail.component.html',
  styleUrl: './card-detail.component.css'
})
export class CardDetailComponent implements OnChanges {
  private readonly attachmentService = inject(AttachmentService);
  private readonly commentService = inject(CommentService);
  private readonly notify = inject(NotificationService);
  private readonly userService = inject(UserService);
  private readonly fb = inject(FormBuilder);

  // Inputs: data passed in from the parent component (cards.component)
  @Input({ required: true }) card!: CardResponse;
  @Input() session: AuthSession | null = null;
  @Input() assigneeName: string | null = null;

  // Outputs: events emitted back to the parent
  @Output() closed = new EventEmitter<void>();
  @Output() requestEdit = new EventEmitter<CardResponse>();
  @Output() requestDelete = new EventEmitter<CardResponse>();

  attachments: AttachmentResponse[] = [];
  comments: CommentResponse[] = [];
  selectedFile: File | null = null;
  loadingAttachments = false;
  loadingComments = false;
  uploadingAttachment = false;
  postingComment = false;
  attachmentError = '';
  commentError = '';
  authorMap: Record<number, UserDto> = {};  // key: userId → user profile (for comment author names)

  editingCommentId: number | null = null;
  editContent = '';

  commentForm = this.fb.nonNullable.group({
    content: ['', [Validators.required, Validators.minLength(1)]]
  });

  // ngOnChanges runs whenever an @Input changes (e.g., when a different card is selected)
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['card'] && this.card?.cardId) {
      this.selectedFile = null;
      this.commentForm.reset({ content: '' });
      this.cancelEditComment();
      this.loadAttachments();
      this.loadComments();
    }
  }

  close(): void { this.closed.emit(); }

  deleteCard(): void {
    const confirmed = confirm('Are you sure you want to delete this card?');
    if (!confirmed) return;
    this.requestDelete.emit(this.card);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] ?? null;
  }

  uploadAttachment(): void {
    this.attachmentError = '';
    if (!this.selectedFile) return;

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
      error: (err) => this.notify.error(readErrorMessage(err) || 'Failed to delete attachment')
    });
  }

  canDeleteAttachment(item: AttachmentResponse): boolean {
    if (!this.session) return false;
    return isAdminRole(this.session.role) || this.session.userId === item.uploaderId;
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
      error: (err) => this.notify.error(readErrorMessage(err) || 'Failed to delete comment')
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
    if (!content) { this.notify.error('Comment content cannot be empty.'); return; }

    this.commentService.update({ commentId: item.commentId, content }).subscribe({
      next: (updated) => {
        this.comments = this.comments.map((entry) => entry.commentId === updated.commentId ? updated : entry);
        this.sortComments();
        this.cancelEditComment();
        this.notify.success('Comment updated');
      },
      error: (err) => this.notify.error(readErrorMessage(err) || 'Failed to update comment')
    });
  }

  canManageComment(item: CommentResponse): boolean {
    if (!this.session) return false;
    return isAdminRole(this.session.role) || this.session.userId === item.authorId;
  }

  commentAuthor(authorId: number): string {
    return this.authorMap[authorId]?.fullName || `User ${authorId}`;
  }

  formatDate(value: string | null): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
  }

  private loadAttachments(): void {
    this.attachmentError = '';
    this.loadingAttachments = true;
    this.attachmentService.getByCard(this.card.cardId).subscribe({
      next: (items) => { this.attachments = items; this.sortAttachments(); this.loadingAttachments = false; },
      error: (err) => { this.attachmentError = readErrorMessage(err); this.loadingAttachments = false; }
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
      error: (err) => { this.commentError = readErrorMessage(err); this.loadingComments = false; }
    });
  }

  private sortAttachments(): void {
    this.attachments = [...this.attachments].sort((left, right) =>
      new Date(right.uploadedAt).getTime() - new Date(left.uploadedAt).getTime()
    );
  }

  private sortComments(): void {
    this.comments = [...this.comments].sort((left, right) =>
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
    );
  }

  // Fetches user profiles for comment authors we haven't loaded yet
  private resolveAuthors(): void {
    const authorIds = Array.from(new Set(this.comments.map((item) => item.authorId)));
    const missingIds = authorIds.filter((id) => !this.authorMap[id]);
    if (!missingIds.length) return;

    this.userService.getBulk(missingIds).subscribe({
      next: (users) => {
        const nextMap = { ...this.authorMap };
        for (const user of users) nextMap[user.userId] = user;
        this.authorMap = nextMap;
      },
      error: () => { /* Keep fallback "User X" labels if lookup fails */ }
    });
  }
}
