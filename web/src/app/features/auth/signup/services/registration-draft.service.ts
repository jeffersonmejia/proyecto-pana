import { Injectable } from '@angular/core';
import { RegistrationData } from '../models/registration-data';

@Injectable({ providedIn: 'root' })
export class RegistrationDraftService {
  save(key: string, data: RegistrationData, version: string): void {
    const draft: Partial<RegistrationData> & { version?: string } = { ...data, version };
    draft.password = undefined;
    localStorage.setItem(key, JSON.stringify(draft));
  }
  read(key: string): (Partial<RegistrationData> & { version?: string }) | null {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try { return JSON.parse(raw) as Partial<RegistrationData> & { version?: string }; } catch { localStorage.removeItem(key); return null; }
  }
  clear(key: string): void { localStorage.removeItem(key); }
}
