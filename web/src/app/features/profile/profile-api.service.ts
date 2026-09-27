import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface ProfileData {
  id: number; ci: string; first_name: string; last_name: string; phone: string | null; email: string;
  birth_date: string | null; birth_province: string | null; birth_city: string | null; gender: string | null;
  self_identification: string | null; has_disability: string | null; disability_type: string | null; address: string | null;
  sector: string | null; education: string | null; observations: string | null;
}

@Injectable({ providedIn: 'root' })
export class ProfileApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/auth/profile`;
  get() { return this.http.get<{ profile: ProfileData }>(this.url); }
  update(profile: Omit<ProfileData, 'id' | 'ci'>) { return this.http.put<{ profile: ProfileData }>(this.url, profile); }
}
