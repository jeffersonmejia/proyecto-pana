import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface DashboardStats {
  participants: number; beneficiaries: number; activities: number; activities_in_progress: number;
  attendance_hours: number; participant_evaluations: number; satisfaction_average: number; documents: number;
}
export interface ReportFilters { type: string; person_id: number | ''; from: string; to: string; }

@Injectable({ providedIn: 'root' })
export class ReportsApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/reports`;
  dashboard() { return this.http.get<{ dashboard: DashboardStats }>(`${this.url}/dashboard`); }
  people(q = '') { return this.http.get<{ people: { id: number; first_name: string; last_name: string }[] }>(`${this.url}/people`, { params: { q } }); }
  report(filters: ReportFilters) {
    let params = new HttpParams().set('type', filters.type).set('from', filters.from).set('to', filters.to);
    if (filters.person_id) params = params.set('person_id', filters.person_id);
    return this.http.get<{ rows: Record<string, unknown>[] }>(this.url, { params });
  }
}
