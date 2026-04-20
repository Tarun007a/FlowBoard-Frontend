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
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.css'
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