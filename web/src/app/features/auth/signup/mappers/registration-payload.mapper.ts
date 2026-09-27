import { Injectable } from '@angular/core';
import { RegistrationPayload } from '../models/registration-payload';
import { RegistrationDraft } from '../models/registration-draft';

@Injectable({ providedIn: 'root' })
export class RegistrationPayloadMapper {
  map(data: RegistrationDraft, phone: string, email: string): RegistrationPayload {
    return { ...data, phone, email } as RegistrationPayload;
  }
}
