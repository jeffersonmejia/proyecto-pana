import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface AttendanceRecord {
  id: number; participant_id: number; attendance_date: string; status: 'present' | 'absent' | 'excused';
  check_in: string | null; check_out: string | null; note: string | null; total_minutes: number | null;
  hours: number | null; first_name: string; last_name: string;
}
export interface AttendanceInput {
  participant_id: number; attendance_date: string; status: string; check_in: string; check_out: string;
  note: string; correction_reason?: string;
}
export interface AttendanceEvent {
  id: number; event_type: string; correction_reason: string | null; created_at: string; actor_email: string | null;
}

@Injectable({ providedIn: 'root' })
export class AttendanceApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/attendance`;

  participants(q = '') {
    return this.http.get<{ participants: { id: number; first_name: string; last_name: string }[] }>(
      `${this.url}/participants`, { params: { q } });
  }

  list(filters: { participant_id: number | ''; from: string; to: string; status: string }) {
    let params = new HttpParams().set('from', filters.from).set('to', filters.to).set('status', filters.status);
    if (filters.participant_id) params = params.set('participant_id', filters.participant_id);
    return this.http.get<{ records: AttendanceRecord[] }>(this.url, { params });
  }

  create(record: AttendanceInput) { return this.http.post<{ id: number }>(this.url, record); }
  correct(record: AttendanceInput & { id: number }) { return this.http.put(this.url, record); }
  history(id: number) {
    return this.http.get<{ history: AttendanceEvent[] }>(`${this.url}/history`, { params: { id } });
  }
}
