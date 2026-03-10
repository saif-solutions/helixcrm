// test/mocks/prisma.mock.ts
import { jest } from '@jest/globals';

type ModelOperations = {
  findUnique: jest.Mock;
  findFirst: jest.Mock;
  findMany: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
  upsert: jest.Mock;
  count: jest.Mock;
  aggregate: jest.Mock;
  groupBy: jest.Mock;
};

type PrismaSpecialMethods = {
  $transaction: jest.Mock;
  $connect: jest.Mock;
  $disconnect: jest.Mock;
  $on: jest.Mock;
  $use: jest.Mock;
};

export type PrismaMock = PrismaSpecialMethods & {
  [modelName: string]: ModelOperations | jest.Mock;
};

const createModelOperations = (store: Map<string, any>): ModelOperations => {
  const generateId = () =>
    `mock-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

  const findByWhere = (where: any) => {
    if (!where) return null;

    for (const record of store.values()) {
      const match = Object.entries(where).every(
        ([key, value]) => record[key] === value,
      );

      if (match) return record;
    }

    return null;
  };

  return {
    findUnique: jest.fn().mockImplementation(async (args: any) => {
      const { where } = args || {};
      return findByWhere(where);
    }),

    findFirst: jest.fn().mockImplementation(async (args: any) => {
      const { where } = args || {};
      return findByWhere(where);
    }),

    findMany: jest.fn().mockImplementation(async (args: any) => {
      const where = args?.where;

      if (!where) {
        return Array.from(store.values());
      }

      return Array.from(store.values()).filter(record =>
        Object.entries(where).every(([k, v]) => record[k] === v),
      );
    }),

    create: jest.fn().mockImplementation(async (args: any) => {
      const { data } = args;

      const id = data.id ?? generateId();
      const record = { ...data, id };

      store.set(id, record);
      return record;
    }),

    update: jest.fn().mockImplementation(async (args: any) => {
      const { where, data } = args;

      const existing = findByWhere(where);

      if (!existing) {
        throw new Error('MockPrisma: Record not found for update');
      }

      const updated = { ...existing, ...data };

      store.set(existing.id, updated);

      return updated;
    }),

    delete: jest.fn().mockImplementation(async (args: any) => {
      const { where } = args;

      const existing = findByWhere(where);

      if (!existing) {
        throw new Error('MockPrisma: Record not found for delete');
      }

      store.delete(existing.id);

      return existing;
    }),

    upsert: jest.fn().mockImplementation(async (args: any) => {
      const { where, create, update } = args;

      const existing = findByWhere(where);

      if (existing) {
        const updated = { ...existing, ...update };

        store.set(existing.id, updated);

        return updated;
      }

      const id = create.id ?? generateId();
      const record = { ...create, id };

      store.set(id, record);

      return record;
    }),

    count: jest.fn().mockImplementation(async () => store.size),

aggregate: jest.fn().mockImplementation(async () => ({})),

groupBy: jest.fn().mockImplementation(async () => ([])),
  };
};

export const createMockPrisma = (): PrismaMock => {
  const stores = new Map<string, Map<string, any>>();

  const getStore = (model: string) => {
    if (!stores.has(model)) {
      stores.set(model, new Map());
    }

    return stores.get(model)!;
  };

  const mock: PrismaMock = {
    $transaction: jest.fn().mockImplementation(async (callback: any) => {
      if (typeof callback === 'function') {
        return callback(mock);
      }

      return callback;
    }),

    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $on: jest.fn(),
    $use: jest.fn(),
  } as PrismaMock;

  const models = [
    'user',
    'deal',
    'lead',
    'contact',
    'pipeline',
    'stage',
    'auditLog',
    'role',
    'permission',
    'userRole',
    'refreshToken',
    'exportJob',
    'webhook',
    'emailTemplate',
    'sentEmail',
    'file',
    'importJob',
    'analytics',
    'tenant',
  ];

  for (const model of models) {
    mock[model] = createModelOperations(getStore(model));
  }

  return new Proxy(mock, {
    get(target: PrismaMock, prop: string | symbol) {
      if (prop in target) {
        return target[prop as keyof PrismaMock];
      }

      if (typeof prop === 'string' && !prop.startsWith('$')) {
        const store = getStore(prop);

        target[prop] = createModelOperations(store);

        return target[prop];
      }

      return undefined;
    },
  });
};

export type MockPrisma = ReturnType<typeof createMockPrisma>;

export const resetMockPrisma = (mockPrisma: MockPrisma): void => {
  const resetOperations = (obj: any): void => {
    Object.values(obj).forEach(value => {
      if (value && typeof value === 'object') {
        if (jest.isMockFunction(value)) {
          value.mockClear();
        } else {
          resetOperations(value);
        }
      }
    });
  };

  resetOperations(mockPrisma);
};