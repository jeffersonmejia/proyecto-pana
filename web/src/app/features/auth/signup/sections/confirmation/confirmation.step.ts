import { Injectable } from '@angular/core';
import { RegistrationStep, RegistrationStepContext } from '../../orchestration/registration-step';
import { ConfirmationSectionService } from './confirmation-section.service';

@Injectable({ providedIn: 'root' })
export class ConfirmationStep implements RegistrationStep {
  constructor(private readonly section: ConfirmationSectionService) {}
  isComplete(context: RegistrationStepContext): boolean { return this.section.isComplete(context.data); }
  error(): { field: string; message: string } | null { return null; }
}
