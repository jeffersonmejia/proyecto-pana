import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class RegistrationMessageService {
  identity(failure: HttpErrorResponse): string { const code = failure.error?.error; return ({ registration_identity_already_exists: 'La cedula ya esta registrada. Es irrepetible.', not_found: 'No se pudo verificar la cedula y el correo.', internal_error: 'No se pudo verificar la identidad. Intentalo nuevamente.' } as Record<string, string>)[code] ?? this.general(failure); }
  general(failure: HttpErrorResponse): string {
    const code = failure.error?.error;
    if (failure.status === 0) return 'No se pudo conectar con el servidor. Verifica que el backend este encendido.';
    return ({ invalid_name: 'Escribe exactamente dos nombres y dos apellidos.', invalid_ci: 'La cedula de identidad no tiene un formato valido.', registration_identity_already_exists: 'La cedula ya esta registrada. Es irrepetible.', invalid_email: 'El correo electronico no tiene un formato valido.', invalid_password: 'La contrasena debe tener 12 caracteres, letras y numeros.', age_not_allowed: 'La inscripcion esta disponible para personas de 18 a 29 anos.', registration_duplicate_ci: 'La cedula ya esta registrada. Es irrepetible.', registration_duplicate_email: 'El correo electronico ya esta registrado. Es irrepetible.', registration_duplicate_ci_email: 'La cedula y el correo electronico ya estan registrados.' } as Record<string, string>)[code] ?? (failure.status >= 500 ? 'El servidor no pudo procesar la inscripcion.' : 'No se pudo enviar la inscripcion. Revisa los datos indicados.');
  }
}
