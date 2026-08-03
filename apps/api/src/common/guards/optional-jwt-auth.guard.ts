import { Injectable, type ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Reads the bearer token if one is present, and lets the request through if it
 * is not.
 *
 * The registry is public, but how much of each record a reader sees depends on
 * who they are — so these routes need to *know* the viewer without *requiring*
 * one. JwtAuthGuard rejects anonymous requests, which is right for everything
 * behind a login and wrong here.
 *
 * An invalid or expired token is treated as anonymous rather than as an error:
 * a member whose session lapsed should quietly see the public view and be shown
 * the sign-in prompt, not a 401 on a page that works fine without a login.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest<TUser>(_err: unknown, user: TUser | false): TUser | undefined {
    return user || undefined;
  }
}
