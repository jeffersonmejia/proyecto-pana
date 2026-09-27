import { Injectable } from '@angular/core';
import { RegistrationData } from '../../models/registration-data';

@Injectable({ providedIn: 'root' })
export class AvailabilitySectionService {
  isComplete(data: RegistrationData): boolean {
    return data.days.length > 0 && data.schedules.length > 0;
  }
}
