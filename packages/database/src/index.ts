import pg from 'pg';
import pgvector from 'pgvector';

export interface DatabasePackageInfo {
  name: string;
  driver: 'pg';
  pgvectorSupported: boolean;
}

export const DATABASE_PACKAGE_INFO: DatabasePackageInfo = {
  name: '@archon/database',
  driver: 'pg',
  pgvectorSupported: true,
};

export { pg, pgvector };

export {
  type TechnologyRow,
  type Technology,
  mapTechnologyRowToEntity,
  mapEntityToTechnologyRow,
} from './technology.js';

