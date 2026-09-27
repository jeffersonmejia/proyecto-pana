import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class RegistrationInputService {
  validateCredentials(target: HTMLInputElement): boolean {
    if (target.name === 'email') target.classList.toggle('email-invalid', target.value.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target.value.trim()));
    if (target.name === 'password') target.classList.toggle('password-invalid', target.value.length > 0 && (target.value.length < 12 || !/\d/.test(target.value) || !/\p{L}/u.test(target.value)));
    return target.name === 'email' || target.name === 'password';
  }
  shouldPreventSpace(target: HTMLInputElement, key: string): boolean {
    if (!['firstNames', 'lastNames'].includes(target?.name) || !/\s/.test(key)) return false;
    if (!target.value || target.value.endsWith(' ') || target.value.includes('  ')) return true;
    if (target.name === 'lastNames' && target.value.trim().split(/\s+/).length >= 2) return true;
    return target.name === 'firstNames' && target.value.includes(' ');
  }
  pasteHasForbiddenSpace(target: HTMLInputElement, value: string): boolean { return ['firstNames', 'lastNames'].includes(target?.name) && /^\s|\s$|\s{2,}/.test(value); }
  normalizeName(value: string): string { return value.replace(/\s+/g, ' ').trim(); }
  nameIsValid(target: HTMLInputElement): boolean { return target.name === 'firstNames' ? /^\p{L}+(?:[-']\p{L}+)* \p{L}+(?:[-']\p{L}+)*$/u.test(target.value) : /^\p{L}+(?:[-']\p{L}+)*(?: \p{L}+(?:[-']\p{L}+)*)+$/u.test(target.value); }
}
