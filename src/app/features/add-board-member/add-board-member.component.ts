import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { BoardService } from '../../core/services/board.service';
import { NotificationService } from '../../core/services/notification.service';
import { readErrorMessage } from '../../core/utils/error.utils';

@Component({
  selector: 'app-add-board-member',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './add-board-member.component.html',
  styleUrl: './add-board-member.component.css'
})
export class AddBoardMemberComponent {
  private readonly fb = inject(FormBuilder);
  private readonly boardService = inject(BoardService);
  private readonly notify = inject(NotificationService);

  @Input({ required: true }) boardId!: number;
  @Output() cancel = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  submitting = false;
  error = '';

  form = this.fb.nonNullable.group({
    userId: [null as number | null, [Validators.required, Validators.min(1)]]
  });

  close(): void {
    if (this.submitting) {
      return;
    }

    this.cancel.emit();
  }

  submit(): void {
    this.error = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (!this.boardId) {
      this.error = 'Board id is required.';
      return;
    }

    const userId = this.form.getRawValue().userId;
    if (!userId) {
      this.error = 'User id is required.';
      return;
    }

    this.submitting = true;
    this.boardService
      .addMemberToBoard({ boardId: this.boardId, userId })
      .pipe(finalize(() => (this.submitting = false)))
      .subscribe({
        next: () => {
          this.form.reset({ userId: null });
          this.saved.emit();
        },
        error: (err) => {
          const message = readErrorMessage(err);
          this.error = message;
          this.notify.error(message);
        }
      });
  }
}
