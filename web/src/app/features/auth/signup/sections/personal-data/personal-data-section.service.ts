import { Injectable } from '@angular/core';
import { RegistrationData } from '../../models/registration-data';

@Injectable({ providedIn: 'root' })
export class PersonalDataSectionService {
  isComplete(data: RegistrationData, validName: boolean, birthDateReady: boolean, validEmail: boolean, validPassword: boolean): boolean {
    return validName && /^\d{10}$/.test(data.id) && birthDateReady && !!data.gender && !!data.selfIdentification
      && !!data.education.trim() && !!data.hasDisability && (data.hasDisability === 'No' || !!data.disabilityType)
      && validEmail && validPassword;
  }
}
