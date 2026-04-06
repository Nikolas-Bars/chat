import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { join } from 'path';
import { DataSourceOptions } from 'typeorm';

export function getDataSourceOptions(): DataSourceOptions {
  return {
    type: 'mariadb',
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 3906),
    username: process.env.DB_USER ?? 'chat_user',
    password: process.env.DB_PASSWORD ?? 'chat_pass',
    database: process.env.DB_NAME ?? 'chat_db',
    synchronize: false,
    entities: [join(__dirname, '..', 'modules', '**', '*.entity.{ts,js}')],
    migrations: [join(__dirname, '..', 'migrations', '*.{ts,js}')],
  };
}

export function getTypeOrmModuleOptions(): TypeOrmModuleOptions {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { entities: _entities, ...rest } = getDataSourceOptions();
  return {
    ...rest,
    autoLoadEntities: true,
  };
}
