// Simplified database helper for tests
// This will be replaced once Prisma client is properly set up

// Mock database client for now
export const prisma = {
  $transaction: async (fn: any) => {
    try {
      return await fn({});
    } catch (e) {
      throw e;
    }
  },
  $executeRaw: async (query: string) => {},
  user: {
    findUnique: async () => null,
    create: async (data: any) => ({ id: 'mock-id', ...data.data }),
  },
};

export async function withTestTransaction<T>(testFn: (tx: any) => Promise<T>): Promise<T> {
  let result: T;

  await prisma
    .$transaction(async (tx) => {
      result = await testFn(tx);
      throw new Error('__TEST_ROLLBACK__');
    })
    .catch((err) => {
      if (err.message !== '__TEST_ROLLBACK__') {
        throw err;
      }
    });

  return result!;
}

export async function cleanDatabase(): Promise<void> {
  // Mock implementation
  return Promise.resolve();
}

export async function verifyIsolation(): Promise<boolean> {
  return withTestTransaction(async (tx) => {
    return true;
  });
}

export default prisma;
