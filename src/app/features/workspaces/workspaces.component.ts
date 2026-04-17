import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, combineLatest, finalize, map, of } from 'rxjs';
import { AuthSession } from '../../core/models/auth.models';
import { ApiPage } from '../../core/models/api-page.model';
import { Visibility, WorkspaceRequest, WorkspaceResponse } from '../../core/models/workspace.models';
import { AuthStoreService } from '../../core/services/auth-store.service';
import { BoardService } from '../../core/services/board.service';
import { NotificationService } from '../../core/services/notification.service';
import { WorkspaceService } from '../../core/services/workspace.service';
import { readErrorMessage } from '../../core/utils/error.utils';

interface WorkspaceCardMeta {
  boardCount: number | null;
  memberCount: number | null;
}

@Component({
  selector: 'app-workspaces-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="workspace-page">
      <section class="workspace-hero panel">
        <div>
          <div class="hero-badge">Workspace Hub</div>
          <h1>Welcome back to FlowBoard</h1>
          <p class="muted">Manage your workspaces from one clean view.</p>
        </div>

        <div class="hero-actions">
          <button class="button accent" type="button" (click)="openCreateModal()">Create Workspace</button>
        </div>
      </section>

      <p class="error" *ngIf="error">{{ error }}</p>

      <div class="workspace-layout">
        <section class="workspace-section workspace-main panel">
          <header class="section-head">
            <div>
              <h2>Workspaces</h2>
              <p class="muted">Your owned and joined workspaces in one view</p>
            </div>
            <span class="section-count">{{ combinedWorkspaces.length }}</span>
          </header>

          <div class="workspace-grid" *ngIf="combinedWorkspaces.length; else noWorkspaces">
            <article
              class="workspace-card"
              *ngFor="let workspace of combinedWorkspaces; trackBy: trackByWorkspaceId"
              [class.card-loading]="openingWorkspaceId === workspace.workspaceId"
              [attr.aria-busy]="openingWorkspaceId === workspace.workspaceId"
              [ngStyle]="{ 'background': workspaceGradient(workspace.workspaceId) }"
              (click)="openWorkspace(workspace)">
              <div class="owner-star" *ngIf="isOwner(workspace)" title="My Workspace" aria-label="My Workspace">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 2.75l2.85 5.78 6.37.93-4.61 4.49 1.09 6.35L12 17.3 6.3 20.3l1.09-6.35-4.61-4.49 6.37-.93L12 2.75z" />
                </svg>
              </div>

              <header class="card-head">
                <h3>{{ workspace.name }}</h3>
                <span class="visibility-pill">{{ workspace.visibility }}</span>
              </header>

              <p class="card-description">{{ workspace.description || 'No description provided.' }}</p>
              <p class="card-role">{{ isOwner(workspace) ? 'Owner' : 'Member' }}</p>

              <footer class="card-stats">
                <div>
                  <span class="label">Members</span>
                  <strong>{{ asCount(metaFor(workspace.workspaceId).memberCount) }}</strong>
                </div>
                <div>
                  <span class="label">Boards</span>
                  <strong>{{ asCount(metaFor(workspace.workspaceId).boardCount) }}</strong>
                </div>
              </footer>
            </article>
          </div>

          <ng-template #noWorkspaces>
            <section class="empty-workspaces" *ngIf="!loadingSections">
              <img src="images/workspaces-empty-state.svg" alt="No workspaces illustration" />
              <div>
                <h3>No workspaces yet</h3>
                <p class="muted">Create your first workspace or ask your manager/team to add you.</p>
              </div>
              <button class="button accent" type="button" (click)="openCreateModal()">Create Workspace</button>
            </section>
          </ng-template>
        </section>

        <aside class="workspace-section workspace-sidebar panel" *ngIf="publicSectionEnabled">
          <header class="section-head sidebar-head">
            <div>
              <h2>Public Workspaces</h2>
              <p class="muted">Browse open workspaces you can access</p>
            </div>
          </header>

          <div class="public-list" *ngIf="publicWorkspaces.length; else noPublic">
            <article
              class="public-card"
              *ngFor="let workspace of publicWorkspaces; trackBy: trackByWorkspaceId"
              [class.card-loading]="openingWorkspaceId === workspace.workspaceId"
              [attr.aria-busy]="openingWorkspaceId === workspace.workspaceId"
              [ngStyle]="{ 'background': workspaceGradient(workspace.workspaceId) }"
              (click)="openWorkspace(workspace)">
              <header>
                <h3>{{ workspace.name }}</h3>
                <span class="visibility-pill">{{ workspace.visibility }}</span>
              </header>

              <p>{{ workspace.description || 'No description provided.' }}</p>

              <div class="public-meta">
                <span>Members: {{ asCount(metaFor(workspace.workspaceId).memberCount) }}</span>
              </div>

              <button
                class="button secondary"
                type="button"
                *ngIf="canJoin(workspace)"
                [disabled]="joiningWorkspaceId === workspace.workspaceId"
                (click)="joinWorkspace(workspace, $event)">
                {{ joiningWorkspaceId === workspace.workspaceId ? 'Joining...' : 'Join Workspace' }}
              </button>
            </article>
          </div>

          <ng-template #noPublic>
            <div class="public-empty" *ngIf="!loadingSections">
              <p class="muted">No public workspaces available</p>
            </div>
          </ng-template>
        </aside>
      </div>

      <div class="empty-wrap panel" *ngIf="loadingSections">
        <p class="muted">Loading workspaces...</p>
      </div>
    </div>

    <div class="modal-overlay" *ngIf="showCreateModal" (click)="closeCreateModal()">
      <section class="panel modal-card" (click)="$event.stopPropagation()">
        <header class="modal-head">
          <div>
            <div class="hero-badge">Workspace</div>
            <h2>Create workspace</h2>
          </div>
          <button class="button secondary" type="button" (click)="closeCreateModal()">Close</button>
        </header>

        <form class="stack" [formGroup]="form" (ngSubmit)="createWorkspace()">
          <div class="field">
            <label>Name</label>
            <input type="text" formControlName="name" placeholder="Engineering Team" />
          </div>

          <div class="field">
            <label>Description</label>
            <textarea formControlName="description" placeholder="Roadmap, sprint planning, and delivery boards."></textarea>
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
              <input type="text" formControlName="logoUrl" placeholder="https://logo.example/workspace.png" />
            </div>
          </div>

          <p class="error" *ngIf="createError">{{ createError }}</p>

          <div class="actions">
            <button class="button accent" type="submit" [disabled]="creatingWorkspace || form.invalid">
              {{ creatingWorkspace ? 'Creating...' : 'Create Workspace' }}
            </button>
            <button class="button secondary" type="button" (click)="form.reset(defaultForm)">Reset</button>
          </div>
        </form>
      </section>
    </div>
  `,
  styles: [
    `
      .workspace-page {
        display: grid;
        gap: 1rem;
      }

      .workspace-hero {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        align-items: flex-start;
        padding: 1rem 1.15rem;
        background: linear-gradient(125deg, #f0f7ff, #e3f0ff);
        color: #1b3a5a;
      }

      .workspace-hero h1 {
        margin: 0.45rem 0;
        font-family: 'Sora', 'Space Grotesk', 'Segoe UI', sans-serif;
      }

      .workspace-hero .muted {
        color: #557092;
      }

      .hero-badge {
        width: fit-content;
        border-radius: 999px;
        background: #e5f1ff;
        color: #1f5d9d;
        border: 1px solid #c7ddf6;
        padding: 0.3rem 0.62rem;
        font-size: 0.74rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.02em;
      }

      .workspace-layout {
        display: grid;
        gap: 1rem;
        grid-template-columns: minmax(0, 7fr) minmax(280px, 3fr);
      }

      .workspace-section {
        padding: 1rem;
      }

      .section-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 0.9rem;
        margin-bottom: 0.8rem;
      }

      .section-count {
        min-width: 34px;
        min-height: 34px;
        border-radius: 999px;
        display: inline-grid;
        place-items: center;
        border: 1px solid #c7dcf6;
        background: #ebf4ff;
        color: #295c91;
        font-weight: 700;
      }

      .section-head h2 {
        margin: 0;
        color: #23486d;
        font-size: 1.14rem;
      }

      .section-head p {
        margin: 0.25rem 0 0;
      }

      .workspace-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(285px, 1fr));
        gap: 0.9rem;
      }

      .workspace-card {
        display: grid;
        gap: 0.75rem;
        min-height: 220px;
        border-radius: 16px;
        padding: 1rem;
        color: #1d3046;
        border: 1px solid #cfe1f5;
        box-shadow: 0 10px 22px rgba(30, 74, 135, 0.16);
        transition: transform 140ms ease, box-shadow 140ms ease;
        position: relative;
        cursor: pointer;
      }

      .owner-star {
        position: absolute;
        top: 0.78rem;
        right: 0.8rem;
        width: 30px;
        height: 30px;
        border-radius: 999px;
        display: grid;
        place-items: center;
        color: #e3aa2b;
        background: rgba(255, 255, 255, 0.86);
        border: 1px solid #f2d18d;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
      }

      .workspace-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 15px 28px rgba(30, 74, 135, 0.2);
      }

      .workspace-card.card-loading,
      .public-card.card-loading {
        opacity: 0.76;
        pointer-events: none;
      }

      .card-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 0.6rem;
      }

      .card-head h3 {
        margin: 0;
        font-size: 1.1rem;
        line-height: 1.25;
      }

      .visibility-pill {
        border-radius: 999px;
        border: 1px solid #b9d3f2;
        background: #e9f4ff;
        color: #2b5c8e;
        font-size: 0.72rem;
        padding: 0.3rem 0.54rem;
        font-weight: 700;
      }

      .card-description {
        margin: 0;
        color: #4c6788;
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .card-role {
        margin: 0;
        color: #2e5f95;
        font-size: 0.82rem;
        font-weight: 700;
      }

      .card-stats {
        margin-top: auto;
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0.5rem;
      }

      .card-stats div {
        border-radius: 12px;
        border: 1px solid #d3e2f4;
        background: rgba(255, 255, 255, 0.78);
        padding: 0.5rem 0.6rem;
      }

      .label {
        display: block;
        font-size: 0.72rem;
        text-transform: uppercase;
        opacity: 0.78;
        margin-bottom: 0.1rem;
      }

      .empty-wrap {
        display: grid;
        gap: 0.7rem;
        justify-items: flex-start;
        padding: 1rem;
      }

      .empty-workspaces {
        min-height: 330px;
        border-radius: 14px;
        border: 1px dashed #bdd6f3;
        background: #f3f9ff;
        display: grid;
        justify-items: start;
        gap: 0.7rem;
        padding: 1.2rem;
      }

      .empty-workspaces img {
        width: min(320px, 100%);
      }

      .empty-workspaces h3 {
        margin: 0;
        color: #284a6f;
      }

      .public-list {
        display: grid;
        gap: 0.65rem;
      }

      .public-card {
        border: 1px solid #d2e3f7;
        border-radius: 14px;
        padding: 0.82rem;
        display: grid;
        gap: 0.56rem;
        cursor: pointer;
        box-shadow: 0 10px 20px rgba(30, 74, 135, 0.14);
        transition: transform 130ms ease, box-shadow 130ms ease;
      }

      .public-card:hover {
        transform: translateY(-1px);
        box-shadow: 0 14px 24px rgba(30, 74, 135, 0.18);
      }

      .public-card header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 0.55rem;
      }

      .public-card h3 {
        margin: 0;
        font-size: 0.98rem;
        line-height: 1.3;
      }

      .public-card p {
        margin: 0;
        color: #4e6788;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .public-meta {
        font-size: 0.8rem;
        color: #355b85;
      }

      .public-empty {
        min-height: 120px;
        border: 1px dashed #c1d8f2;
        border-radius: 12px;
        background: #f4f9ff;
        display: grid;
        place-items: center;
        text-align: center;
        padding: 0.8rem;
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
        width: min(580px, 100%);
        padding: 1rem;
      }

      .modal-head {
        display: flex;
        justify-content: space-between;
        gap: 0.7rem;
        margin-bottom: 0.85rem;
      }

      .modal-head h2 {
        margin: 0.44rem 0 0;
      }

      @media (max-width: 900px) {
        .workspace-hero {
          flex-direction: column;
          align-items: stretch;
        }

        .workspace-layout {
          grid-template-columns: 1fr;
        }
      }
    `
  ]
})
export class WorkspacesComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly workspaceService = inject(WorkspaceService);
  private readonly boardService = inject(BoardService);
  private readonly authStore = inject(AuthStoreService);
  private readonly notify = inject(NotificationService);

  readonly defaultForm = {
    name: '',
    description: '',
    visibility: 'PUBLIC' as Visibility,
    logoUrl: ''
  };

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    description: ['', [Validators.required, Validators.minLength(2)]],
    visibility: ['PUBLIC' as Visibility, [Validators.required]],
    logoUrl: ['', [Validators.required, Validators.minLength(2)]]
  });

  session: AuthSession | null = null;
  showCreateModal = false;
  creatingWorkspace = false;
  loadingSections = false;
  publicSectionEnabled = true;
  joiningWorkspaceId: number | null = null;
  openingWorkspaceId: number | null = null;
  error = '';
  createError = '';

  myWorkspaces: WorkspaceResponse[] = [];
  joinedWorkspaces: WorkspaceResponse[] = [];
  combinedWorkspaces: WorkspaceResponse[] = [];
  publicWorkspaces: WorkspaceResponse[] = [];
  workspaceMeta: Record<number, WorkspaceCardMeta> = {};

  ngOnInit(): void {
    this.session = this.authStore.restore();
    this.loadWorkspaceSections();
  }

  openCreateModal(): void {
    this.createError = '';
    this.showCreateModal = true;
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
  }

  createWorkspace(): void {
    this.createError = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.creatingWorkspace = true;
    const payload = this.form.getRawValue() as WorkspaceRequest;

    this.workspaceService
      .create(payload)
      .pipe(finalize(() => (this.creatingWorkspace = false)))
      .subscribe({
        next: (created) => {
          this.addCreatedWorkspaceToView(created);
          this.notify.success('Workspace created');
          this.form.reset(this.defaultForm);
          this.showCreateModal = false;
          this.loadWorkspaceSections();
        },
        error: (err) => {
          const message = readErrorMessage(err);
          this.createError = message;
          this.notify.error(message);
        }
      });
  }

  openWorkspace(workspace: WorkspaceResponse): void {
    if (this.openingWorkspaceId !== null) {
      return;
    }

    this.openingWorkspaceId = workspace.workspaceId;
    this.router
      .navigate(['/workspace', workspace.workspaceId])
      .then((navigated) => {
        if (!navigated) {
          this.openingWorkspaceId = null;
          this.notify.error('Unable to open workspace');
        }
      })
      .catch(() => {
        this.openingWorkspaceId = null;
        this.notify.error('Unable to open workspace');
      });
  }

  joinWorkspace(workspace: WorkspaceResponse, event: Event): void {
    event.stopPropagation();

    if (!this.session?.userId) {
      this.notify.error('Login required to join workspace');
      return;
    }

    this.joiningWorkspaceId = workspace.workspaceId;
    this.workspaceService
      .addMember({ workspaceId: workspace.workspaceId, userId: this.session.userId })
      .pipe(finalize(() => (this.joiningWorkspaceId = null)))
      .subscribe({
        next: () => {
          this.promotePublicWorkspaceToJoined(workspace.workspaceId);
          this.notify.success('Joined workspace successfully');
          this.loadWorkspaceSections({ announceJoinedLoaded: true });
        },
        error: (err) => {
          const message = readErrorMessage(err);
          this.notify.error(message);
        }
      });
  }

  canJoin(workspace: WorkspaceResponse): boolean {
    if (!this.session) {
      return false;
    }

    const owned = workspace.ownerId === this.session.userId;
    const joined = this.combinedWorkspaces.some((item) => item.workspaceId === workspace.workspaceId);
    return !owned && !joined;
  }

  isOwner(workspace: WorkspaceResponse): boolean {
    return workspace.ownerId === this.session?.userId;
  }

  trackByWorkspaceId(_: number, workspace: WorkspaceResponse): number {
    return workspace.workspaceId;
  }

  metaFor(workspaceId: number): WorkspaceCardMeta {
    return this.workspaceMeta[workspaceId] ?? {
      boardCount: null,
      memberCount: null
    };
  }

  asCount(value: number | null): string {
    return value === null ? 'N/A' : String(value);
  }

  workspaceGradient(workspaceId: number): string {
    const tones = [
      'linear-gradient(135deg, #eff6ff, #daeaff)',
      'linear-gradient(135deg, #f5f9ff, #e2f0ff)',
      'linear-gradient(135deg, #eef5ff, #d9e9ff)',
      'linear-gradient(135deg, #f3f9ff, #e6f2ff)',
      'linear-gradient(135deg, #ebf4ff, #d8e9ff)'
    ];

    return tones[Math.abs(workspaceId) % tones.length] as string;
  }

  private loadWorkspaceSections(options: { announceJoinedLoaded?: boolean } = {}): void {
    this.loadingSections = true;
    this.error = '';

    let hasLoadError = false;
    let joinedLoadFailed = false;

    const mine$ = this.workspaceService.getMyWorkspaces(0, 100).pipe(
      catchError(() => {
        hasLoadError = true;
        return of(this.emptyPage<WorkspaceResponse>());
      })
    );

    const joined$ = this.workspaceService.getJoinedWorkspaces(0, 100, 'workspaceId', 'asc').pipe(
      catchError(() => {
        hasLoadError = true;
        joinedLoadFailed = true;
        return of(this.emptyPage<WorkspaceResponse>());
      })
    );

    const public$ = this.workspaceService.getPublicWorkspaces(0, 100).pipe(
      catchError(() => {
        hasLoadError = true;
        return of(this.emptyPage<WorkspaceResponse>());
      })
    );

    combineLatest([mine$, joined$, public$])
      .pipe(finalize(() => (this.loadingSections = false)))
      .subscribe({
        next: ([mine, joined, publicItems]) => {
          const sortedOwned = this.sortByRecent(mine.content);
          const ownerIds = new Set(sortedOwned.map((item) => item.workspaceId));

          const sortedJoined = this.sortByRecent(joined.content);
          const joinedOnly = sortedJoined.filter((item) => !ownerIds.has(item.workspaceId));

          const combinedIds = new Set([...sortedOwned, ...joinedOnly].map((item) => item.workspaceId));
          const publicOnly = this.sortByRecent(publicItems.content).filter((item) => !combinedIds.has(item.workspaceId));

          this.myWorkspaces = sortedOwned;
          this.joinedWorkspaces = joinedOnly;
          this.combinedWorkspaces = [...sortedOwned, ...joinedOnly];
          this.publicWorkspaces = publicOnly;

          const merged = [...this.combinedWorkspaces, ...this.publicWorkspaces];
          this.workspaceService.setWorkspaces(merged);

          const activeIds = new Set(merged.map((workspace) => workspace.workspaceId));
          this.workspaceMeta = Object.entries(this.workspaceMeta).reduce<Record<number, WorkspaceCardMeta>>((acc, [id, meta]) => {
            const workspaceId = Number(id);
            if (activeIds.has(workspaceId)) {
              acc[workspaceId] = meta;
            }

            return acc;
          }, {});

          for (const workspace of merged) {
            this.updateMeta(workspace);
          }

          if (options.announceJoinedLoaded) {
            this.notify.info('Joined workspace loaded');
          }

          if (joinedLoadFailed) {
            this.notify.error('Failed to load joined workspaces');
          }

          if (hasLoadError) {
            this.error = 'Failed to load workspaces';
            this.notify.error(this.error);
          }
        },
        error: () => {
          this.error = 'Failed to load workspaces';
          this.notify.error(this.error);
        }
      });
  }

  private addCreatedWorkspaceToView(workspace: WorkspaceResponse): void {
    this.myWorkspaces = this.sortByRecent([workspace, ...this.myWorkspaces.filter((item) => item.workspaceId !== workspace.workspaceId)]);
    this.joinedWorkspaces = this.joinedWorkspaces.filter((item) => item.workspaceId !== workspace.workspaceId);
    this.publicWorkspaces = this.publicWorkspaces.filter((item) => item.workspaceId !== workspace.workspaceId);
    this.rebuildCombinedLists();
    this.updateMeta(workspace);
  }

  private promotePublicWorkspaceToJoined(workspaceId: number): void {
    const found = this.publicWorkspaces.find((item) => item.workspaceId === workspaceId);
    if (!found) {
      return;
    }

    this.publicWorkspaces = this.publicWorkspaces.filter((item) => item.workspaceId !== workspaceId);
    this.joinedWorkspaces = this.sortByRecent([found, ...this.joinedWorkspaces.filter((item) => item.workspaceId !== workspaceId)]);
    this.rebuildCombinedLists();
    this.updateMeta(found);
  }

  private rebuildCombinedLists(): void {
    this.combinedWorkspaces = [...this.myWorkspaces, ...this.joinedWorkspaces];
    this.workspaceService.setWorkspaces([...this.combinedWorkspaces, ...this.publicWorkspaces]);
  }

  private sortByRecent(items: WorkspaceResponse[]): WorkspaceResponse[] {
    return [...items].sort((a, b) => this.sortValue(b) - this.sortValue(a));
  }

  private sortValue(workspace: WorkspaceResponse): number {
    const updated = Date.parse(workspace.updatedAt);
    if (!Number.isNaN(updated)) {
      return updated;
    }

    const created = Date.parse(workspace.createdAt);
    if (!Number.isNaN(created)) {
      return created;
    }

    return workspace.workspaceId;
  }

  private updateMeta(workspace: WorkspaceResponse): void {
    combineLatest([
      this.resolveBoardCount(workspace.workspaceId),
      this.resolveMemberCount(workspace.workspaceId)
    ]).subscribe(([boardCount, memberCount]) => {
      this.workspaceMeta = {
        ...this.workspaceMeta,
        [workspace.workspaceId]: {
          boardCount,
          memberCount
        }
      };
    });
  }

  private resolveBoardCount(workspaceId: number) {
    const memberPublic$ = this.boardService
      .getPublicBoardsForLoggedUser(workspaceId, 0, 100)
      .pipe(map((page) => page.content), catchError(() => of([])));

    const private$ = this.boardService
      .getPrivateBoards(workspaceId, 0, 100)
      .pipe(map((page) => page.content), catchError(() => of([])));

    return combineLatest([memberPublic$, private$]).pipe(
      map(([memberPublic, privateBoards]) => {
        const merged = [...memberPublic, ...privateBoards];
        if (!merged.length) {
          return null;
        }

        return new Set(merged.map((item) => item.boardId)).size;
      })
    );
  }

  private resolveMemberCount(workspaceId: number) {
    return this.workspaceService.getMembers(workspaceId, 0, 100).pipe(
      map((page) => page.totalNumberOfElements || page.content.length),
      catchError(() => of(null))
    );
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
