// test/mocks/redis.mock.ts
import { jest } from '@jest/globals';

// Define Redis mock type
export type RedisMock = {
  // Basic operations
  get: jest.Mock;
  set: jest.Mock;
  del: jest.Mock;
  expire: jest.Mock;
  ttl: jest.Mock;
  
  // Hash operations
  hget: jest.Mock;
  hset: jest.Mock;
  hdel: jest.Mock;
  hgetall: jest.Mock;
  
  // List operations
  lpush: jest.Mock;
  rpush: jest.Mock;
  lpop: jest.Mock;
  rpop: jest.Mock;
  lrange: jest.Mock;
  
  // Set operations
  sadd: jest.Mock;
  srem: jest.Mock;
  smembers: jest.Mock;
  sismember: jest.Mock;
  
  // Sorted set operations
  zadd: jest.Mock;
  zrem: jest.Mock;
  zrange: jest.Mock;
  zscore: jest.Mock;
  
  // Transaction support
  multi: jest.Mock;
  exec: jest.Mock;
  discard: jest.Mock;
  
  // Connection
  quit: jest.Mock;
  connect: jest.Mock;
  disconnect: jest.Mock;
  
  // Events
  on: jest.Mock;
  once: jest.Mock;
  emit: jest.Mock;
};

export const createMockRedis = (): RedisMock => ({
  // Basic operations
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  expire: jest.fn(),
  ttl: jest.fn(),
  
  // Hash operations
  hget: jest.fn(),
  hset: jest.fn(),
  hdel: jest.fn(),
  hgetall: jest.fn(),
  
  // List operations
  lpush: jest.fn(),
  rpush: jest.fn(),
  lpop: jest.fn(),
  rpop: jest.fn(),
  lrange: jest.fn(),
  
  // Set operations
  sadd: jest.fn(),
  srem: jest.fn(),
  smembers: jest.fn(),
  sismember: jest.fn(),
  
  // Sorted set operations
  zadd: jest.fn(),
  zrem: jest.fn(),
  zrange: jest.fn(),
  zscore: jest.fn(),
  
  // Transaction support
  multi: jest.fn().mockReturnThis(),
  exec: jest.fn(),
  discard: jest.fn(),
  
  // Connection
  quit: jest.fn(),
  connect: jest.fn(),
  disconnect: jest.fn(),
  
  // Events
  on: jest.fn(),
  once: jest.fn(),
  emit: jest.fn(),
});