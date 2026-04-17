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
  template: `
    <div class="stack">
      <section class="hero">
        <div class="badge">User Management</div>
        <h1>Inspect and update users</h1>
        <p class="muted">The backend exposes direct lookup, role and name search, bulk fetch, profile update, avatar change, and deletion endpoints.</p>
      </section>

      <section class="grid cols-2">
        <div class="panel section-card stack">
          <h2 class="section-title">Lookup</h2>
          <div class="grid cols-2">
            <div class="field">
              <label>Email</label>
              <input type="email" [formControl]="lookupEmail" />
            </div>
            <div class="field">
              <label>User ID</label>
              <input type="number" [formControl]="lookupId" />
            </div>
            <div class="field">
              <label>Full name</label>
              <input type="text" [formControl]="searchName" />
            </div>
            <div class="field">
              <label>Role</label>
              <input type="text" [formControl]="searchRole" />
            </div>
            <div class="field">
              <label>Bulk email list</label>
              <textarea [formControl]="bulkEmails"></textarea>
            </div>
            <div class="field">
              <label>Bulk ids</label>
              <textarea [formControl]="bulkIds"></textarea>
            </div>
          </div>

          <div class="actions">
            <button class="button secondary" type="button" (click)="fetchByEmail()">By email</button>
            <button class="button secondary" type="button" (click)="fetchById()">By id</button>
            <button class="button secondary" type="button" (click)="searchUsers()">Search</button>
            <button class="button secondary" type="button" (click)="fetchBulk()">Bulk ids</button>
            <button class="button secondary" type="button" (click)="resolveEmails()">Resolve ids from emails</button>
          </div>
        </div>

        <div class="panel section-card stack">
          <h2 class="section-title">Profile Update</h2>
          <form class="stack" [formGroup]="form" (ngSubmit)="updateUser()">
            <div class="grid cols-2">
              <div class="field">
                <label>User ID</label>
                <input type="number" formControlName="userId" />
              </div>
              <div class="field">
                <label>Full name</label>
                <input type="text" formControlName="fullName" />
              </div>
              <div class="field">
                <label>Avatar URL</label>
                <input type="text" formControlName="avatarUrl" />
              </div>
            </div>
            <div class="actions">
              <button class="button accent" type="submit" [disabled]="loading || form.invalid">Save profile</button>
              <button class="button danger" type="button" (click)="deleteUser()">Delete user</button>
              <button class="button secondary" type="button" (click)="updateAvatar()">Update avatar only</button>
            </div>
          </form>
        </div>
      </section>

      <section class="panel section-card stack">
        <div class="actions-between">
          <h2 class="section-title">Results</h2>
          <button class="button secondary" type="button" (click)="clearResults()">Clear</button>
        </div>

        <p class="error" *ngIf="error">{{ error }}</p>
        <p class="success" *ngIf="message">{{ message }}</p>

        <div class="surface result-box" *ngIf="singleUser">
          <div><span class="muted">Name</span><div>{{ singleUser.fullName }}</div></div>
          <div><span class="muted">Email</span><div>{{ singleUser.email }}</div></div>
          <div><span class="muted">User ID</span><div>{{ singleUser.userId }}</div></div>
          <div><span class="muted">Avatar</span><div>{{ singleUser.avatarUrl || '-' }}</div></div>
        </div>

        <table class="table" *ngIf="users.length">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Avatar</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let user of users">
              <td>{{ user.userId }}</td>
              <td>{{ user.fullName }}</td>
              <td>{{ user.email }}</td>
              <td>{{ user.avatarUrl || '-' }}</td>
            </tr>
          </tbody>
        </table>

        <pre class="surface json-box" *ngIf="jsonResult">{{ jsonResult }}</pre>
      </section>
    </div>
  `,
  styles: [
    `
      .section-card {
        padding: 18px;
      }

      .actions-between {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
      }

      .result-box,
      .json-box {
        padding: 14px;
        white-space: pre-wrap;
      }
    `
  ]
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