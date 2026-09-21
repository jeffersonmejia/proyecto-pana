import { Component, OnInit, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApiService, ManagedPermission, ManagedRole, ManagedUser } from './admin-api.service';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'pana-access-admin',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './access-admin.component.html',
  styleUrl: './access-admin.component.scss',
})
export class AccessAdminComponent implements OnInit {
  private readonly api = inject(AdminApiService);
  readonly auth = inject(AuthService);
  readonly close = output<void>();
  readonly users = signal<ManagedUser[]>([]);
  readonly roles = signal<ManagedRole[]>([]);
  readonly permissions = signal<ManagedPermission[]>([]);
  readonly message = signal('');
  readonly error = signal('');
  readonly busy = signal(false);
  userForm = { id: null as number | null, email: '', password: '', is_active: true, roles: [] as string[] };
  roleForm = { id: null as number | null, code: '', name: '', permissions: [] as string[] };

  ngOnInit(): void { this.load(); }

  load(): void {
    if (this.auth.hasPermission('users.read') || this.auth.hasPermission('users.manage')) {
      this.api.users().subscribe({ next: (items) => this.users.set(items), error: (e) => this.fail(e) });
    }
    if (this.auth.hasPermission('roles.manage') || this.auth.hasPermission('users.manage')) {
      this.api.roles().subscribe({ next: (items) => this.roles.set(items), error: (e) => this.fail(e) });
      this.api.permissions().subscribe({ next: (items) => this.permissions.set(items), error: (e) => this.fail(e) });
    }
  }

  editUser(user: ManagedUser): void {
    this.userForm = { ...user, password: '', roles: [...user.roles] };
  }

  saveUser(): void {
    this.run(this.api.saveUser(this.userForm, this.userForm.id), 'Usuario guardado.');
  }

  removeUser(id: number): void {
    if (confirm('¿Eliminar esta cuenta y cerrar sus sesiones?')) {
      this.run(this.api.deleteUser(id), 'Usuario eliminado.');
    }
  }

  editRole(role: ManagedRole): void {
    this.roleForm = { ...role, permissions: [...role.permissions] };
  }

  saveRole(): void {
    this.run(this.api.saveRole(this.roleForm, this.roleForm.id), 'Rol guardado.');
  }

  removeRole(id: number): void {
    if (confirm('¿Eliminar este rol? Solo se puede eliminar si no está asignado.')) {
      this.run(this.api.deleteRole(id), 'Rol eliminado.');
    }
  }

  toggleUserRole(event: Event, code: string): void {
    this.userForm.roles = this.toggle(this.userForm.roles, code, event);
  }

  togglePermission(event: Event, code: string): void {
    this.roleForm.permissions = this.toggle(this.roleForm.permissions, code, event);
  }

  resetUser(): void { this.userForm = { id: null, email: '', password: '', is_active: true, roles: [] }; }
  resetRole(): void { this.roleForm = { id: null, code: '', name: '', permissions: [] }; }

  private toggle(values: string[], code: string, event: Event): string[] {
    const selected = (event.target as HTMLInputElement).checked;
    return selected ? [...new Set([...values, code])] : values.filter((item) => item !== code);
  }

  private run(request: import('rxjs').Observable<unknown>, success: string): void {
    this.busy.set(true);
    this.error.set('');
    request.subscribe({
      next: () => { this.message.set(success); this.resetUser(); this.resetRole(); this.load(); },
      error: (failure) => this.fail(failure),
      complete: () => this.busy.set(false),
    });
  }

  private fail(failure: { error?: { error?: string } }): void {
    this.busy.set(false);
    this.error.set(failure.error?.error ?? 'No se pudo completar la operación.');
  }
}
