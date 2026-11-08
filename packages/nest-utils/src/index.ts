import 'reflect-metadata';
import { Injectable } from '@nestjs/common';
import { ScaffoldStatusSchema, type ScaffoldStatus } from '@archon/validators';

export interface NestUtilsPackageInfo {
  name: string;
  version: string;
}

export const NEST_UTILS_PACKAGE_INFO: NestUtilsPackageInfo = {
  name: '@archon/nest-utils',
  version: '0.1.0',
};

@Injectable()
export class NestUtilsSanityService {
  public getStatus(): ScaffoldStatus {
    return ScaffoldStatusSchema.parse({
      package: NEST_UTILS_PACKAGE_INFO.name,
      initialized: true,
      version: NEST_UTILS_PACKAGE_INFO.version,
    });
  }
}
