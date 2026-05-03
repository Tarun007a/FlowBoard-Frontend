import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { readErrorMessage } from '../../core/utils/error.utils';

type VerificationState = 'verifying' | 'success' | 'failed';

@Component({
  selector: 'app-auth-verify',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './auth-verify.component.html',
  styleUrl: './auth-verify.component.css'
})
export class AuthVerifyComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  state: VerificationState = 'verifying';
  message = 'Verifying your account...';

  ngOnInit(): void {
    const token = this.route.snapshot.paramMap.get('token');

    if (!token) {
      this.state = 'failed';
      this.message = 'Invalid verification link';
      return;
    }

    this.auth
      .verifyEmail(token)
      .subscribe({
        next: () => {
          this.state = 'success';
          this.message = 'Your account is now verified. You can login now.';
        },
        error: (err) => {
          console.error(err);
          this.state = 'failed';
          this.message = readErrorMessage(err) || 'Verification failed';
        }
      });
  }

  goToLogin(): void {
    void this.router.navigate(['/login']);
  }
}
