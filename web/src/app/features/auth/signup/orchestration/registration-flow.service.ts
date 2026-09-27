import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class RegistrationFlowService {
  readonly steps = ['Datos personales', 'Dirección e instrucción', 'Disponibilidad', 'Información adicional', 'Documentos y confirmación'];
  readonly step = signal(0);

  setStep(index: number): void {
    this.step.set(Math.max(0, Math.min(index, this.steps.length - 1)));
  }
}
