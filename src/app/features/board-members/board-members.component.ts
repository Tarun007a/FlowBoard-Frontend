import { CommonModule } from '@angular/common';
import { Component, DestroyRef, Input, OnChanges, OnDestroy, OnInit, SimpleChanges, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UserDto } from '../../core/models/auth.models';
import { BoardService } from '../../core/services/board.service';
import { NotificationService } from '../../core/services/notification.service';
import { readErrorMessage } from '../../core/utils/error.utils';
import { AddBoardMemberComponent } from '../add-board-member/add-board-member.component';

@Component({
  selector: 'app-board-members',
  standalone: true,
  imports: [CommonModule, AddBoardMemberComponent],
  templateUrl: './board-members.component.html',
  styleUrl: './board-members.component.css'
})
export class BoardMembersComponent implements OnInit, OnChanges, OnDestroy {
  private readonly boardService = inject(BoardService);
  private readonly notify = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  @Input({ required: true }) boardId!: number;

  members: UserDto[] = [];
  loading = false;
  error = '';
  showAddMemberDialog = false;

  ngOnInit(): void {
    this.boardService
      .getBoardMembers()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((items) => (this.members = items));
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['boardId'] && this.boardId) {
      this.loadMembers();
    }
  }

  ngOnDestroy(): void {}

  loadMembers(): void {
    this.loading = true;
    this.error = '';

    this.boardService.getMembers(this.boardId, 0, 100).subscribe({
      next: () => {
        // Stream updates the view.
      },
      error: (err) => {
        const message = readErrorMessage(err);
        this.error = message;
        this.notify.error(message);
        this.loading = false;
      },
      complete: () => (this.loading = false)
    });
  }

  openAddMemberDialog(): void {
    this.showAddMemberDialog = true;
  }

  closeAddMemberDialog(): void {
    this.showAddMemberDialog = false;
  }

  onMemberAdded(): void {
    this.showAddMemberDialog = false;
    this.loadMembers();
    this.notify.success('Member added to board');
  }

  displayName(member: UserDto): string {
    return member.fullName?.trim() || `User #${member.userId}`;
  }

  initial(member: UserDto): string {
    const name = this.displayName(member);
    return name.charAt(0).toUpperCase();
  }

}
