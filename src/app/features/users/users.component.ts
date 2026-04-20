import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, Observable } from 'rxjs';
import { UserDto } from '../../core/models/auth.models';
import { UserService } from '../../core/services/user.service';
import { readErrorMessage, splitCsvNumbers } from '../../core/utils/error.utils';

@Component({
  selector: 'app-users-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './users.component.html',
  styleUrl: './users.component.css'
})
export class UsersComponent {
  private readonly fb = inject(FormBuilder);
  private readonly userService = inject(UserService);

  loading = false;
  error = '';
  message = '';
  users: UserDto[] = [];
  singleUser: UserDto | null = null;
  jsonResult = '';

  lookupEmail = this.fb.nonNullable.control('', [Validators.email]);
  lookupId = this.fb.nonNullable.control<number | null>(null);
  searchName = this.fb.nonNullable.control('');
  searchRole = this.fb.nonNullable.control('');
  bulkEmails = this.fb.nonNullable.control('');
  bulkIds = this.fb.nonNullable.control('');

  form = this.fb.nonNullable.group({
    userId: [null as number | null, [Validators.required]],
    fullName: ['', [Validators.required]],
    avatarUrl: ['']
  });

  clearResults(): void {
    this.error = '';
    this.message = '';
    this.users = [];
    this.singleUser = null;
    this.jsonResult = '';
  }

  fetchByEmail(): void {
    const email = this.lookupEmail.value.trim();

    if (!email) {
      this.error = 'Email is required';
      return;
    }

    this.run(this.userService.getByEmail(email), (user) => (this.singleUser = user));
  }

  fetchById(): void {
    const userId = this.lookupId.value;

    if (!userId) {
      this.error = 'User id is required';
      return;
    }

    this.run(this.userService.getById(userId), (user) => (this.singleUser = user));
  }

  searchUsers(): void {
    const name = this.searchName.value.trim();
    const role = this.searchRole.value.trim();

    if (name) {
      this.run(this.userService.searchByName(name), (page) => (this.users = page.content));
      return;
    }

    if (role) {
      this.run(this.userService.searchByRole(role), (page) => (this.users = page.content));
      return;
    }

    this.error = 'Enter a name or role';
  }

  fetchBulk(): void {
    const ids = splitCsvNumbers(this.bulkIds.value);

    if (!ids.length) {
      this.error = 'Enter at least one numeric id';
      return;
    }

    this.run(this.userService.getBulk(ids), (items) => (this.users = items));
  }

  resolveEmails(): void {
    const emails = this.bulkEmails.value
      .split(/[\n,]/)
      .map((value) => value.trim())
      .filter(Boolean);

    if (!emails.length) {
      this.error = 'Enter at least one email';
      return;
    }

    this.run(this.userService.findAllIds(emails), (items) => (this.jsonResult = JSON.stringify(items, null, 2)));
  }

  updateUser(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.run(this.userService.update(value.userId as number, { fullName: value.fullName, avatarUrl: value.avatarUrl }), (user) => {
      this.singleUser = user;
      this.message = 'User updated';
    });
  }

  updateAvatar(): void {
    const value = this.form.getRawValue();

    if (!value.userId) {
      this.error = 'User id is required';
      return;
    }

    this.run(this.userService.updateAvatar(value.userId as number, value.avatarUrl || ''), (user) => {
      this.singleUser = user;
      this.message = 'Avatar updated';
    });
  }

  deleteUser(): void {
    const value = this.form.getRawValue();

    if (!value.userId) {
      this.error = 'User id is required';
      return;
    }

    this.run(this.userService.delete(value.userId as number), (text) => {
      this.message = text;
      this.jsonResult = text;
    });
  }

  private run<T>(request$: Observable<T>, onSuccess: (value: T) => void): void {
    this.loading = true;
    this.error = '';
    this.message = '';
    this.jsonResult = '';

    request$
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (value: T) => {
          onSuccess(value);
        },
        error: (err: unknown) => (this.error = readErrorMessage(err))
      });
  }
}