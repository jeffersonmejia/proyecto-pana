import { Component, OnInit, inject, output, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
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
  private readonly route=inject(ActivatedRoute);private readonly router=inject(Router);
  ngOnInit(): void { const requested=this.route.snapshot.paramMap.get('section') as AdminSection|null;
    if(requested&&this.allowed(requested))this.active.set(requested);else this.active.set(this.canUsers()?'users':this.canPeople()?'people':this.canRoles()?'roles':'backups');
    if(!requested||!this.allowed(requested))void this.router.navigateByUrl(`/administracion/${this.active()}`,{replaceUrl:true}); }
  canUsers(): boolean { return this.auth.hasPermission('users.read')||this.auth.hasPermission('users.manage'); }
  canPeople(): boolean { return this.auth.hasPermission('people.read')||this.auth.hasPermission('people.manage'); }
  canRoles(): boolean { return this.auth.hasPermission('roles.manage'); }
  canBackups(): boolean { return this.auth.user()?.roles.includes('admin') ?? false; }
  select(section:AdminSection): void { if(!this.allowed(section))return;this.active.set(section);void this.router.navigateByUrl(`/administracion/${section}`); }
  private allowed(section:AdminSection): boolean { return section==='users'?this.canUsers():section==='people'?this.canPeople():section==='roles'?this.canRoles():this.canBackups(); }
}
