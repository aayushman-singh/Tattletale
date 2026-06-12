/**
 * Protected replay artifact API tests.
 *
 * These routes are the non-public, case-artifact surface for investigator
 * workspaces. They intentionally do NOT replace the public /demo static replay:
 * synthetic demo files may remain public, while real PII-bearing case artifacts
 * must be served only through scoped backend routes.
 */
import request from 'supertest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import app from '../server.js';
import { openValidatedReportFile, resolveReportPath } from '../controllers/replayArtifactControllers.js';
import User from '../models/userModel.js';

const validUser = {
  name: 'Case Analyst',
  email: 'analyst@example.com',
  password: 'sup3rsecret',
};

const report = {
  mode: 'replay',
  synthetic: true,
  notice: 'Synthetic fixture for route tests.',
  handle: 'ana_rivera_dev',
  generatedAt: '2026-06-11T10:00:00.000Z',
  brief: {
    text: 'Ana Rivera appears across four platforms with one high-cohesion developer identity.',
    generator: 'extractive',
    validated: true,
    facts: {
      handle: 'ana_rivera_dev',
      displayName: 'Ana Rivera',
      platformCount: 4,
    },
  },
  network: {
    nodes: [
      {
        id: 'contact:boris',
        kind: 'contact',
        label: 'Boris Petrov',
        platform: 'telegram',
        cluster: -1,
        crossPlatform: true,
        degree: 2,
        x: 120,
        y: 240,
      },
    ],
    links: [
      {
        source: 'self:instagram',
        target: 'contact:boris',
        type: 'message',
        timestamp: '2024-11-02T10:00:00Z',
        t: 1730541600000,
      },
    ],
    timeRange: { startMs: 1730541600000, endMs: 1730541600000 },
    contactCount: 1,
    crossPlatformContacts: 1,
  },
  findings: [
    {
      platform: 'instagram',
      username: 'ana_rivera_dev',
      samplePosts: [{ caption: 'raw finding must not leak through brief endpoint' }],
    },
  ],
  correlation: {
    nodes: [{ username: 'linked_handle_that_needs_its_own_scope' }],
    edges: [],
    identities: [],
  },
};

let artifactDir;

async function writeReport(handle, body = report) {
  const dir = path.join(artifactDir, handle);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, 'report.json'), JSON.stringify({ ...body, handle }), 'utf8');
}

async function signup(scopes = []) {
  const res = await request(app).post('/api/users/signup').send(validUser);
  await User.findByIdAndUpdate(res.body._id, { caseAccess: scopes });
  return res.body.token;
}

beforeEach(async () => {
  artifactDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tattletale-replay-artifacts-'));
  process.env.REPLAY_ARTIFACT_DIR = artifactDir;
  await writeReport('ana_rivera_dev');
});

afterEach(async () => {
  delete process.env.REPLAY_ARTIFACT_DIR;
  delete process.env.REPLAY_ALLOWED_ORIGINS;
  await fs.rm(artifactDir, { recursive: true, force: true });
});

