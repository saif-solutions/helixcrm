import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  roots: ['<rootDir>/src', '<rootDir>/test', '<rootDir>/tests'],

  // Explicit patterns for your structure
  testMatch: [
    // Source code tests
    '<rootDir>/src/**/*.spec.ts',
    '<rootDir>/src/**/*.test.ts',

    // Unit tests
    '<rootDir>/tests/unit/**/*.spec.ts',
    '<rootDir>/tests/unit/**/*.test.ts',

    // Integration tests (when you add them)
    '<rootDir>/tests/integration/**/*.spec.ts',
    '<rootDir>/tests/integration/**/*.test.ts',

    // E2E/Flow tests
    '<rootDir>/test/flows/**/*.spec.ts',
    '<rootDir>/test/**/*.e2e-spec.ts',
    '<rootDir>/test/**/*.spec.ts',
    '<rootDir>/test/**/*.test.ts',
  ],

  // Module name mapping for your structure
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
    '^test/(.*)$': '<rootDir>/test/$1',
    '^tests/(.*)$': '<rootDir>/tests/$1',
    '^@test-utils$': '<rootDir>/test/utils/create-test-app.ts',
  },

  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/test/setup.ts',
    '<rootDir>/test/mocks/bullmq.mock.ts',
    '<rootDir>/test/mocks/csrf.mock.ts',
  ],

  // Coverage collection
  collectCoverageFrom: [
    '<rootDir>/src/**/*.ts',
    '!<rootDir>/src/**/*.dto.ts',
    '!<rootDir>/src/**/*.entity.ts',
    '!<rootDir>/src/**/*.interface.ts',
    '!<rootDir>/src/**/*.type.ts',
    '!<rootDir>/src/**/*.enum.ts',
    '!<rootDir>/src/**/*.module.ts',
    '!<rootDir>/src/main.ts',
    '!<rootDir>/src/**/index.ts',
  ],

  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'json', 'html'],

  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
  testTimeout: 30000,

  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: 'reports/junit',
        outputName: 'jest-junit.xml',
      },
    ],
  ],
};

export default config;
