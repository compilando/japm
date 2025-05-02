import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as fs from 'fs';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
