import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, debounceTime, distinctUntilChanged, finalize, of } from 'rxjs';
import { UserDto } from '../../core/models/auth.models';
import { AdminService } from '../../core/services/admin.service';
import { AuthService } from '../../core/services/auth.service';
import { readHttpErrorMessage } from '../../core/utils/error.utils';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css'
})
export class AdminDashboardComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly adminService = inject(AdminService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly searchForm = this.fb.nonNullable.group({
    query: ['']
  });

  loading = false;
  actionLoadingUserId: number | null = null;
  error = '';

  users: UserDto[] = [];
  private allUsers: UserDto[] = [];

  ngOnInit(): void {
    this.loadUsers();

    this.searchForm.controls.query.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.search(value.trim()));
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  onSearchSubmit(): void {
    const term = this.searchForm.controls.query.value.trim();
    this.search(term);
  }

  statusLabel(user: UserDto): 'Enabled' | 'Disabled' {
    return user.isActive ? 'Enabled' : 'Disabled';
  }

  isDisabled(user: UserDto): boolean {
    return !user.isActive;
  }

  toggleStatus(user: UserDto): void {
    const currentlyEnabled = user.isActive;
    const request$ = currentlyEnabled
      ? this.adminService.disableUser(user.userId)
      : this.adminService.enableUser(user.userId);

    this.actionLoadingUserId = user.userId;
    request$
      .pipe(finalize(() => (this.actionLoadingUserId = null)))
      .subscribe({
        next: () => {
          this.updateUserStatus(user.userId, !currentlyEnabled);
        },
        error: (err) => {
          this.error = readHttpErrorMessage(err, 'Failed to update user status.');
        }
      });
  }

  deleteUser(user: UserDto): void {
    const confirmed = window.confirm('Delete this user?');
    if (!confirmed) {
      return;
    }

    this.actionLoadingUserId = user.userId;
    this.adminService
      .deleteUser(user.userId)
      .pipe(finalize(() => (this.actionLoadingUserId = null)))
      .subscribe({
        next: () => {
          this.users = this.users.filter((item) => item.userId !== user.userId);
          this.allUsers = this.allUsers.filter((item) => item.userId !== user.userId);
        },
        error: (err) => {
          this.error = readHttpErrorMessage(err, 'Failed to delete user.');
        }
      });
  }

  trackByUserId(_: number, user: UserDto): number {
    return user.userId;
  }

  private loadUsers(): void {
    this.loading = true;
    this.error = '';

    this.adminService
      .getAllUsers()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (page) => {
          this.allUsers = page.content;
          this.users = [...this.allUsers];
        },
        error: (err) => {
          this.error = readHttpErrorMessage(err, 'Failed to load users.');
          this.users = [];
          this.allUsers = [];
        }
      });
  }

  private search(term: string): void {
    this.error = '';

    if (!term) {
      this.users = [...this.allUsers];
      return;
    }

    this.loading = true;

    if (term.includes('@')) {
      this.adminService
        .searchByEmail(term)
        .pipe(
          catchError(() => {
            const lowered = term.toLowerCase();
            this.users = this.allUsers.filter((user) =>
              user.email.toLowerCase().includes(lowered) || user.fullName.toLowerCase().includes(lowered)
            );
            return of(null);
          }),
          finalize(() => (this.loading = false))
        )
        .subscribe((user) => {
          if (user) {
            this.users = [user];
          }
        });
      return;
    }

    this.adminService
      .searchByUsername(term)
      .pipe(
        catchError(() => {
          const lowered = term.toLowerCase();
          this.users = this.allUsers.filter((user) =>
            user.fullName.toLowerCase().includes(lowered) || user.email.toLowerCase().includes(lowered)
          );
          return of(null);
        }),
        finalize(() => (this.loading = false))
      )
      .subscribe((page) => {
        if (page) {
          const lowered = term.toLowerCase();
          const emailMatches = this.allUsers.filter((user) => user.email.toLowerCase().includes(lowered));
          const merged = new Map<number, UserDto>();

          for (const user of page.content) {
            merged.set(user.userId, user);
          }

          for (const user of emailMatches) {
            merged.set(user.userId, user);
          }

          this.users = Array.from(merged.values());
        }
      });
  }

  private updateUserStatus(userId: number, isActive: boolean): void {
    const update = (item: UserDto): UserDto =>
      item.userId === userId ? { ...item, isActive } : item;

    this.users = this.users.map(update);
    this.allUsers = this.allUsers.map(update);
  }
}
