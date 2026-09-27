import { RegistrationData } from '../models/registration-data';

export interface RegistrationStepContext {
  data: RegistrationData;
  birthDateReady: boolean;
  validFullName: boolean;
  validEmail: boolean;
  validPassword: boolean;
}

export interface RegistrationStep {
  isComplete(context: RegistrationStepContext): boolean;
  error(context: RegistrationStepContext): { field: string; message: string } | null;
}
