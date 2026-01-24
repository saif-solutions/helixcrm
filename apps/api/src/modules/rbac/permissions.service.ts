import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const permissions = await this.prisma.permission.findMany({
      orderBy: { code: 'asc' },
    });

    return permissions;
  }

  async findGrouped() {
    const permissions = await this.findAll();

    // Group by module
    const grouped = permissions.reduce((acc, permission) => {
      const [module] = permission.code.split('.');
      if (!acc[module]) {
        acc[module] = [];
      }
      acc[module].push(permission);
      return acc;
    }, {} as Record<string, any[]>);

    // Convert to array format
    return Object.entries(grouped).map(([module, perms]) => ({
      module,
      permissions: perms,
    }));
  }

  async getPermissionHierarchy() {
    const permissions = await this.findAll();
    
    // Organize by module.action
    const hierarchy: Record<string, any> = {};

    permissions.forEach((permission) => {
      const [module, action, scope] = permission.code.split('.');
      
      if (!hierarchy[module]) {
        hierarchy[module] = {};
      }
      
      if (!hierarchy[module][action]) {
        hierarchy[module][action] = [];
      }
      
      if (scope) {
        hierarchy[module][action].push(scope);
      }
    });

    return hierarchy;
  }
}