import { join } from 'node:path';
import { ConfigService } from '@nestjs/config';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const getDatabaseConfig = async (
  configService: ConfigService,
): Promise<TypeOrmModuleOptions> => {
  const databaseUrl = configService.get<string>('DATABASE_URL');
  const host = configService.get<string>('DB_HOST', 'localhost');
  const port = configService.get<number>('DB_PORT', 5432);
  const username = configService.get<string>('DB_USERNAME', 'root');
  const password = configService.get<string>('DB_PASSWORD', '');
  const database = configService.get<string>('DB_NAME', 'cookiehaus');
  const synchronize = configService.get<boolean>('DB_SYNCHRONIZE', false);
  const sslEnabled = configService.get<boolean>('DB_SSL', false);

  const ssl = sslEnabled
    ? {
        rejectUnauthorized: false,
      }
    : undefined;

  return {
    type: 'postgres',
    url: databaseUrl,
    host: databaseUrl ? undefined : host,
    port: databaseUrl ? undefined : port,
    username: databaseUrl ? undefined : username,
    password: databaseUrl ? undefined : password,
    database: databaseUrl ? undefined : database,
    ssl,
    autoLoadEntities: true,
    synchronize,
    // Migraciones (src/migrations → dist/migrations). Se aplican solas al arrancar el
    // backend, antes de atender pedidos: el deploy (git pull + up --build) no necesita
    // un paso extra. Si una falla, el backend no arranca: revisar `docker logs`.
    // Solo .js: tanto la app como la CLI corren sobre dist/ (el build también emite .d.ts).
    migrations: [join(__dirname, '..', 'migrations', '*.js')],
    migrationsRun: true,
  };
};
