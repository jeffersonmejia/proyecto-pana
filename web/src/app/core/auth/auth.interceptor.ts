import { HttpErrorResponse, HttpEvent, HttpEventType, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const logResponse = tap((event: HttpEvent<unknown>) => {
    if (!environment.production && event.type === HttpEventType.Response) {
      console.log('[API response]', request.method, request.url, event.status, event.body);
    }
  });
  const logError = (error: HttpErrorResponse) => {
    if (!environment.production) {
      console.error('[API error]', request.method, request.url, error.status, error.error);
    }
    return throwError(() => error);
  };
  const token = auth.accessToken();
  const readOnly = ['GET', 'HEAD', 'OPTIONS'].includes(request.method);
  if (auth.isPreview() && !readOnly && !request.url.includes('/auth/')) {
    return throwError(() => new Error('role_preview_read_only'));
  }
  if (!token) {
    return next(request).pipe(logResponse, catchError(logError));
  }

  const authorized = request.clone({
    setHeaders: { Authorization: `Bearer ${token}` },
    withCredentials: true,
  });

  return next(authorized).pipe(logResponse, catchError((error: HttpErrorResponse) => {
    if (error.status !== 401 || request.url.includes('/auth/')) return logError(error);
    return auth.refreshAccessToken().pipe(switchMap((refreshed) => {
      const renewedToken = auth.accessToken();
      if (!refreshed || !renewedToken) return logError(error);
      return next(request.clone({ setHeaders: { Authorization: `Bearer ${renewedToken}` }, withCredentials: true })).pipe(logResponse, catchError(logError));
    }));
  }));
};
