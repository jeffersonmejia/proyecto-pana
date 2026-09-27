import { HttpErrorResponse } from "@angular/common/http";
import {
  ChangeDetectorRef,
  Directive,
  DestroyRef,
  HostListener,
  inject,
  output,
  signal,
} from "@angular/core";
import { SafeResourceUrl } from "@angular/platform-browser";
import { ActivatedRoute, Router } from "@angular/router";
import {
  RegistrationApiService,
} from "../services/registration-api.service";
import { ECUADOR_LOCATIONS } from "../data/ecuador-locations";
import { RegistrationData } from "../models/registration-data";
import { RegistrationFlowService } from "../orchestration/registration-flow.service";
import { RegistrationStepContext } from "../orchestration/registration-step";
import { RegistrationStepRegistryService } from "../orchestration/registration-step-registry.service";
import { RegistrationAvailabilityService } from "../services/registration-availability.service";
import { RegistrationDateService } from "../services/registration-date.service";
import { RegistrationFormService } from "../services/registration-form.service";
import { RegistrationDraftService } from "../services/registration-draft.service";
import { RegistrationLocationService } from "../services/registration-location.service";
import { RegistrationPayloadMapper } from "../mappers/registration-payload.mapper";
import { RegistrationStore } from "../store/registration.store";
import { RegistrationSubmitValidatorService } from "../services/registration-submit-validator.service";
import { RegistrationMessageService } from "../services/registration-message.service";
import { RegistrationInputService } from "../services/registration-input.service";

