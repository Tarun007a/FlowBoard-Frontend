import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, switchMap } from 'rxjs';
import { AuthSession, UserDto } from '../../core/models/auth.models';
import { AuthStoreService } from '../../core/services/auth-store.service';
import { CurrentUserProfileService } from '../../core/services/current-user-profile.service';
import { NotificationService } from '../../core/services/notification.service';
import { UserService } from '../../core/services/user.service';
import { readErrorMessage } from '../../core/utils/error.utils';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authStore = inject(AuthStoreService);
  private readonly userService = inject(UserService);
  private readonly profileState = inject(CurrentUserProfileService);
  private readonly notify = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  session: AuthSession | null = null;
  profile: UserDto | null = null;
  editing = false;
  saving = false;
  error = '';

  form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(3)]],
    avatarUrl: ['']
  });

  get avatarSeed(): string {
    const name = this.profile?.fullName?.trim() || this.profile?.email?.trim() || 'U';
    return name.charAt(0).toUpperCase();
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

    this.error = '';
    this.editing = true;
    this.form.reset({
      fullName: this.profile.fullName,
      avatarUrl: this.profile.avatarUrl || ''
    });
  }

  cancelEdit(): void {
    this.editing = false;
    this.error = '';

    if (!this.profile) {
      return;
    }

    this.form.reset({
      fullName: this.profile.fullName,
      avatarUrl: this.profile.avatarUrl || ''
    });
  }

  save(): void {
    this.error = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notify.error('Please fix validation errors before saving.');
      return;
    }

    if (!this.session?.userId) {
      this.error = 'Unable to determine logged-in user.';
      this.notify.error(this.error);
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
          this.notify.success('Profile updated successfully');
        },
        error: (err) => {
          const message = readErrorMessage(err);
          this.error = message;
          this.notify.error(message || 'Failed to update profile');
        }
      });
  }

  private loadProfile(): void {
    this.error = '';

    this.profileState.loadProfile().subscribe({
      next: () => void 0,
      error: (err) => {
        const message = readErrorMessage(err);
        this.error = message;
        this.notify.error(message || 'Failed to load profile');
      }
    });
  }
}