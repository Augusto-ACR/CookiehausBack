import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';
import { AppModule } from './app.module';

const extraerNumero = (texto: string) => {
  const match = texto.match(/\d+/);
  return match ? Number(match[0]) : undefined;
};

const traducirConstraint = (
  constraint: string,
  mensajeOriginal: string,
  propiedad: string,
) => {
  const valor = extraerNumero(mensajeOriginal);

  switch (constraint) {
    case 'isEmail':
      return `${propiedad} debe ser un email válido.`;
    case 'isString':
      return `${propiedad} debe ser texto.`;
    case 'isInt':
      return `${propiedad} debe ser un número entero.`;
    case 'isNumber':
      return `${propiedad} debe ser numérico.`;
    case 'isArray':
      return `${propiedad} debe ser una lista.`;
    case 'arrayMinSize':
      return `${propiedad} debe tener al menos ${valor ?? 1} elemento(s).`;
    case 'isIn':
      return `${propiedad} tiene un valor inválido.`;
    case 'minLength':
      return `${propiedad} debe tener al menos ${valor ?? 1} caracteres.`;
    case 'maxLength':
      return `${propiedad} no puede superar ${valor ?? 255} caracteres.`;
    case 'min':
      return `${propiedad} debe ser mayor o igual a ${valor ?? 0}.`;
    case 'max':
      return `${propiedad} debe ser menor o igual a ${valor ?? 0}.`;
    case 'whitelistValidation':
      return `${propiedad} no está permitido.`;
    default:
      return mensajeOriginal;
  }
};

const recolectarErrores = (errores: ValidationError[], ruta = ''): string[] => {
  const mensajes: string[] = [];

  for (const error of errores) {
    const propiedad = ruta ? `${ruta}.${error.property}` : error.property;

    if (error.constraints) {
      for (const [constraint, mensajeOriginal] of Object.entries(error.constraints)) {
        mensajes.push(traducirConstraint(constraint, mensajeOriginal, propiedad));
      }
    }

    if (error.children && error.children.length > 0) {
      mensajes.push(...recolectarErrores(error.children, propiedad));
    }
  }

  return mensajes;
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: true,
    credentials: false,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (validationErrors: ValidationError[] = []) => {
        const mensajes = recolectarErrores(validationErrors);
        return new BadRequestException({
          message: mensajes.length > 0 ? mensajes : ['Datos inválidos.'],
          error: 'Bad Request',
          statusCode: 400,
        });
      },
    }),
  );

const configService = app.get(ConfigService);
  
  // 1. Lo leemos como string (o usamos process.env directo) y lo parseamos a número
  const port = parseInt(configService.get<string>('PORT') || '3000', 10);
  
  // 2. Le agregamos el '0.0.0.0' para que escuche el tráfico de Railway
  await app.listen(port, '0.0.0.0');
}
bootstrap();
