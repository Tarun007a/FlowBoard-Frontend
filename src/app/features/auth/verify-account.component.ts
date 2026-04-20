import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { readErrorMessage } from '../../core/utils/error.utils';

@Component({
  selector: 'app-verify-account-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './verify-account.component.html',
  styleUrl: './verify-account.component.css'
})
export class VerifyAccountComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);

  loading = true;
  error = '';
  success = '';

  ngOnInit(): void {
    const token = this.route.snapshot.paramMap.get('token');

    if (!token) {
      this.error = 'Missing verification token';
      this.loading = false;
      return;
    }

    this.auth
      .verify(token)
      .pipe(
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe({
        next: (message) => (this.success = message),
        error: (err) => (this.error = readErrorMessage(err))
      });
  }
}