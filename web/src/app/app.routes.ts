import { Routes } from '@angular/router';
import { authGuard, guestGuard, permissionGuard } from './core/auth/route.guards';

const coursePermissions=['courses.read'];
const adminPermissions=['users.read','users.manage','people.read','people.manage','roles.manage'];

export const routes: Routes = [
  {path:'bienvenido',loadComponent:()=>import('./features/welcome').then(m=>m.WelcomeComponent)},
  {path:'login',canActivate:[guestGuard],loadComponent:()=>import('./features/auth').then(m=>m.LoginComponent)},
  {path:'inscripcion',canActivate:[guestGuard],loadComponent:()=>import('./features/auth').then(m=>m.RegistrationComponent)},
  {path:'inscripcion/:step',canActivate:[guestGuard],loadComponent:()=>import('./features/auth').then(m=>m.RegistrationComponent)},
  {path:'cursos',canActivate:[authGuard,permissionGuard],data:{permissions:coursePermissions},loadComponent:()=>import('./features/courses').then(m=>m.CoursesHomeComponent)},
  {path:'eventos',canActivate:[authGuard,permissionGuard],data:{permissions:['events.read']},loadComponent:()=>import('./features/events').then(m=>m.EventsComponent)},
  {path:'eventos/:courseId',canActivate:[authGuard,permissionGuard],data:{permissions:['events.read']},loadComponent:()=>import('./features/events').then(m=>m.EventsComponent)},
  {path:'notificaciones',canActivate:[authGuard],loadComponent:()=>import('./features/notifications').then(m=>m.NotificationListComponent)},
  {path:'notificaciones/:id',canActivate:[authGuard],loadComponent:()=>import('./features/notifications').then(m=>m.NotificationDetailComponent)},
  {path:'perfil',canActivate:[authGuard],loadComponent:()=>import('./features/profile').then(m=>m.ProfileComponent)},
  {path:'cursos/:courseId/actividades/:activityId',canActivate:[authGuard,permissionGuard],data:{permissions:coursePermissions},loadComponent:()=>import('./features/courses').then(m=>m.CoursesHomeComponent)},
  {path:'cursos/:courseId/participantes/:id',canActivate:[authGuard,permissionGuard],data:{permissions:coursePermissions},loadComponent:()=>import('./features/people').then(m=>m.PersonDetailComponent)},
  {path:'cursos/:courseId',canActivate:[authGuard,permissionGuard],data:{permissions:coursePermissions},loadComponent:()=>import('./features/courses').then(m=>m.CoursesHomeComponent)},
  {path:'administracion',canActivate:[authGuard,permissionGuard],data:{permissions:adminPermissions},loadComponent:()=>import('./features/admin').then(m=>m.AdministrationComponent)},
  {path:'administracion/:section',canActivate:[authGuard,permissionGuard],data:{permissions:adminPermissions},loadComponent:()=>import('./features/admin').then(m=>m.AdministrationComponent)},
  {path:'personas',canActivate:[authGuard,permissionGuard],data:{permissions:['people.read','people.manage']},loadComponent:()=>import('./features/people').then(m=>m.PeopleComponent)},
  {path:'asistencia',canActivate:[authGuard,permissionGuard],data:{permissions:['attendance.read','attendance.manage']},loadComponent:()=>import('./features/attendance').then(m=>m.AttendanceComponent)},
  {path:'actividades',canActivate:[authGuard,permissionGuard],data:{permissions:['activities.read','activities.manage']},loadComponent:()=>import('./features/activities').then(m=>m.ActivitiesComponent)},
  {path:'evaluaciones',canActivate:[authGuard,permissionGuard],data:{permissions:['evaluations.read','evaluations.manage']},loadComponent:()=>import('./features/evaluations').then(m=>m.EvaluationsComponent)},
  {path:'reportes',canActivate:[authGuard,permissionGuard],data:{permissions:['reports.read']},loadComponent:()=>import('./features/reports').then(m=>m.ReportsComponent)},
  {path:'acceso-denegado',canActivate:[authGuard],loadComponent:()=>import('./features/access-denied').then(m=>m.AccessDeniedComponent)},
  {path:'',pathMatch:'full',redirectTo:'cursos'},
  {path:'**',redirectTo:'cursos'},
];
