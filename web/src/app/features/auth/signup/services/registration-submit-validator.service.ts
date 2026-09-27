import { Injectable } from '@angular/core';
import { RegistrationDraft } from '../models/registration-draft';

export interface SubmitValidationError { field: string; message: string; }

@Injectable({ providedIn: 'root' })
export class RegistrationSubmitValidatorService {
  validate(data: RegistrationDraft, validFullName: boolean): SubmitValidationError | null {
    if (!validFullName) return { field: 'name', message: 'Escribe exactamente dos nombres y dos apellidos.' };
    if ((data.age ?? 0) < 18 || (data.age ?? 0) > 29) return { field: 'birthDate', message: 'La inscripcion esta disponible para personas de 18 a 29 anos.' };
    if (!data.days.length) return { field: 'days', message: 'Selecciona al menos un dia disponible.' };
    if (!data.schedules.length) return { field: 'schedules', message: 'Selecciona al menos un horario disponible.' };
    if (!data.terms) return { field: 'terms', message: 'Acepta los terminos para continuar.' };
    return null;
  }
}
