import { Injectable, signal } from '@angular/core';
import { RegistrationDraft } from '../models/registration-draft';
import { createRegistrationState } from './registration-state';

@Injectable({ providedIn: 'root' })
export class RegistrationStore {
  readonly data: RegistrationDraft = createRegistrationState();
  readonly revision = signal(0);
  readonly firstNames = signal('');
  readonly lastNames = signal('');
  readonly emailDomain = signal('@gmail.com');
  readonly birthYear = signal('');
  readonly birthMonth = signal('');
  readonly birthDay = signal('');
  patch(patch: Partial<RegistrationDraft>): void { Object.assign(this.data, patch); }
  touch(): void { this.revision.update(value => value + 1); }
  replace(data: RegistrationDraft): void { Object.assign(this.data, data); }
  setNameParts(firstNames: string, lastNames: string): void { this.firstNames.set(firstNames); this.lastNames.set(lastNames); }
  setBirthParts(year: string, month: string, day: string): void { this.birthYear.set(year); this.birthMonth.set(month); this.birthDay.set(day); }
  reset(): void { Object.assign(this.data, createRegistrationState()); this.firstNames.set(''); this.lastNames.set(''); this.emailDomain.set('@gmail.com'); }
}
