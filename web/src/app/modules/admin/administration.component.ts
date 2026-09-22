import { Component, OnInit, inject, output, signal } from '@angular/core';
import { LucideClipboardCheck, LucideDownload, LucideUsersRound } from '@lucide/angular';
import { AuthService } from '../../core/auth/auth.service';
import { PeopleComponent } from '../people/people.component';
import { AdminRolesComponent } from './admin-roles.component';
import { AdminUsersComponent } from './access-admin.component';
import { BackupsComponent } from './backups.component';

type AdminSection='users'|'people'|'roles'|'backups';
@Component({selector:'pana-access-admin',standalone:true,imports:[PeopleComponent,AdminRolesComponent,AdminUsersComponent,BackupsComponent,LucideClipboardCheck,LucideDownload,LucideUsersRound],templateUrl:'./administration.component.html',styleUrl:'./administration.component.scss'})
export class AdministrationComponent implements OnInit {
  readonly auth=inject(AuthService); readonly close=output<void>(); readonly active=signal<AdminSection>('users');
  ngOnInit(): void { if(this.auth.hasPermission('users.read')||this.auth.hasPermission('users.manage')) this.active.set('users');
    else if(this.auth.hasPermission('people.read')||this.auth.hasPermission('people.manage')) this.active.set('people'); else this.active.set('roles'); }
  canUsers(): boolean { return this.auth.hasPermission('users.read')||this.auth.hasPermission('users.manage'); }
  canPeople(): boolean { return this.auth.hasPermission('people.read')||this.auth.hasPermission('people.manage'); }
  canRoles(): boolean { return this.auth.hasPermission('roles.manage'); }
  canBackups(): boolean { return this.auth.user()?.roles.includes('admin') ?? false; }
  select(section:AdminSection): void { this.active.set(section); }
}
