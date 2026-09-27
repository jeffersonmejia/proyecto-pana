import { Injectable } from '@angular/core';
import { RegistrationData } from '../../models/registration-data';
import { PersonalDataSectionService } from './personal-data-section.service';
import { RegistrationStep, RegistrationStepContext } from '../../orchestration/registration-step';

@Injectable({ providedIn: 'root' })
export class PersonalDataStep implements RegistrationStep {
  constructor(private readonly section: PersonalDataSectionService) {}
  isComplete(context: RegistrationStepContext): boolean { return this.section.isComplete(context.data, context.validFullName, context.birthDateReady, context.validEmail, context.validPassword); }
  error(context: RegistrationStepContext): { field: string; message: string } | null {
    const data = context.data;
    if (!data.birthProvince) return { field: 'birthProvince', message: 'Selecciona la provincia de nacimiento.' };
    if (!data.birthCity) return { field: 'birthCity', message: 'Selecciona la ciudad de nacimiento.' };
    if (!data.selfIdentification) return { field: 'selfIdentification', message: 'Selecciona tu autoidentificacion.' };
    if (!data.hasDisability) return { field: 'hasDisability', message: 'Indica si tienes discapacidad.' };
    if (data.hasDisability === 'Si' && !data.disabilityType) return { field: 'disabilityType', message: 'Selecciona el tipo de discapacidad.' };
    if (!data.education.trim()) return { field: 'education', message: 'Ingresa tu instruccion.' };
    if (!data.sector.trim()) return { field: 'sector', message: 'Ingresa tu sector o barrio.' };
    if (!context.birthDateReady) return { field: 'birthDate', message: 'Selecciona tu fecha de nacimiento.' };
    if (!context.validFullName) return { field: 'name', message: 'Ingresa tus nombres y apellidos completos.' };
    if (!/^\d{10}$/.test(data.id)) return { field: 'id', message: 'La cedula debe tener exactamente 10 digitos.' };
    if (!data.gender) return { field: 'gender', message: 'Escoge tu genero.' };
    if (!context.validEmail) return { field: 'email', message: 'Escribe un correo valido.' };
    if (!context.validPassword) return { field: 'password', message: 'Completa los requisitos de la contrasena.' };
    return null;
  }
}
