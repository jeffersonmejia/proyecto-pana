import { Injectable } from '@angular/core';
import { RegistrationData } from '../../models/registration-data';

@Injectable({ providedIn: 'root' })
export class ConfirmationSectionService {
  isComplete(data: RegistrationData): boolean {
    return data.terms;
  }
}
