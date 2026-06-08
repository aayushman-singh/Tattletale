/**
 * Shared test lifecycle: spin up an in-memory MongoDB before the suite,
 * wipe collections between tests, and tear everything down afterwards.
 *
 * This means the backend test suite needs NO external mongod and NO network
 * access beyond the one-time mongodb-memory-server binary download.
 */
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterEach(async () => {
  const { collections } = mongoose.connection;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});
