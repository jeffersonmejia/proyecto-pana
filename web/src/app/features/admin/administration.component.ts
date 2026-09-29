import { Component, OnInit, inject, output, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideClipboardCheck, LucideDownload, LucideShieldCheck, LucideUserRound, LucideUsersRound } from '@lucide/angular';
import { AuthService } from '../../core/auth/auth.service';
import { PeopleComponent } from '../people/people.component';
import { AdminRolesComponent } from './admin-roles.component';
import { AdminUsersComponent } from './access-admin.component';
import { BackupsComponent } from './backups.component';
import { SkeletonLoaderComponent } from '../../shared/skeleton-loader.component';
import { AdminApiService } from './admin-api.service';
import { BackupApiService } from './backup-api.service';

type AdminSection='users'|'people'|'roles'|'backups';
@Component({selector:'pana-access-admin',standalone:true,imports:[PeopleComponent,AdminRolesComponent,AdminUsersComponent,BackupsComponent,SkeletonLoaderComponent,LucideClipboardCheck,LucideDownload,LucideShieldCheck,LucideUserRound,LucideUsersRound],templateUrl:'./administration.component.html',styleUrl:'./administration.component.scss'})
export class AdministrationComponent implements OnInit {
  readonly auth=inject(AuthService); readonly close=output<void>(); readonly active=signal<AdminSection>('users'); readonly sectionReady=signal(false); readonly usersCount=signal(0); readonly backupsCount=signal(0);
  private readonly adminApi=inject(AdminApiService); private readonly backupApi=inject(BackupApiService);
  private readonly route=inject(ActivatedRoute);private readonly router=inject(Router);
  ngOnInit(): void { const requested=this.route.snapshot.paramMap.get('section') as AdminSection|null;
    if(requested&&this.allowed(requested))this.active.set(requested);else this.active.set(this.canUsers()?'users':this.canPeople()?'people':this.canRoles()?'roles':'backups');
    if(!requested||!this.allowed(requested))void this.router.navigateByUrl(`/administracion/${this.active()}`,{replaceUrl:true}); this.prepareSection(); this.loadCounts(); }
  private loadCounts(): void { if(this.canUsers())this.adminApi.users(1).subscribe({next:result=>this.usersCount.set(result.pagination.total)}); if(this.canBackups())this.backupApi.list().subscribe({next:result=>this.backupsCount.set(result.backups.length)}); }
  canUsers(): boolean { return this.auth.hasPermission('users.read')||this.auth.hasPermission('users.manage'); }
  canPeople(): boolean { return this.auth.hasPermission('people.read')||this.auth.hasPermission('people.manage'); }
  canRoles(): boolean { return this.auth.hasPermission('roles.manage'); }
  canBackups(): boolean { return this.auth.user()?.roles.includes('admin') ?? false; }
  select(section:AdminSection): void { if(!this.allowed(section))return;this.active.set(section);this.prepareSection();void this.router.navigateByUrl(`/administracion/${section}`); }
  private prepareSection(): void { this.sectionReady.set(false); setTimeout(()=>this.sectionReady.set(true),700); }
  private allowed(section:AdminSection): boolean { return section==='users'?this.canUsers():section==='people'?this.canPeople():section==='roles'?this.canRoles():this.canBackups(); }
}
