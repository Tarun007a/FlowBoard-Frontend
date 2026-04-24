import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AuthSession } from '../models/auth.models';
import { decodeTokenPayload } from '../utils/jwt.utils';
import { SessionService } from './session.service';

@Injectable({ providedIn: 'root' })
export class AuthStoreService {
  private readonly sessionSubject = new BehaviorSubject<AuthSession | null>(null);
  readonly session$ = this.sessionSubject.asObservable();

  constructor(private readonly session: SessionService) {
    this.sessionSubject.next(this.session.read());
  }

  snapshot(): AuthSession | null {
    return this.sessionSubject.value;
  }

  isLoggedIn(): boolean {
    return Boolean(this.sessionSubject.value?.token);
  }

  saveToken(token: string): AuthSession | null {
    const payload = decodeTokenPayload(token);
    const session: AuthSession | null = payload
      ? {
          token,
          userId: Number(payload['userId'] ?? 0),
          email: String(payload['username'] ?? payload['email'] ?? payload['sub'] ?? ''),
          role: String(payload['role'] ?? 'USER')
        }
      : null;

    if (!session || !session.userId) {
      return null;
    }

    this.session.write(session);
    this.sessionSubject.next(session);
    return session;
  }

  restore(): AuthSession | null {
    const stored = this.session.read();
    this.sessionSubject.next(stored);
    return stored;
  }

  clear(): void {
    this.session.clear();
    this.sessionSubject.next(null);
  }
}