import { Injectable } from '@angular/core';
import { RegistrationData } from '../../models/registration-data';

@Injectable({ providedIn: 'root' })
export class AdditionalInfoSectionService {
  phoneIsComplete(phone: string): boolean {
    const digits = phone.replace(/\D/g, '');
    return /^\d{10}$/.test(digits);
  }

  isComplete(data: RegistrationData): boolean {
    const phoneComplete = this.phoneIsComplete(data.phone);
    const motivationComplete = !!data.motivation.trim();
    const studentComplete = data.role === 'beneficiary' || (!!data.institution.trim() && !!data.career.trim() && !!data.level && !!data.skills.trim() && !!data.volunteer && (data.volunteer === 'No' || !!data.volunteerDetails.trim()));
    const result = phoneComplete && motivationComplete && studentComplete;
    console.debug('[PANA registration] additional-info validation', { phoneComplete, phoneLength: data.phone.length, motivationComplete, motivationLength: data.motivation.length, role: data.role, studentComplete, result });
    return result;
  }
}
