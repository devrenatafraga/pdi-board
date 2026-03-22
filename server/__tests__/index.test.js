const request = require('supertest');

// ─── Mocks (hoisted before any require) ──────────────────────────────────────

jest.mock('@clerk/clerk-sdk-node', () => ({
  ClerkExpressWithAuth: jest.fn(() => (_req, _res, next) => next()),
  ClerkExpressRequireAuth: jest.fn(() => (_req, _res, next) => next()),
}));

jest.mock('../routes/api', () => {
  const express = require('express');
  const r = express.Router();
  r.get('/ping', (_req, res) => res.json({ ok: true }));
  return r;
});

jest.mock('../routes/reports', () => {
  const express = require('express');
  const r = express.Router();
  r.get('/ping', (_req, res) => res.json({ ok: true }));
  return r;
});

jest.mock('../middleware/requireAuth', () => (_req, _res, next) => next());

// ─── GET /api/me ──────────────────────────────────────────────────────────────

describe('GET /api/me — sem autenticação', () => {
  let app;

  beforeAll(() => {
    // ClerkExpressWithAuth passthrough (no req.auth injected)
    app = require('../index');
  });

  it('retorna { user: null } quando req.auth não está presente', async () => {
    const res = await request(app).get('/api/me');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ user: null });
  });

  it('responde 200 para rotas SPA desconhecidas (fallback)', async () => {
    const res = await request(app).get('/alguma-rota-spa');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
  });
});

describe('GET /api/me — com autenticação (Clerk)', () => {
  let app;

  beforeAll(() => {
    jest.resetModules();

    jest.mock('@clerk/clerk-sdk-node', () => ({
      ClerkExpressWithAuth: jest.fn(
        () => (req, _res, next) => { req.auth = { userId: 'clerk-user-42' }; next(); }
      ),
      ClerkExpressRequireAuth: jest.fn(() => (_req, _res, next) => next()),
    }));
    jest.mock('../routes/api', () => {
      const express = require('express');
      const r = express.Router();
      r.get('/ping', (_req, res) => res.json({ ok: true }));
      return r;
    });
    jest.mock('../routes/reports', () => {
      const express = require('express');
      const r = express.Router();
      r.get('/ping', (_req, res) => res.json({ ok: true }));
      return r;
    });
    jest.mock('../middleware/requireAuth', () => (_req, _res, next) => next());

    app = require('../index');
  });

  it('retorna o userId quando req.auth.userId está presente', async () => {
    const res = await request(app).get('/api/me');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ user: { id: 'clerk-user-42' } });
  });
});

// ─── GET / — injeção da CLERK_PUBLISHABLE_KEY ─────────────────────────────────

describe('GET / — injeção da CLERK_PUBLISHABLE_KEY no HTML', () => {
  let app;

  beforeAll(() => {
    jest.resetModules();

    jest.mock('@clerk/clerk-sdk-node', () => ({
      ClerkExpressWithAuth: jest.fn(() => (_req, _res, next) => next()),
      ClerkExpressRequireAuth: jest.fn(() => (_req, _res, next) => next()),
    }));
    jest.mock('../routes/api', () => {
      const express = require('express');
      const r = express.Router();
      r.get('/ping', (_req, res) => res.json({ ok: true }));
      return r;
    });
    jest.mock('../routes/reports', () => {
      const express = require('express');
      const r = express.Router();
      r.get('/ping', (_req, res) => res.json({ ok: true }));
      return r;
    });
    jest.mock('../middleware/requireAuth', () => (_req, _res, next) => next());

    app = require('../index');
  });

  it('injeta a chave publishable no HTML quando env está definida', async () => {
    process.env.CLERK_PUBLISHABLE_KEY = 'pk_test_xyz';
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
    expect(res.text).toContain('pk_test_xyz');
    delete process.env.CLERK_PUBLISHABLE_KEY;
  });

  it('não deixa o placeholder no HTML quando env não está definida', async () => {
    delete process.env.CLERK_PUBLISHABLE_KEY;
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.text).not.toContain('%%CLERK_PUBLISHABLE_KEY%%');
  });
});
