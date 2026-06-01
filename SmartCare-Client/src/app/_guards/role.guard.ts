import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../_services/auth.service';
import { Role } from '../_models/user.model';

const ROLE_DASHBOARDS: Record<Role, string> = {
  Admin: '/admin',
  Doctor: '/doctor',
  Receptionist: '/receptionist',
  Patient: '/patient',
};

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const user = auth.currentUser();
  if (!user) return router.createUrlTree(['/login']);

  const allowed: Role[] = route.data['roles'] ?? [];
  if (allowed.includes(user.role)) return true;

  // Wrong role — redirect silently to the user's own dashboard
  return router.createUrlTree([ROLE_DASHBOARDS[user.role]]);
};