describe('protected replay artifact routes', () => {
  it('requires a token before reading the intelligence brief', async () => {
    const res = await request(app).get('/api/replay/ana_rivera_dev/intel-brief');

    expect(res.status).toBe(401);
    expect(res.text).toMatch(/no token/i);
  });

  it('rejects a malformed token before reading network graph PII', async () => {
    const res = await request(app)
      .get('/api/replay/ana_rivera_dev/network-graph')
      .set('Authorization', 'Bearer not-a-real-token');

    expect(res.status).toBe(401);
    expect(res.text).toMatch(/token failed/i);
  });

  it('fails closed when the user has no case scope', async () => {
    const token = await signup();

    const res = await request(app)
      .get('/api/replay/ana_rivera_dev/intel-brief')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.text).toMatch(/case scope/i);
    expect(res.text).not.toContain(report.brief.text);
  });

  it('fails closed when the user has the right scope on a different subject', async () => {
    const token = await signup([
      { handle: 'other_subject', scopes: ['intel-brief:read', 'network-graph:read'] },
    ]);

    const res = await request(app)
      .get('/api/replay/ana_rivera_dev/network-graph')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.text).toMatch(/case scope/i);
    expect(res.text).not.toContain('Boris Petrov');
  });

  it('returns only a minimized intelligence-brief projection for scoped users', async () => {
    const token = await signup([
      { handle: 'ana_rivera_dev', scopes: ['intel-brief:read'] },
    ]);

    const res = await request(app)
      .get('/api/replay/ana_rivera_dev/intel-brief')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      handle: 'ana_rivera_dev',
      generatedAt: report.generatedAt,
      synthetic: true,
      notice: report.notice,
      brief: {
        text: report.brief.text,
        generator: 'extractive',
        validated: true,
      },
    });
    expect(res.body.findings).toBeUndefined();
    expect(res.body.correlation).toBeUndefined();
    expect(res.body.brief.facts).toBeUndefined();
  });

  it('returns only the network graph projection for scoped users', async () => {
    const token = await signup([
      { handle: 'ana_rivera_dev', scopes: ['network-graph:read'] },
    ]);

    const res = await request(app)
      .get('/api/replay/ana_rivera_dev/network-graph')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      handle: 'ana_rivera_dev',
      generatedAt: report.generatedAt,
      network: report.network,
    });
    expect(res.body.findings).toBeUndefined();
    expect(res.body.correlation).toBeUndefined();
    expect(res.body.brief).toBeUndefined();
  });

  it('marks replay projections as non-cacheable', async () => {
    const token = await signup([
      { handle: 'ana_rivera_dev', scopes: ['intel-brief:read'] },
    ]);

    const res = await request(app)
      .get('/api/replay/ana_rivera_dev/intel-brief')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toMatch(/no-store/);
    expect(res.headers.pragma).toBe('no-cache');
    expect(res.headers['surrogate-control']).toBe('no-store');
  });

  it('marks early replay JSON parse failures as non-cacheable', async () => {
    const res = await request(app)
      .get('/api/replay/ana_rivera_dev/intel-brief')
      .set('Content-Type', 'application/json')
      .send('{"broken"');

    expect(res.status).toBe(400);
    expect(res.headers['cache-control']).toMatch(/no-store/);
    expect(res.headers.pragma).toBe('no-cache');
    expect(res.headers['surrogate-control']).toBe('no-store');
    expect(res.text).not.toContain(report.brief.text);
  });

  it('fails closed when the artifact directory is not configured', async () => {
    delete process.env.REPLAY_ARTIFACT_DIR;
    const token = await signup([
      { handle: 'ana_rivera_dev', scopes: ['intel-brief:read'] },
    ]);

    const res = await request(app)
      .get('/api/replay/ana_rivera_dev/intel-brief')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(503);
    expect(res.text).toMatch(/internal server error/i);
    expect(res.text).not.toContain(report.brief.text);
  });

  it('rejects artifact directories that resolve outside the artifact root', async () => {
    const escapedHandle = 'escaped_subject';
    const externalDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tattletale-external-artifact-'));

    try {
      await fs.writeFile(
        path.join(externalDir, 'report.json'),
        JSON.stringify({
          ...report,
          handle: escapedHandle,
          brief: {
            ...report.brief,
            text: 'External artifact text must not be served.',
          },
        }),
        'utf8',
      );
      await fs.symlink(
        externalDir,
        path.join(artifactDir, escapedHandle),
        process.platform === 'win32' ? 'junction' : 'dir',
      );
      const token = await signup([
        { handle: escapedHandle, scopes: ['intel-brief:read'] },
      ]);

      const res = await request(app)
        .get(`/api/replay/${escapedHandle}/intel-brief`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.text).toMatch(/escaped its root/i);
      expect(res.text).not.toContain('External artifact text');
    } finally {
      await fs.rm(externalDir, { recursive: true, force: true });
    }
  });

  it('rejects report files that resolve outside the artifact root', async () => {
    const root = path.resolve('C:/artifact-root');
    const handle = 'escaped_report';
    const artifactDirPath = path.join(root, handle);
    const requestedReport = path.join(artifactDirPath, 'report.json');
    const outsideReport = path.resolve('C:/outside-artifacts/report.json');
    const fakeFs = {
      realpath: async (target) => {
        if (target === root) return root;
        if (target === artifactDirPath) return artifactDirPath;
        if (target === requestedReport) return outsideReport;
        throw Object.assign(new Error(`Unexpected realpath target: ${target}`), { code: 'ENOENT' });
      },
      lstat: async () => ({ isSymbolicLink: () => false }),
      stat: async () => ({ isFile: () => true, size: 1024 }),
    };

    await expect(resolveReportPath(root, handle, fakeFs)).rejects.toMatchObject({
      message: expect.stringMatching(/escaped its root/i),
      statusCode: 400,
    });
  });

  it('rejects report files that change between path validation and descriptor open', async () => {
    const root = path.resolve('C:/artifact-root');
    const handle = 'swapped_report';
    const artifactDirPath = path.join(root, handle);
    const requestedReport = path.join(artifactDirPath, 'report.json');
    const validatedStat = { isFile: () => true, size: 1024, dev: 1, ino: 1 };
    let closed = false;
    const fakeFs = {
      realpath: async (target) => {
        if (target === root) return root;
        if (target === artifactDirPath) return artifactDirPath;
        if (target === requestedReport) return requestedReport;
        throw Object.assign(new Error(`Unexpected realpath target: ${target}`), { code: 'ENOENT' });
      },
      lstat: async () => ({ isSymbolicLink: () => false }),
      stat: async () => validatedStat,
      open: async () => ({
        stat: async () => ({ isFile: () => true, size: 1024, dev: 1, ino: 2 }),
        close: async () => {
          closed = true;
        },
      }),
    };

    await expect(openValidatedReportFile(root, handle, fakeFs)).rejects.toMatchObject({
      message: expect.stringMatching(/changed during validation/i),
      statusCode: 409,
    });
    expect(closed).toBe(true);
  });

  it('fails closed when the intelligence brief projection is malformed', async () => {
    await writeReport('bad_brief', {
      ...report,
      brief: {
        ...report.brief,
        validated: false,
      },
    });
    const token = await signup([
      { handle: 'bad_brief', scopes: ['intel-brief:read'] },
    ]);

    const res = await request(app)
      .get('/api/replay/bad_brief/intel-brief')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(500);
    expect(res.text).toMatch(/internal server error/i);
    expect(res.text).not.toContain(report.brief.text);
  });

  it.each([
    ['generatedAt', { generatedAt: { private: 'raw timestamp PII must not leak' } }],
    ['synthetic', { synthetic: { private: 'raw synthetic flag PII must not leak' } }],
    ['notice', { notice: { private: 'raw notice PII must not leak' } }],
  ])('fails closed when the intelligence brief top-level %s field is malformed', async (_field, override) => {
    await writeReport('bad_header', {
      ...report,
      ...override,
    });
    const token = await signup([
      { handle: 'bad_header', scopes: ['intel-brief:read'] },
    ]);

    const res = await request(app)
      .get('/api/replay/bad_header/intel-brief')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(500);
    expect(res.text).toMatch(/internal server error/i);
    expect(res.text).not.toContain('raw');
    expect(res.text).not.toContain('PII');
  });

  it('fails closed when the network graph top-level generatedAt field is malformed', async () => {
    await writeReport('bad_network_header', {
      ...report,
      generatedAt: { private: 'raw network timestamp PII must not leak' },
    });
    const token = await signup([
      { handle: 'bad_network_header', scopes: ['network-graph:read'] },
    ]);

    const res = await request(app)
      .get('/api/replay/bad_network_header/network-graph')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(500);
    expect(res.text).toMatch(/internal server error/i);
    expect(res.text).not.toContain('raw network');
  });

  it('fails closed when the network graph projection is malformed', async () => {
    await writeReport('bad_network', {
      ...report,
      network: { nodes: report.network.nodes },
    });
    const token = await signup([
      { handle: 'bad_network', scopes: ['network-graph:read'] },
    ]);

    const res = await request(app)
      .get('/api/replay/bad_network/network-graph')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(500);
    expect(res.text).toMatch(/internal server error/i);
    expect(res.text).not.toContain('Boris Petrov');
  });

  it('fails closed when the network graph contains unapproved nested fields', async () => {
    await writeReport('leaky_network', {
      ...report,
      network: {
        ...report.network,
        rawMessages: [{ text: 'private message body must never be projected' }],
      },
    });
    const token = await signup([
      { handle: 'leaky_network', scopes: ['network-graph:read'] },
    ]);

    const res = await request(app)
      .get('/api/replay/leaky_network/network-graph')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(500);
    expect(res.text).toMatch(/internal server error/i);
    expect(res.text).not.toContain('private message');
  });

  it('rejects oversized replay artifacts before parsing them', async () => {
    const hugeHandle = 'huge_artifact';
    const dir = path.join(artifactDir, hugeHandle);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, 'report.json'), `"${'x'.repeat(11 * 1024 * 1024)}"`, 'utf8');
    const token = await signup([
      { handle: hugeHandle, scopes: ['intel-brief:read'] },
    ]);

    const res = await request(app)
      .get(`/api/replay/${hugeHandle}/intel-brief`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(413);
    expect(res.text).toMatch(/maximum size/i);
  });

  it('fails closed for browser origins when replay CORS origins are not configured', async () => {
    const token = await signup([
      { handle: 'ana_rivera_dev', scopes: ['intel-brief:read'] },
    ]);

    const res = await request(app)
      .get('/api/replay/ana_rivera_dev/intel-brief')
      .set('Origin', 'https://case-console.example')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(503);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
    expect(res.headers['cache-control']).toMatch(/no-store/);
    expect(res.headers.pragma).toBe('no-cache');
    expect(res.headers['surrogate-control']).toBe('no-store');
    expect(res.text).not.toContain(report.brief.text);
  });

  it('allows a configured replay browser origin without wildcard CORS', async () => {
    process.env.REPLAY_ALLOWED_ORIGINS = 'https://case-console.example';
    const token = await signup([
      { handle: 'ana_rivera_dev', scopes: ['intel-brief:read'] },
    ]);

    const res = await request(app)
      .get('/api/replay/ana_rivera_dev/intel-brief')
      .set('Origin', 'https://case-console.example')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe('https://case-console.example');
    expect(res.headers['access-control-allow-origin']).not.toBe('*');
  });

  it('marks replay CORS preflight responses as non-cacheable', async () => {
    process.env.REPLAY_ALLOWED_ORIGINS = 'https://case-console.example';

    const res = await request(app)
      .options('/api/replay/ana_rivera_dev/intel-brief')
      .set('Origin', 'https://case-console.example')
      .set('Access-Control-Request-Method', 'GET')
      .set('Access-Control-Request-Headers', 'authorization');

    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe('https://case-console.example');
    expect(res.headers['cache-control']).toMatch(/no-store/);
    expect(res.headers.pragma).toBe('no-cache');
    expect(res.headers['surrogate-control']).toBe('no-store');
  });
});
