import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, DestroyRef, HostListener, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideArrowRight, LucideBriefcase, LucideCalendar, LucideCheckCircle2, LucideCircleHelp, LucideClipboardCheck, LucideClock, LucideCreditCard, LucideEye, LucideEyeOff, LucideGraduationCap, LucideHeartHandshake, LucideLockKeyhole, LucideMail, LucideMapPin, LucidePhone, LucideSchool, LucideSparkles, LucideUser } from '@lucide/angular';
import { RegistrationApiService, RegistrationPayload } from './registration-api.service';
import { ECUADOR_LOCATIONS } from './ecuador-locations';
import { RegistrationData } from './models/registration-data';
import { RegistrationFlowService } from './orchestration/registration-flow.service';
import { PersonalDataSectionService } from './sections/personal-data/personal-data-section.service';
import { AddressSectionService } from './sections/address/address-section.service';
import { AvailabilitySectionService } from './sections/availability/availability-section.service';
import { AdditionalInfoSectionService } from './sections/additional-info/additional-info-section.service';
import { ConfirmationSectionService } from './sections/confirmation/confirmation-section.service';

@Component({ selector: 'pana-registration', standalone: true, imports: [FormsModule, MatButtonModule, LucideArrowRight, LucideBriefcase, LucideCalendar, LucideCheckCircle2, LucideCircleHelp, LucideClipboardCheck, LucideClock, LucideCreditCard, LucideEye, LucideEyeOff, LucideGraduationCap, LucideHeartHandshake, LucideLockKeyhole, LucideMail, LucideMapPin, LucidePhone, LucideSchool, LucideSparkles, LucideUser], templateUrl: './registration.component.html', styleUrl: './registration.component.scss' })
export class RegistrationComponent {
  firstNames = '';
  private readonly resetBirthDateDefaults = (() => { queueMicrotask(() => { this.birthYear = String(this.dateYears[0]); this.birthMonth = '1'; this.birthDay = '1'; this.data.birthProvince = 'Santo Domingo de los Tsáchilas'; this.data.birthCity = 'Santo Domingo'; this.syncBirthDate(); this.updateAge(); }); return true; })();
  private readonly restoreLocationAfterDraft = (() => { queueMicrotask(() => this.restoreSavedLocation()); return true; })();
  private restoreSavedLocation(): void { const raw = localStorage.getItem(this.draftKey); const shared = localStorage.getItem('pana-location-shared') === 'true'; if (!raw && !shared) return; try { const draft = raw ? JSON.parse(raw) as Partial<RegistrationData> : {}; const latitude = Number(draft.latitude); const longitude = Number(draft.longitude); const hasCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude) && (latitude !== -0.2504757 || longitude !== -79.168232); if (shared || hasCoordinates) { this.locationGranted.set(true); this.locationStatus.set('Ubicación restaurada.'); } if (hasCoordinates) this.mapEmbedUrl.set(this.buildMapUrl(latitude, longitude)); } catch { return; } }
  @HostListener('document:focusin', ['$event'])
  prepareFullPhone(event: FocusEvent): void { const target = event.target as HTMLInputElement; if (target?.name !== 'phone') return; target.setAttribute('maxlength', '10'); const raw = target.value.replace(/\D/g, ''); const digits = raw.length === 8 ? `09${raw}` : raw.slice(0, 10); target.value = digits; this.phoneInputDigits = digits; this.data.phone = digits; }
  @HostListener('document:keydown', ['$event'])
  enableFullPhone(event: KeyboardEvent): void { const target = event.target as HTMLInputElement; if (target?.name === 'phone') target.setAttribute('maxlength', '10'); }
  @HostListener('document:paste', ['$event'])
  enableFullPhonePaste(event: ClipboardEvent): void { const target = event.target as HTMLInputElement; if (target?.name === 'phone') target.setAttribute('maxlength', '10'); }
  @HostListener('document:input', ['$event'])
  syncFullPhoneInput(event: Event): void { const target = event.target as HTMLInputElement; if (target?.name !== 'phone') return; target.setAttribute('maxlength', '10'); const raw = target.value.replace(/\D/g, '').slice(0, 10); const digits = this.phoneInputDigits.length > raw.length ? this.phoneInputDigits : raw; target.value = digits; this.phoneInputDigits = digits; this.data.phone = digits; this.clearFieldError('phone'); queueMicrotask(() => { target.value = this.data.phone; this.cdr.detectChanges(); }); }
  lastNames = '';
  phoneInputDigits = '';
  private readonly capturePhoneInput = (() => { window.addEventListener('input', this.capturePhoneValue, true); return true; })();
  private capturePhoneValue = (event: Event): void => { const target = event.target as HTMLInputElement; if (target?.name !== 'phone') return; const digits = target.value.replace(/\D/g, '').slice(0, 10); this.phoneInputDigits = digits; this.data.phone = digits; };
  @HostListener('document:input', ['$event'])
  trackPhoneLength(event: Event): void { const target = event.target as HTMLInputElement; if (target?.name === 'phone') this.phoneInputDigits = target.value.replace(/\D/g, '').slice(0, 10); }
  @HostListener('document:input', ['$event'])
  validateCredentialsWhileTyping(event: Event): void { const target = event.target as HTMLInputElement; if (target?.name === 'email') target.classList.toggle('email-invalid', target.value.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target.value.trim())); if (target?.name === 'password') target.classList.toggle('password-invalid', target.value.length > 0 && (target.value.length < 12 || !/\d/.test(target.value) || !/\p{L}/u.test(target.value))); if (target?.name === 'email' || target?.name === 'password') queueMicrotask(() => this.cdr.detectChanges()); }
  @HostListener('document:keyup', ['$event'])
  validateCredentialsOnKeyup(event: KeyboardEvent): void { this.validateCredentialsWhileTyping(event); }
  @HostListener('document:keydown', ['$event'])
  preventForbiddenSpaces(event: KeyboardEvent): void { const target = event.target as HTMLInputElement; if (!['lastNames', 'id', 'email', 'password'].includes(target?.name) || !/\s/.test(event.key)) return; if (target.name === 'lastNames') { if (!target.value || target.value.endsWith(' ') || target.value.includes('  ')) event.preventDefault(); return; } event.preventDefault(); }
  @HostListener('document:paste', ['$event'])
  preventForbiddenSpacePaste(event: ClipboardEvent): void { const target = event.target as HTMLInputElement; if (!['lastNames', 'id', 'email', 'password'].includes(target?.name)) return; const value = event.clipboardData?.getData('text') ?? ''; if (target.name === 'lastNames' ? /^\s|\s$|\s{2,}/.test(value) : /\s/.test(value)) event.preventDefault(); }
  @HostListener('document:input', ['$event'])
  updateNameHint(event: Event): void { const target = event.target as HTMLInputElement; if (!['firstNames', 'lastNames'].includes(target?.name)) return; const valid = target.name === 'firstNames' ? /^\p{L}+(?:[-']\p{L}+)* \p{L}+(?:[-']\p{L}+)*$/u.test(target.value) : /^\p{L}+(?:[-']\p{L}+)*(?: \p{L}+(?:[-']\p{L}+)*)+$/u.test(target.value); target.classList.toggle('name-invalid', target.value.length > 0 && !valid); }
  private readonly flow = inject(RegistrationFlowService);
  private readonly personalData = inject(PersonalDataSectionService);
  private readonly addressSection = inject(AddressSectionService);
  private readonly availabilitySection = inject(AvailabilitySectionService);
  private readonly additionalInfo = inject(AdditionalInfoSectionService);
  private readonly confirmationSection = inject(ConfirmationSectionService);
  private readonly router = inject(Router); private readonly route = inject(ActivatedRoute); private readonly api = inject(RegistrationApiService); private readonly destroyRef = inject(DestroyRef); private readonly sanitizer = inject(DomSanitizer); private readonly cdr = inject(ChangeDetectorRef);
  private readonly draftKey = 'pana-registration-draft';
  private readonly draftVersion = 'volunteer-default-no-v1';
  readonly closed = output<void>(); readonly step = this.flow.step; readonly steps = this.flow.steps; readonly submitted = signal(false); readonly busy = signal(false); readonly passwordVisible = signal(false); readonly error = signal(''); readonly errorField = signal('');
  readonly data: RegistrationData = { name: '', id: '', birthDate: '', age: null, gender: 'Masculino', birthProvince: '', birthCity: '', selfIdentification: '', hasDisability: 'No', disabilityType: '', role: 'beneficiary', phone: '', email: '', address: '', sector: '', latitude: null, longitude: null, institution: '', career: '', education: '', level: '1', motivation: '', skills: '', volunteer: 'No', volunteerDetails: '', password: '', days: [], schedules: [], availabilitySlots: [], terms: false };
  readonly locations = ECUADOR_LOCATIONS;
  readonly selfIdentificationOptions = ['Indígena', 'Afroecuatoriano/a', 'Negro/a', 'Mulato/a', 'Montubio/a', 'Mestizo/a', 'Blanco/a', 'Otro/a'];
  readonly disabilityOptions = ['Visual', 'Auditiva', 'Física', 'Intelectual', 'Psicosocial', 'Del lenguaje', 'Múltiple', 'Otra'];
  readonly emailDomains = ['@gmail.com', '@outlook.com']; emailDomain = '@gmail.com';
  readonly dateYears = Array.from({ length: 12 }, (_, index) => new Date().getFullYear() - 18 - index); readonly dateMonths = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']; birthYear = ''; birthMonth = ''; birthDay = '';
  readonly locationStatus = signal('Aún no has compartido tu ubicación.'); readonly locationGranted = signal(false); readonly mapEmbedUrl = signal<SafeResourceUrl>(this.buildMapUrl(-0.2504757, -79.168232)); private locationWatchId: number | null = null;
  constructor() {this.restoreDraft(); const sync = (event: StorageEvent) => { if (event.key === this.draftKey) this.restoreDraft(event.newValue); }; const routeSub = this.route.paramMap.subscribe(params => { const value = Number(params.get('step')); const index = Number.isInteger(value) && value >= 1 && value <= this.steps.length ? value - 1 : 0; this.step.set(index); if (!params.get('step')) void this.router.navigate(['/inscripcion', 1], { replaceUrl: true }); }); window.addEventListener('storage', sync); this.destroyRef.onDestroy(() => { routeSub.unsubscribe(); window.removeEventListener('storage', sync); if (this.locationWatchId !== null) navigator.geolocation?.clearWatch(this.locationWatchId); }); }
  close(): void { this.closed.emit(); void this.router.navigateByUrl('/login'); }
  private buildMapUrl(latitude: number, longitude: number): SafeResourceUrl { if (latitude !== -0.2504757 || longitude !== -79.168232) { this.data.latitude = latitude; this.data.longitude = longitude; localStorage.setItem('pana-location-shared', 'true'); this.persistDraft(); } const point = `${latitude},${longitude}`; return this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.google.com/maps?q=${point}&ll=${point}&z=18&output=embed`); }
  requestLocation(): void { if (!window.isSecureContext) { this.locationStatus.set('La ubicación requiere HTTPS o localhost. Abre la dirección https:// de la aplicación.'); return; } if (!navigator.geolocation) { this.locationStatus.set('Tu navegador no permite acceder a la ubicación.'); return; } if (this.locationWatchId !== null) navigator.geolocation.clearWatch(this.locationWatchId); this.locationGranted.set(false); this.locationStatus.set('Buscando tu ubicación en Santo Domingo...'); this.locationWatchId = navigator.geolocation.watchPosition(position => { const { latitude, longitude } = position.coords; if (!this.isSantoDomingo(latitude, longitude)) { this.locationStatus.set('La ubicación recibida no corresponde a Santo Domingo. Reintentando...'); return; } this.mapEmbedUrl.set(this.buildMapUrl(latitude, longitude)); this.locationGranted.set(true); this.locationStatus.set('Mapa centrado en Santo Domingo.'); if (this.locationWatchId !== null) { navigator.geolocation.clearWatch(this.locationWatchId); this.locationWatchId = null; } }, error => { const message = error.code === error.PERMISSION_DENIED ? 'Permiso de ubicación denegado. Actívalo en el navegador para continuar.' : 'No se pudo obtener Santo Domingo. Reintentando...'; this.locationStatus.set(message); }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }); }
  private isSantoDomingo(latitude: number, longitude: number): boolean { const latDistance = (latitude + 0.2504757) * 111.32; const lonDistance = (longitude + 79.168232) * 111.32 * Math.cos((-0.2504757 * Math.PI) / 180); return Math.sqrt(latDistance ** 2 + lonDistance ** 2) <= 35; }
  updateAge(): void { if (!this.data.birthDate) { this.data.age = null; return; } const birth = new Date(`${this.data.birthDate}T00:00:00`); const today = new Date(); let age = today.getFullYear() - birth.getFullYear(); if (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate())) age--; this.data.age = age; }
  toggleValue(values: string[], value: string): void { const index = values.indexOf(value); index === -1 ? values.push(value) : values.splice(index, 1); }
  slotKey(day: string, schedule: string): string { return `${day}::${schedule}`; }
  isSlotSelected(day: string, schedule: string): boolean { return this.data.availabilitySlots.includes(this.slotKey(day, schedule)); }
  isScheduleFullySelected(schedule: string): boolean { return this.availableDays.every(day => this.isSlotSelected(day, schedule)); }
  toggleSchedule(schedule: string): void { const selected = this.isScheduleFullySelected(schedule); this.availableDays.forEach(day => { const key = this.slotKey(day, schedule); const hasSlot = this.data.availabilitySlots.includes(key); if (selected && hasSlot) this.toggleValue(this.data.availabilitySlots, key); if (!selected && !hasSlot) this.toggleValue(this.data.availabilitySlots, key); }); this.syncAvailabilityArrays(); }
  toggleAvailability(day: string, schedule: string): void { this.toggleValue(this.data.availabilitySlots, this.slotKey(day, schedule)); this.syncAvailabilityArrays(); }
  private syncAvailabilityArrays(): void { this.data.days = this.availableDays.filter(item => this.data.availabilitySlots.some(slot => slot.startsWith(`${item}::`))); this.data.schedules = this.availableSchedules.filter(item => this.data.availabilitySlots.some(slot => slot.endsWith(`::${item}`))); }
  togglePassword(): void { this.passwordVisible.update(value => !value); }
  syncFullName(): void { this.data.name = `${this.firstNames.trim()} ${this.lastNames.trim()}`.trim(); }
  sanitizeEmail(): void { this.data.email = this.data.email.replace(/[^A-Za-z0-9._@-]/g, ''); }
  hasValidEmail(): boolean { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.fullEmail().trim()); }
  hasPasswordNumber(): boolean { return /\d/.test(this.data.password); }
  hasPasswordLetter(): boolean { return /\p{L}/u.test(this.data.password); }
  hasValidPassword(): boolean { return this.data.password.length >= 12 && this.hasPasswordNumber() && this.hasPasswordLetter(); }
  changeRole(): void { if (this.data.role === 'beneficiary') { this.data.institution = ''; this.data.career = ''; this.data.education = ''; this.data.level = ''; this.data.volunteer = 'No'; this.data.volunteerDetails = ''; } if (this.data.role === 'student' && !this.data.level) this.data.level = '1'; }
  citiesForProvince(): string[] { return this.locations.find(item => item.name === this.data.birthProvince)?.cities ?? []; }
  changeBirthProvince(): void { if (!this.citiesForProvince().includes(this.data.birthCity)) this.data.birthCity = ''; }
  changeDisability(): void { if (this.data.hasDisability === 'No') this.data.disabilityType = ''; }
  persistDraft(): void { const draft: Partial<RegistrationData> & { version?: string } = { ...this.data, version: this.draftVersion }; draft.password = undefined; localStorage.setItem(this.draftKey, JSON.stringify(draft)); }
  private restoreDraft(raw: string | null = localStorage.getItem(this.draftKey)): void { if (!raw) return; try { const draft = JSON.parse(raw) as Partial<RegistrationData> & { version?: string }; const volunteer = draft.version === this.draftVersion ? draft.volunteer : 'No'; Object.assign(this.data, draft, { password: '', volunteer }); if (!Array.isArray(this.data.availabilitySlots)) this.data.availabilitySlots = this.data.days.flatMap(day => this.data.schedules.map(schedule => this.slotKey(day, schedule))); this.data.id = this.data.id.replace(/\D/g, '').slice(0, 10); if (this.data.phone.startsWith('09')) this.data.phone = this.data.phone.slice(2); this.data.phone = this.data.phone.replace(/\D/g, '').slice(0, 8); if (this.data.birthDate) [this.birthYear, this.birthMonth, this.birthDay] = this.data.birthDate.split('-'); if (!this.data.gender) this.data.gender = 'Masculino'; if (!this.data.role) this.data.role = 'beneficiary'; if (this.data.role === 'student' && !this.data.level) this.data.level = '1'; if (!this.data.volunteer) this.data.volunteer = 'No'; const parts = this.data.email.split('@'); if (parts.length > 1) { this.data.email = parts[0]; this.emailDomain = `@${parts[1]}`; } this.sanitizeEmail(); if (!this.emailDomains.includes(this.emailDomain)) this.emailDomain = '@gmail.com'; } catch { localStorage.removeItem(this.draftKey); } }
  availableBirthMonths(): number[] { if (!this.birthYear) return this.dateMonths.map((_, index) => index + 1); return this.dateMonths.map((_, index) => index + 1).filter(month => this.dateDaysForMonth(Number(this.birthYear), month).length > 0); }
  dateDays(): number[] { if (!this.birthYear || !this.birthMonth) return Array.from({ length: 31 }, (_, index) => index + 1); return this.dateDaysForMonth(Number(this.birthYear), Number(this.birthMonth)); }
  private dateDaysForMonth(year: number, month: number): number[] { const max = new Date(year, month, 0).getDate(); return Array.from({ length: max }, (_, index) => index + 1).filter(day => this.isAllowedBirthDate(year, month, day)); }
  private isAllowedBirthDate(year: number, month: number, day: number): boolean { const date = new Date(year, month - 1, day); const today = new Date(); const minimum = new Date(today.getFullYear() - 29, today.getMonth(), today.getDate()); const maximum = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate()); return date >= minimum && date <= maximum; }
  syncBirthDate(): void { if (this.birthYear && !this.availableBirthMonths().includes(Number(this.birthMonth))) this.birthMonth = ''; if (this.birthMonth && !this.dateDays().includes(Number(this.birthDay))) this.birthDay = ''; if (!this.birthYear || !this.birthMonth || !this.birthDay) { this.data.birthDate = ''; this.data.age = null; return; } this.data.birthDate = `${this.birthYear}-${this.birthMonth.padStart(2, '0')}-${this.birthDay.padStart(2, '0')}`; this.updateAge(); }
  fullEmail(): string { return this.data.email.trim(); }
  fullPhone(): string { const digits = this.data.phone.replace(/\D/g, '').slice(0, 10); const phone = digits.length === 8 ? '09' + digits : digits; this.data.phone = phone; return phone; }
  private restoreNameParts(): void { const parts = this.data.name.trim().split(/\s+/).filter(Boolean); if (!this.firstNames && parts.length) { this.firstNames = parts[0]; this.lastNames = parts.slice(1).join(' '); } }
  hasValidNames(): boolean { return /^\p{L}+(?:[-']\p{L}+)* \p{L}+(?:[-']\p{L}+)*$/u.test(this.firstNames); }
  hasValidLastNames(): boolean { return /^\p{L}+(?:[-']\p{L}+)*(?: \p{L}+(?:[-']\p{L}+)*)+$/u.test(this.lastNames); }
  blockNameSpace(event: KeyboardEvent): void { if (event.key === ' ' && (!this.firstNames || this.firstNames.includes(' ') || this.firstNames.endsWith(' '))) event.preventDefault(); }
  blockInvalidNamePaste(event: ClipboardEvent): void { const value = event.clipboardData?.getData('text') ?? ''; if (!/^\p{L}+(?:[-']\p{L}+)* \p{L}+(?:[-']\p{L}+)*$/u.test(value)) event.preventDefault(); }
  blockAnySpace(event: KeyboardEvent): void { if (/\s/.test(event.key)) event.preventDefault(); }
  blockSpacePaste(event: ClipboardEvent): void { if (/\s/.test(event.clipboardData?.getData('text') ?? '')) event.preventDefault(); }
  hasValidFullName(): boolean {
    if (!this.hasValidNames() || !this.hasValidLastNames()) return false;
    if (!this.firstNames.trim() && this.data.name.trim()) this.restoreNameParts();
    if (!this.firstNames.trim() || !this.lastNames.trim()) return false;
    const parts = this.data.name.trim().split(/\s+/).filter(Boolean);
    return parts.length >= 2 && parts.every(part => /^\p{L}+(?:[-']\p{L}+)*$/u.test(part));
  }
  canContinue(): boolean {
    this.data.selfIdentification = this.data.selfIdentification || 'Mestizo/a';
    switch (this.step()) {
      case 0: return this.personalData.isComplete(this.data, this.hasValidFullName(), !!this.data.birthDate && !!this.birthYear && !!this.birthMonth && !!this.birthDay, this.hasValidEmail(), this.hasValidPassword());
      case 1: return this.addressSection.isComplete(this.data);
      case 2: return this.availabilitySection.isComplete(this.data);
      case 3: return this.additionalInfo.isComplete(this.data);
      case 4: return this.confirmationSection.isComplete(this.data);
      default: return false;
    }
  }
  private setStep(index: number): void { this.step.set(index); void this.router.navigate(['/inscripcion', index + 1], { replaceUrl: true }); }
  next(): void { if (this.busy()) return; this.error.set(''); this.errorField.set(''); const message = this.step() === 0 ? (this.canContinue() ? '' : 'Completa todos los campos obligatorios del paso 1.') : this.missingFieldMessage(); if (message) { this.error.set(message); return; } if (this.step() === 0 || this.step() === 3) { this.busy.set(true); const phone = this.step() === 3 ? this.fullPhone() : ''; this.api.checkIdentity(this.data.id, this.fullEmail(), phone).subscribe({ next: () => { this.busy.set(false); this.setStep(this.step() + 1); }, error: (failure: HttpErrorResponse) => { const code = failure.error?.error; this.errorField.set(code === 'registration_duplicate_email' ? 'email' : code === 'registration_duplicate_phone' ? 'phone' : 'id'); this.error.set(code === 'registration_duplicate_phone' ? 'El teléfono ya está registrado.' : this.identityMessageFor(failure)); this.busy.set(false); } }); return; } if (this.step() < this.steps.length - 1) this.setStep(this.step() + 1); }
  private missingFieldMessage(): string {
    if (this.step() === 3) return this.canContinue() ? '' : this.invalid('phone', 'Completa los campos obligatorios del paso 4.');
    if (this.step() === 1) { if (!this.data.education.trim()) return this.invalid('education', 'Ingresa tu instrucción.'); if (!this.data.address.trim()) return this.invalid('address', 'Ingresa tu dirección de domicilio.'); return ''; }
    if (this.step() === 2) { if (!this.data.days.length) return this.invalid('days', 'Selecciona al menos un día disponible.'); if (!this.data.schedules.length) return this.invalid('schedules', 'Selecciona al menos un horario disponible.'); return ''; }
    if (this.step() === 3) { if (!/^09\d{8}$/.test(this.data.phone)) return this.invalid('phone', 'Ingresa un teléfono de 10 dígitos que empiece con 09.'); if (!this.data.motivation.trim()) return this.invalid('motivation', 'Indica por qué deseas participar.'); if (this.data.role === 'student' && (!this.data.institution.trim() || !this.data.career.trim() || !this.data.level || !this.data.skills.trim() || !this.data.volunteer || (this.data.volunteer === 'Si' && !this.data.volunteerDetails.trim()))) return this.invalid('role', 'Completa la información del estudiante.'); return ''; }
    if (!this.data.birthProvince) return this.invalid('birthProvince', 'Selecciona la provincia de nacimiento.');
    if (!this.data.birthCity) return this.invalid('birthCity', 'Selecciona la ciudad de nacimiento.');
    if (!this.data.selfIdentification) return this.invalid('selfIdentification', 'Selecciona tu autoidentificacion.');
    if (!this.data.hasDisability) return this.invalid('hasDisability', 'Indica si tienes discapacidad.');
    if (this.data.hasDisability === 'Si' && !this.data.disabilityType) return this.invalid('disabilityType', 'Selecciona el tipo de discapacidad.');
    if (!this.data.education.trim()) return this.invalid('education', 'Ingresa tu instruccion.');
    if (!this.data.sector.trim()) return this.invalid('sector', 'Ingresa tu sector o barrio.');
    if (!this.birthYear || !this.birthMonth || !this.birthDay || !this.data.birthDate) return this.invalid('birthDate', 'Selecciona tu fecha de nacimiento.');
    if (!this.hasValidFullName()) return this.invalid('name', 'Ingresa tus nombres y apellidos completos.');
    if (!/^\d{10}$/.test(this.data.id)) return this.invalid('id', 'La cedula debe tener exactamente 10 digitos.');
    if (!this.data.gender) return this.invalid('gender', 'Escoge tu genero.');
    if (!this.hasValidEmail()) return this.invalid('email', 'Escribe un correo valido, por ejemplo correo@dominio.com.');
    if (!this.hasValidPassword()) return this.invalid('password', 'Completa los requisitos de la contrasena.');
    return '';
  }
  private legacyMissingFieldMessage(): string {
    if (this.step() === 0 && !this.data.birthProvince) return this.invalid('birthProvince', 'Selecciona la provincia de nacimiento.');
    if (this.step() === 0 && !this.data.birthCity) return this.invalid('birthCity', 'Selecciona la ciudad de nacimiento.');
    if (this.step() === 0 && !this.data.selfIdentification) return this.invalid('selfIdentification', 'Selecciona tu autoidentificación.');
    if (this.step() === 0 && !this.data.hasDisability) return this.invalid('hasDisability', 'Indica si tienes discapacidad.');
    if (this.step() === 0 && this.data.hasDisability === 'Si' && !this.data.disabilityType) return this.invalid('disabilityType', 'Selecciona el tipo de discapacidad.');
    if (this.step() === 0 && !this.data.education) return this.invalid('education', 'Ingresa tu instrucción.');
    if (this.step() === 0 && !this.data.sector) return this.invalid('sector', 'Ingresa tu sector.');
    if (this.step() === 2 && !this.data.sector) return this.invalid('sector', 'Ingresa tu sector.');
    if (this.step() === 2 && this.data.role === 'student' && !this.data.education) return this.invalid('education', 'Ingresa tu instrucción.');
    if (this.step() === 0 && (!this.birthYear || !this.birthMonth || !this.birthDay || !this.data.birthDate)) return this.invalid('birthDate', 'Selecciona año, mes y día de nacimiento.');
    if (this.step() === 0 && !this.hasValidFullName()) return this.invalid('name', 'Escribe exactamente dos nombres y dos apellidos.');
    if (this.step() === 0 && !/^\d{10}$/.test(this.data.id)) return this.invalid('id', 'La cédula debe tener exactamente 10 dígitos.');
    if (this.step() === 0 && (!this.data.email || !/^[A-Za-z0-9._]+$/.test(this.data.email))) return this.invalid('email', 'Escribe solo letras, números, punto o guion bajo.');
    if (this.step() === 0) { if (!this.data.name) return this.invalid('name', 'Ingresa tus nombres y apellidos.'); if (!this.data.id) return this.invalid('id', 'Ingresa tu cédula de identidad.'); if (!this.data.birthDate) return this.invalid('birthDate', 'Selecciona tu fecha de nacimiento.'); if (!this.data.gender) return this.invalid('gender', 'Escoge tu género.'); if (!this.data.email) return this.invalid('email', 'Escribe tu correo electrónico.'); if (!this.hasValidPassword()) return this.invalid('password', 'Completa los requisitos de la contraseña.'); }
    if (this.step() === 1) { if (!this.data.days.length) return this.invalid('days', 'Selecciona al menos un día disponible.'); if (!this.data.schedules.length) return this.invalid('schedules', 'Selecciona al menos un horario disponible.'); }
    if (this.step() === 2) { if (!this.locationGranted()) return this.invalid('location', 'Debes permitir el acceso a tu ubicación por motivos de logística.'); if (!/^\d{8}$/.test(this.data.phone)) return this.invalid('phone', 'Ingresa los 8 dígitos después del 09.'); if (!this.data.address) return this.invalid('address', 'Ingresa tu dirección de domicilio.'); if (this.data.role === 'student' && !this.data.institution) return this.invalid('institution', 'Ingresa tu institución educativa.'); if (this.data.role === 'student' && !this.data.career) return this.invalid('career', 'Ingresa tu carrera.'); if (this.data.role === 'student' && !this.data.level) return this.invalid('level', 'Selecciona tu semestre.'); if (this.data.role === 'student' && !this.data.skills) return this.invalid('skills', 'Indica qué habilidades puedes aportar.'); if (this.data.role === 'student' && !this.data.volunteer) return this.invalid('volunteer', 'Indica si has participado en voluntariado.'); if (!this.data.motivation) return this.invalid('motivation', 'Indica por qué deseas participar.'); }
    return '';
  }
  fieldError(field: string): string { return this.errorField() === field ? this.error() : ''; }
  identityError(field: 'ci' | 'email'): string { const both = this.error() === 'La cédula y el correo electrónico ya están registrados.'; if (both) return field === 'ci' ? 'La cédula ya está registrada. Es irrepetible.' : 'El correo electrónico ya está registrado. Es irrepetible.'; return this.fieldError(field === 'ci' ? 'id' : 'email'); }
  clearFieldError(field: string): void { if (this.errorField() === field || this.error().includes('ya está registrada') || this.error().startsWith('No se pudo enviar')) { this.error.set(''); this.errorField.set(''); } }
  private identityMessageFor(failure: HttpErrorResponse): string { const code = failure.error?.error; if (code === 'registration_identity_already_exists') return 'La cédula ya está registrada. Es irrepetible.'; if (code === 'not_found') return 'No se pudo verificar la cédula y el correo. Revisa que el backend esté actualizado.'; if (code === 'internal_error') return 'No se pudo verificar la cédula y el correo. Inténtalo nuevamente.'; return this.messageFor(failure); }
  private invalid(field: string, message: string): string { this.errorField.set(field); return message; }
  back(): void { this.error.set(''); this.setStep(Math.max(0, this.step() - 1)); }
  goTo(index: number): void { if (index <= this.step()) { this.error.set(''); this.setStep(index); } }
  submit(): void {
    if (this.busy()) return; this.updateAge(); this.errorField.set('');
    if (!this.hasValidFullName()) { this.errorField.set('name'); this.error.set('Escribe exactamente dos nombres y dos apellidos.'); return; }
    if ((this.data.age ?? 0) < 18 || (this.data.age ?? 0) > 29) { this.errorField.set('birthDate'); this.error.set('La inscripción está disponible para personas de 18 a 29 años.'); return; }
    if (!this.data.days.length) { this.errorField.set('days'); this.error.set('Selecciona al menos un día disponible.'); return; } if (!this.data.schedules.length) { this.errorField.set('schedules'); this.error.set('Selecciona al menos un horario disponible.'); return; } if (!this.data.terms) { this.errorField.set('terms'); this.error.set('Acepta los términos para continuar.'); return; }
    const payload: RegistrationPayload = { name: this.data.name, id: this.data.id, birthDate: this.data.birthDate, gender: this.data.gender, birthProvince: this.data.birthProvince, birthCity: this.data.birthCity, selfIdentification: this.data.selfIdentification, hasDisability: this.data.hasDisability, disabilityType: this.data.disabilityType, role: this.data.role, phone: this.fullPhone(), email: this.fullEmail(), address: this.data.address, sector: this.data.sector, latitude: this.data.latitude, longitude: this.data.longitude, institution: this.data.institution, career: this.data.career, education: this.data.education, level: this.data.level, motivation: this.data.motivation, skills: this.data.skills, volunteer: this.data.volunteer, volunteerDetails: this.data.volunteerDetails, password: this.data.password, days: this.data.days, schedules: this.data.schedules, terms: this.data.terms };
     this.busy.set(true); this.error.set(''); this.api.create(payload).subscribe({ next: () => { setTimeout(() => { localStorage.removeItem(this.draftKey); this.busy.set(false); void this.router.navigateByUrl('/login', { replaceUrl: true, state: { registrationEmail: payload.email, registrationPassword: payload.password } }); }, 500); }, error: (failure: HttpErrorResponse) => { setTimeout(() => { const code = failure.error?.error; if (code === 'invalid_password') { this.setStep(0); this.errorField.set('password'); } if (code === 'registration_duplicate_ci' || code === 'registration_duplicate_email' || code === 'registration_duplicate_ci_email') { this.setStep(0); this.errorField.set(code === 'registration_duplicate_email' ? 'email' : code === 'registration_duplicate_ci_email' ? '' : 'id'); } if (!this.errorField()) this.errorField.set('id'); this.error.set(this.messageFor(failure)); this.busy.set(false); }, 500); } });
  }
  private messageFor(failure: HttpErrorResponse): string { const code = failure.error?.error; if (failure.status === 0) return 'No se pudo conectar con el servidor. Verifica que el backend esté encendido.'; if (code === 'invalid_name') return 'Escribe exactamente dos nombres y dos apellidos.'; if (code === 'invalid_ci') return 'La cédula de identidad no tiene un formato válido.'; if (code === 'registration_identity_already_exists') return 'La cédula ya está registrada. Es irrepetible.'; if (code === 'invalid_email') return 'El correo electrónico no tiene un formato válido.'; if (code === 'invalid_password') return 'La contraseña debe tener 12 caracteres, letras y números.'; if (code === 'age_not_allowed') return 'La inscripción está disponible para personas de 18 a 29 años.'; if (code === 'registration_duplicate_ci') return 'La cédula ya está registrada. Es irrepetible.'; if (code === 'registration_duplicate_email') return 'El correo electrónico ya está registrado. Es irrepetible.'; if (code === 'registration_duplicate_ci_email') return 'La cédula y el correo electrónico ya están registrados.'; if (failure.status >= 500) return 'El servidor no pudo procesar la inscripción. Revisa los datos e inténtalo nuevamente.'; return 'No se pudo enviar la inscripción. Revisa los datos indicados e inténtalo de nuevo.'; }
}
