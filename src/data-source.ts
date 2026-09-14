import { join } from 'node:path';
import { DataSource } from 'typeorm';

// DataSource solo para la CLI de TypeORM (npm run migration:show / :run / :revert,
// sobre el build en dist/). La app no lo usa: arranca con config/database.config.ts,
// que ya corre las migraciones pendientes al iniciar. Lee las mismas variables de
// entorno; dentro del contenedor llegan por env_file.
//
// En la VPS:  docker compose run --rm backend npm run migration:show
const url = process.env.DATABASE_URL;

export default new DataSource({
  type: 'postgres',
  url,
  host: url ? undefined : (process.env.DB_HOST ?? 'localhost'),
  port: url ? undefined : Number(process.env.DB_PORT ?? 5432),
  username: url ? undefined : (process.env.DB_USERNAME ?? 'root'),
  password: url ? undefined : (process.env.DB_PASSWORD ?? ''),
  database: url ? undefined : (process.env.DB_NAME ?? 'cookiehaus'),
  ssl:
    process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  entities: [join(__dirname, '**', '*.entity.js')],
  migrations: [join(__dirname, 'migrations', '*.js')],
});
