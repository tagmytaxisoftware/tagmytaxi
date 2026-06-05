/** @type {import('jest').Config} */
module.exports = {
  displayName: 'matching-service',
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/src/**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@tagmytaxi/shared$': '<rootDir>/../../packages/shared/src/index.ts',
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/**/__tests__/**', '!src/index.ts'],
  coverageThresholds: {
    global: { branches: 70, functions: 80, lines: 80, statements: 80 },
  },
};
