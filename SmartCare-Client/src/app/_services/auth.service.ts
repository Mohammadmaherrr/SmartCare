import { Injectable, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { jwtDecode } from 'jwt-decode';
import { ApiService } from './api.service';
import { AuthResponse, PatientRegisterDto, Role, User } from '../_models/user.model';

interface JwtClaims {
  email?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'token';
  private readonly USER_KEY = 'currentUser';

  readonly currentUser = signal<User | null>(null);

  constructor(private api: ApiService) {
    this.loadUserFromStorage();
  }

  login(email: string, password: string): Observable<void> {
    return this.api.post<AuthResponse>('auth/login', { email, password }).pipe(
      tap((res) => {
        const decoded = jwtDecode<JwtClaims>(res.token);
        const user: User = {
          id: res.userId,
          fullName: res.fullName,
          email: decoded.email ?? email,
          role: res.role,
          accountStatus: 'Active',
        };
        localStorage.setItem(this.TOKEN_KEY, res.token);
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
        this.currentUser.set(user);
      }),
      map(() => void 0),
    );
  }

  register(dto: PatientRegisterDto): Observable<void> {
    return this.api.post<AuthResponse>('auth/register', dto).pipe(
      tap((res) => {
        const decoded = jwtDecode<JwtClaims>(res.token);
        const user: User = {
          id: res.userId,
          fullName: res.fullName,
          email: decoded.email ?? dto.email,
          role: res.role,
          accountStatus: 'Active',
        };
        localStorage.setItem(this.TOKEN_KEY, res.token);
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
        this.currentUser.set(user);
      }),
      map(() => void 0),
    );
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUser.set(null);
  }

  hasRole(role: Role): boolean {
    return this.currentUser()?.role === role;
  }

  private loadUserFromStorage(): void {
    const userStr = localStorage.getItem(this.USER_KEY);
    if (!userStr) return;
    try {
      this.currentUser.set(JSON.parse(userStr) as User);
    } catch {
      this.logout();
    }
  }
}
