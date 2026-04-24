import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { readHttpErrorMessage } from '../../core/utils/error.utils';

@Component({
  selector: 'app-register-admin',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register-admin.component.html',
  styleUrl: './register-admin.component.css'
})
export class RegisterAdminComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  loading = false;
  error = '';

  form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]]
  });

  submit(): void {
    if (this.loading) {
      return;
    }

    this.error = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.auth.registerAdmin(this.form.getRawValue())
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          this.router.navigate(['/login']);
        },
        error: (err) => {
          const status = Number((err as { status?: unknown })?.status ?? 0);
          this.error = status === 401 || status === 403
            ? 'Unauthorized'
            : readHttpErrorMessage(err, 'Admin registration failed.');
        }
      });
  }
}
