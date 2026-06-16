import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { getDatabaseConfig } from './config/database.config';
import {
  envValidationOptions,
  envValidationSchema,
} from './config/env.validation';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { InsumosModule } from './insumos/insumos.module';
import { ProductosModule } from './productos/productos.module';
import { ProduccionModule } from './produccion/produccion.module';
import { VentasModule } from './ventas/ventas.module';
import { ComprasModule } from './compras/compras.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      validationOptions: envValidationOptions,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: getDatabaseConfig,
    }),
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60000, limit: 100 }]),
    UsersModule,
    AuthModule,
    InsumosModule,
    ProductosModule,
    ProduccionModule,
    VentasModule,
    ComprasModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
