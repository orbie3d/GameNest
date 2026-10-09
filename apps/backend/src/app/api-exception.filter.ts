import { ArgumentsHost, Catch, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { ExceptionFilter } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { ApiErrorDto } from './api-error.dto';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  constructor(private readonly adapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const status = exception instanceof HttpException ? exception.getStatus() : 500;
    let message: string | string[] = 'Internal server error';
    if (status < 500 && exception instanceof HttpException) {
      const response = exception.getResponse();
      if (typeof response === 'string') message = response;
      else if ('message' in response) {
        const candidate: unknown = response.message;
        if (typeof candidate === 'string') message = candidate;
        else if (Array.isArray(candidate) && candidate.every((item) => typeof item === 'string')) message = candidate;
      }
    }
    if (status >= 500) this.logger.error('An unexpected server error occurred');
    const body: ApiErrorDto = { statusCode: status, error: HttpStatus[status] ?? 'ERROR', message };
    this.adapterHost.httpAdapter.reply(host.switchToHttp().getResponse(), body, status);
  }
}
