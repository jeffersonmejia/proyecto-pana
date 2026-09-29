import { Component, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { LucideEye, LucideEyeOff, LucideLockKeyhole, LucideMail, LucideLogIn, LucideUserPlus } from '@lucide/angular';

@Component({
  selector: 'pana-login',
  standalone: true,
  imports: [FormsModule, MatButtonModule, LucideEye, LucideEyeOff, LucideLockKeyhole, LucideMail, LucideLogIn, LucideUserPlus],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly authenticated = output<void>();
  email = '';
  password = '';
  rememberMe = false;
  readonly passwordVisible = signal(false);
  readonly busy = signal(false);
  readonly errorMessage = signal('');
  readonly submitAttempted = signal(false);

  constructor() {
    const rememberedEmail = localStorage.getItem('pana.remembered.email');
    if (rememberedEmail) { this.email = rememberedEmail; this.rememberMe = true; }
    const state = history.state as { registrationEmail?: unknown; registrationPassword?: unknown };
    if (typeof state.registrationEmail === 'string' && typeof state.registrationPassword === 'string') {
      this.email = state.registrationEmail; this.password = state.registrationPassword; this.rememberMe = true;
      history.replaceState({}, document.title, window.location.href);
    }
  }

  submit(): void {
    this.submitAttempted.set(true);
    if (!this.email.trim() || !this.password) return;
    this.busy.set(true);
    this.errorMessage.set('');
    this.auth.login(this.email, this.password).subscribe({
      next: () => {
        if (this.rememberMe) localStorage.setItem('pana.remembered.email', this.email);
        else localStorage.removeItem('pana.remembered.email');
        this.authenticated.emit(); void this.router.navigateByUrl('/cursos');
      },
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

  openRegistration(): void { void this.router.navigateByUrl('/inscripcion'); }
  togglePassword(): void { this.passwordVisible.update(value => !value); }
}
