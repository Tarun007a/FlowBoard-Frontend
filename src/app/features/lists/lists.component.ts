import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TaskListResponse } from '../../core/models/list.models';
import { ListService } from '../../core/services/list.service';
import { readErrorMessage } from '../../core/utils/error.utils';

@Component({
  selector: 'app-lists-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="stack">
      <section class="hero">
        <div class="badge">List APIs</div>
        <h1>Manage board columns</h1>
        <p class="muted">Create lists, reorder them, and archive or unarchive columns directly against the backend service.</p>
      </section>

      <section class="grid cols-2">
        <div class="panel section-card stack">
          <h2 class="section-title">List form</h2>
          <form class="stack" [formGroup]="form" (ngSubmit)="saveList()">
            <div class="grid cols-2">
              <div class="field"><label>List ID</label><input type="number" formControlName="listId" /></div>
              <div class="field"><label>Board ID</label><input type="number" formControlName="boardId" /></div>
              <div class="field"><label>Name</label><input type="text" formControlName="name" /></div>
              <div class="field"><label>Color</label><input type="text" formControlName="color" /></div>
            </div>
            <div class="actions">
              <button class="button accent" type="submit">Save</button>
              <button class="button secondary" type="button" (click)="loadByBoard()">Load by board</button>
              <button class="button secondary" type="button" (click)="loadArchived()">Archived</button>
              <button class="button danger" type="button" (click)="deleteList()">Delete</button>
            </div>
          </form>
        </div>

        <div class="panel section-card stack">
          <h2 class="section-title">Reorder</h2>
          <div class="field">
            <label>Board ID</label>
            <input type="number" [formControl]="reorderBoardId" />
          </div>
          <div class="field">
            <label>Ordered list ids comma separated</label>
            <textarea [formControl]="orderedIds"></textarea>
          </div>
          <div class="actions">
            <button class="button accent" type="button" (click)="reorder()">Apply order</button>
            <button class="button secondary" type="button" (click)="archive()">Archive</button>
            <button class="button secondary" type="button" (click)="unarchive()">Unarchive</button>
          </div>
        </div>
      </section>

      <section class="panel section-card stack">
        <p class="error" *ngIf="error">{{ error }}</p>
        <p class="success" *ngIf="message">{{ message }}</p>
        <table class="table" *ngIf="lists.length">
          <thead><tr><th>ID</th><th>Board</th><th>Name</th><th>Position</th><th>Color</th><th>Archived</th></tr></thead>
          <tbody>
            <tr *ngFor="let item of lists" (click)="edit(item)">
              <td>{{ item.listId }}</td>
              <td>{{ item.boardId }}</td>
              <td>{{ item.name }}</td>
              <td>{{ item.position }}</td>
              <td>{{ item.color }}</td>
              <td>{{ item.isArchived ? 'Yes' : 'No' }}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  `,
  styles: [` .section-card { padding: 18px; } `]
})
export class ListsComponent {
  private readonly fb = inject(FormBuilder);
  private readonly listService = inject(ListService);

  error = '';
  message = '';
  lists: TaskListResponse[] = [];

  form = this.fb.nonNullable.group({
    listId: [null as number | null],
    boardId: [null as number | null, [Validators.required]],
    name: ['', [Validators.required]],
    color: ['', [Validators.required]]
  });

  reorderBoardId = this.fb.nonNullable.control<number | null>(null);
  orderedIds = this.fb.nonNullable.control('');

  edit(item: TaskListResponse): void {
    this.form.patchValue({ listId: item.listId, boardId: Number(item.boardId), name: item.name, color: item.color });
  }

  saveList(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const payload = { boardId: value.boardId as number, name: value.name, color: value.color };
    const request$ = value.listId ? this.listService.update(value.listId, payload) : this.listService.create(payload);

    request$.subscribe({
      next: (list) => {
        this.message = value.listId ? 'List updated' : 'List created';
        this.lists = [list, ...this.lists.filter((item) => item.listId !== list.listId)];
      },
      error: (err) => (this.error = readErrorMessage(err))
    });
  }

  loadByBoard(): void {
    const boardId = this.form.controls.boardId.value;
    if (!boardId) {
      this.error = 'Board id is required';
      return;
    }
    this.listService.getByBoard(boardId).subscribe({ next: (lists) => (this.lists = lists), error: (err) => (this.error = readErrorMessage(err)) });
  }

  loadArchived(): void {
    const boardId = this.form.controls.boardId.value;
    if (!boardId) {
      this.error = 'Board id is required';
      return;
    }
    this.listService.getArchived(boardId).subscribe({ next: (lists) => (this.lists = lists), error: (err) => (this.error = readErrorMessage(err)) });
  }

  reorder(): void {
    const boardId = this.reorderBoardId.value;
    if (!boardId) {
      this.error = 'Board id is required';
      return;
    }

    const orderedIds = this.orderedIds.value
      .split(',')
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isFinite(value));

    const payload = orderedIds.map((taskListId, index) => ({ taskListId, position: index }));
    this.listService.reorder(boardId, payload).subscribe({ next: (lists) => (this.lists = lists), error: (err) => (this.error = readErrorMessage(err)) });
  }

  archive(): void {
    const listId = this.form.controls.listId.value;
    if (!listId) {
      this.error = 'List id is required';
      return;
    }
    this.listService.archive(listId).subscribe({ next: (message) => (this.message = message), error: (err) => (this.error = readErrorMessage(err)) });
  }

  unarchive(): void {
    const listId = this.form.controls.listId.value;
    if (!listId) {
      this.error = 'List id is required';
      return;
    }
    this.listService.unarchive(listId).subscribe({ next: (message) => (this.message = message), error: (err) => (this.error = readErrorMessage(err)) });
  }

  deleteList(): void {
    const listId = this.form.controls.listId.value;
    if (!listId) {
      this.error = 'List id is required';
      return;
    }
    this.listService.delete(listId).subscribe({ next: (message) => (this.message = message), error: (err) => (this.error = readErrorMessage(err)) });
  }
}