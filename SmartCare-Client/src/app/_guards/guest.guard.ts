import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../_services/auth.service';

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const user = auth.currentUser();
  if (!user) return true;

  switch (user.role) {
    case 'Admin':        return router.createUrlTree(['/admin']);
    case 'Doctor':       return router.createUrlTree(['/doctor']);
    case 'Receptionist': return router.createUrlTree(['/receptionist']);
    case 'Patient':      return router.createUrlTree(['/patient']);
    default:             return router.createUrlTree(['/']);
  }
};
