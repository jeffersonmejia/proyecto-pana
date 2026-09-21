import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface PersonRecord {
  id: number;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
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

export type PersonInput = Omit<PersonRecord, 'id'>;

@Injectable({ providedIn: 'root' })
export class PeopleApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/people`;

  list(filters: { q: string; type: string; status: string }) {
    const params = new HttpParams()
      .set('q', filters.q).set('type', filters.type).set('status', filters.status);
    return this.http.get<{ people: PersonRecord[] }>(this.url, { params });
  }

  create(person: PersonInput) {
    return this.http.post<{ id: number }>(this.url, person);
  }

  update(person: PersonRecord) {
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
