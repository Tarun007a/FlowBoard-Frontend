import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { readHttpErrorMessage } from '../../core/utils/error.utils';

const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

@Component({
  selector: 'app-reset-password-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-page">
      <div class="auth-glow auth-glow-left"></div>
      <div class="auth-glow auth-glow-right"></div>

      <section class="panel auth-card">
        <div class="auth-header">
          <div>
            <div class="badge">Password recovery</div>
            <h1>Reset access</h1>
            <p class="muted">Use the same email, OTP, and new password payload the backend expects.</p>
          </div>
          <div class="auth-tabs">
            <span class="auth-tab" [class.active]="step === 1">1 Email</span>
            <span class="auth-tab" [class.active]="step === 2">2 OTP</span>
            <span class="auth-tab" [class.active]="step === 3">3 Password</span>
          </div>
        </div>

        <form class="stack" [formGroup]="form" (ngSubmit)="resetPassword()">
          <div class="step-panel" [class.active]="step === 1">
            <div class="field">
              <label for="email">Email</label>
              <input id="email" type="email" formControlName="email" autocomplete="email" />
            </div>
            <div class="actions">
              <button class="button accent" type="button" (click)="sendOtp()" [disabled]="otpLoading || loading || form.controls.email.invalid">
                {{ otpLoading ? 'Sending...' : 'Send OTP' }}
              </button>
              <button class="button secondary" type="button" (click)="step = 2" [disabled]="!form.controls.email.valid">I already have an OTP</button>
            </div>
          </div>

          <div class="step-panel" [class.active]="step === 2">
            <div class="field">
              <label for="otp">OTP</label>
              <input id="otp" type="text" formControlName="otp" maxlength="6" inputmode="numeric" />
            </div>
            <div class="actions">
              <button class="button accent" type="button" (click)="verifyOtp()" [disabled]="form.controls.otp.invalid">Verify OTP</button>
              <button class="button secondary" type="button" (click)="step = 1">Back</button>
            </div>
          </div>

          <div class="step-panel" [class.active]="step === 3">
            <div class="field">
              <label for="newPassword">New password</label>
              <input id="newPassword" type="password" formControlName="newPassword" autocomplete="new-password" />
            </div>
            <div class="actions">
              <button class="button accent" type="submit" [disabled]="loading || otpLoading || form.invalid">
                {{ loading ? 'Updating...' : 'Reset password' }}
              </button>
              <a class="button secondary" routerLink="/login">Back to login</a>
            </div>
          </div>

          <p class="error" *ngIf="error">{{ error }}</p>
          <p class="success" *ngIf="success">{{ success }}</p>
        </form>
      </section>
    </div>
  `,
  styles: [
    `
      .auth-page {
        min-height: 100dvh;
        display: grid;
        place-items: center;
        padding: 20px;
        position: relative;
        overflow: hidden;
      }

      .auth-card {
        width: min(560px, 100%);
        padding: 20px;
        position: relative;
        z-index: 1;
      }

      .auth-header {
        display: grid;
        gap: 12px;
        margin-bottom: 14px;
      }

      .auth-header h1 {
        margin: 8px 0 4px;
        font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
        font-size: 1.3rem;
      }

      .auth-tabs {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      .auth-tab {
        border-radius: 6px;
        padding: 0.42rem 0.68rem;
        background: #dfe1e6;
        color: #44546f;
        font-size: 0.82rem;
        font-weight: 600;
      }

      .auth-tab.active {
        background: #0c66e4;
        color: #ffffff;
        font-weight: 700;
      }

      .step-panel {
        display: none;
        gap: 16px;
        padding: 14px;
        border-radius: 10px;
        border: 1px solid #dfe1e6;
        background: #f7f8f9;
      }

      .step-panel.active {
        display: grid;
      }

      .auth-glow {
        position: absolute;
        width: 320px;
        height: 320px;
        border-radius: 999px;
        filter: blur(18px);
        opacity: 0.22;
        pointer-events: none;
      }

      .auth-glow-left {
        background: rgba(0, 121, 191, 0.35);
        top: -80px;
        left: -90px;
      }

      .auth-glow-right {
        background: rgba(255, 255, 255, 0.35);
        bottom: -80px;
        right: -90px;
      }

      @media (max-width: 760px) {
        .auth-card {
          padding: 18px;
        }
      }
    `
  ]
})
export class ResetPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly notify = inject(NotificationService);

  loading = false;
  otpLoading = false;
  step = 1;
  error = '';
  success = '';

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    otp: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6), Validators.pattern(/^\d{6}$/)]],
    newPassword: ['', [Validators.required, Validators.minLength(8), Validators.pattern(PASSWORD_RULE)]]
  });

  sendOtp(): void {
    if (this.otpLoading) {
      return;
    }

    this.error = '';
    this.success = '';

    if (this.form.controls.email.invalid) {
      this.form.controls.email.markAsTouched();
      this.error = 'Please enter a valid email address.';
      return;
    }

    this.otpLoading = true;
    this.auth
      .sendOtp(this.form.controls.email.value)
      .pipe(finalize(() => (this.otpLoading = false)))
      .subscribe({
        next: () => {
          this.success = 'OTP sent successfully';
          this.notify.success('OTP sent successfully');
          this.step = 2;
        },
        error: (err) => {
          const message = readHttpErrorMessage(err, 'Unable to send OTP. Please try again.');
          this.error = message;
          this.notify.error(message);
        }
      });
  }

  verifyOtp(): void {
    this.error = '';

    if (this.form.controls.otp.invalid) {
      this.form.controls.otp.markAsTouched();
      this.error = 'Please enter the 6-digit OTP.';
      return;
    }

    this.step = 3;
    this.success = 'OTP accepted. Set a new password to finish.';
  }

  resetPassword(): void {
    if (this.loading) {
      return;
    }

    this.error = '';
    this.success = '';

    if (this.form.controls.email.invalid) {
      this.form.controls.email.markAsTouched();
      this.error = 'Please enter a valid email address.';
      return;
    }

    if (this.form.controls.otp.invalid) {
      this.form.controls.otp.markAsTouched();
      this.error = 'Please enter the 6-digit OTP.';
      return;
    }

    if (this.form.controls.newPassword.invalid) {
      this.form.controls.newPassword.markAsTouched();
      this.error = this.form.controls.newPassword.hasError('pattern')
        ? 'Password must include uppercase, lowercase, number, and special character.'
        : 'Please enter a valid new password.';
      return;
    }

    this.loading = true;
    this.auth
      .resetPassword(this.form.getRawValue())
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (message) => {
          this.success = message || 'Password reset successfully';
          this.notify.success(this.success);
          this.step = 1;
          this.form.reset({ email: '', otp: '', newPassword: '' });
        },
        error: (err) => {
          const message = readHttpErrorMessage(err, 'Unable to reset password. Please try again.');
          this.error = message;
          this.notify.error(message);
        }
      });
  }
}