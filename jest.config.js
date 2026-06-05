/** @type {import('jest').Config} */
module.exports = {
  projects: [
    '<rootDir>/services/matching-service',
    '<rootDir>/services/tracking-service',
    '<rootDir>/services/billing-service',
    '<rootDir>/packages/shared',
  ],
  collectCoverageFrom: [
    'packages/*/src/**/*.ts',
    'services/*/src/**/*.ts',
    '!**/__tests__/**',
    '!**/index.ts',
    '!**/*.d.ts',
  ],
  coverageThresholds: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
