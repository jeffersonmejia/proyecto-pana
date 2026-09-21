import { Component, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/auth/auth.service';
import { LucideLockKeyhole, LucideMail } from '@lucide/angular';

@Component({
  selector: 'pana-login',
  standalone: true,
  imports: [FormsModule, MatButtonModule, LucideLockKeyhole, LucideMail],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  readonly authenticated = output<void>();
  email = '';
  password = '';
  readonly busy = signal(false);
  readonly errorMessage = signal('');

  submit(): void {
    this.busy.set(true);
    this.errorMessage.set('');
    this.auth.login(this.email, this.password).subscribe({
      next: () => this.authenticated.emit(),
      error: (error: HttpErrorResponse) => {
        const code = error.error?.error;
        this.errorMessage.set(code === 'rate_limited'
          ? 'Demasiados intentos. Espera un momento e inténtalo de nuevo.'
          : 'Correo o contraseña incorrectos.');
        this.busy.set(false);
      },
      complete: () => this.busy.set(false),
    });
  }
}
