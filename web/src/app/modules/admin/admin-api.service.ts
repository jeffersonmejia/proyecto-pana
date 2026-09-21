import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ManagedUser {
  id: number;
  email: string;
  is_active: boolean;
  roles: string[];
}

export interface ManagedRole {
  id: number;
  code: string;
  name: string;
  permissions: string[];
}

export interface ManagedPermission { code: string; name: string; }

@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/admin`;

  users(): Observable<ManagedUser[]> {
    return this.http.get<{ users: ManagedUser[] }>(`${this.url}/users`).pipe(map((result) => result.users));
  }

  saveUser(user: object, id: number | null): Observable<unknown> {
    return id === null
      ? this.http.post(`${this.url}/users`, user)
      : this.http.put(`${this.url}/users`, { ...user, id });
  }

  deleteUser(id: number): Observable<unknown> {
    return this.http.delete(`${this.url}/users?id=${id}`);
  }

  roles(): Observable<ManagedRole[]> {
    return this.http.get<{ roles: ManagedRole[] }>(`${this.url}/roles`).pipe(map((result) => result.roles));
  }

  permissions(): Observable<ManagedPermission[]> {
    return this.http.get<{ permissions: ManagedPermission[] }>(`${this.url}/permissions`)
      .pipe(map((result) => result.permissions));
  }

  saveRole(role: object, id: number | null): Observable<unknown> {
    const payload = id === null ? role : { ...role, id };
    return id === null
      ? this.http.post(`${this.url}/roles`, payload)
      : this.http.put(`${this.url}/roles`, payload);
  }

  deleteRole(id: number): Observable<unknown> {
    return this.http.delete(`${this.url}/roles?id=${id}`);
  }
}
