import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any) {
    // If no user could be decoded from JWT, return null instead of throwing UnauthorizedException
    return user || null;
  }
}
