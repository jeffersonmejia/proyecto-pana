import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface RegistrationPayload {
  name: string; id: string; course: string; birthDate: string; gender: string;
  phone: string; email: string; address: string; institution: string; career: string;
  level: string; motivation: string; skills: string; volunteer: string;
  volunteerDetails: string; password: string; days: string[]; schedules: string[]; terms: boolean;
}

export interface RegistrationCourse {
  id: number; name: string; description: string | null; start_date: string; end_date: string;
  max_participants: number; participant_count: number; available_slots: number | null;
  is_available: boolean; availability_label: string;
}

@Injectable({ providedIn: 'root' })
export class RegistrationApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/public/registrations`;

  availableCourses(): Observable<{ courses: RegistrationCourse[] }> {
    return this.http.get<{ courses: RegistrationCourse[] }>(`${environment.apiBaseUrl}/public/courses`);
  }

  create(payload: RegistrationPayload): Observable<{ status: string }> {
    return this.http.post<{ status: string }>(this.url, payload);
  }
}
