import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TaskListRequest, TaskListResponse } from '../../core/models/list.models';
import { ListService } from '../../core/services/list.service';

@Component({
  selector: 'app-lists-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './lists.component.html',
  styleUrl: './lists.component.css'
})
export class ListsComponent {
  private readonly fb = inject(FormBuilder);
  private readonly listService = inject(ListService);

  lists: TaskListResponse[] = [];

  // Main form for creating/updating a list
  form = this.fb.nonNullable.group({
    listId: [null as number | null],
    boardId: [null as number | null, [Validators.required]],
    name: ['', [Validators.required]]
  });

  // Standalone controls for the reorder section (not part of the main form)
  reorderBoardId = this.fb.nonNullable.control<number | null>(null);
  orderedIds = this.fb.nonNullable.control('');

  // Populate the form when user clicks a list row in the table
  edit(item: TaskListResponse): void {
    this.form.patchValue({
      listId: item.listId,
      boardId: Number(item.boardId),
      name: item.name
    });
  }

  // Create a new list or update an existing one (if listId is set)
  saveList(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const payload = { boardId: value.boardId as number, name: value.name } as TaskListRequest;
    const request$ = value.listId
      ? this.listService.update(value.listId, payload)
      : this.listService.create(payload);

    request$.subscribe({
      next: (list) => {
        // Add the new/updated list to the top, removing the old version if it existed
        this.lists = [list, ...this.lists.filter((item) => item.listId !== list.listId)];
      },
      error: (err) => console.error(err)
    });
  }

  loadByBoard(): void {
    const boardId = this.form.controls.boardId.value;
    if (!boardId) { console.error('Board id is required'); return; }
    this.listService.getByBoard(boardId).subscribe({
      next: (lists) => (this.lists = lists),
      error: (err) => console.error(err)
    });
  }

  loadArchived(): void {
    const boardId = this.form.controls.boardId.value;
    if (!boardId) { console.error('Board id is required'); return; }
    this.listService.getArchived(boardId).subscribe({
      next: (lists) => (this.lists = lists),
      error: (err) => console.error(err)
    });
  }

  reorder(): void {
    const boardId = this.reorderBoardId.value;
    if (!boardId) { console.error('Board id is required'); return; }

    // Parse comma-separated IDs into an array of numbers
    const orderedIds = this.orderedIds.value
      .split(',')
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isFinite(value));

    const payload = orderedIds.map((taskListId, index) => ({ taskListId, position: index }));
    this.listService.reorder(boardId, payload).subscribe({
      next: (lists) => (this.lists = lists),
      error: (err) => console.error(err)
    });
  }

  archive(): void {
    const listId = this.form.controls.listId.value;
    if (!listId) { console.error('List id is required'); return; }
    this.listService.archive(listId).subscribe({
      next: () => void 0,
      error: (err) => console.error(err)
    });
  }

  unarchive(): void {
    const listId = this.form.controls.listId.value;
    if (!listId) { console.error('List id is required'); return; }
    this.listService.unarchive(listId).subscribe({
      next: () => void 0,
      error: (err) => console.error(err)
    });
  }

  deleteList(): void {
    const listId = this.form.controls.listId.value;
    if (!listId) { console.error('List id is required'); return; }
    this.listService.delete(listId).subscribe({
      next: () => void 0,
      error: (err) => console.error(err)
    });
  }
}
