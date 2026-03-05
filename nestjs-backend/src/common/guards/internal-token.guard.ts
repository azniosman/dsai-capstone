import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Guard that validates the `X-Internal-Token` header on internal automation
 * endpoints.
 *
 * Internal automation endpoints are invoked exclusively via Lambda
 * Invoke API (Lambda-to-Lambda) and must NEVER be exposed publicly via
 * API Gateway. This guard provides a second layer of defence — it rejects
 * any request that does not carry the correct shared secret.
 *
 * The expected token is read from the `INTERNAL_AUTOMATION_TOKEN`
 * environment variable, which is stored in AWS Secrets Manager in
 * production and injected as a Lambda environment variable at deploy time.
 */
@Injectable()
export class InternalTokenGuard implements CanActivate, OnModuleInit {
  private readonly logger = new Logger(InternalTokenGuard.name);

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const token = this.config.get<string>('INTERNAL_AUTOMATION_TOKEN');
    if (!token) {
      this.logger.warn(
        'INTERNAL_AUTOMATION_TOKEN not set — all /internal/* calls will be rejected',
      );
    }
  }

  /**
   * Validates the `X-Internal-Token` request header.
   *
   * @param context - The NestJS execution context.
   * @returns `true` if the token matches.
   * @throws {ForbiddenException} If the token is absent or incorrect.
   */
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Record<string, any>>();
    const token: string | undefined = request.headers?.['x-internal-token'];
    const expected = this.config.get<string>('INTERNAL_AUTOMATION_TOKEN');

    if (!expected || !token || token !== expected) {
      throw new ForbiddenException(
        'Invalid or missing internal automation token',
      );
    }

    return true;
  }
}
