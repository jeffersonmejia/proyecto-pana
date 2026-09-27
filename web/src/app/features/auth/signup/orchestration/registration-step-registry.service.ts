import { Injectable } from '@angular/core';
import { RegistrationStep, RegistrationStepContext } from './registration-step';
import { PersonalDataStep } from '../sections/personal-data/personal-data.step';
import { AddressStep } from '../sections/address/address.step';
import { AvailabilityStep } from '../sections/availability/availability.step';
import { AdditionalInfoStep } from '../sections/additional-info/additional-info.step';
import { ConfirmationStep } from '../sections/confirmation/confirmation.step';

@Injectable({ providedIn: 'root' })
export class RegistrationStepRegistryService {
  private readonly handlers: Record<number, RegistrationStep>;
  constructor(personal: PersonalDataStep, address: AddressStep, availability: AvailabilityStep, additional: AdditionalInfoStep, confirmation: ConfirmationStep) {
    this.handlers = { 0: personal, 1: address, 2: availability, 3: additional, 4: confirmation };
  }
  isComplete(step: number, context: RegistrationStepContext): boolean { return this.handlers[step]?.isComplete(context) ?? false; }
  error(step: number, context: RegistrationStepContext): { field: string; message: string } | null { return this.handlers[step]?.error(context) ?? null; }
}
