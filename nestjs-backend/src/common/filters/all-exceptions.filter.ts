import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let detail: unknown = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
        detail = res;
      } else if (typeof res === 'object' && res !== null) {
        message = (res as any).message || message;
        detail = (res as any).error || res;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    this.logger.error(
      `Http Status: ${status} Error Message: ${message}`,
      exception instanceof Error ? exception.stack : '',
    );

    // This format matches what the frontend extractApiError expects (matching FastAPI structure)
    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      detail: message,
      errorInfo: detail,
    });
  }
}
