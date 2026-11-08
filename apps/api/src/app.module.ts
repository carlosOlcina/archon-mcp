import { Module } from '@nestjs/common';
import { NestUtilsSanityService } from '@archon/nest-utils';
import { DATABASE_PACKAGE_INFO } from '@archon/database';
import { CATALOG_PACKAGE_INFO } from '@archon/catalog';
import { SCAFFOLD_VERSION } from '@archon/validators';

@Module({
  providers: [NestUtilsSanityService],
})
export class AppModule {
  public static getMetadata() {
    return {
      version: SCAFFOLD_VERSION,
      database: DATABASE_PACKAGE_INFO.name,
      catalog: CATALOG_PACKAGE_INFO.name,
    };
  }
}
