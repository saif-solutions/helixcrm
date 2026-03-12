import { verifyIsolation } from '../../helpers/database';

describe('Database Isolation', () => {
  it('should prevent data leakage between transactions', async () => {
    const isolationWorks = await verifyIsolation();
    expect(isolationWorks).toBe(true);
  });
});
