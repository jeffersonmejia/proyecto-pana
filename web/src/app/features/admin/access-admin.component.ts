import { Component, OnInit, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PaginatorComponent, PageInfo } from '../../shared/paginator.component';
import { StepDialogComponent } from '../../shared/step-dialog.component';
import { ConfirmationDialogComponent } from '../../shared/confirmation-dialog.component';
import { LucideGraduationCap, LucidePencil, LucidePlus, LucideTrash, LucideUserRound, LucideUsersRound, LucideWrench } from '@lucide/angular';
import { AdminApiService, BeneficiaryOption, ManagedUser, RoleOption } from './admin-api.service';
import { AuthService } from '../../core/auth/auth.service';
import { BeneficiaryPickerComponent } from './beneficiary-picker.component';
import { TutorStudentPickerComponent } from './tutor-student-picker.component';
import { emptyProfile, validIdentity, validProfile } from './admin-user-form.validator';

@Component({
  selector: 'pana-admin-users',
  standalone: true,
  imports: [FormsModule, PaginatorComponent, StepDialogComponent, ConfirmationDialogComponent, BeneficiaryPickerComponent, TutorStudentPickerComponent, LucideGraduationCap, LucidePencil, LucidePlus, LucideTrash, LucideUserRound, LucideUsersRound, LucideWrench],
  templateUrl: './access-admin.component.html',
  styleUrl: './access-admin.component.scss',
})
export class AdminUsersComponent implements OnInit {
  private readonly api = inject(AdminApiService);
  readonly auth = inject(AuthService);
  readonly close = output<void>();
  readonly users = signal<ManagedUser[]>([]);
  readonly userRoleFilter = signal<'all'|'beneficiary'|'student'|'tecnico'>('all');
  readonly roleCounts = signal<Record<string, number>>({});
  readonly roleOptions = signal<RoleOption[]>([]);
  readonly usersPage = signal<PageInfo>({ page: 1, page_size: 5, total: 0, pages: 1 });
  readonly message = signal('');
  readonly error = signal('');
  readonly busy = signal(false);
  readonly userDialog = signal(false); readonly step = signal(0);
  readonly deleteTarget = signal<ManagedUser | null>(null);
  userForm = { id: null as number | null, person_id: null as number | null, ci: '', first_name: '', last_name: '', phone: '',
    email: '', password: '', is_active: true, roles: [] as string[], profile: emptyProfile() };

  ngOnInit(): void { this.load(); }

  load(): void {
    if (this.auth.hasPermission('users.read') || this.auth.hasPermission('users.manage')) {
      this.api.users(this.usersPage().page, this.userRoleFilter()).subscribe({ next: (result) => { this.users.set(result.users); this.usersPage.set(result.pagination); this.roleCounts.set(result.role_counts); }, error: (e) => this.fail(e) });
    }
    if (this.auth.hasPermission('users.manage') || this.auth.hasPermission('roles.manage'))
      this.api.roleOptions().subscribe({ next: (items) => this.roleOptions.set(items), error: (e) => this.fail(e) });
  }

  editUser(user: ManagedUser): void {
    this.step.set(0); this.userDialog.set(true);
    this.userForm = { ...user, phone: user.phone ?? '', password: '', roles: [...user.roles],
      profile: { ...emptyProfile(), ...user.profile } };
  }

  createUser(): void { this.resetUser(); this.step.set(0); this.userDialog.set(true); }

  saveUser(): void {
    if (!this.userForm.id) this.usersPage.update((value) => ({ ...value, page: 1 }));
    this.run(this.api.saveUser(this.userForm, this.userForm.id), 'Usuario guardado.');
  }

  removeUser(user: ManagedUser): void { this.deleteTarget.set(user); }
  cancelDelete(): void { if(!this.busy())this.deleteTarget.set(null); }
  confirmDelete(): void { const user=this.deleteTarget(); if(!user)return; this.deleteTarget.set(null); this.run(this.api.deleteUser(user.id), 'Usuario eliminado.'); }

  toggleUserRole(event: Event, code: string): void {
    if ((event.target as HTMLInputElement).checked) {
      if (this.userForm.roles[0] !== code) this.userForm.profile = emptyProfile();
      this.userForm.roles = [code];
      this.userForm.person_id = null;
    } else this.userForm.roles = [];
  }

  selectBeneficiary(person: BeneficiaryOption): void {
    this.userForm.person_id = person.id;
    this.userForm.ci = person.ci ?? '';
    this.userForm.first_name = person.first_name;
    this.userForm.last_name = person.last_name;
    this.userForm.email = person.email ?? '';
  }

  roleNames(codes: string[]): string {
    return codes.map((code) => this.roleOptions().find((role) => role.code === code)?.name ?? code).join(', ');
  }

  resetUser(): void { this.userForm = { id: null, person_id: null, ci: '', first_name: '', last_name: '', phone: '', email: '', password: '', is_active: true, roles: [], profile: emptyProfile() }; }
  setUserRoleFilter(role: 'all'|'beneficiary'|'student'|'tecnico'): void { this.userRoleFilter.set(role); this.usersPage.update(value => ({ ...value, page: 1 })); this.load(); }
  roleCount(role: 'all'|'beneficiary'|'student'|'tecnico'): number { return role === 'all' ? this.usersPage().total : this.roleCounts()[role] ?? 0; }
  changeUsersPage(page: number): void { this.usersPage.update((value) => ({ ...value, page })); this.load(); }
  canContinue(): boolean {
    if (this.step() > 0) return this.userForm.roles.length === 1 && validIdentity(this.userForm)
      && (this.userForm.roles[0] !== 'beneficiary' || !!this.userForm.person_id)
      && validProfile(this.userForm.roles[0], this.userForm.profile);
    return validIdentity(this.userForm) && (!this.userForm.id ? this.userForm.password.length >= 12 : true);
  }
  next(): void { if (this.canContinue()) this.step.update((value) => value + 1); }
  toggleUser(user: ManagedUser): void {
    this.userForm = { ...user, phone: user.phone ?? '', password: '',
      is_active: !user.is_active, roles: [...user.roles], profile: { ...emptyProfile(), ...user.profile } };
    this.run(this.api.saveUser(this.userForm, user.id), 'Estado de usuario actualizado.');
  }

  hasProfile(): boolean {
 return ['coordinator', 'tecnico', 'student', 'beneficiary'].includes(this.userForm.roles[0]);
  }

  private run(request: import('rxjs').Observable<unknown>, success: string): void {
    this.busy.set(true);
    this.error.set('');
    request.subscribe({
      next: () => { this.message.set(success); this.userDialog.set(false); this.resetUser(); this.load(); },
      error: (failure) => this.fail(failure),
      complete: () => this.busy.set(false),
    });
  }

  private fail(failure: { error?: { error?: string } }): void {
    this.busy.set(false);
    this.error.set(failure.error?.error ?? 'No se pudo completar la operación.');
  }
}
