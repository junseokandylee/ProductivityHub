export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId: string;
  tenantName: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  name: string;
  password: string;
  tenantName: string;
  role?: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  token?: string;
  expiresAt?: string;
  user?: User;
}