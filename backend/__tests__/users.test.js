/**
 * Integration tests for the user auth surface, exercised through the real
 * Express app via supertest. The app is imported with NODE_ENV=test, which
 * (see server.js) skips connectDB() and app.listen() — mongodb-memory-server
 * supplies the database connection from __tests__/setup.js.
 *
 * Routes under test (mounted at /api/users in routes/userRoutes.js):
 *   POST /api/users/signup    -> registerUser   (public)
 *   POST /api/users/login     -> authUser       (public)
 *   GET  /api/users/          -> getUser        (protected: `protect` middleware)
 *
 * NOTE ON ACTUAL vs EXPECTED SHAPES (verified against the controllers):
 *   - There is NO error-handling middleware in server.js, so thrown errors are
 *     rendered by Express's DEFAULT handler as a text/html page (res.body is
 *     empty). The error message lives in res.text, so error-message assertions
 *     check res.text, not res.body.message.
 *   - When a Mongoose validation error is thrown for a missing required field,
 *     no res.status() is set first, so the default handler responds 500.
 *   - authUser sets res.status(400) for BOTH wrong password and unknown user
 *     (not 401). The 401s come only from the `protect` JWT middleware.
 *   These assertions match the code as written.
 */
import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import app from '../server.js';
import User from '../models/userModel.js';

// JWT secret comes from process.env.JWT_SECRET (set in setup.js for tests).
// middlewares/authMiddleware.js. Tests forge tokens with the same value.
const JWT_SECRET = process.env.JWT_SECRET;

const validUser = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  password: 'sup3rsecret',
  pic: 'https://example.com/ada.png',
};

/** Sign up a fresh user and return the parsed response body. */
async function signup(overrides = {}) {
  const res = await request(app)
    .post('/api/users/signup')
    .send({ ...validUser, ...overrides });
  return res;
}

describe('POST /api/users/signup', () => {
  it('creates a user and returns a token plus the user fields', async () => {
    const res = await signup();

    expect(res.status).toBe(201);
    // NOTE: the User model (models/userModel.js) defines no `pic` field, so
    // Mongoose strips it on create and it is not echoed back — hence we do not
    // assert on res.body.pic here even though signup accepts a `pic` field.
    expect(res.body).toMatchObject({
      name: validUser.name,
      email: validUser.email,
      isAdmin: false,
    });
    expect(res.body._id).toBeDefined();
    expect(typeof res.body.token).toBe('string');
    expect(res.body.token.length).toBeGreaterThan(0);

    // The returned token must be a valid JWT carrying the new user's id.
    const decoded = jwt.verify(res.body.token, JWT_SECRET);
    expect(decoded.id).toBe(res.body._id);

    // Password must never be echoed back to the client.
    expect(res.body.password).toBeUndefined();
  });

  it('rejects a duplicate email with 400', async () => {
    await signup();
    const res = await signup({ name: 'Imposter' });

    expect(res.status).toBe(400);
    expect(res.text).toMatch(/already exists/i);
  });

  it('rejects missing required fields (no email) with a 4xx/5xx error', async () => {
    // The controller has no explicit field guard, so a missing required field
    // surfaces as a Mongoose ValidationError -> Express default 500 handler.
    const res = await request(app)
      .post('/api/users/signup')
      .send({ name: 'No Email', password: 'pw' });

    expect(res.status).toBeGreaterThanOrEqual(400);
    // No user should have been persisted.
    expect(await User.countDocuments()).toBe(0);
  });
});

describe('POST /api/users/login', () => {
  beforeEach(async () => {
    await signup();
  });

  it('logs in with correct credentials and returns a token', async () => {
    const res = await request(app)
      .post('/api/users/login')
      .send({ email: validUser.email, password: validUser.password });

    expect(res.status).toBe(200);
    expect(res.body.email).toBe(validUser.email);
    expect(typeof res.body.token).toBe('string');
    const decoded = jwt.verify(res.body.token, JWT_SECRET);
    expect(decoded.id).toBe(res.body._id);
  });

  it('rejects a wrong password (authUser responds 400)', async () => {
    const res = await request(app)
      .post('/api/users/login')
      .send({ email: validUser.email, password: 'wrong-password' });

    expect(res.status).toBe(400);
    expect(res.text).toMatch(/invalid/i);
  });

  it('rejects an unknown user (authUser responds 400)', async () => {
    const res = await request(app)
      .post('/api/users/login')
      .send({ email: 'nobody@example.com', password: 'whatever' });

    expect(res.status).toBe(400);
    expect(res.text).toMatch(/invalid/i);
  });
});

describe('GET /api/users/ (protected: getUser)', () => {
  it('rejects a request with no token (401)', async () => {
    const res = await request(app).get('/api/users/');
    expect(res.status).toBe(401);
    expect(res.text).toMatch(/no token/i);
  });

  it('rejects a request with an invalid token (401)', async () => {
    const res = await request(app)
      .get('/api/users/')
      .set('Authorization', 'Bearer not-a-real-token');

    expect(res.status).toBe(401);
    expect(res.text).toMatch(/token failed/i);
  });

  it('accepts a valid token and returns the user without the password (200)', async () => {
    const signupRes = await signup();
    const { token } = signupRes.body;

    const res = await request(app)
      .get('/api/users/')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe(validUser.email);
    expect(res.body.name).toBe(validUser.name);
    expect(res.body.password).toBeUndefined();
  });

  it('does not expose case-access grants in the user profile response', async () => {
    const signupRes = await signup();
    await User.findByIdAndUpdate(signupRes.body._id, {
      caseAccess: [{ handle: 'ana_rivera_dev', scopes: ['intel-brief:read'] }],
    });

    const res = await request(app)
      .get('/api/users/')
      .set('Authorization', `Bearer ${signupRes.body.token}`);

    expect(res.status).toBe(200);
    expect(res.body.caseAccess).toBeUndefined();
  });
});

describe('password storage', () => {
  it('stores the password hashed (bcrypt), never in plaintext', async () => {
    await signup();

    // Read the raw document straight from the DB, bypassing the API.
    const stored = await User.findOne({ email: validUser.email });
    expect(stored).not.toBeNull();
    expect(stored.password).not.toBe(validUser.password);

    // It must be a real bcrypt hash that verifies against the original password.
    const matches = await bcrypt.compare(validUser.password, stored.password);
    expect(matches).toBe(true);
  });
});
