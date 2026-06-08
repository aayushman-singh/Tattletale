/**
 * Jest configuration for the (ESM) backend.
 *
 * The backend uses native ES modules ("type": "module" in package.json), so
 * tests run under Node's experimental VM modules loader (see the "test" script,
 * which sets NODE_OPTIONS=--experimental-vm-modules). No Babel/transform is
 * needed: Jest hands the ESM source straight to Node's loader.
 */
module.exports = {
  testEnvironment: 'node',
  // Source is already ESM; do not transform it.
  transform: {},
  testMatch: ['**/__tests__/**/*.test.js'],
  // mongodb-memory-server can take a moment to spin up the first time.
  testTimeout: 60000,
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.js'],
};
