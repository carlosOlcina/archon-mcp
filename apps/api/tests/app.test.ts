import { describe, it, expect } from 'vitest';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module.js';
import { NestUtilsSanityService } from '@archon/nest-utils';

describe('@archon/api smoke tests', () => {
  it('should compile AppModule and resolve NestUtilsSanityService dependency', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = moduleRef.createNestApplication();
    await app.init();

    const service = moduleRef.get<NestUtilsSanityService>(NestUtilsSanityService);
    expect(service).toBeDefined();

    const status = service.getStatus();
    expect(status.initialized).toBe(true);

    const metadata = AppModule.getMetadata();
    expect(metadata.version).toBe('0.1.0');
    expect(metadata.database).toBe('@archon/database');
    expect(metadata.catalog).toBe('@archon/catalog');

    await app.close();
  }, 60_000);
});
