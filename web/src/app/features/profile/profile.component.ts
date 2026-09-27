import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideArrowLeft, LucideSave, LucideUserRound } from '@lucide/angular';
import { AuthService } from '../../core/auth/auth.service';
import { ProfileApiService, ProfileData } from './profile-api.service';

@Component({ selector: 'pana-profile', standalone: true, imports: [FormsModule, LucideArrowLeft, LucideSave, LucideUserRound], templateUrl: './profile.component.html', styleUrl: './profile.component.scss' })
export class ProfileComponent {
  readonly auth = inject(AuthService); private readonly api = inject(ProfileApiService); private readonly router = inject(Router);
  readonly loading = signal(true); readonly saving = signal(false); readonly feedback = signal(''); readonly error = signal('');
  profile: ProfileData = { id: 0, ci: '', first_name: '', last_name: '', phone: '', email: '', birth_date: null, birth_province: '', birth_city: '', gender: '', self_identification: '', has_disability: '', disability_type: '', address: '', sector: '', education: '', observations: '' };
  constructor() { this.api.get().subscribe({ next: response => { this.profile = { ...this.profile, ...response.profile }; this.loading.set(false); }, error: () => { this.error.set('No se pudo cargar tu perfil.'); this.loading.set(false); } }); }
  save(): void { this.saving.set(true); this.feedback.set(''); this.error.set(''); const { id, ci, ...input } = this.profile; this.api.update(input).subscribe({ next: response => { this.profile = { ...this.profile, ...response.profile }; this.auth.user.update(user => user ? { ...user, ...response.profile } : user); this.feedback.set('Perfil actualizado correctamente.'); this.saving.set(false); }, error: () => { this.error.set('No se pudo guardar el perfil. Revisa los datos ingresados.'); this.saving.set(false); } }); }
  back(): void { void this.router.navigateByUrl('/cursos'); }
}
