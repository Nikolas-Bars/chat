import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { getDataSourceOptions } from './typeorm-datasource.config';

export default new DataSource(getDataSourceOptions());
