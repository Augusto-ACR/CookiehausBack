import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import * as express from 'express';
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

  const configService = app.get(ConfigService);
  const frontendUrl = configService.get<string>('FRONTEND_URL')!;

  // CORS manual antes de Helmet para evitar que este pise los headers
  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    const origin = req.headers.origin as string | undefined;
    if (origin === frontendUrl) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,Accept,Cookie');
      res.setHeader('Access-Control-Max-Age', '86400');
    }
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });
  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(cookieParser());

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

  const port = parseInt(configService.get<string>('PORT') || '3000', 10);
  await app.listen(port, '0.0.0.0');
}
bootstrap();