@Directive()
export class RegistrationFacade {
  firstNames = "";
  private readonly resetBirthDateDefaults = (() => {
    queueMicrotask(() => {
      this.birthYear = String(this.dateYears[0]);
      this.birthMonth = "1";
      this.birthDay = "1";
      this.data.birthProvince = "Santo Domingo de los Tsáchilas";
      this.data.birthCity = "Santo Domingo";
      this.syncBirthDate();
      this.updateAge();
    });
    return true;
  })();
  private readonly restoreLocationAfterDraft = (() => {
    queueMicrotask(() => this.restoreSavedLocation());
    return true;
  })();
  private restoreSavedLocation(): void {
    const raw = localStorage.getItem(this.draftKey);
    const shared = localStorage.getItem("pana-location-shared") === "true";
    if (!raw && !shared) return;
    try {
      const draft = raw ? (JSON.parse(raw) as Partial<RegistrationData>) : {};
      const latitude = Number(draft.latitude);
      const longitude = Number(draft.longitude);
      const hasCoordinates =
        Number.isFinite(latitude) &&
        Number.isFinite(longitude) &&
        (latitude !== -0.2504757 || longitude !== -79.168232);
      if (shared || hasCoordinates) {
        this.locationGranted.set(true);
        this.locationStatus.set("Ubicación restaurada.");
      }
      if (hasCoordinates)
        this.mapEmbedUrl.set(this.buildMapUrl(latitude, longitude));
    } catch {
      return;
    }
  }
  lastNames = "";
  @HostListener("document:input", ["$event"])
  validateCredentialsWhileTyping(event: Event): void { const target = event.target as HTMLInputElement; this.inputService.validateCredentials(target); if (target.name === "password") { this.error.set(""); this.errorField.set(""); } queueMicrotask(() => this.cdr.detectChanges()); }
  @HostListener("document:keyup", ["$event"])
  validateCredentialsOnKeyup(event: KeyboardEvent): void { this.validateCredentialsWhileTyping(event); }
  @HostListener("document:keydown", ["$event"])
  preventForbiddenSpaces(event: KeyboardEvent): void { if (this.inputService.shouldPreventSpace(event.target as HTMLInputElement, event.key)) event.preventDefault(); }
  @HostListener("document:paste", ["$event"])
  preventForbiddenSpacePaste(event: ClipboardEvent): void { const target = event.target as HTMLInputElement; if (this.inputService.pasteHasForbiddenSpace(target, event.clipboardData?.getData("text") ?? "")) event.preventDefault(); }
  @HostListener("document:input", ["$event"])
  updateNameHint(event: Event): void { const target = event.target as HTMLInputElement; if (target.name && ["firstNames", "lastNames"].includes(target.name)) target.classList.toggle("name-invalid", target.value.length > 0 && !this.inputService.nameIsValid(target)); }
  @HostListener("document:focusout", ["$event"])
  normalizeNameOnBlur(event: FocusEvent): void {
    const target = event.target as HTMLInputElement;
    if (!target?.name || !["firstNames", "lastNames"].includes(target.name)) return;
    const value = this.inputService.normalizeName(target.value);
    target.value = value;
    if (target.name === "firstNames") this.firstNames = value;
    else this.lastNames = value;
    this.syncFullName();
  }
  private readonly flow = inject(RegistrationFlowService);
  private readonly stepRegistry = inject(RegistrationStepRegistryService);
  private readonly formService = inject(RegistrationFormService);
  private readonly dateService = inject(RegistrationDateService);
  private readonly availabilityService = inject(
    RegistrationAvailabilityService,
  );
  private readonly draftService = inject(RegistrationDraftService);
  private readonly locationService = inject(RegistrationLocationService);
  private readonly payloadMapper = inject(RegistrationPayloadMapper);
  private readonly store = inject(RegistrationStore);
  private readonly submitValidator = inject(RegistrationSubmitValidatorService);
  private readonly messages = inject(RegistrationMessageService);
  private readonly inputService = inject(RegistrationInputService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(RegistrationApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly draftKey = "pana-registration-draft";
  private readonly draftVersion = "volunteer-default-no-v1";
  readonly closed = output<void>();
  readonly step = this.flow.step;
  readonly steps = this.flow.steps;
  readonly submitted = signal(false);
  readonly busy = signal(false);
  readonly passwordVisible = signal(false);
  readonly error = signal("");
  readonly errorField = signal("");
  readonly data: RegistrationData = this.store.data;
  readonly locations = ECUADOR_LOCATIONS;
  readonly selfIdentificationOptions = [
    "Indígena",
    "Afroecuatoriano/a",
    "Negro/a",
    "Mulato/a",
    "Montubio/a",
    "Mestizo/a",
    "Blanco/a",
    "Otro/a",
  ];
  readonly disabilityOptions = [
    "Visual",
    "Auditiva",
    "Física",
    "Intelectual",
    "Psicosocial",
    "Del lenguaje",
    "Múltiple",
    "Otra",
  ];
  readonly dateYears = this.dateService.years;
  readonly dateMonths = this.dateService.months;
  readonly availableDays = [
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
  ];
  readonly availableSchedules = ["Mañana", "Tarde"];
  birthYear = "";
  birthMonth = "";
  birthDay = "";
  readonly locationStatus = signal("Aún no has compartido tu ubicación.");
  readonly locationGranted = signal(false);
  readonly mapEmbedUrl = signal<SafeResourceUrl>(
    this.buildMapUrl(-0.2504757, -79.168232),
  );
  private locationWatchId: number | null = null;
  constructor() {
    this.restoreDraft();
    const sync = (event: StorageEvent) => {
      if (event.key === this.draftKey) this.restoreDraft(event.newValue);
    };
    const routeSub = this.route.paramMap.subscribe((params) => {
      const value = Number(params.get("step"));
      const index =
        Number.isInteger(value) && value >= 1 && value <= this.steps.length
          ? value - 1
          : 0;
      this.step.set(index);
      if (!params.get("step"))
        void this.router.navigate(["/inscripcion", 1], { replaceUrl: true });
    });
    window.addEventListener("storage", sync);
    this.destroyRef.onDestroy(() => {
      routeSub.unsubscribe();
      window.removeEventListener("storage", sync);
      if (this.locationWatchId !== null)
        navigator.geolocation?.clearWatch(this.locationWatchId);
    });
  }
  close(): void {
    this.closed.emit();
    void this.router.navigateByUrl("/login");
  }
  private buildMapUrl(latitude: number, longitude: number): SafeResourceUrl {
    if (latitude !== -0.2504757 || longitude !== -79.168232) {
      this.data.latitude = latitude;
      this.data.longitude = longitude;
      localStorage.setItem("pana-location-shared", "true");
      this.persistDraft();
    }
    return this.locationService.mapUrl(latitude, longitude);
  }
  requestLocation(): void {
    if (!window.isSecureContext) {
      this.locationStatus.set(
        "La ubicación requiere HTTPS o localhost. Abre la dirección https:// de la aplicación.",
      );
      return;
    }
    if (!navigator.geolocation) {
      this.locationStatus.set(
        "Tu navegador no permite acceder a la ubicación.",
      );
      return;
    }
    if (this.locationWatchId !== null)
      navigator.geolocation.clearWatch(this.locationWatchId);
    this.locationGranted.set(false);
    this.locationStatus.set("Buscando tu ubicación en Santo Domingo...");
    this.locationWatchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        if (!this.isSantoDomingo(latitude, longitude)) {
          this.locationStatus.set(
            "La ubicación recibida no corresponde a Santo Domingo. Reintentando...",
          );
          return;
        }
        this.mapEmbedUrl.set(this.buildMapUrl(latitude, longitude));
        this.locationGranted.set(true);
        this.locationStatus.set("Mapa centrado en Santo Domingo.");
        if (this.locationWatchId !== null) {
          navigator.geolocation.clearWatch(this.locationWatchId);
          this.locationWatchId = null;
        }
      },
      (error) => {
        const message =
          error.code === error.PERMISSION_DENIED
            ? "Permiso de ubicación denegado. Actívalo en el navegador para continuar."
            : "No se pudo obtener Santo Domingo. Reintentando...";
        this.locationStatus.set(message);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }
  private isSantoDomingo(latitude: number, longitude: number): boolean {
    return this.locationService.isSantoDomingo(latitude, longitude);
  }
  updateAge(): void {
    this.data.age = this.dateService.age(this.data.birthDate);
  }
  toggleValue(values: string[], value: string): void {
    const index = values.indexOf(value);
    index === -1 ? values.push(value) : values.splice(index, 1);
  }
  slotKey(day: string, schedule: string): string {
    return this.availabilityService.slotKey(day, schedule);
  }
  isSlotSelected(day: string, schedule: string): boolean {
    return this.availabilityService.selected(
      this.data.availabilitySlots,
      day,
      schedule,
    );
  }
  isScheduleFullySelected(schedule: string): boolean {
    return this.availabilityService.allSelected(
      this.data.availabilitySlots,
      this.availableDays,
      schedule,
    );
  }
  toggleSchedule(schedule: string): void {
    this.data.availabilitySlots = this.availabilityService.toggleSchedule(
      this.data.availabilitySlots,
      this.availableDays,
      schedule,
    );
    this.syncAvailabilityArrays();
  }
  toggleAvailability(day: string, schedule: string): void {
    this.data.availabilitySlots = this.availabilityService.toggle(
      this.data.availabilitySlots,
      day,
      schedule,
    );
    this.syncAvailabilityArrays();
  }
  private syncAvailabilityArrays(): void {
    const arrays = this.availabilityService.arrays(
      this.data.availabilitySlots,
      this.availableDays,
      this.availableSchedules,
    );
    this.data.days = arrays.days;
    this.data.schedules = arrays.schedules;
  }
  togglePassword(): void {
    this.passwordVisible.update((value) => !value);
  }
  syncFullName(): void {
    this.data.name =
      `${this.firstNames.trim()} ${this.lastNames.trim()}`.trim();
  }
  sanitizeEmail(): void {
    this.data.email = this.formService.sanitizeEmail(this.data.email);
  }
  hasValidEmail(): boolean {
    return this.formService.hasValidEmail(this.fullEmail());
  }
  hasPasswordNumber(): boolean {
    return this.formService.passwordHasNumber(this.data.password);
  }
  hasPasswordLetter(): boolean {
    return this.formService.passwordHasLetter(this.data.password);
  }
  hasValidPassword(): boolean {
    return this.formService.hasValidPassword(this.data.password);
  }
  changeRole(): void {
    if (this.data.role === "beneficiary") {
      this.data.institution = "";
      this.data.career = "";
      this.data.education = "";
      this.data.level = "";
      this.data.volunteer = "No";
      this.data.volunteerDetails = "";
    }
    if (this.data.role === "student" && !this.data.level) this.data.level = "1";
  }
  citiesForProvince(): string[] {
    return (
      this.locations.find((item) => item.name === this.data.birthProvince)
        ?.cities ?? []
    );
  }
  changeBirthProvince(): void {
    if (!this.citiesForProvince().includes(this.data.birthCity))
      this.data.birthCity = "";
  }
  changeDisability(): void {
    if (this.data.hasDisability === "No") this.data.disabilityType = "";
  }
  persistDraft(): void {
    this.draftService.save(this.draftKey, this.data, this.draftVersion);
  }
  private restoreDraft(
    raw: string | null = localStorage.getItem(this.draftKey),
  ): void {
    if (!raw) return;
    try {
      const draft = JSON.parse(raw) as Partial<RegistrationData> & {
        version?: string;
      };
      const volunteer =
        draft.version === this.draftVersion ? draft.volunteer : "No";
      Object.assign(this.data, draft, { password: "", volunteer });
      if (!Array.isArray(this.data.availabilitySlots))
        this.data.availabilitySlots = this.data.days.flatMap((day) =>
          this.data.schedules.map((schedule) => this.slotKey(day, schedule)),
        );
      this.data.availabilitySlots = this.data.availabilitySlots.filter(
        (slot) => !slot.endsWith("::Noche"),
      );
      this.syncAvailabilityArrays();
      this.data.id = this.data.id.replace(/\D/g, "").slice(0, 10);
      this.data.phone = this.data.phone.replace(/\D/g, "").slice(0, 10);
      if (this.data.birthDate)
        [this.birthYear, this.birthMonth, this.birthDay] =
          this.data.birthDate.split("-");
      if (!this.data.gender) this.data.gender = "Masculino";
      if (!this.data.role) this.data.role = "beneficiary";
      if (this.data.role === "student" && !this.data.level)
        this.data.level = "1";
      if (!this.data.volunteer) this.data.volunteer = "No";
      this.sanitizeEmail();
    } catch {
      localStorage.removeItem(this.draftKey);
    }
  }
  availableBirthMonths(): number[] {
    return this.dateService.availableMonths(this.birthYear);
  }
  dateDays(): number[] {
    return this.dateService.days(this.birthYear, this.birthMonth);
  }
  syncBirthDate(): void {
    const value = this.dateService.sync(
      this.birthYear,
      this.birthMonth,
      this.birthDay,
    );
    this.birthYear = value.year;
    this.birthMonth = value.month;
    this.birthDay = value.day;
    this.data.birthDate = value.date;
    this.updateAge();
  }
  fullEmail(): string {
    return this.data.email.trim();
  }
  syncPhone(value: string): void {
    this.data.phone = this.formService.normalizePhone(value);
    this.store.touch();
    console.debug("[PANA registration] syncPhone", { rawLength: value.length, normalizedLength: this.data.phone.length, phoneMasked: this.maskPhone(this.data.phone), revision: this.store.revision() });
    this.clearFieldError("phone");
  }
  syncMotivation(value: string): void {
    this.data.motivation = value;
    this.store.touch();
    console.debug("[PANA registration] syncMotivation", { length: value.length, trimmedLength: value.trim().length, revision: this.store.revision() });
    this.clearFieldError("motivation");
  }
  private maskPhone(value: string): string { return value.length < 4 ? value : `${value.slice(0, 2)}******${value.slice(-2)}`; }
  fullPhone(): string {
    return this.formService.fullPhone(this.data.phone);
  }
  private restoreNameParts(): void {
    const parts = this.data.name.trim().split(/\s+/).filter(Boolean);
    if (!this.firstNames && parts.length) {
      this.firstNames = parts[0];
      this.lastNames = parts.slice(1).join(" ");
    }
  }
  hasValidNames(): boolean {
    return this.formService.hasValidFirstNames(this.firstNames);
  }
  hasValidLastNames(): boolean {
    return this.formService.hasValidLastNames(this.lastNames);
  }
  blockNameSpace(event: KeyboardEvent): void {
    if (
      event.key === " " &&
      (!this.firstNames ||
        this.firstNames.includes(" ") ||
        this.firstNames.endsWith(" "))
    )
      event.preventDefault();
  }
  blockInvalidNamePaste(event: ClipboardEvent): void {
    const value = event.clipboardData?.getData("text") ?? "";
    if (!/^\p{L}+(?:[-']\p{L}+)* \p{L}+(?:[-']\p{L}+)*$/u.test(value))
      event.preventDefault();
  }
  blockAnySpace(event: KeyboardEvent): void {
    if (/\s/.test(event.key)) event.preventDefault();
  }
  blockSpacePaste(event: ClipboardEvent): void {
    if (/\s/.test(event.clipboardData?.getData("text") ?? ""))
      event.preventDefault();
  }
  hasValidFullName(): boolean {
    return this.formService.hasValidFullName(
      this.data,
      this.firstNames,
      this.lastNames,
    );
  }
  private stepContext(): RegistrationStepContext {
    return {
      data: this.data,
      birthDateReady:
        !!this.data.birthDate &&
        !!this.birthYear &&
        !!this.birthMonth &&
        !!this.birthDay,
      validFullName: this.hasValidFullName(),
      validEmail: this.hasValidEmail(),
      validPassword: this.hasValidPassword(),
    };
  }
  canContinue(): boolean {
    this.store.revision();
    this.data.selfIdentification = this.data.selfIdentification || "Mestizo/a";
    const result = this.stepRegistry.isComplete(this.step(), this.stepContext());
    console.debug("[PANA registration] canContinue", { step: this.step(), result, role: this.data.role, phoneLength: this.data.phone.length, phoneMasked: this.maskPhone(this.data.phone), motivationLength: this.data.motivation.length, revision: this.store.revision() });
    return result;
  }
  touchForm(event?: Event): void { this.store.touch(); const target = event?.target as HTMLInputElement | null; console.debug("[PANA registration] input", { field: target?.name ?? "unknown", valueLength: target?.value?.length ?? 0, revision: this.store.revision() }); }
  private setStep(index: number): void {
    this.step.set(index);
    void this.router.navigate(["/inscripcion", index + 1], {
      replaceUrl: true,
    });
  }
  next(): void {
    if (this.busy()) return;
    this.error.set("");
    this.errorField.set("");
    const message =
      this.step() === 0
        ? this.canContinue()
          ? ""
          : "Completa todos los campos obligatorios del paso 1."
        : this.missingFieldMessage();
    if (message) {
      if (this.step() === 0 && !this.hasValidPassword()) return;
      this.error.set(message);
      return;
    }
    if (this.step() === 0 || this.step() === 3) {
      this.busy.set(true);
      const phone = this.step() === 3 ? this.fullPhone() : "";
      this.api.checkIdentity(this.data.id, this.fullEmail(), phone).subscribe({
        next: () => {
          this.busy.set(false);
          this.setStep(this.step() + 1);
        },
        error: (failure: HttpErrorResponse) => {
          const code = failure.error?.error;
          this.errorField.set(
            code === "registration_duplicate_email"
              ? "email"
              : code === "registration_duplicate_phone"
                ? "phone"
                : "id",
          );
          this.error.set(
            code === "registration_duplicate_phone"
              ? "El teléfono ya está registrado."
              : this.identityMessageFor(failure),
          );
          this.busy.set(false);
        },
      });
      return;
    }
    if (this.step() < this.steps.length - 1) this.setStep(this.step() + 1);
  }
  private missingFieldMessage(): string {
    const error = this.stepRegistry.error(this.step(), this.stepContext());
    return error ? this.invalid(error.field, error.message) : "";
  }
  fieldError(field: string): string {
    if (field === "password") return "";
    return this.errorField() === field ? this.error() : "";
  }
  identityError(field: "ci" | "email"): string {
    const both =
      this.error() ===
      "La cédula y el correo electrónico ya están registrados.";
    if (both)
      return field === "ci"
        ? "La cédula ya está registrada. Es irrepetible."
        : "El correo electrónico ya está registrado. Es irrepetible.";
    return this.fieldError(field === "ci" ? "id" : "email");
  }
  clearFieldError(field: string): void {
    if (
      this.errorField() === field ||
      this.error().includes("ya está registrada") ||
      this.error().startsWith("No se pudo enviar")
    ) {
      this.error.set("");
      this.errorField.set("");
    }
  }
  private identityMessageFor(failure: HttpErrorResponse): string { return this.messages.identity(failure); }
  private invalid(field: string, message: string): string { this.errorField.set(field); return message; }
  back(): void {
    this.error.set("");
    this.setStep(Math.max(0, this.step() - 1));
  }
  goTo(index: number): void {
    if (index <= this.step()) {
      this.error.set("");
      this.setStep(index);
    }
  }
  submit(): void {
    if (this.busy()) return;
    console.log("[PANA registration] submit clicked", { terms: this.data.terms, days: this.data.days, schedules: this.data.schedules });
    this.updateAge();
    this.errorField.set("");
    const validation = this.submitValidator.validate(this.data, this.hasValidFullName());
    console.log("[PANA registration] submit validation", { validation, age: this.data.age, validFullName: this.hasValidFullName(), days: this.data.days, schedules: this.data.schedules, terms: this.data.terms });
    if (validation) { this.errorField.set(validation.field); this.error.set(validation.message); return; }
    const payload = this.payloadMapper.map(this.data, this.fullPhone(), this.fullEmail());
    console.log("[PANA registration] payload", { phoneLength: payload.phone.length, email: payload.email, days: payload.days, schedules: payload.schedules, terms: payload.terms });
    this.busy.set(true);
    this.error.set("");
    this.api.create(payload).subscribe({
      next: () => {
        setTimeout(() => {
          localStorage.removeItem(this.draftKey);
          this.busy.set(false);
          void this.router.navigateByUrl("/login", {
            replaceUrl: true,
            state: {
              registrationEmail: payload.email,
              registrationPassword: payload.password,
            },
          });
        }, 500);
      },
      error: (failure: HttpErrorResponse) => {
        setTimeout(() => {
          const code = failure.error?.error;
          if (code === "invalid_password") {
            this.setStep(0);
            this.errorField.set("password");
          }
          if (
            code === "registration_duplicate_ci" ||
            code === "registration_duplicate_email" ||
            code === "registration_duplicate_ci_email"
          ) {
            this.setStep(0);
            this.errorField.set(
              code === "registration_duplicate_email"
                ? "email"
                : code === "registration_duplicate_ci_email"
                  ? ""
                  : "id",
            );
          }
          if (!this.errorField() && this.step() < this.steps.length - 1) this.errorField.set("id");
          this.error.set(this.messageFor(failure));
          this.busy.set(false);
        }, 500);
      },
    });
  }
  private messageFor(failure: HttpErrorResponse): string { return this.messages.general(failure); }
}
