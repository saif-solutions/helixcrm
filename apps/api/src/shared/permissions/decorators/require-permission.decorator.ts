import { SetMetadata } from '@nestjs/common';

export const PERMISSION_KEY = 'permissions';

export const RequirePermission = (permission: string | string[]) =>
  SetMetadata(PERMISSION_KEY, permission);
