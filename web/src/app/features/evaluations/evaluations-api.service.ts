import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';

export type EvaluationType = 'participant' | 'satisfaction';
export interface Criterion { id: number; name: string; description: string | null; is_active: boolean | number; }
export interface EvaluationAnswer { criterion_id: number; score: number; note: string; criterion_name?: string; }
export interface EvaluationRecord {
  id: number; evaluation_type: EvaluationType; person_id: number; first_name: string; last_name: string;
  evaluated_on: string; average_score: number | null; satisfaction_score: number | null;
  observations: string | null; criterion_count: number; answers?: EvaluationAnswer[];
}
export interface EvaluationInput {
  evaluation_type: EvaluationType; person_id: number; evaluated_on: string; satisfaction_score: number | null;
  observations: string; answers: EvaluationAnswer[];
}
export interface EvaluationPage { page: number; page_size: number; total: number; pages: number; }

@Injectable({ providedIn: 'root' })
export class EvaluationsApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/evaluations`;
  people(type: string, q = '') {
    return this.http.get<{ people: { id: number; first_name: string; last_name: string }[] }>(
      `${this.url}/people`, { params: { type, q } });
  }
  criteria() { return this.http.get<{ criteria: Criterion[] }>(`${this.url}/criteria`); }
  createCriterion(data: { name: string; description: string }) { return this.http.post(`${this.url}/criteria`, data); }
  updateCriterion(data: Criterion) { return this.http.put(`${this.url}/criteria`, data); }
  list(type: EvaluationType, person_id: number | '', from: string, to: string, page = 1) {
    let params = new HttpParams().set('type', type).set('from', from).set('to', to);
    if (person_id) params = params.set('person_id', person_id);
    return this.http.get<{ evaluations: EvaluationRecord[]; pagination: EvaluationPage }>(this.url, { params: params.set('page', page) });
  }
  one(id: number) { return this.http.get<{ evaluation: EvaluationRecord }>(this.url, { params: { id } }); }
  create(data: EvaluationInput) { return this.http.post<{ id: number }>(this.url, data); }
  update(data: EvaluationInput & { id: number }) { return this.http.put(this.url, data); }
}
