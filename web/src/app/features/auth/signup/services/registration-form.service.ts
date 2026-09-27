import { Injectable } from '@angular/core';
import { RegistrationData } from '../models/registration-data';

@Injectable({ providedIn: 'root' })
export class RegistrationFormService {
  sanitizeEmail(value: string): string { return value.replace(/[^A-Za-z0-9._@-]/g, ''); }
  fullEmail(value: string): string { return value.trim(); }
  normalizePhone(value: string): string {
    return value.replace(/\D/g, '').slice(0, 10);
  }
  fullPhone(value: string): string { return value.replace(/\D/g, '').slice(0, 10); }
  hasValidEmail(value: string): boolean { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.fullEmail(value)); }
  hasValidPassword(value: string): boolean { return value.length >= 12 && /\d/.test(value) && /\p{L}/u.test(value); }
  hasValidNames(firstNames: string, lastNames: string): boolean {
    return this.hasValidFirstNames(firstNames) && this.hasValidLastNames(lastNames);
  }
  hasValidFirstNames(value: string): boolean { return /^\p{L}+(?:[-']\p{L}+)* \p{L}+(?:[-']\p{L}+)*$/u.test(value); }
  hasValidLastNames(value: string): boolean { return /^\p{L}+(?:[-']\p{L}+)*(?: \p{L}+(?:[-']\p{L}+)*)+$/u.test(value); }
  hasValidFullName(data: RegistrationData, firstNames: string, lastNames: string): boolean {
    if (!firstNames.trim() && data.name.trim()) {
      const parts = data.name.trim().split(/\s+/).filter(Boolean);
      firstNames = parts[0] ?? '';
      lastNames = parts.slice(1).join(' ');
    }
    if (!firstNames.trim() || !lastNames.trim() || !this.hasValidNames(firstNames, lastNames)) return false;
    return data.name.trim().split(/\s+/).filter(Boolean).every(part => /^\p{L}+(?:[-']\p{L}+)*$/u.test(part));
  }
  passwordHasNumber(value: string): boolean { return /\d/.test(value); }
  passwordHasLetter(value: string): boolean { return /\p{L}/u.test(value); }
}
