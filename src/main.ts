import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as fs from 'fs';
import { PrismaClientExceptionFilter } from './common/filters/prisma-exception.filter';
// import { HttpExceptionFilter } from './common/filters/http-exception.filter'; // Optional: A generic HTTP exception filter

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Apply Global Filters (Prisma specific first, then generic HTTP)
  // HttpAdapterHost is needed for filters that might handle non-HttpException errors
  // const { httpAdapter } = app.get(HttpAdapterHost); // HttpAdapterHost might not be needed if only handling known exceptions
  app.useGlobalFilters(
    new PrismaClientExceptionFilter(),
    // new HttpExceptionFilter() // Uncomment if you create a generic HttpExceptionFilter
  );

  const config = new DocumentBuilder()
    .setTitle('JAPM API')
    .setDescription('API para la aplicación de Prompt Engineering JAPM')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);

  // Escribir el documento Swagger en un archivo JSON
  try {
    fs.writeFileSync('./openapi.json', JSON.stringify(document, null, 2));
    console.log('OpenAPI specification written to openapi.json');
  } catch (err) {
    console.error('Error writing OpenAPI specification:', err);
  }

  SwaggerModule.setup('api', app, document);

  // Habilitar CORS
  app.enableCors();

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
