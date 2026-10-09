import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppResponseDto } from './app-response.dto';
import { ApiErrorDto } from './api-error.dto';
import { AppService } from './app.service';

@ApiTags('Aplicación')
@ApiResponse({ status: 429, type: ApiErrorDto })
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Comprobar que la API responde' })
  @ApiOkResponse({ type: AppResponseDto })
  getData(): AppResponseDto {
    return this.appService.getData();
  }
}
