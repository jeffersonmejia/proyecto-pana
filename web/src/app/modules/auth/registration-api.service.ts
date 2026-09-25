import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface RegistrationPayload {
  name: string; id: string; birthDate: string; gender: string; birthProvince: string; birthCity: string;
  selfIdentification: string; hasDisability: string; disabilityType: string; role: string;
  phone: string; email: string; address: string; sector: string; latitude: number | null; longitude: number | null; institution: string; career: string;
  education: string; level: string; motivation: string; skills: string; volunteer: string;
  volunteerDetails: string; password: string; days: string[]; schedules: string[]; terms: boolean;
}

@Injectable({ providedIn: 'root' })
export class RegistrationApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/public/registrations`;

  create(payload: RegistrationPayload): Observable<{ status: string }> {
    return this.http.post<{ status: string }>(this.url, payload);
  }

  checkIdentity(id: string, email: string, phone: string): Observable<{ available: boolean }> {
    return this.http.post<{ available: boolean }>(`${this.url}/check-identity`, { id, email, phone });
  }
}
