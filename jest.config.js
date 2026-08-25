export default {
  rootDir: '.',
  testEnvironment: 'node',
  transform: {},
  extensionsToTreatAsEsm: [],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1.js',
  },
  testMatch: ['<rootDir>/server/__tests__/**/*.test.js'],
  setupFiles: ['<rootDir>/server/__tests__/setup-env.js'],
  collectCoverageFrom: [
    'server/**/*.js',
    '!server/__tests__/**',
    '!server/seed*.js',
    '!server/node_modules/**',
    '!server/notification/queue/dashboard.js',
    '!server/notification/templates/**',
    '!server/config/razorpay.js',
  ],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  coverageReporters: ['text', 'lcov', 'clover'],
  maxWorkers: '50%',
  testTimeout: 30000,
};
