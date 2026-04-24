import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiPage } from '../models/api-page.model';
import { UserDto } from '../models/auth.models';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class AdminService {
  constructor(private readonly api: ApiService) {}

  getAllUsers(page = 0, size = 100, sortBy = 'userId', direction = 'asc'): Observable<ApiPage<UserDto>> {
    return this.api.get<ApiPage<UserDto>>('/api/v1/admin/user/all', { page, size, sortBy, direction });
  }

  searchByUsername(fullName: string, page = 0, size = 100, sortBy = 'userId', direction = 'asc'): Observable<ApiPage<UserDto>> {
    return this.api.get<ApiPage<UserDto>>(`/api/v1/admin/name/${encodeURIComponent(fullName)}`, {
      page,
      size,
      sortBy,
      direction
    });
  }

  searchByEmail(email: string): Observable<UserDto> {
    return this.api.get<UserDto>(`/api/v1/admin/email/${encodeURIComponent(email)}`);
  }

  disableUser(userId: number): Observable<string> {
    return this.api.putText(`/api/v1/admin/disable/${userId}`, {});
  }

  enableUser(userId: number): Observable<string> {
    return this.api.putText(`/api/v1/admin/enable/${userId}`, {});
  }

  deleteUser(userId: number): Observable<string> {
    return this.api.deleteText(`/api/v1/admin/${userId}`);
  }
}
