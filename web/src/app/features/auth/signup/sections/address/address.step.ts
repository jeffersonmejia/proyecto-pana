import { Injectable } from '@angular/core';
import { RegistrationStep, RegistrationStepContext } from '../../orchestration/registration-step';
import { AddressSectionService } from './address-section.service';

@Injectable({ providedIn: 'root' })
export class AddressStep implements RegistrationStep {
  constructor(private readonly section: AddressSectionService) {}
  isComplete(context: RegistrationStepContext): boolean { return this.section.isComplete(context.data); }
  error(context: RegistrationStepContext): { field: string; message: string } | null {
    if (!context.data.education.trim()) return { field: 'education', message: 'Ingresa tu instruccion.' };
    if (!context.data.address.trim()) return { field: 'address', message: 'Ingresa tu direccion de domicilio.' };
    return null;
  }
}
