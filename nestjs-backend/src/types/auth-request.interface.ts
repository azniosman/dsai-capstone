import { Request } from 'express';
import { User } from '../entities/user.entity';

/**
 * Extended Express Request object containing the authenticated User entity.
 * Injected by the JwtAuthGuard into the request lifecycle.
 */
export interface AuthenticatedRequest extends Request {
  user: User;
}

/**
 * Extended Express Request object for optionally authenticated routes.
 * Injected by the OptionalJwtAuthGuard.
 */
export interface OptionalAuthenticatedRequest extends Request {
  user?: User;
}
