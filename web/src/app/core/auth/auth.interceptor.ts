import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const token = auth.accessToken();
  const readOnly = ['GET', 'HEAD', 'OPTIONS'].includes(request.method);
  if (auth.isPreview() && !readOnly && !request.url.includes('/auth/')) {
    return throwError(() => new Error('role_preview_read_only'));
  }
  if (!token) {
    return next(request);
  }

  const authorized = request.clone({
    setHeaders: { Authorization: `Bearer ${token}` },
    withCredentials: true,
  });

  return next(authorized).pipe(catchError((error: HttpErrorResponse) => {
    if (error.status !== 401 || request.url.includes('/auth/')) return throwError(() => error);
    return auth.refreshAccessToken().pipe(switchMap((refreshed) => {
      const renewedToken = auth.accessToken();
      if (!refreshed || !renewedToken) return throwError(() => error);
      return next(request.clone({ setHeaders: { Authorization: `Bearer ${renewedToken}` }, withCredentials: true }));
    }));
  }));
};
