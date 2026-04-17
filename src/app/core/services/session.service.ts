import { Injectable } from '@angular/core';
import { AuthSession } from '../models/auth.models';

const SESSION_KEY = 'flowboard.session';

@Injectable({ providedIn: 'root' })
export class SessionService {
  read(): AuthSession | null {
    const raw = localStorage.getItem(SESSION_KEY);

    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as AuthSession;
    } catch {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
  }

  write(session: AuthSession): void {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  clear(): void {
    localStorage.removeItem(SESSION_KEY);
  }
}