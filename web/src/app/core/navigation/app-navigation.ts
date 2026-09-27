export type AppModuleId =
  | 'home'
  | 'events'
  | 'admin'
  | 'people'
  | 'attendance'
  | 'activities'
  | 'evaluations'
  | 'reports';

export const APP_NAVIGATION_PATHS: Readonly<Record<AppModuleId, string>> = {
  home: '/cursos',
  events: '/eventos',
  admin: '/administracion',
  people: '/personas',
  attendance: '/asistencia',
  activities: '/actividades',
  evaluations: '/evaluaciones',
  reports: '/reportes',
};

export function navigationPath(module: AppModuleId): string {
  return APP_NAVIGATION_PATHS[module];
}
