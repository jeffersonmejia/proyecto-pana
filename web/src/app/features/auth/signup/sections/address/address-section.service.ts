import { Injectable } from '@angular/core';
import { RegistrationData } from '../../models/registration-data';

@Injectable({ providedIn: 'root' })
export class AddressSectionService {
  isComplete(data: RegistrationData): boolean {
    return !!data.birthProvince && !!data.birthCity && !!data.sector.trim() && !!data.address.trim() && !!data.education.trim();
  }
}
