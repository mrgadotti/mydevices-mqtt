/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  testTimeout: 30000,
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: { types: ['jest', 'node'], module: 'commonjs', esModuleInterop: true, strict: true, target: 'es2020', skipLibCheck: true } }] },
};
