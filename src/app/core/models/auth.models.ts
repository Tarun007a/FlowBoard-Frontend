export interface SignupRequest {
  fullName: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ForgetPasswordRequest {
  email: string;
  otp: string;
  newPassword: string;
}

export interface UserUpdateRequest {
  fullName: string;
  avatarUrl: string;
}

export interface UserDto {
  fullName: string;
  email: string;
  avatarUrl: string | null;
  userId: number;
}

export interface AuthSession {
  token: string;
  userId: number;
  email: string;
  role: string;
}