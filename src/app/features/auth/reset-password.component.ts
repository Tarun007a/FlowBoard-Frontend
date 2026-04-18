import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { readHttpErrorMessage } from '../../core/utils/error.utils';

const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
const VERIFICATION_CODE_RULE = /^[A-Za-z0-9]{6}$/;

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
            <p class="muted">Recover your account in two quick steps.</p>
          </div>
          <div class="auth-tabs">
            <span class="auth-tab" [class.active]="step === 1">1 Send Code</span>
            <span class="auth-tab" [class.active]="step === 2">2 Reset Password</span>
          </div>
        </div>

        <form class="stack" [formGroup]="form" (ngSubmit)="resetPassword()">
          <div class="step-panel" *ngIf="step === 1">
            <div class="field">
              <label for="email">Email</label>
              <input id="email" type="email" formControlName="email" autocomplete="email" />
              <p class="error" *ngIf="form.controls.email.touched && form.controls.email.invalid">Please enter a valid email address.</p>
            </div>
            <div class="actions">
              <button class="button accent" type="button" (click)="sendOtp()" [disabled]="otpLoading || loading || form.controls.email.invalid">
                {{ otpLoading ? 'Sending...' : 'Send Code' }}
              </button>
              <a class="button secondary" routerLink="/login">Back to login</a>
            </div>
          </div>

          <div class="step-panel" *ngIf="step === 2">
            <div class="field">
              <label for="otp">Enter Verification Code</label>
              <input
                id="otp"
                type="text"
                formControlName="otp"
                maxlength="6"
                inputmode="text"
                placeholder="Enter 6-character code"
                (keydown)="preventSpace($event)"
                (input)="normalizeCodeInput()"
                (paste)="onCodePaste($event)"
              />
              <p class="error" *ngIf="form.controls.otp.touched && form.controls.otp.invalid">Code must be 6 letters or numbers</p>
            </div>

            <div class="field">
              <label for="newPassword">New password</label>
              <input id="newPassword" type="password" formControlName="newPassword" autocomplete="new-password" />
            </div>

            <div class="actions">
              <button class="button accent" type="submit" [disabled]="loading || otpLoading">
                {{ loading ? 'Resetting...' : 'Reset Password' }}
              </button>
              <button class="button secondary" type="button" (click)="step = 1" [disabled]="loading">Back</button>
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
        display: grid;
        gap: 16px;
        padding: 14px;
        border-radius: 10px;
        border: 1px solid #dfe1e6;
        background: #f7f8f9;
        animation: stepIn 220ms ease;
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

      @keyframes stepIn {
        from {
          opacity: 0;
          transform: translateY(8px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `
  ]
})
export class ResetPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly notify = inject(NotificationService);
  private readonly router = inject(Router);

  loading = false;
  otpLoading = false;
  step = 1;
  error = '';
  success = '';

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    otp: ['', [Validators.required, Validators.pattern(VERIFICATION_CODE_RULE)]],
    newPassword: ['', [Validators.required, Validators.minLength(8), Validators.pattern(PASSWORD_RULE)]]
  });

  preventSpace(event: KeyboardEvent): void {
    if (event.key === ' ') {
      event.preventDefault();
    }
  }

  normalizeCodeInput(): void {
    const currentValue = this.form.controls.otp.value;
    const normalized = currentValue.replace(/\s+/g, '').slice(0, 6);

    if (normalized !== currentValue) {
      this.form.controls.otp.setValue(normalized, { emitEvent: false });
    }
  }

  onCodePaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pastedText = event.clipboardData?.getData('text') ?? '';
    const normalized = pastedText.replace(/\s+/g, '').slice(0, 6);
    this.form.controls.otp.setValue(normalized);
    this.form.controls.otp.markAsTouched();
  }

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
          this.success = 'Code sent successfully';
          this.notify.success('Code sent successfully');
          this.step = 2;
          this.form.controls.otp.markAsPristine();
          this.form.controls.newPassword.markAsPristine();
        },
        error: (err) => {
          const message = readHttpErrorMessage(err, 'Unable to send code. Please try again.');
          this.error = message;
          this.notify.error(message);
        }
      });
  }

  resetPassword(): void {
    if (this.loading || this.step !== 2) {
      return;
    }

    this.error = '';
    this.success = '';

    if (this.form.controls.email.invalid) {
      this.form.controls.email.markAsTouched();
      this.error = 'Please enter a valid email address.';
      return;
    }

    this.normalizeCodeInput();

    if (this.form.controls.otp.invalid) {
      this.form.controls.otp.markAsTouched();
      this.error = 'Code must be 6 letters or numbers';
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
        next: () => {
          this.success = 'Password reset successful';
          this.notify.success('Password reset successful');
          this.form.reset({ email: '', otp: '', newPassword: '' });
          void this.router.navigate(['/login']);
        },
        error: (err) => {
          const message = readHttpErrorMessage(err, 'Unable to reset password. Please try again.');
          const isCodeError = /otp|code/i.test(message) && /invalid|wrong|incorrect|expired/i.test(message);

          if (isCodeError) {
            this.error = 'Invalid code';
            this.notify.error('Invalid code');
            return;
          }

          this.error = message;
          this.notify.error(message);
        }
      });
  }
}