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
import { BoardService } from '../../core/services/board.service';

@Component({
  selector: 'app-boards-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './boards.component.html',
  styleUrl: './boards.component.css'
})
export class BoardsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly boardService = inject(BoardService);
  // destroyRef is used to automatically unsubscribe when the component is destroyed
  private readonly destroyRef = inject(DestroyRef);

  workspaceId = 0;
  boards: BoardResponse[] = [];

  // Default form values used when resetting
  readonly defaultForm = {
    name: '',
    description: '',
    visibility: 'PUBLIC' as Visibility
  };

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    description: ['', [Validators.required]],
    visibility: ['PUBLIC' as Visibility, [Validators.required]]
  });

  ngOnInit(): void {
    // Subscribe to the shared boards list (updates automatically)
    this.boardService.getBoards()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((items) => (this.boards = items));

    this.workspaceId = Number(this.route.snapshot.paramMap.get('id') ?? 0);

    if (!this.workspaceId) {
      console.error('Workspace id is required.');
      return;
    }

    this.loadBoards();
  }

  createBoard(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const payload = {
      workspaceId: this.workspaceId,
      name: value.name,
      description: value.description,
      visibility: value.visibility
    } as BoardRequest;

    this.boardService.create(payload).subscribe({
      next: () => {
        this.form.reset(this.defaultForm);
      },
      error: (err) => console.error(err)
    });
  }

  loadBoards(): void {
    // Load public boards and private boards at the same time, then merge them
    combineLatest([
      this.boardService.getPublicBoardsForLoggedUser(this.workspaceId, 0, 100).pipe(catchError(() => of(this.emptyPage()))),
      this.boardService.getPrivateBoards(this.workspaceId, 0, 100).pipe(catchError(() => of(this.emptyPage())))
    ]).subscribe({
      next: ([publicPage, privatePage]) => {
        const merged = [...publicPage.content, ...privatePage.content];
        // Use a Map to remove duplicate boards
        const unique = new Map<number, BoardResponse>();
        for (const board of merged) {
          unique.set(board.boardId, board);
        }
        this.boardService.setBoards(Array.from(unique.values()).sort((a, b) => b.boardId - a.boardId));

        if (!unique.size) {
          this.loadPublicOnly();
        }
      },
      error: (err) => console.error(err)
    });
  }

  loadPublicOnly(): void {
    this.boardService.getPublicBoards(this.workspaceId, 0, 100).subscribe({
      error: (err) => console.error(err)
    });
  }

  toggleBoard(board: BoardResponse): void {
    const request$ = board.isClosed
      ? this.boardService.open(board.boardId)
      : this.boardService.close(board.boardId);

    request$.subscribe({
      next: () => void 0,
      error: (err) => console.error(err)
    });
  }

  // Returns a blank page object used as a fallback when an API call fails
  private emptyPage(): ApiPage<BoardResponse> {
    return {
      pageSize: 0, pageNumber: 0, numberOfElements: 0,
      totalPages: 0, totalNumberOfElements: 0,
      content: [], last: true, first: true
    };
  }
}
