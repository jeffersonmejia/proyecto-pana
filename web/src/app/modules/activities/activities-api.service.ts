import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface ActivityRecord {
  id: number; title: string; description: string | null; responsible: string; start_at: string; end_at: string;
  status: string; participant_names: string | null; participant_ids: number[];
}
export interface ActivityInput {
  title: string; description: string; responsible: string; start_at: string; end_at: string;
  status: string; participant_ids: number[];
}
export interface ActivityLog {
  id: number; event_type: string; details: string; created_at: string; actor_email: string | null;
  first_name: string | null; last_name: string | null;
}
export interface ActivitiesPage { page: number; page_size: number; total: number; pages: number; }

@Injectable({ providedIn: 'root' })
export class ActivitiesApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/activities`;
  participants(q = '') {
    return this.http.get<{ participants: { id: number; first_name: string; last_name: string }[] }>(
      `${this.url}/participants`, { params: { q } });
  }
  list(filters: { participant_id: number | ''; from: string; to: string; status: string; page: number }) {
    let params = new HttpParams().set('from', filters.from).set('to', filters.to).set('status', filters.status);
    if (filters.participant_id) params = params.set('participant_id', filters.participant_id);
    return this.http.get<{ activities: ActivityRecord[]; pagination: ActivitiesPage }>(this.url, { params: params.set('page', filters.page) });
  }
  create(activity: ActivityInput) { return this.http.post<{ id: number }>(this.url, activity); }
  update(activity: ActivityInput & { id: number }) { return this.http.put(this.url, activity); }
  logs(id: number) { return this.http.get<{ logs: ActivityLog[] }>(`${this.url}/logs`, { params: { id } }); }
  addObservation(activity: number, participant: number | '', details: string) {
    return this.http.post(`${this.url}/logs`, { activity_id: activity, participant_id: participant || null, details });
  }
}
