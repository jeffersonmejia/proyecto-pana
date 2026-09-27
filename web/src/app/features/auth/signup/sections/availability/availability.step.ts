import { Injectable } from '@angular/core';
import { RegistrationStep, RegistrationStepContext } from '../../orchestration/registration-step';
import { AvailabilitySectionService } from './availability-section.service';

@Injectable({ providedIn: 'root' })
export class AvailabilityStep implements RegistrationStep {
  constructor(private readonly section: AvailabilitySectionService) {}
  isComplete(context: RegistrationStepContext): boolean { return this.section.isComplete(context.data); }
  error(context: RegistrationStepContext): { field: string; message: string } | null {
    if (!context.data.days.length) return { field: 'days', message: 'Selecciona al menos un dia disponible.' };
    if (!context.data.schedules.length) return { field: 'schedules', message: 'Selecciona al menos un horario disponible.' };
    return null;
  }
}
