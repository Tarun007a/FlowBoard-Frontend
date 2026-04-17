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
  template: `
    <div class="profile-page stack">
      <section class="panel profile-header" *ngIf="profile; else loadingState">
        <div class="profile-left">
          <div class="avatar-frame" *ngIf="profile.avatarUrl; else initialsAvatar">
            <img [src]="profile.avatarUrl" alt="Profile avatar" />
          </div>
          <ng-template #initialsAvatar>
            <div class="avatar-fallback">{{ avatarSeed }}</div>
          </ng-template>
        </div>

        <div class="profile-right">
          <div class="badge">My Profile</div>
          <h1>{{ profile.fullName || 'User Profile' }}</h1>
          <p class="muted">Manage your personal details available in the current backend profile DTO.</p>

          <div class="details-grid">
            <article class="detail-item">
              <span class="detail-label">Full Name</span>
              <strong>{{ profile.fullName || '-' }}</strong>
            </article>
            <article class="detail-item">
              <span class="detail-label">Email</span>
              <strong>{{ profile.email || '-' }}</strong>
            </article>
            <article class="detail-item">
              <span class="detail-label">User ID</span>
              <strong>{{ profile.userId }}</strong>
            </article>
            <article class="detail-item">
              <span class="detail-label">Role</span>
              <strong>{{ session?.role || '-' }}</strong>
            </article>
          </div>

          <div class="actions">
            <button class="button accent" type="button" *ngIf="!editing" (click)="startEdit()">Edit Profile</button>
          </div>
        </div>
      </section>

      <section class="panel edit-card stack" *ngIf="editing">
        <header class="edit-head">
          <h2 class="section-title">Update Profile</h2>
          <p class="muted">Only fields supported by backend update DTO are editable.</p>
        </header>

        <form class="stack" [formGroup]="form" (ngSubmit)="save()">
          <div class="grid cols-2">
            <div class="field">
              <label for="fullName">Full Name</label>
              <input id="fullName" type="text" formControlName="fullName" placeholder="Enter full name" />
              <small class="error" *ngIf="form.controls.fullName.touched && form.controls.fullName.invalid">
                Full name is required (min 3 characters).
              </small>
            </div>

            <div class="field">
              <label for="email">Email (Read only)</label>
              <input id="email" type="email" [value]="profile?.email || ''" readonly />
            </div>

            <div class="field full">
              <label for="avatarUrl">Profile Image URL</label>
              <input id="avatarUrl" type="text" formControlName="avatarUrl" placeholder="https://example.com/avatar.png" />
            </div>
          </div>

          <p class="error" *ngIf="error">{{ error }}</p>

          <div class="actions">
            <button class="button accent" type="submit" [disabled]="saving || form.invalid">
              {{ saving ? 'Saving...' : 'Save Changes' }}
            </button>
            <button class="button secondary" type="button" [disabled]="saving" (click)="cancelEdit()">Cancel</button>
          </div>
        </form>
      </section>
    </div>

    <ng-template #loadingState>
      <section class="panel loading-card stack">
        <div class="badge">Profile</div>
        <h2 class="section-title">Loading your profile</h2>
        <p class="muted">Please wait while we fetch your profile details.</p>
      </section>
    </ng-template>
  `,
  styles: [
    `
      .profile-page {
        gap: 14px;
      }

      .profile-header {
        padding: 18px;
        display: grid;
        grid-template-columns: 180px minmax(0, 1fr);
        gap: 18px;
        align-items: start;
      }

      .profile-left {
        display: grid;
        place-items: center;
      }

      .avatar-frame,
      .avatar-fallback {
        width: 132px;
        height: 132px;
        border-radius: 18px;
        border: 1px solid #c9ddf6;
        background: #eff6ff;
        box-shadow: 0 10px 22px rgba(30, 74, 135, 0.12);
      }

      .avatar-frame {
        overflow: hidden;
      }

      .avatar-frame img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .avatar-fallback {
        display: grid;
        place-items: center;
        color: #1b5ba2;
        font-size: 2.1rem;
        font-weight: 800;
      }

      .profile-right h1 {
        margin: 10px 0 6px;
      }

      .profile-right > .muted {
        margin: 0;
      }

      .details-grid {
        margin-top: 14px;
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
      }

      .detail-item {
        border: 1px solid #d5e3f4;
        border-radius: 12px;
        background: #f8fbff;
        padding: 10px 12px;
        display: grid;
        gap: 4px;
      }

      .detail-label {
        color: #5b708a;
        font-size: 0.78rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.03em;
      }

      .detail-item strong {
        color: #203850;
      }

      .edit-card,
      .loading-card {
        padding: 18px;
      }

      .edit-head h2 {
        margin: 0;
      }

      .edit-head p {
        margin: 5px 0 0;
      }

      @media (max-width: 900px) {
        .profile-header {
          grid-template-columns: 1fr;
        }

        .details-grid {
          grid-template-columns: 1fr;
        }
      }
    `
  ]
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
  private loadedToastShown = false;

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
      next: () => {
        if (!this.loadedToastShown) {
          this.notify.info('Profile loaded');
          this.loadedToastShown = true;
        }
      },
      error: (err) => {
        const message = readErrorMessage(err);
        this.error = message;
        this.notify.error(message || 'Failed to load profile');
      }
    });
  }
}