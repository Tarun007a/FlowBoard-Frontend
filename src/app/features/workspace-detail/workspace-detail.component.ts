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

interface BoardCardMeta {
  memberCount: number | null;
}

@Component({
  selector: 'app-workspace-detail-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="workspace-detail-page">
      <section class="panel workspace-banner" *ngIf="workspace; else loadingWorkspace">
        <div class="workspace-header-main">
          <div class="workspace-chip">Workspace</div>
          <h1>{{ workspace.name }}</h1>
          <p class="muted">{{ workspace.description || 'No description provided.' }}</p>

          <div class="workspace-meta">
            <span class="meta-pill">Visibility: {{ workspace.visibility }}</span>
            <span class="meta-pill">Members: {{ memberCount }}</span>
            <span class="meta-pill owner-badge" *ngIf="workspace.ownerId === session?.userId">★ Owner</span>
            <span class="meta-pill" *ngIf="workspace.ownerId === session?.userId">Role: Owner</span>
            <span class="meta-pill" *ngIf="workspace.ownerId !== session?.userId">Role: Member</span>
          </div>
        </div>

        <div class="banner-actions">
          <button class="button accent" type="button" *ngIf="canManageWorkspace" (click)="openBoardModal()">Create Board</button>
          <button class="button secondary" type="button" (click)="openMembersPanel()">Members</button>
          <a class="button secondary" routerLink="/workspaces">Back</a>
          <button class="button secondary" type="button" *ngIf="canManageWorkspace" (click)="openUpdateModal()">Update Workspace</button>
          <button class="button danger" type="button" *ngIf="canManageWorkspace" (click)="deleteWorkspace()">Delete Workspace</button>
        </div>
      </section>

      <section class="panel section-card boards-section">
        <header class="section-head">
          <h2>Boards</h2>
          <p class="muted">Boards available in this workspace.</p>
        </header>

        <section class="board-grid" *ngIf="boards.length; else emptyBoards">
          <a
            class="board-card"
            *ngFor="let board of boards"
            [routerLink]="['/board', board.boardId]"
            [class.card-loading]="openingBoardId === board.boardId"
            [attr.aria-busy]="openingBoardId === board.boardId"
            [ngStyle]="{ 'background': boardBackground(board) }"
            (click)="markBoardOpening(board.boardId)">
            <header class="board-head">
              <h3>{{ board.name }}</h3>
              <span class="board-pill">{{ board.isClosed ? 'Closed' : 'Open' }}</span>
            </header>

            <p class="board-text">{{ board.description || 'No description provided.' }}</p>

            <footer class="board-footer">
              <div>
                <span class="label">Visibility</span>
                <strong>{{ board.visibility }}</strong>
              </div>
              <div>
                <span class="label">Members</span>
                <strong>{{ asCount(metaFor(board.boardId).memberCount) }}</strong>
              </div>
            </footer>
          </a>
        </section>
      </section>

      <ng-template #emptyBoards>
        <section class="panel empty-state-box" *ngIf="workspace">
          <div class="workspace-chip">No Boards</div>
          <h2>No boards yet. Create your first board.</h2>
          <p class="muted">Create a board to start organizing lists and cards.</p>
          <button class="button accent" type="button" *ngIf="canManageWorkspace" (click)="openBoardModal()">Create Board</button>
        </section>
      </ng-template>

      <ng-template #loadingWorkspace>
        <section class="panel empty-state-box">
          <div class="workspace-chip">Loading</div>
          <h2>Fetching workspace</h2>
          <p class="muted">Please wait while workspace details load.</p>
        </section>
      </ng-template>

      <p class="error" *ngIf="error">{{ error }}</p>
    </div>

    <div class="members-overlay" *ngIf="showMembersPanel" (click)="closeMembersPanel()"></div>
    <aside class="panel members-drawer" [class.open]="showMembersPanel" [attr.aria-hidden]="!showMembersPanel">
      <header class="drawer-head">
        <div>
          <div class="workspace-chip">Workspace Members</div>
          <h2>Members ({{ memberCount }})</h2>
          <p class="muted">Manage workspace access without leaving boards.</p>
        </div>
        <button class="button secondary" type="button" (click)="closeMembersPanel()">Close</button>
      </header>

      <form class="stack member-add-form" [formGroup]="memberForm" (ngSubmit)="addMember()" *ngIf="canManageWorkspace">
        <div class="field">
          <label>User ID</label>
          <input type="number" formControlName="userId" placeholder="Enter user id" />
        </div>

        <div class="actions">
          <button class="button accent" type="submit" [disabled]="memberForm.invalid || addingMember">
            {{ addingMember ? 'Adding...' : 'Add Member' }}
          </button>
        </div>
      </form>

      <section class="member-list" *ngIf="workspaceMembers.length; else emptyMembersDrawer">
        <article class="member-row" *ngFor="let member of workspaceMembers; trackBy: trackByMemberId">
          <div class="member-main">
            <strong>{{ memberDisplayName(member) }}</strong>
            <span class="muted">{{ memberEmail(member) || 'Email unavailable' }}</span>
          </div>

          <span class="role-pill" [class.owner]="isOwnerMember(member)">
            {{ memberRole(member) }}
          </span>

          <button
            class="button danger"
            type="button"
            *ngIf="canRemoveMember(member)"
            [disabled]="removingMemberUserId === member.userId"
            (click)="removeMember(member)">
            {{ removingMemberUserId === member.userId ? 'Removing...' : 'Remove' }}
          </button>
        </article>
      </section>

      <ng-template #emptyMembersDrawer>
        <section class="members-empty">
          <p class="muted" *ngIf="loadingMembers">Loading members...</p>
          <p class="muted" *ngIf="!loadingMembers">No members found.</p>
        </section>
      </ng-template>
    </aside>

    <div class="modal-overlay" *ngIf="showUpdateModal" (click)="closeUpdateModal()">
      <section class="panel modal-card" (click)="$event.stopPropagation()">
        <header class="modal-head">
          <div>
            <div class="workspace-chip">Workspace</div>
            <h2>Update workspace</h2>
          </div>
          <button class="button secondary" type="button" (click)="closeUpdateModal()">Close</button>
        </header>

        <form class="stack" [formGroup]="workspaceForm" (ngSubmit)="updateWorkspace()">
          <div class="field">
            <label>Name</label>
            <input type="text" formControlName="name" />
          </div>

          <div class="field">
            <label>Description</label>
            <textarea formControlName="description"></textarea>
          </div>

          <div class="grid cols-2">
            <div class="field">
              <label>Visibility</label>
              <select formControlName="visibility">
                <option value="PUBLIC">PUBLIC</option>
                <option value="PRIVATE">PRIVATE</option>
              </select>
            </div>
            <div class="field">
              <label>Logo URL</label>
              <input type="text" formControlName="logoUrl" />
            </div>
          </div>

          <div class="actions">
            <button class="button accent" type="submit" [disabled]="loading || workspaceForm.invalid">
              {{ loading ? 'Updating...' : 'Update Workspace' }}
            </button>
          </div>
        </form>
      </section>
    </div>

    <div class="modal-overlay" *ngIf="showBoardModal" (click)="closeBoardModal()">
      <section class="panel modal-card" (click)="$event.stopPropagation()">
        <header class="modal-head">
          <div>
            <div class="workspace-chip">Board</div>
            <h2>Create board</h2>
          </div>
          <button class="button secondary" type="button" (click)="closeBoardModal()">Close</button>
        </header>

        <form class="stack" [formGroup]="boardForm" (ngSubmit)="createBoard()">
          <div class="field">
            <label>Board Name</label>
            <input type="text" formControlName="name" placeholder="Product Roadmap" />
          </div>

          <div class="field">
            <label>Description</label>
            <textarea formControlName="description" placeholder="Track planning, design, build, and release work."></textarea>
          </div>

          <div class="grid cols-2">
            <div class="field">
              <label>Visibility</label>
              <select formControlName="visibility">
                <option value="PUBLIC">PUBLIC</option>
                <option value="PRIVATE">PRIVATE</option>
              </select>
            </div>
            <div class="field">
              <label>Background</label>
              <input type="text" formControlName="background" placeholder="#d9eaff" />
            </div>
          </div>

          <div class="actions">
            <button class="button accent" type="submit" [disabled]="loading || boardForm.invalid">
              {{ loading ? 'Creating...' : 'Create Board' }}
            </button>
            <button class="button secondary" type="button" (click)="boardForm.reset(defaultBoardForm)">Reset</button>
          </div>
        </form>
      </section>
    </div>

  `,
  styles: [
    `
      .workspace-detail-page {
        display: grid;
        gap: 1rem;
      }

      .workspace-banner {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 1rem;
        padding: 1rem 1.15rem;
        background: linear-gradient(130deg, #f0f8ff, #e4f1ff);
        color: #1f3b5a;
      }

      .workspace-banner h1 {
        margin: 0.35rem 0;
        font-family: 'Sora', 'Space Grotesk', 'Segoe UI', sans-serif;
      }

      .workspace-banner .muted {
        color: #5a7495;
        margin: 0;
      }

      .workspace-header-main {
        display: grid;
        gap: 0.2rem;
      }

      .workspace-chip {
        width: fit-content;
        padding: 0.28rem 0.62rem;
        border-radius: 999px;
        border: 1px solid #c7ddf7;
        background: #eaf4ff;
        color: #255f99;
        text-transform: uppercase;
        letter-spacing: 0.02em;
        font-size: 0.74rem;
        font-weight: 700;
      }

      .workspace-meta {
        margin-top: 0.6rem;
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
      }

      .meta-pill {
        border: 1px solid #c5daf4;
        background: #edf5ff;
        color: #2f5f91;
        border-radius: 999px;
        padding: 0.28rem 0.58rem;
        font-size: 0.76rem;
        font-weight: 700;
      }

      .owner-badge {
        border-color: #f2d79f;
        background: #fff7e8;
        color: #8a6211;
      }

      .banner-actions {
        display: flex;
        gap: 0.55rem;
        flex-wrap: wrap;
        justify-content: flex-end;
      }

      .section-card {
        padding: 1rem;
      }

      .boards-section {
        min-height: 280px;
      }

      .section-head {
        margin-bottom: 0.8rem;
      }

      .section-head h2 {
        margin: 0;
        color: #26496d;
      }

      .section-head p {
        margin: 0.2rem 0 0;
      }

      .members-head {
        display: flex;
        justify-content: space-between;
        gap: 0.7rem;
      }

      .members-head h2 {
        margin: 0;
      }

      .member-list {
        display: grid;
        gap: 0.55rem;
      }

      .member-row {
        border: 1px solid #d4e5f7;
        border-radius: 12px;
        background: #f5faff;
        padding: 0.62rem 0.72rem;
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto auto;
        align-items: center;
        gap: 0.65rem;
      }

      .member-main {
        display: grid;
        gap: 0.12rem;
      }

      .member-main strong,
      .member-main .muted {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .role-pill {
        border-radius: 999px;
        border: 1px solid #bbd5f2;
        background: #eaf4ff;
        color: #2b5d8f;
        font-size: 0.72rem;
        font-weight: 700;
        padding: 0.26rem 0.54rem;
      }

      .role-pill.owner {
        border-color: #f0d69f;
        background: #fff6e3;
        color: #8a6314;
      }

      .members-empty {
        border: 1px dashed #c6dbf3;
        border-radius: 12px;
        background: #f6fbff;
        padding: 0.78rem;
      }

      .members-overlay {
        position: fixed;
        inset: 0;
        z-index: 79;
        background: rgba(15, 23, 42, 0.24);
      }

      .members-drawer {
        position: fixed;
        top: 0;
        right: 0;
        z-index: 80;
        width: min(460px, 100%);
        height: 100dvh;
        border-radius: 18px 0 0 18px;
        border-right: 0;
        padding: 1rem;
        overflow-y: auto;
        transform: translateX(105%);
        transition: transform 180ms ease;
      }

      .members-drawer.open {
        transform: translateX(0);
      }

      .drawer-head {
        display: flex;
        justify-content: space-between;
        gap: 0.8rem;
        margin-bottom: 0.75rem;
      }

      .drawer-head h2 {
        margin: 0.42rem 0 0;
        color: #26496d;
      }

      .member-add-form {
        border: 1px solid #d6e5f7;
        border-radius: 12px;
        background: #f6fbff;
        padding: 0.75rem;
        margin-bottom: 0.8rem;
      }

      .board-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 0.9rem;
      }

      .board-card {
        display: grid;
        gap: 0.72rem;
        min-height: 200px;
        border-radius: 16px;
        padding: 1rem;
        color: #20364f;
        border: 1px solid #d0e2f6;
        box-shadow: 0 12px 24px rgba(30, 74, 135, 0.16);
        transition: transform 130ms ease, box-shadow 130ms ease;
      }

      .board-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 16px 30px rgba(30, 74, 135, 0.2);
      }

      .board-card.card-loading {
        opacity: 0.76;
        pointer-events: none;
      }

      .board-head {
        display: flex;
        justify-content: space-between;
        gap: 0.6rem;
      }

      .board-head h3 {
        margin: 0;
        font-size: 1.1rem;
      }

      .board-pill {
        border-radius: 999px;
        border: 1px solid #bad4f2;
        background: #eaf4ff;
        color: #2f5d8d;
        font-size: 0.72rem;
        font-weight: 700;
        height: fit-content;
        padding: 0.3rem 0.58rem;
      }

      .board-text {
        margin: 0;
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
        color: #547090;
      }

      .board-footer {
        margin-top: auto;
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0.5rem;
      }

      .board-footer div {
        border-radius: 12px;
        border: 1px solid #d3e4f7;
        background: rgba(255, 255, 255, 0.8);
        padding: 0.5rem 0.55rem;
      }

      .label {
        display: block;
        font-size: 0.72rem;
        opacity: 0.82;
        margin-bottom: 0.12rem;
      }

      .empty-state-box {
        padding: 1rem 1.15rem;
        display: grid;
        gap: 0.7rem;
        justify-items: flex-start;
      }

      .empty-state-box h2 {
        margin: 0;
      }

      .modal-overlay {
        position: fixed;
        inset: 0;
        z-index: 75;
        display: grid;
        place-items: center;
        background: rgba(15, 23, 42, 0.24);
        padding: 1rem;
      }

      .modal-card {
        width: min(600px, 100%);
        padding: 1rem;
      }

      .modal-head {
        display: flex;
        justify-content: space-between;
        gap: 0.6rem;
        margin-bottom: 0.8rem;
      }

      .modal-head h2 {
        margin: 0.4rem 0 0;
      }

      @media (max-width: 960px) {
        .workspace-banner {
          flex-direction: column;
        }

        .member-row {
          grid-template-columns: 1fr;
          justify-items: start;
        }

        .members-drawer {
          width: 100%;
          border-radius: 0;
        }
      }
    `
  ]
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
  private readonly destroyRef = inject(DestroyRef);

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
  memberDirectory: Record<number, UserDto> = {};
  boardMeta: Record<number, BoardCardMeta> = {};
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
  private workspaceLoadedToastShown = false;

  get canManageWorkspace(): boolean {
    if (!this.workspace || !this.session) {
      return false;
    }

    return this.workspace.ownerId === this.session.userId || this.session.role === 'ADMIN';
  }

  ngOnInit(): void {
    this.workspaceId = Number(this.route.snapshot.paramMap.get('id') ?? 0);
    this.session = this.authStore.restore();

    this.router.events.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
      if (event instanceof NavigationCancel || event instanceof NavigationError) {
        this.openingBoardId = null;
      }
    });

    this.boardService
      .getBoards()
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
    if (!this.canManageWorkspace) {
      this.notifyPermissionDenied();
      return;
    }

    if (!this.workspace) {
      return;
    }

    this.workspaceForm.reset({
      name: this.workspace.name,
      description: this.workspace.description,
      visibility: this.workspace.visibility,
      logoUrl: this.workspace.logoUrl || ''
    });

    this.showUpdateModal = true;
  }

  closeUpdateModal(): void {
    this.showUpdateModal = false;
  }

  updateWorkspace(): void {
    if (!this.canManageWorkspace) {
      this.notifyPermissionDenied();
      return;
    }

    if (this.workspaceForm.invalid) {
      this.workspaceForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    const payload = this.workspaceForm.getRawValue() as WorkspaceRequest;

    this.workspaceService
      .updateWorkspace(this.workspaceId, payload)
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
    if (!this.canManageWorkspace) {
      this.notifyPermissionDenied();
      return;
    }

    const confirmed = window.confirm('Are you sure you want to delete this workspace?');
    if (!confirmed) {
      return;
    }

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
    if (!this.canManageWorkspace) {
      this.notifyPermissionDenied();
      return;
    }

    this.error = '';
    this.showBoardModal = true;
  }

  closeBoardModal(): void {
    this.showBoardModal = false;
  }

  markBoardOpening(boardId: number): void {
    if (this.openingBoardId !== null) {
      return;
    }

    this.openingBoardId = boardId;
  }

  openMembersPanel(): void {
    this.showMembersPanel = true;
    this.loadWorkspaceMembers();
  }

  closeMembersPanel(): void {
    this.showMembersPanel = false;
  }

  createBoard(): void {
    if (!this.canManageWorkspace) {
      this.notifyPermissionDenied();
      return;
    }

    if (this.boardForm.invalid) {
      this.boardForm.markAllAsTouched();
      return;
    }

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

    this.boardService
      .create(payload)
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
    if (!this.canManageWorkspace) {
      this.notifyPermissionDenied();
      return;
    }

    if (this.memberForm.invalid) {
      this.memberForm.markAllAsTouched();
      return;
    }

    const userId = this.memberForm.getRawValue().userId;
    if (!userId) {
      return;
    }

    this.addingMember = true;
    this.workspaceService
      .addMember({ workspaceId: this.workspaceId, userId })
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

  metaFor(boardId: number): BoardCardMeta {
    return this.boardMeta[boardId] ?? { memberCount: null };
  }

  trackByMemberId(_: number, member: WorkspaceMemberResponse): number {
    return member.memberId;
  }

  memberDisplayName(member: WorkspaceMemberResponse): string {
    const profile = this.memberDirectory[member.userId];
    const display = profile?.fullName?.trim();
    if (display) {
      return display;
    }

    if (member.userId === this.session?.userId) {
      return 'You';
    }

    return `User #${member.userId}`;
  }

  memberEmail(member: WorkspaceMemberResponse): string {
    const profile = this.memberDirectory[member.userId];
    if (profile?.email) {
      return profile.email;
    }

    if (member.userId === this.session?.userId) {
      return this.session?.email || '';
    }

    return '';
  }

  memberRole(member: WorkspaceMemberResponse): 'Owner' | 'Member' {
    return this.isOwnerMember(member) ? 'Owner' : 'Member';
  }

  isOwnerMember(member: WorkspaceMemberResponse): boolean {
    return member.userId === this.workspace?.ownerId;
  }

  canRemoveMember(member: WorkspaceMemberResponse): boolean {
    if (!this.canManageWorkspace) {
      return false;
    }

    return !this.isOwnerMember(member);
  }

  removeMember(member: WorkspaceMemberResponse): void {
    if (!this.canRemoveMember(member)) {
      this.notifyPermissionDenied();
      return;
    }

    this.removingMemberUserId = member.userId;
    this.workspaceService
      .removeMember(this.workspaceId, member.userId)
      .pipe(finalize(() => (this.removingMemberUserId = null)))
      .subscribe({
        next: () => {
          this.notify.success('Member removed successfully');
          this.loadWorkspaceMembers();
        },
        error: (err) => {
          if (this.isNoAccessError(err)) {
            this.notifyPermissionDenied();
            return;
          }

          const message = readErrorMessage(err);
          this.error = message;
          this.notify.error(message);
        }
      });
  }

  asCount(value: number | null): string {
    return value === null ? 'N/A' : String(value);
  }

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
        if (this.isNoAccessError(err)) {
          this.error = 'Unable to load workspace details.';
          return;
        }

        const message = readErrorMessage(err) || 'Failed to load workspace';
        this.error = message;
        this.notify.error('Failed to load workspace');
      }
    });
  }

  private loadWorkspaceMembers(): void {
    this.loadingMembers = true;

    this.workspaceService
      .getMembers(this.workspaceId, 0, 100, 'memberId', 'asc')
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

          if (this.isNoAccessError(err)) {
            return;
          }

          const message = readErrorMessage(err);
          this.error = message;
          this.notify.error(message);
        }
      });
  }

  private loadMemberDirectory(members: WorkspaceMemberResponse[]): void {
    const uniqueIds = Array.from(new Set(members.map((member) => member.userId)));
    if (!uniqueIds.length) {
      this.memberDirectory = {};
      return;
    }

    this.userService.getBulk(uniqueIds).subscribe({
      next: (users) => {
        this.memberDirectory = users.reduce<Record<number, UserDto>>((acc, user) => {
          acc[user.userId] = user;
          return acc;
        }, {});
      },
      error: () => {
        this.memberDirectory = {};
      }
    });
  }

  private isNoAccessError(error: unknown): boolean {
    if (!(error instanceof HttpErrorResponse)) {
      return false;
    }

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
        if (merged.length) {
          this.setBoards(merged);
          return;
        }

        this.boardService.getPublicBoards(this.workspaceId, 0, 100).subscribe({
          next: (page) => this.setBoards(page.content),
          error: (err) => {
            const message = readErrorMessage(err);
            this.error = message;
            this.notify.error(message);
          }
        });
      },
      error: (err) => {
        const message = readErrorMessage(err);
        this.error = message;
        this.notify.error(message);
      }
    });
  }

  private setBoards(items: BoardResponse[]): void {
    const unique = new Map<number, BoardResponse>();
    for (const board of items) {
      unique.set(board.boardId, board);
    }

    const boards = Array.from(unique.values()).sort((left, right) => right.boardId - left.boardId);
    this.boardService.setBoards(boards);

    for (const board of boards) {
      this.resolveBoardMeta(board);
    }
  }

  private resolveBoardMeta(board: BoardResponse): void {
    this.boardService
      .getMembers(board.boardId, 0, 100)
      .pipe(
        map((page) => page.totalNumberOfElements || page.content.length),
        catchError(() => of(null))
      )
      .subscribe((memberCount) => {
        this.boardMeta = {
          ...this.boardMeta,
          [board.boardId]: {
            memberCount
          }
        };
      });
  }

  private emptyPage<T>(): ApiPage<T> {
    return {
      pageSize: 0,
      pageNumber: 0,
      numberOfElements: 0,
      totalPages: 0,
      totalNumberOfElements: 0,
      content: [],
      last: true,
      first: true
    };
  }
}
