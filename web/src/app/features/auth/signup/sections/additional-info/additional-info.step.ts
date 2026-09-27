import { Injectable } from '@angular/core';
import { RegistrationStep, RegistrationStepContext } from '../../orchestration/registration-step';
import { AdditionalInfoSectionService } from './additional-info-section.service';

@Injectable({ providedIn: 'root' })
export class AdditionalInfoStep implements RegistrationStep {
  constructor(private readonly section: AdditionalInfoSectionService) {}
  isComplete(context: RegistrationStepContext): boolean { return this.section.isComplete(context.data); }
  error(context: RegistrationStepContext): { field: string; message: string } | null {
    const data = context.data;
    if (!this.section.phoneIsComplete(data.phone)) return { field: 'phone', message: 'Ingresa un telefono de exactamente 10 digitos.' };
    if (!data.motivation.trim()) return { field: 'motivation', message: 'Indica por que deseas participar.' };
    if (data.role === 'student' && (!data.institution.trim() || !data.career.trim() || !data.level || !data.skills.trim() || !data.volunteer || (data.volunteer === 'Si' && !data.volunteerDetails.trim()))) return { field: 'role', message: 'Completa la informacion del estudiante.' };
    return null;
  }
}
