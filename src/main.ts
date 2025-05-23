import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as fs from 'fs';
import { PrismaClientExceptionFilter } from './common/filters/prisma-exception.filter';
import { TenantIdInterceptor } from './common/interceptors/tenant-id.interceptor';
import { Logger, ValidationPipe } from '@nestjs/common';
// import { HttpExceptionFilter } from './common/filters/http-exception.filter'; // Optional: A generic HTTP exception filter

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configurar el prefijo global antes de cualquier otra configuración
  app.setGlobalPrefix('api', {
    exclude: ['/health', '/health/(.*)'], // Excluir rutas de health check
  });

  // Configurar ValidationPipe global con transformaciones habilitadas
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true, // Habilitar transformaciones
      transformOptions: {
        enableImplicitConversion: true, // Permitir conversión implícita de tipos
      },
      whitelist: true, // Solo permitir propiedades definidas en el DTO
      forbidNonWhitelisted: true, // Rechazar propiedades no definidas
    }),
  );

  // Apply Global Filters (Prisma specific first, then generic HTTP)
  // HttpAdapterHost is needed for filters that might handle non-HttpException errors
  // const { httpAdapter } = app.get(HttpAdapterHost); // HttpAdapterHost might not be needed if only handling known exceptions
  app.useGlobalFilters(
    new PrismaClientExceptionFilter(),
    // new HttpExceptionFilter() // Uncomment if you create a generic HttpExceptionFilter
  );

  // Aplica el interceptor global para tenantId
  app.useGlobalInterceptors(new TenantIdInterceptor());

  const config = new DocumentBuilder()
    .setTitle('japm.app API')
    .setDescription('API for the japm.app Prompt Engineering application')
    .setVersion('1.0')
    // Add Bearer Authentication security definition for Swagger UI
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'bearer', // This name here is important! It needs to match the name in @ApiBearerAuth() decorators
    )
    .build();
  const document = SwaggerModule.createDocument(app, config);

  // Write the Swagger document to a JSON file
  try {
    fs.writeFileSync('./openapi.json', JSON.stringify(document, null, 2));
    Logger.log('OpenAPI specification written to openapi.json', 'Bootstrap');
  } catch (err) {
    Logger.error(
      'Error writing OpenAPI specification:',
      err.stack,
      'Bootstrap',
    );
  }

  SwaggerModule.setup('api/docs', app, document);

  // Enable CORS
  app.enableCors();

  const port = process.env.PORT || 3000;
  await app.listen(port);
  Logger.log(`Application is running on: http://localhost:${port}`);

  const appUrl = await app.getUrl();
  const funnyArt = `
  SERVER IS UP AND RUNNING! LET'S GOOOO!
  ################################################################
  #####                                                      #####
  #####   JAPM - Just Another Prompt Manager                 #####
  #####   Backend: ${appUrl}                         #####
  #####   Swagger UI:        ${appUrl}/api-docs      #####
  #####                                                      #####
  ################################################################
  MAY THE PROMPTS BE WITH YOU! (^_^)b
  `;
  Logger.log(funnyArt, 'Bootstrap');
}
bootstrap();
