import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { catchError, finalize, map, Observable, of, shareReplay, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AuthUser {
  id: number;
  ci: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string;
  last_login_at: string | null;
  roles: string[];
  permissions: string[];
}

export type PreviewRole = 'coordinator' | 'tutor' | 'student' | 'volunteer' | 'beneficiary';
const PREVIEW_PERMISSIONS: Record<PreviewRole, string[]> = {
  coordinator: ['courses.read','people.read','attendance.read','activities.read','evaluations.read','reports.read','documents.read'],
  tutor: ['courses.read','people.read','attendance.read','activities.read','evaluations.read','reports.read','documents.read'],
  student: ['courses.read','people.read','attendance.read','activities.read','evaluations.read','documents.read'],
  volunteer: ['courses.read','people.read','attendance.read','activities.read','documents.read'],
  beneficiary: ['courses.read','people.read','evaluations.read','documents.read'],
};

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
  readonly sessionReady = signal(false);
  private previewOriginal: AuthUser | null = null;
  readonly previewRole = signal<PreviewRole | null>(null);
  readonly isPreview = computed(() => this.previewRole() !== null);
  private refreshRequest: Observable<boolean> | null = null;

  login(email: string, password: string): Observable<void> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, { email, password }, { withCredentials: true })
      .pipe(tap((response) => this.setSession(response)), map(() => undefined));
  }

  restoreSession(): Observable<boolean> {
    return this.refreshAccessToken().pipe(tap(() => this.sessionReady.set(true)));
  }

  refreshAccessToken(): Observable<boolean> {
    if (this.refreshRequest) return this.refreshRequest;
    this.refreshRequest = this.http.post<AuthResponse>(`${this.apiUrl}/refresh`, {}, { withCredentials: true }).pipe(
      tap((response) => this.setSession(response)),
      map(() => true),
      catchError(() => { this.clearSession(); return of(false); }),
      finalize(() => { this.refreshRequest = null; }),
      shareReplay(1),
    );
    return this.refreshRequest;
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

  startRolePreview(role: PreviewRole): void {
    const original = this.previewOriginal ?? this.user();
    if (!original?.roles.includes('admin')) return;
    this.previewOriginal = original;
    this.previewRole.set(role);
    this.user.set({ ...original, roles: [role], permissions: PREVIEW_PERMISSIONS[role] });
  }

  stopRolePreview(): void {
    if (this.previewOriginal) this.user.set(this.previewOriginal);
    this.previewOriginal = null;
    this.previewRole.set(null);
  }

  clearSession(): void {
    this.stopRolePreview();
    this.accessToken.set(null);
    this.user.set(null);
  }

  private setSession(response: AuthResponse): void {
    this.stopRolePreview();
    this.accessToken.set(response.access_token);
    this.user.set(response.user);
  }
}
