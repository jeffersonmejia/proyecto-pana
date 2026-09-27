import { Injectable } from '@angular/core';
import { RegistrationData } from '../../models/registration-data';

@Injectable({ providedIn: 'root' })
export class AdditionalInfoSectionService {
  isComplete(data: RegistrationData): boolean {
    if (!/^09\d{8}$/.test(data.phone) || !data.motivation.trim()) return false;
    if (data.role === 'beneficiary') return true;
    return !!data.institution.trim() && !!data.career.trim() && !!data.level && !!data.skills.trim()
      && !!data.volunteer && (data.volunteer === 'No' || !!data.volunteerDetails.trim());
  }
}
