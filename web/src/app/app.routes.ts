import { Routes } from '@angular/router';
import { authGuard, guestGuard, permissionGuard } from './core/auth/route.guards';

const coursePermissions=['courses.read'];
const adminPermissions=['users.read','users.manage','people.read','people.manage','roles.manage'];

export const routes: Routes = [
  {path:'bienvenido',loadComponent:()=>import('./modules/welcome/welcome.component').then(m=>m.WelcomeComponent)},
  {path:'login',canActivate:[guestGuard],loadComponent:()=>import('./modules/auth/login.component').then(m=>m.LoginComponent)},
  {path:'inscripcion',canActivate:[guestGuard],loadComponent:()=>import('./modules/auth/registration.component').then(m=>m.RegistrationComponent)},
  {path:'inscripcion/:step',canActivate:[guestGuard],loadComponent:()=>import('./modules/auth/registration.component').then(m=>m.RegistrationComponent)},
  {path:'cursos',canActivate:[authGuard,permissionGuard],data:{permissions:coursePermissions},loadComponent:()=>import('./modules/courses/courses-home.component').then(m=>m.CoursesHomeComponent)},
  {path:'eventos',canActivate:[authGuard,permissionGuard],data:{permissions:['events.read']},loadComponent:()=>import('./modules/events/events.component').then(m=>m.EventsComponent)},
  {path:'notificaciones',canActivate:[authGuard],loadComponent:()=>import('./modules/notifications/notification-list.component').then(m=>m.NotificationListComponent)},
  {path:'notificaciones/:id',canActivate:[authGuard],loadComponent:()=>import('./modules/notifications/notification-detail.component').then(m=>m.NotificationDetailComponent)},
  {path:'perfil',canActivate:[authGuard],loadComponent:()=>import('./modules/profile/profile.component').then(m=>m.ProfileComponent)},
  {path:'cursos/:courseId/actividades/:activityId',canActivate:[authGuard,permissionGuard],data:{permissions:coursePermissions},loadComponent:()=>import('./modules/courses/courses-home.component').then(m=>m.CoursesHomeComponent)},
  {path:'cursos/:courseId/participantes/:id',canActivate:[authGuard,permissionGuard],data:{permissions:coursePermissions},loadComponent:()=>import('./modules/people/person-detail.component').then(m=>m.PersonDetailComponent)},
  {path:'cursos/:courseId',canActivate:[authGuard,permissionGuard],data:{permissions:coursePermissions},loadComponent:()=>import('./modules/courses/courses-home.component').then(m=>m.CoursesHomeComponent)},
  {path:'administracion',canActivate:[authGuard,permissionGuard],data:{permissions:adminPermissions},loadComponent:()=>import('./modules/admin/administration.component').then(m=>m.AdministrationComponent)},
  {path:'administracion/:section',canActivate:[authGuard,permissionGuard],data:{permissions:adminPermissions},loadComponent:()=>import('./modules/admin/administration.component').then(m=>m.AdministrationComponent)},
  {path:'personas',canActivate:[authGuard,permissionGuard],data:{permissions:['people.read','people.manage']},loadComponent:()=>import('./modules/people/people.component').then(m=>m.PeopleComponent)},
  {path:'asistencia',canActivate:[authGuard,permissionGuard],data:{permissions:['attendance.read','attendance.manage']},loadComponent:()=>import('./modules/attendance/attendance.component').then(m=>m.AttendanceComponent)},
  {path:'actividades',canActivate:[authGuard,permissionGuard],data:{permissions:['activities.read','activities.manage']},loadComponent:()=>import('./modules/activities/activities.component').then(m=>m.ActivitiesComponent)},
  {path:'evaluaciones',canActivate:[authGuard,permissionGuard],data:{permissions:['evaluations.read','evaluations.manage']},loadComponent:()=>import('./modules/evaluations/evaluations.component').then(m=>m.EvaluationsComponent)},
  {path:'reportes',canActivate:[authGuard,permissionGuard],data:{permissions:['reports.read']},loadComponent:()=>import('./modules/reports/reports.component').then(m=>m.ReportsComponent)},
  {path:'acceso-denegado',canActivate:[authGuard],loadComponent:()=>import('./shared/access-denied.component').then(m=>m.AccessDeniedComponent)},
  {path:'',pathMatch:'full',redirectTo:'cursos'},
  {path:'**',redirectTo:'cursos'},
];
