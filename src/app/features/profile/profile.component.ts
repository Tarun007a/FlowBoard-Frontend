import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize, switchMap } from 'rxjs';
import { AuthSession, UserDto } from '../../core/models/auth.models';
import { AuthService } from '../../core/services/auth.service';
import { AuthStoreService } from '../../core/services/auth-store.service';
import { CurrentUserProfileService } from '../../core/services/current-user-profile.service';
import { UserService } from '../../core/services/user.service';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly authStore = inject(AuthStoreService);
  private readonly userService = inject(UserService);
  private readonly profileState = inject(CurrentUserProfileService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  session: AuthSession | null = null;
  profile: UserDto | null = null;
  editing = false;
  saving = false;

  form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(3)]],
    avatarUrl: ['']
  });

  get avatarSeed(): string {
    const name = this.profile?.fullName?.trim() || this.profile?.email?.trim() || 'U';
    return name.charAt(0).toUpperCase();
  }

  get displayName(): string {
    return this.profile?.fullName?.trim() || 'User Profile';
  }

  get displayEmail(): string {
    return this.profile?.email?.trim() || this.session?.email || '-';
  }

  get displayUsername(): string {
    const email = this.profile?.email?.trim() || this.session?.email || '';
    const [username] = email.split('@');
    return username || '-';
  }

  get roleLabel(): string {
    return (this.session?.role || 'USER').toUpperCase();
  }

  ngOnInit(): void {
    this.session = this.authStore.snapshot() ?? this.authStore.restore();

    this.profileState.profile$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((profile) => {
        this.profile = profile;

        if (profile && !this.editing) {
          this.form.reset({
            fullName: profile.fullName,
            avatarUrl: profile.avatarUrl || ''
          });
        }
      });

    this.loadProfile();
  }

  startEdit(): void {
    if (!this.profile) {
      return;
    }

    this.editing = true;
    this.form.reset({
      fullName: this.profile.fullName,
      avatarUrl: this.profile.avatarUrl || ''
    });
  }

  cancelEdit(): void {
    this.editing = false;

    if (!this.profile) {
      return;
    }

    this.form.reset({
      fullName: this.profile.fullName,
      avatarUrl: this.profile.avatarUrl || ''
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (!this.session?.userId) {
      console.error('Unable to determine logged-in user.');
      return;
    }

    const payload = this.form.getRawValue();
    this.saving = true;

    this.userService
      .update(this.session.userId, {
        fullName: payload.fullName.trim(),
        avatarUrl: payload.avatarUrl.trim()
      })
      .pipe(
        switchMap(() => this.profileState.loadProfile(true)),
        finalize(() => (this.saving = false))
      )
      .subscribe({
        next: (profile) => {
          this.profileState.setProfile(profile);
          this.editing = false;
        },
        error: (err) => console.error(err)
      });
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  private loadProfile(): void {
    this.profileState.loadProfile().subscribe({
      next: () => void 0,
      error: (err) => console.error(err)
    });
  }
}
