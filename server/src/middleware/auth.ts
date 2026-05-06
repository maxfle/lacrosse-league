import { Request, Response, NextFunction } from 'express';
import passport from 'passport';

export interface AuthUser {
  id: string;
  email: string;
  role: 'super_admin' | 'admin' | 'coach' | 'player';
  first_name: string;
  last_name: string;
  is_verified: boolean;
  is_approved: boolean;
}

declare global {
  namespace Express {
    interface User extends AuthUser {}
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  passport.authenticate('jwt', { session: false }, (err: Error, user: AuthUser) => {
    if (err || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    req.user = user;
    next();
  })(req, res, next);
}

export function requireRole(...roles: AuthUser['role'][]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

export function requireApproved(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (!req.user.is_approved && req.user.role === 'coach') {
    return res.status(403).json({ error: 'Account pending admin approval' });
  }
  next();
}
