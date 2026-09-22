import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const auth=inject(AuthService),router=inject(Router);
  if(auth.sessionReady())return auth.user()?true:router.createUrlTree(['/login']);
  return auth.restoreSession().pipe(map(()=>auth.user()?true:router.createUrlTree(['/login'])));
};

export const guestGuard: CanActivateFn = () => {
  const auth=inject(AuthService),router=inject(Router);
  if(auth.sessionReady())return auth.user()?router.createUrlTree(['/cursos']):true;
  return auth.restoreSession().pipe(map(()=>auth.user()?router.createUrlTree(['/cursos']):true));
};

export const permissionGuard: CanActivateFn = route => {
  const auth=inject(AuthService),router=inject(Router);
  const section=route.paramMap.get('section');
  const sectionPermissions:Record<string,string[]>={users:['users.read','users.manage'],people:['people.read','people.manage'],roles:['roles.manage'],backups:['users.manage']};
  const permissions=route.data['permissions'] as string[]|undefined;
  const required=section?sectionPermissions[section]:permissions;
  const check=()=>!required?.length||required.some(permission=>auth.hasPermission(permission))
    ?true:router.createUrlTree(['/acceso-denegado']);
  return auth.sessionReady()?check():auth.restoreSession().pipe(map(()=>check()));
};
