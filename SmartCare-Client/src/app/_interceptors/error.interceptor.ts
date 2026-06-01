import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { catchError, throwError } from 'rxjs';
import { ApiResponse } from '../_models/api-response.model';
import { AuthService } from '../_services/auth.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toastr = inject(ToastrService);
  const router = inject(Router);
  const auth = inject(AuthService);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      const body = err.error as Partial<ApiResponse<unknown>> | null;
      const errors: string[] = body?.errors?.length ? body.errors : [];
      const message = body?.message ?? 'An unexpected error occurred';

      switch (err.status) {
        case 401:
          if (auth.currentUser()) {
            // Authenticated session expired — clear state and send to login
            auth.logout();
            router.navigate(['/login']);
            toastr.warning('Your session has expired. Please sign in again.');
          } else {
            // Unauthenticated request (e.g. wrong password on login page)
            toastr.error(message || 'Invalid email or password');
          }
          break;
        case 403:
          toastr.error("You don't have permission");
          break;
        case 400:
        case 409:
          if (errors.length) {
            errors.forEach((e) => toastr.error(e));
          } else {
            toastr.error(message);
          }
          break;
        case 500:
          toastr.error('Something went wrong. Please try again later.');
          break;
        case 0:
          toastr.error('Cannot reach the server. Please check your connection.');
          break;
      }

      return throwError(() => err);
    }),
  );
};
