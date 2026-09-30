import { Component, HostBinding, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideArrowLeft, LucideBuilding2, LucideCalendarDays, LucideGraduationCap, LucideIdCard, LucideLogOut, LucideMail, LucideMapPin, LucidePhone, LucideSave, LucideUserRound } from '@lucide/angular';
import { AuthService } from '../../core/auth/auth.service';
import { ProfileApiService, ProfileData } from './profile-api.service';
import { ECUADOR_LOCATIONS } from '../auth/signup/data/ecuador-locations';

@Component({ selector: 'pana-profile', standalone: true, imports: [FormsModule, LucideArrowLeft, LucideBuilding2, LucideCalendarDays, LucideGraduationCap, LucideIdCard, LucideLogOut, LucideMail, LucideMapPin, LucidePhone, LucideSave, LucideUserRound], templateUrl: './profile-form.component.html', styleUrl: './profile.component.scss' })
export class ProfileComponent {
  readonly auth = inject(AuthService); private readonly api = inject(ProfileApiService); private readonly router = inject(Router);
  readonly locations = ECUADOR_LOCATIONS;
  readonly loading = signal(true); readonly saving = signal(false); readonly feedback = signal(''); readonly error = signal('');
  @HostBinding('class.profile-limited') get profileLimited(): boolean { const roles = this.auth.user()?.roles ?? []; return roles.includes('student') || roles.includes('beneficiary') || roles.includes('tecnico'); }
  profile: ProfileData = { id: 0, ci: '', first_name: '', last_name: '', phone: '', email: '', birth_date: null, birth_province: '', birth_city: '', gender: '', self_identification: '', has_disability: '', disability_type: '', address: '', sector: '', education: '', observations: '' };
  constructor() { this.api.get().subscribe({ next: response => { this.profile = { ...this.profile, ...response.profile }; this.loading.set(false); }, error: () => { this.error.set('No se pudo cargar tu perfil.'); this.loading.set(false); } }); }
  emailLocked(): boolean { return this.auth.user()?.roles.some(role => ['admin', 'coordinator', 'tecnico'].includes(role)) ?? false; }
  cities(): string[] { return this.locations.find(location => location.name === this.profile.birth_province)?.cities ?? []; }
  onProvinceChange(): void { if (!this.cities().includes(this.profile.birth_city ?? '')) this.profile.birth_city = ''; }
  save(): void { this.saving.set(true); this.feedback.set(''); this.error.set(''); const { id, ci, ...input } = this.profile; this.api.update(input).subscribe({ next: response => { this.profile = { ...this.profile, ...response.profile }; this.auth.user.update(user => user ? { ...user, ...response.profile } : user); this.feedback.set('Perfil actualizado correctamente.'); this.saving.set(false); }, error: response => { const code = response.error?.error; this.error.set(code === 'phone_already_exists' ? 'El tel&eacute;fono ya est&aacute; registrado.' : 'No se pudo guardar el perfil. Revisa los datos ingresados.'); this.saving.set(false); } }); }
  back(): void { void this.router.navigateByUrl('/cursos'); }
  logout(): void { this.auth.logout().subscribe(() => void this.router.navigateByUrl('/login')); }
}
