import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import { PageInfo } from '../../shared/paginator.component';
import { environment } from '../../../environments/environment';

export interface ManagedUser {
  id: number;
  ci: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string;
  is_active: boolean;
  last_login_at: string | null;
  roles: string[];
  person_id: number | null;
  profile: UserProfile;
}

export interface BeneficiaryOption {
  id: number;
  ci: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
}

export interface UserProfile {
  is_active?: boolean;
  position?: string;
  institutional_phone?: string;
  institution?: string;
  university?: string;
  career?: string;
  process_type?: string;
  hours_required?: number | string;
  hours_completed?: number | string;
  start_date?: string;
  end_date?: string | null;
  birth_date?: string | null;
  address?: string;
  entry_date?: string;
  observations?: string;
  student_person_ids?: number[];
}

export interface StudentOption { id: number; ci: string; first_name: string; last_name: string; }

export interface ManagedRole {
  id: number;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  permissions: string[];
}

export interface ManagedPermission { code: string; name: string; }
export interface RoleOption { id: number; code: string; name: string; is_active: boolean; }

@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/admin`;

  users(page = 1): Observable<{ users: ManagedUser[]; pagination: PageInfo }> {
    return this.http.get<{ users: ManagedUser[]; pagination: PageInfo }>(`${this.url}/users`, { params: { page } });
  }

  beneficiaryPeople(query: string, personId: number | null) {
    return this.http.get<{ people: BeneficiaryOption[] }>(`${this.url}/users/beneficiaries`, {
      params: { q: query, ...(personId ? { person_id: personId } : {}) },
    });
  }

  students(query: string, userId: number | null) {
    return this.http.get<{ students: StudentOption[] }>(`${this.url}/users/students`, {
      params: { q: query, ...(userId ? { user_id: userId } : {}) },
    });
  }

  saveUser(user: object, id: number | null): Observable<unknown> {
    return id === null
      ? this.http.post(`${this.url}/users`, user)
      : this.http.put(`${this.url}/users`, { ...user, id });
  }

  deleteUser(id: number): Observable<unknown> {
    return this.http.delete(`${this.url}/users?id=${id}`);
  }

  roles(page = 1): Observable<{ roles: ManagedRole[]; pagination: PageInfo }> {
    return this.http.get<{ roles: ManagedRole[]; pagination: PageInfo }>(`${this.url}/roles`, { params: { page } });
  }

  roleOptions(): Observable<RoleOption[]> {
    return this.http.get<{ roles: RoleOption[] }>(`${this.url}/roles/options`)
      .pipe(map((result) => result.roles));
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
