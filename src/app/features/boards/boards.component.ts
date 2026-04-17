import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { combineLatest, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiPage } from '../../core/models/api-page.model';
import { BoardRequest, BoardResponse } from '../../core/models/board.models';
import { Visibility } from '../../core/models/workspace.models';
import { NotificationService } from '../../core/services/notification.service';
import { BoardService } from '../../core/services/board.service';
import { readErrorMessage } from '../../core/utils/error.utils';

@Component({
  selector: 'app-boards-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="stack page-stack">
      <section class="hero panel">
        <div class="badge">Step 3</div>
        <h1>Boards in workspace #{{ workspaceId }}</h1>
        <p class="muted">This route handles board creation and board listing only. List and card work starts after opening a board.</p>
        <div class="actions">
          <a class="button secondary" [routerLink]="['/workspace', workspaceId]">Back to members</a>
        </div>
      </section>

      <section class="panel section-card stack">
        <h2 class="section-title">Create board</h2>
        <form class="stack" [formGroup]="form" (ngSubmit)="createBoard()">
          <div class="field">
            <label>Board name</label>
            <input type="text" formControlName="name" placeholder="Product backlog" />
          </div>
          <div class="field">
            <label>Description</label>
            <textarea formControlName="description" placeholder="Track roadmap items for the quarter"></textarea>
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
              <input type="text" formControlName="background" placeholder="#0f4c81" />
            </div>
          </div>
          <div class="actions">
            <button class="button accent" type="submit" [disabled]="form.invalid">Create board</button>
            <button class="button secondary" type="button" (click)="form.reset(defaultForm)">Reset</button>
          </div>
        </form>
        <p class="error" *ngIf="error">{{ error }}</p>
        <p class="success" *ngIf="message">{{ message }}</p>
      </section>

      <section class="panel section-card stack">
        <div class="actions-between">
          <h2 class="section-title">Board list</h2>
          <button class="button secondary" type="button" (click)="loadBoards()">Refresh</button>
        </div>

        <div class="empty-state" *ngIf="!boards.length">
          <div class="badge">No boards yet</div>
          <p class="muted">Create the first board using the form above.</p>
        </div>

        <div class="board-grid" *ngIf="boards.length">
          <article class="board-item" *ngFor="let board of boards">
            <div class="item-top">
              <div>
                <h3>{{ board.name }}</h3>
                <p class="muted">{{ board.description }}</p>
              </div>
              <span class="chip">{{ board.visibility }}</span>
            </div>
            <div class="chip-row">
              <span class="chip">#{{ board.boardId }}</span>
              <span class="chip">{{ board.isClosed ? 'Closed' : 'Open' }}</span>
            </div>
            <div class="actions">
              <a class="button accent" [routerLink]="['/board', board.boardId]">Open board</a>
              <button class="button secondary" type="button" (click)="toggleBoard(board)">{{ board.isClosed ? 'Open' : 'Close' }}</button>
            </div>
          </article>
        </div>
      </section>
    </div>
  `,
  styles: [
    `
      .page-stack { gap: 16px; }
      .section-card { padding: 20px; }
      .actions-between {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
      }
      .board-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 12px;
      }
      .board-item {
        display: grid;
        gap: 12px;
        padding: 14px;
        border-radius: 12px;
        border: 1px solid #dbe3ef;
        background: #fdfefe;
      }
      .item-top {
        display: flex;
        justify-content: space-between;
        align-items: start;
        gap: 12px;
      }
      .item-top h3 {
        margin: 0;
        color: #1f2a44;
      }
      .item-top p {
        margin: 8px 0 0;
      }
      .chip-row { display: flex; gap: 8px; flex-wrap: wrap; }
      .chip {
        display: inline-flex;
        align-items: center;
        padding: 0.35rem 0.7rem;
        border-radius: 999px;
        border: 1px solid #dde5f2;
        background: #f5f8ff;
        color: #1f2a44;
        font-size: 0.8rem;
        font-weight: 600;
      }
    `
  ]
})
export class BoardsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly boardService = inject(BoardService);
  private readonly notify = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  workspaceId = 0;
  boards: BoardResponse[] = [];
  error = '';
  message = '';

  readonly defaultForm = {
    name: '',
    description: '',
    visibility: 'PUBLIC' as Visibility,
    background: '#0f4c81'
  };

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    description: ['', [Validators.required]],
    visibility: ['PUBLIC' as Visibility, [Validators.required]],
    background: ['#0f4c81']
  });

  ngOnInit(): void {
    this.boardService
      .getBoards()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((items) => (this.boards = items));

    this.workspaceId = Number(this.route.snapshot.paramMap.get('id') ?? 0);

    if (!this.workspaceId) {
      this.error = 'Workspace id is required.';
      return;
    }

    this.loadBoards();
  }

  createBoard(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.error = '';
    this.message = '';

    const value = this.form.getRawValue();
    const payload: BoardRequest = {
      workspaceId: this.workspaceId,
      name: value.name,
      description: value.description,
      background: value.background,
      visibility: value.visibility
    };

    this.boardService.create(payload).subscribe({
      next: () => {
        this.notify.success('Board created');
        this.form.reset(this.defaultForm);
      },
      error: (err) => {
        const message = readErrorMessage(err);
        this.error = message;
        this.notify.error(message);
      }
    });
  }

  loadBoards(): void {
    this.error = '';

    combineLatest([
      this.boardService.getPublicBoardsForLoggedUser(this.workspaceId, 0, 100).pipe(catchError(() => of(this.emptyPage()))),
      this.boardService.getPrivateBoards(this.workspaceId, 0, 100).pipe(catchError(() => of(this.emptyPage())))
    ]).subscribe({
      next: ([publicPage, privatePage]) => {
        const merged = [...publicPage.content, ...privatePage.content];
        const unique = new Map<number, BoardResponse>();
        for (const board of merged) {
          unique.set(board.boardId, board);
        }
        this.boardService.setBoards(Array.from(unique.values()).sort((a, b) => b.boardId - a.boardId));

        if (!unique.size) {
          this.loadPublicOnly();
        }
      },
      error: (err) => {
        const message = readErrorMessage(err);
        this.error = message;
        this.notify.error(message);
      }
    });
  }

  loadPublicOnly(): void {
    this.boardService.getPublicBoards(this.workspaceId, 0, 100).subscribe({
      next: () => {
        // Stream updates the view.
      },
      error: (err) => {
        const message = readErrorMessage(err);
        this.error = message;
        this.notify.error(message);
      }
    });
  }

  toggleBoard(board: BoardResponse): void {
    const request$ = board.isClosed ? this.boardService.open(board.boardId) : this.boardService.close(board.boardId);
    request$.subscribe({
      next: (message) => {
        this.notify.info(message);
      },
      error: (err) => {
        const message = readErrorMessage(err);
        this.error = message;
        this.notify.error(message);
      }
    });
  }

  private emptyPage(): ApiPage<BoardResponse> {
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
