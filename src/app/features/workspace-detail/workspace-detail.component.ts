import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, NavigationCancel, NavigationError, Router, RouterLink } from '@angular/router';
import { catchError, combineLatest, finalize, map, of } from 'rxjs';
import { AuthSession, UserDto } from '../../core/models/auth.models';
import { ApiPage } from '../../core/models/api-page.model';
import { BoardRequest, BoardResponse } from '../../core/models/board.models';
import { Visibility, WorkspaceMemberResponse, WorkspaceRequest, WorkspaceResponse } from '../../core/models/workspace.models';
import { AuthStoreService } from '../../core/services/auth-store.service';
import { BoardService } from '../../core/services/board.service';
import { NotificationService } from '../../core/services/notification.service';
import { UserService } from '../../core/services/user.service';
import { WorkspaceService } from '../../core/services/workspace.service';
import { readErrorMessage } from '../../core/utils/error.utils';

// Stores the member count for each board card
interface BoardCardMeta {
  memberCount: number | null;
}

@Component({
  selector: 'app-workspace-detail-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './workspace-detail.component.html',
  styleUrl: './workspace-detail.component.css'
})
export class WorkspaceDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly authStore = inject(AuthStoreService);
  private readonly workspaceService = inject(WorkspaceService);
  private readonly boardService = inject(BoardService);
  private readonly userService = inject(UserService);
  private readonly notify = inject(NotificationService);
  // destroyRef automatically unsubscribes observables when the component is destroyed
  private readonly destroyRef = inject(DestroyRef);

  // Default values for the create board form (used when resetting)
  readonly defaultBoardForm = {
    name: '',
    description: '',
    visibility: 'PUBLIC' as Visibility,
    background: '#d9eaff'
  };

  boardForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    description: ['', [Validators.required]],
    visibility: ['PUBLIC' as Visibility, [Validators.required]],
    background: ['#d9eaff']
  });

  memberForm = this.fb.nonNullable.group({
    userId: [null as number | null, [Validators.required, Validators.min(1)]]
  });

  workspaceForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    description: ['', [Validators.required, Validators.minLength(2)]],
    visibility: ['PUBLIC' as Visibility, [Validators.required]],
    logoUrl: ['', [Validators.required, Validators.minLength(2)]]
  });

  workspaceId = 0;
  workspace: WorkspaceResponse | null = null;
  session: AuthSession | null = null;
  boards: BoardResponse[] = [];
  workspaceMembers: WorkspaceMemberResponse[] = [];
  memberDirectory: Record<number, UserDto> = {};  // key: userId → user profile
  boardMeta: Record<number, BoardCardMeta> = {};   // key: boardId → member count
  memberCount = 0;

  showUpdateModal = false;
  showBoardModal = false;
  showMembersPanel = false;
  openingBoardId: number | null = null;
  loading = false;
  addingMember = false;
  loadingMembers = false;
  removingMemberUserId: number | null = null;
  error = '';

  // Prevents showing "Workspace loaded" toast more than once per visit
  private workspaceLoadedToastShown = false;

  // Only workspace owners and admins can manage the workspace
  get canManageWorkspace(): boolean {
    if (!this.workspace || !this.session) return false;
    return this.workspace.ownerId === this.session.userId || this.session.role === 'ADMIN';
  }

  ngOnInit(): void {
    this.workspaceId = Number(this.route.snapshot.paramMap.get('id') ?? 0);
    this.session = this.authStore.restore();

    // Clear the "opening" state if navigation was cancelled (e.g., guard denied access)
    this.router.events.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
      if (event instanceof NavigationCancel || event instanceof NavigationError) {
        this.openingBoardId = null;
      }
    });

    // Subscribe to the shared boards list; filter to only this workspace's boards
    this.boardService.getBoards()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((items) => {
        this.boards = items.filter((item) => item.workspaceId === this.workspaceId);
      });

    if (!this.workspaceId) {
      this.error = 'Invalid workspace id';
      return;
    }

    this.loadWorkspace();
    this.loadWorkspaceMembers();
    this.loadBoards();
  }

  openUpdateModal(): void {
    if (!this.canManageWorkspace) { this.notifyPermissionDenied(); return; }
    if (!this.workspace) return;

    // Pre-fill the form with current workspace values
    this.workspaceForm.reset({
      name: this.workspace.name,
      description: this.workspace.description,
      visibility: this.workspace.visibility,
      logoUrl: this.workspace.logoUrl || ''
    });
    this.showUpdateModal = true;
  }

  closeUpdateModal(): void { this.showUpdateModal = false; }

  updateWorkspace(): void {
    if (!this.canManageWorkspace) { this.notifyPermissionDenied(); return; }
    if (this.workspaceForm.invalid) { this.workspaceForm.markAllAsTouched(); return; }

    this.loading = true;
    const payload = this.workspaceForm.getRawValue() as WorkspaceRequest;

    this.workspaceService.updateWorkspace(this.workspaceId, payload)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (workspace) => {
          this.workspace = workspace;
          this.notify.success('Workspace updated successfully');
          this.showUpdateModal = false;
        },
        error: (err) => {
          const message = readErrorMessage(err);
          this.error = message;
          this.notify.error(message);
        }
      });
  }

  deleteWorkspace(): void {
    if (!this.canManageWorkspace) { this.notifyPermissionDenied(); return; }

    const confirmed = window.confirm('Are you sure you want to delete this workspace?');
    if (!confirmed) return;

    this.workspaceService.deleteWorkspace(this.workspaceId).subscribe({
      next: () => {
        this.notify.success('Workspace deleted');
        this.router.navigate(['/workspaces']);
      },
      error: (err) => {
        const message = readErrorMessage(err);
        this.error = message;
        this.notify.error(message);
      }
    });
  }

  openBoardModal(): void {
    if (!this.canManageWorkspace) { this.notifyPermissionDenied(); return; }
    this.error = '';
    this.showBoardModal = true;
  }

  closeBoardModal(): void { this.showBoardModal = false; }

  // Called when user clicks a board card - marks it as "opening" to show a loading state
  markBoardOpening(boardId: number): void {
    if (this.openingBoardId !== null) return;
    this.openingBoardId = boardId;
  }

  openMembersPanel(): void {
    this.showMembersPanel = true;
    this.loadWorkspaceMembers();
  }

  closeMembersPanel(): void { this.showMembersPanel = false; }

  createBoard(): void {
    if (!this.canManageWorkspace) { this.notifyPermissionDenied(); return; }
    if (this.boardForm.invalid) { this.boardForm.markAllAsTouched(); return; }

    this.loading = true;
    this.error = '';

    const value = this.boardForm.getRawValue();
    const payload: BoardRequest = {
      workspaceId: this.workspaceId,
      name: value.name,
      description: value.description,
      background: value.background,
      visibility: value.visibility
    };

    this.boardService.create(payload)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (board) => {
          this.notify.success('Board created');
          this.boardForm.reset(this.defaultBoardForm);
          this.showBoardModal = false;
          this.resolveBoardMeta(board);
        },
        error: (err) => {
          const message = readErrorMessage(err);
          this.error = message;
          this.notify.error(message);
        }
      });
  }

  addMember(): void {
    if (!this.canManageWorkspace) { this.notifyPermissionDenied(); return; }
    if (this.memberForm.invalid) { this.memberForm.markAllAsTouched(); return; }

    const userId = this.memberForm.getRawValue().userId;
    if (!userId) return;

    this.addingMember = true;
    this.workspaceService.addMember({ workspaceId: this.workspaceId, userId })
      .pipe(finalize(() => (this.addingMember = false)))
      .subscribe({
        next: () => {
          this.notify.success('Member added');
          this.memberForm.reset({ userId: null });
          this.loadWorkspaceMembers();
        },
        error: (err) => {
          const message = readErrorMessage(err);
          this.error = message;
          this.notify.error(message);
        }
      });
  }

  // Returns board metadata (member count) or a default object if not loaded yet
  metaFor(boardId: number): BoardCardMeta {
    return this.boardMeta[boardId] ?? { memberCount: null };
  }

  // trackBy improves *ngFor performance
  trackByMemberId(_: number, member: WorkspaceMemberResponse): number {
    return member.memberId;
  }

  memberDisplayName(member: WorkspaceMemberResponse): string {
    const profile = this.memberDirectory[member.userId];
    const display = profile?.fullName?.trim();
    if (display) return display;
    if (member.userId === this.session?.userId) return 'You';
    return `User #${member.userId}`;
  }

  memberEmail(member: WorkspaceMemberResponse): string {
    const profile = this.memberDirectory[member.userId];
    if (profile?.email) return profile.email;
    if (member.userId === this.session?.userId) return this.session?.email || '';
    return '';
  }

  memberRole(member: WorkspaceMemberResponse): 'Owner' | 'Member' {
    return this.isOwnerMember(member) ? 'Owner' : 'Member';
  }

  isOwnerMember(member: WorkspaceMemberResponse): boolean {
    return member.userId === this.workspace?.ownerId;
  }

  canRemoveMember(member: WorkspaceMemberResponse): boolean {
    if (!this.canManageWorkspace) return false;
    return !this.isOwnerMember(member);  // can't remove the owner
  }

  removeMember(member: WorkspaceMemberResponse): void {
    if (!this.canRemoveMember(member)) { this.notifyPermissionDenied(); return; }

    this.removingMemberUserId = member.userId;
    this.workspaceService.removeMember(this.workspaceId, member.userId)
      .pipe(finalize(() => (this.removingMemberUserId = null)))
      .subscribe({
        next: () => {
          this.notify.success('Member removed successfully');
          this.loadWorkspaceMembers();
        },
        error: (err) => {
          if (this.isNoAccessError(err)) { this.notifyPermissionDenied(); return; }
          const message = readErrorMessage(err);
          this.error = message;
          this.notify.error(message);
        }
      });
  }

  asCount(value: number | null): string {
    return value === null ? 'N/A' : String(value);
  }

  // Returns a gradient background for a board card
  boardBackground(board: BoardResponse): string {
    const fallback = [
      'linear-gradient(135deg, #f2f8ff, #deecff)',
      'linear-gradient(135deg, #eff6ff, #dcecff)',
      'linear-gradient(135deg, #f5f9ff, #e2efff)',
      'linear-gradient(135deg, #edf5ff, #d6e8ff)'
    ];
    if (board.background && board.background.trim()) {
      return `linear-gradient(145deg, ${board.background}, #f4f9ff)`;
    }
    return fallback[Math.abs(board.boardId) % fallback.length] as string;
  }

  private loadWorkspace(): void {
    this.workspaceService.getWorkspaceById(this.workspaceId).subscribe({
      next: (workspace) => {
        this.workspace = workspace;
        if (!this.workspaceLoadedToastShown) {
          this.notify.success('Workspace loaded');
          this.workspaceLoadedToastShown = true;
        }
      },
      error: (err) => {
        if (this.isNoAccessError(err)) { this.error = 'Unable to load workspace details.'; return; }
        const message = readErrorMessage(err) || 'Failed to load workspace';
        this.error = message;
        this.notify.error('Failed to load workspace');
      }
    });
  }

  private loadWorkspaceMembers(): void {
    this.loadingMembers = true;
    this.workspaceService.getMembers(this.workspaceId, 0, 100, 'memberId', 'asc')
      .pipe(finalize(() => (this.loadingMembers = false)))
      .subscribe({
        next: (page) => {
          this.workspaceMembers = page.content;
          this.memberCount = page.totalNumberOfElements || page.content.length;
          this.workspaceService.setWorkspaceMembers(page.content);
          this.loadMemberDirectory(page.content);
        },
        error: (err) => {
          this.workspaceMembers = [];
          this.memberCount = 0;
          if (this.isNoAccessError(err)) return;
          const message = readErrorMessage(err);
          this.error = message;
          this.notify.error(message);
        }
      });
  }

  // Fetches full user profiles for all workspace members (for display names/emails)
  private loadMemberDirectory(members: WorkspaceMemberResponse[]): void {
    const uniqueIds = Array.from(new Set(members.map((member) => member.userId)));
    if (!uniqueIds.length) { this.memberDirectory = {}; return; }

    this.userService.getBulk(uniqueIds).subscribe({
      next: (users) => {
        this.memberDirectory = users.reduce<Record<number, UserDto>>((acc, user) => {
          acc[user.userId] = user;
          return acc;
        }, {});
      },
      error: () => { this.memberDirectory = {}; }
    });
  }

  private isNoAccessError(error: unknown): boolean {
    if (!(error instanceof HttpErrorResponse)) return false;
    return error.status === 401 || error.status === 403;
  }

  private notifyPermissionDenied(): void {
    this.notify.error('You do not have permission for this action');
  }

  private loadBoards(): void {
    const memberPublic$ = this.boardService.getPublicBoardsForLoggedUser(this.workspaceId, 0, 100).pipe(catchError(() => of(this.emptyPage<BoardResponse>())));
    const private$ = this.boardService.getPrivateBoards(this.workspaceId, 0, 100).pipe(catchError(() => of(this.emptyPage<BoardResponse>())));

    combineLatest([memberPublic$, private$]).subscribe({
      next: ([memberPublic, privateBoards]) => {
        const merged = [...memberPublic.content, ...privateBoards.content];
        if (merged.length) { this.setBoards(merged); return; }

        // Fallback: load public boards if no member/private boards found
        this.boardService.getPublicBoards(this.workspaceId, 0, 100).subscribe({
          next: (page) => this.setBoards(page.content),
          error: (err) => { const message = readErrorMessage(err); this.error = message; this.notify.error(message); }
        });
      },
      error: (err) => { const message = readErrorMessage(err); this.error = message; this.notify.error(message); }
    });
  }

  private setBoards(items: BoardResponse[]): void {
    // Deduplicate boards and sort newest first
    const unique = new Map<number, BoardResponse>();
    for (const board of items) unique.set(board.boardId, board);
    const boards = Array.from(unique.values()).sort((left, right) => right.boardId - left.boardId);
    this.boardService.setBoards(boards);
    for (const board of boards) this.resolveBoardMeta(board);
  }

  private resolveBoardMeta(board: BoardResponse): void {
    this.boardService.getMembers(board.boardId, 0, 100).pipe(
      map((page) => page.totalNumberOfElements || page.content.length),
      catchError(() => of(null))
    ).subscribe((memberCount) => {
      this.boardMeta = { ...this.boardMeta, [board.boardId]: { memberCount } };
    });
  }

  private emptyPage<T>(): ApiPage<T> {
    return { pageSize: 0, pageNumber: 0, numberOfElements: 0, totalPages: 0, totalNumberOfElements: 0, content: [], last: true, first: true };
  }
}
