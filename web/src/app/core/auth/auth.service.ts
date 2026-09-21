import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { catchError, finalize, map, Observable, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AuthUser {
  id: number;
  email: string;
  roles: string[];
  permissions: string[];
}

interface AuthResponse {
  access_token: string;
  expires_in: number;
  user: AuthUser;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiBaseUrl}/auth`;
  readonly accessToken = signal<string | null>(null);
  readonly user = signal<AuthUser | null>(null);

  login(email: string, password: string): Observable<void> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, { email, password }, { withCredentials: true })
      .pipe(tap((response) => this.setSession(response)), map(() => undefined));
  }

  restoreSession(): Observable<boolean> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/refresh`, {}, { withCredentials: true }).pipe(
      tap((response) => this.setSession(response)),
      map(() => true),
      catchError(() => of(false)),
    );
  }

  logout(): Observable<void> {
    return this.http.post(`${this.apiUrl}/logout`, {}, { withCredentials: true }).pipe(
      map(() => undefined),
      catchError(() => of(undefined)),
      finalize(() => this.clearSession()),
    );
  }

  hasPermission(permission: string): boolean {
    return this.user()?.permissions.includes(permission) ?? false;
  }

  clearSession(): void {
    this.accessToken.set(null);
    this.user.set(null);
  }

  private setSession(response: AuthResponse): void {
    this.accessToken.set(response.access_token);
    this.user.set(response.user);
  }
}
