import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { ApiPage } from '../models/api-page.model';
import { UserDto, UserUpdateRequest } from '../models/auth.models';

@Injectable({ providedIn: 'root' })
export class UserService {
  constructor(private readonly api: ApiService) {}

  getByEmail(email: string) {
    return this.api.get<UserDto>(`/api/v1/user/user-email/${encodeURIComponent(email)}`);
  }

  getById(userId: number) {
    return this.api.get<UserDto>(`/api/v1/user/id/${userId}`);
  }

  delete(userId: number) {
    return this.api.deleteText(`/api/v1/user/delete/${userId}`);
  }

  update(userId: number, request: UserUpdateRequest) {
    return this.api.put<UserDto>(`/api/v1/user/update/${userId}`, request);
  }

  updateAvatar(userId: number, url: string) {
    return this.api.patch<UserDto>(`/api/v1/user/avtarurl/${userId}/${encodeURIComponent(url)}`);
  }

  searchByRole(role: string, page = 0, size = 10, sortBy = 'userId', direction = 'ASC') {
    return this.api.get<ApiPage<UserDto>>(`/api/v1/user/role/${encodeURIComponent(role)}`, { page, size, sortBy, direction });
  }

  searchByName(fullName: string, page = 0, size = 10, sortBy = 'userId', direction = 'ASC') {
    return this.api.get<ApiPage<UserDto>>(`/api/v1/user/name/${encodeURIComponent(fullName)}`, { page, size, sortBy, direction });
  }

  getBulk(userIds: number[]) {
    return this.api.get<UserDto[]>(`/api/v1/user/bulk`, { userIds });
  }

  getEmail(userId: number) {
    return this.api.getText(`/api/v1/user/email/${userId}`);
  }

  findAllIds(userEmailList: string[]) {
    return this.api.get<number[]>(`/api/v1/user/findAll`, { userEmailList });
  }
}