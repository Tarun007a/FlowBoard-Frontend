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

// Stores member and board counts for each workspace card
interface WorkspaceCardMeta {
  boardCount: number | null;
  memberCount: number | null;
}

@Component({
  selector: 'app-workspaces-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './workspaces.component.html',
  styleUrl: './workspaces.component.css'
})
export class WorkspacesComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly workspaceService = inject(WorkspaceService);
  private readonly boardService = inject(BoardService);
  private readonly authStore = inject(AuthStoreService);
  private readonly notify = inject(NotificationService);

  // Default values for the create workspace form
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
  openingWorkspaceId: number | null = null;  // ID of workspace currently being navigated to
  error = '';
  createError = '';

  myWorkspaces: WorkspaceResponse[] = [];
  joinedWorkspaces: WorkspaceResponse[] = [];
  combinedWorkspaces: WorkspaceResponse[] = [];  // owned + joined together
  publicWorkspaces: WorkspaceResponse[] = [];
  workspaceMeta: Record<number, WorkspaceCardMeta> = {};  // key: workspaceId

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

    this.workspaceService.create(payload)
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
    // Prevent double-click navigation
    if (this.openingWorkspaceId !== null) return;

    this.openingWorkspaceId = workspace.workspaceId;
    this.router.navigate(['/workspace', workspace.workspaceId])
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

  isOwner(workspace: WorkspaceResponse): boolean {
    return workspace.ownerId === this.session?.userId;
  }

  // trackBy improves *ngFor performance by telling Angular how to identify each item
  trackByWorkspaceId(_: number, workspace: WorkspaceResponse): number {
    return workspace.workspaceId;
  }

  // Returns the metadata (board/member counts) for a workspace, or null values if not loaded
  metaFor(workspaceId: number): WorkspaceCardMeta {
    return this.workspaceMeta[workspaceId] ?? { boardCount: null, memberCount: null };
  }

  asCount(value: number | null): string {
    return value === null ? 'N/A' : String(value);
  }

  // Returns a gradient background color based on workspace ID
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

  private loadWorkspaceSections(): void {
    this.loadingSections = true;
    this.error = '';

    let hasLoadError = false;
    let joinedLoadFailed = false;

    // Fetch all three groups at the same time and handle failures gracefully
    const mine$ = this.workspaceService.getMyWorkspaces(0, 100).pipe(catchError(() => { hasLoadError = true; return of(this.emptyPage<WorkspaceResponse>()); }));
    const joined$ = this.workspaceService.getJoinedWorkspaces(0, 100, 'workspaceId', 'asc').pipe(catchError(() => { hasLoadError = true; joinedLoadFailed = true; return of(this.emptyPage<WorkspaceResponse>()); }));
    const public$ = this.workspaceService.getPublicWorkspaces(0, 100).pipe(catchError(() => { hasLoadError = true; return of(this.emptyPage<WorkspaceResponse>()); }));

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

          // Remove stale meta entries for workspaces no longer visible
          const activeIds = new Set(merged.map((workspace) => workspace.workspaceId));
          this.workspaceMeta = Object.entries(this.workspaceMeta).reduce<Record<number, WorkspaceCardMeta>>((acc, [id, meta]) => {
            const workspaceId = Number(id);
            if (activeIds.has(workspaceId)) acc[workspaceId] = meta;
            return acc;
          }, {});

          for (const workspace of merged) {
            this.updateMeta(workspace);
          }

          if (joinedLoadFailed) this.notify.error('Failed to load joined workspaces');
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

  private rebuildCombinedLists(): void {
    this.combinedWorkspaces = [...this.myWorkspaces, ...this.joinedWorkspaces];
    this.workspaceService.setWorkspaces([...this.combinedWorkspaces, ...this.publicWorkspaces]);
  }

  private sortByRecent(items: WorkspaceResponse[]): WorkspaceResponse[] {
    return [...items].sort((a, b) => this.sortValue(b) - this.sortValue(a));
  }

  private sortValue(workspace: WorkspaceResponse): number {
    const updated = Date.parse(workspace.updatedAt);
    if (!Number.isNaN(updated)) return updated;
    const created = Date.parse(workspace.createdAt);
    if (!Number.isNaN(created)) return created;
    return workspace.workspaceId;
  }

  // Fetch and store board/member counts for a workspace card
  private updateMeta(workspace: WorkspaceResponse): void {
    combineLatest([
      this.resolveBoardCount(workspace.workspaceId),
      this.resolveMemberCount(workspace.workspaceId)
    ]).subscribe(([boardCount, memberCount]) => {
      this.workspaceMeta = { ...this.workspaceMeta, [workspace.workspaceId]: { boardCount, memberCount } };
    });
  }

  private resolveBoardCount(workspaceId: number) {
    const memberPublic$ = this.boardService.getPublicBoardsForLoggedUser(workspaceId, 0, 100).pipe(map((page) => page.content), catchError(() => of([])));
    const private$ = this.boardService.getPrivateBoards(workspaceId, 0, 100).pipe(map((page) => page.content), catchError(() => of([])));
    return combineLatest([memberPublic$, private$]).pipe(
      map(([memberPublic, privateBoards]) => {
        const merged = [...memberPublic, ...privateBoards];
        if (!merged.length) return null;
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
    return { pageSize: 0, pageNumber: 0, numberOfElements: 0, totalPages: 0, totalNumberOfElements: 0, content: [], last: true, first: true };
  }
}
