import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface PersonRecord {
  id: number;
  ci: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  birth_date: string | null;
  address: string | null;
  observations: string | null;
  has_account: boolean;
  status: 'active' | 'inactive';
  types: string[];
}

export interface PersonEvent {
  id: number;
  event_type: string;
  details: string;
  created_at: string;
  actor_email: string | null;
}
export interface PeoplePage { page: number; page_size: number; total: number; pages: number; }

export type PersonInput = Omit<PersonRecord, 'id' | 'has_account'>;

@Injectable({ providedIn: 'root' })
export class PeopleApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/people`;

  list(filters: { q: string; type: string; status: string; page: number }) {
    const params = new HttpParams()
      .set('q', filters.q).set('type', filters.type).set('status', filters.status).set('page', filters.page);
    return this.http.get<{ people: PersonRecord[]; pagination: PeoplePage }>(this.url, { params });
  }

  create(person: PersonInput) {
    return this.http.post<{ id: number }>(this.url, person);
  }

  update(person: PersonInput & { id: number }) {
    return this.http.put(this.url, person);
  }

  delete(id: number) {
    return this.http.delete(this.url, { params: { id } });
  }

  history(id: number) {
    return this.http.get<{ history: PersonEvent[] }>(`${this.url}/history`, { params: { id } });
  }

  addNote(id: number, details: string) {
    return this.http.post(`${this.url}/history`, { person_id: id, details });
  }
}
