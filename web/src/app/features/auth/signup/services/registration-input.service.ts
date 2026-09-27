import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class RegistrationInputService {
  validateCredentials(target: HTMLInputElement): boolean {
    if (target.name === 'email') target.classList.toggle('email-invalid', target.value.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target.value.trim()));
    if (target.name === 'password') target.classList.toggle('password-invalid', target.value.length > 0 && (target.value.length < 12 || !/\d/.test(target.value) || !/\p{L}/u.test(target.value)));
    return target.name === 'email' || target.name === 'password';
  }
  shouldPreventSpace(target: HTMLInputElement, key: string): boolean {
    if (!['lastNames', 'id', 'email', 'password'].includes(target?.name) || !/\s/.test(key)) return false;
    return target.name !== 'lastNames' || (!!target.value && !target.value.endsWith(' ') && !target.value.includes('  '));
  }
  pasteHasForbiddenSpace(target: HTMLInputElement, value: string): boolean { return ['lastNames', 'id', 'email', 'password'].includes(target?.name) && (target.name === 'lastNames' ? /^\s|\s$|\s{2,}/.test(value) : /\s/.test(value)); }
  nameIsValid(target: HTMLInputElement): boolean { return target.name === 'firstNames' ? /^\p{L}+(?:[-']\p{L}+)* \p{L}+(?:[-']\p{L}+)*$/u.test(target.value) : /^\p{L}+(?:[-']\p{L}+)*(?: \p{L}+(?:[-']\p{L}+)*)+$/u.test(target.value); }
}
