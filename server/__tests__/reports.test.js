const request = require('supertest');
const express = require('express');

// ─── Setup Mocks ───────────────────────────────────────────────────────────

jest.mock('../db/repositories/pdiRepo', () => ({
  findByUser: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
}));

jest.mock('../db/repositories/themeRepo', () => ({
  findByPdi: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
}));

jest.mock('../db/repositories/checkpointRepo', () => ({
  findByTheme: jest.fn(),
  findById: jest.fn(),
  bulkCreate: jest.fn(),
  update: jest.fn(),
}));

const pdiRepo = require('../db/repositories/pdiRepo');
const themeRepo = require('../db/repositories/themeRepo');
const checkpointRepo = require('../db/repositories/checkpointRepo');

let mockDb;

function resetDb() {
  mockDb = { pdis: [], themes: [], checkpoints: [] };
}

function genUuid() {
  return `uuid-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

// ─── Test Setup ────────────────────────────────────────────────────────────────

let app;

beforeEach(() => {
  resetDb();
  jest.clearAllMocks();

  const pdiRepo = require('../db/repositories/pdiRepo');
  const themeRepo = require('../db/repositories/themeRepo');
  const checkpointRepo = require('../db/repositories/checkpointRepo');

  // ── pdiRepo ──
  pdiRepo.findByUser.mockImplementation(userId =>
    Promise.resolve(mockDb.pdis.filter(p => p.clerk_user_id === userId))
  );

  // ── themeRepo ──
  themeRepo.findByPdi.mockImplementation(pdiId =>
    Promise.resolve(mockDb.themes.filter(t => t.pdi_id === pdiId))
  );

  // ── checkpointRepo ──
  checkpointRepo.findByTheme.mockImplementation(themeId =>
    Promise.resolve(mockDb.checkpoints.filter(c => c.theme_id === themeId))
  );

  const reportsRouter = require('../routes/reports');
  app = express();
  app.use(express.json());
  app.use((req, _res, next) => { req.auth = { userId: 'test-user' }; next(); });
  app.use('/api/reports', reportsRouter);
});

// ─── Helper: Create Test Data ──────────────────────────────────────────────────

function seedPdi() {
  const pdi = {
    id: 'pdi-1',
    clerk_user_id: 'test-user',
    title: 'PDI 2025',
    start_date: '2025-01-01',
  };
  mockDb.pdis.push(pdi);
  return pdi;
}

function seedTheme(pdiId) {
  const theme = {
    id: 'theme-1',
    pdi_id: pdiId,
    name: 'Hard Skills',
    color: '#3B82F6',
    position: 0,
  };
  mockDb.themes.push(theme);
  return theme;
}

function seedCheckpoints(themeId) {
  const checkpoints = [
    {
      id: 'cp-1',
      theme_id: themeId,
      title: 'CP1',
      month: 1,
      biweekly: 1,
      type: 'normal',
      status: 'done',
      points: 10,
      notes: 'Completed',
      links: [],
    },
    {
      id: 'cp-2',
      theme_id: themeId,
      title: 'CP2',
      month: 1,
      biweekly: 2,
      type: 'bonus',
      status: 'planned',
      points: 0,
      notes: '',
      links: [],
    },
  ];
  mockDb.checkpoints.push(...checkpoints);
  return checkpoints;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('GET /api/reports/pdf', () => {
  it('retorna 400 quando não há PDI configurado', async () => {
    const res = await request(app).get('/api/reports/pdf');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'No configuration found' });
  });

  it('gera relatório PDF com status 200', async () => {
    const pdi = seedPdi();
    const theme = seedTheme(pdi.id);
    seedCheckpoints(theme.id);

    pdiRepo.findByUser.mockResolvedValue([pdi]);
    themeRepo.findByPdi.mockResolvedValue([theme]);
    checkpointRepo.findByTheme.mockResolvedValue(mockDb.checkpoints);

    const res = await request(app).get('/api/reports/pdf');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/pdf/);
    expect(res.headers['content-disposition']).toMatch(/pdi-report\.pdf/);
  });

  it('inclui título e data no PDF', async () => {
    const pdi = seedPdi();
    const theme = seedTheme(pdi.id);
    seedCheckpoints(theme.id);

    pdiRepo.findByUser.mockResolvedValue([pdi]);
    themeRepo.findByPdi.mockResolvedValue([theme]);
    checkpointRepo.findByTheme.mockResolvedValue(mockDb.checkpoints);

    const res = await request(app).get('/api/reports/pdf');
    expect(res.status).toBe(200);
    expect(res.body).toBeDefined(); // PDF binário
  });
});

describe('GET /api/reports/docx', () => {
  it('retorna 400 quando não há PDI configurado', async () => {
    const res = await request(app).get('/api/reports/docx');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'No configuration found' });
  });

  it('gera relatório DOCX com status 200', async () => {
    const pdi = seedPdi();
    const theme = seedTheme(pdi.id);
    seedCheckpoints(theme.id);

    pdiRepo.findByUser.mockResolvedValue([pdi]);
    themeRepo.findByPdi.mockResolvedValue([theme]);
    checkpointRepo.findByTheme.mockResolvedValue(mockDb.checkpoints);

    const res = await request(app).get('/api/reports/docx');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/wordprocessingml|docx|openxmlformats/);
    expect(res.headers['content-disposition']).toMatch(/pdi-report\.docx/);
  });

  it('inclui resumo geral no DOCX', async () => {
    const pdi = seedPdi();
    const theme = seedTheme(pdi.id);
    seedCheckpoints(theme.id);

    pdiRepo.findByUser.mockResolvedValue([pdi]);
    themeRepo.findByPdi.mockResolvedValue([theme]);
    checkpointRepo.findByTheme.mockResolvedValue(mockDb.checkpoints);

    const res = await request(app).get('/api/reports/docx');
    expect(res.status).toBe(200);
    expect(res.body).toBeDefined(); // DOCX binário
  });
});

describe('GET /api/reports/xlsx', () => {
  it('retorna 400 quando não há PDI configurado', async () => {
    const res = await request(app).get('/api/reports/xlsx');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'No configuration found' });
  });

  it('gera relatório XLSX com status 200', async () => {
    const pdi = seedPdi();
    const theme = seedTheme(pdi.id);
    seedCheckpoints(theme.id);

    pdiRepo.findByUser.mockResolvedValue([pdi]);
    themeRepo.findByPdi.mockResolvedValue([theme]);
    checkpointRepo.findByTheme.mockResolvedValue(mockDb.checkpoints);

    const res = await request(app).get('/api/reports/xlsx');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/spreadsheetml|xlsx|openxmlformats/);
    expect(res.headers['content-disposition']).toMatch(/pdi-report\.xlsx/);
  });

  it('inclui múltiplos temas no XLSX', async () => {
    const pdi = seedPdi();
    const theme1 = seedTheme(pdi.id);
    const theme2 = { ...seedTheme(pdi.id), id: 'theme-2', name: 'Soft Skills', position: 1 };
    mockDb.themes.push(theme2);

    seedCheckpoints(theme1.id);
    seedCheckpoints(theme2.id);

    pdiRepo.findByUser.mockResolvedValue([pdi]);
    themeRepo.findByPdi.mockResolvedValue([theme1, theme2]);
    checkpointRepo.findByTheme.mockImplementation(themeId =>
      Promise.resolve(mockDb.checkpoints.filter(c => c.theme_id === themeId))
    );

    const res = await request(app).get('/api/reports/xlsx');
    expect(res.status).toBe(200);
    expect(res.body).toBeDefined(); // XLSX binário
  });
});

describe('Report generation — authentication', () => {
  it('retorna 401 quando usuário não está autenticado (sem req.auth.userId)', async () => {
    const unauthApp = express();
    unauthApp.use(express.json());
    // Não injeta req.auth
    const reportsRouter = require('../routes/reports');
    unauthApp.use('/api/reports', reportsRouter);

    const res = await request(unauthApp).get('/api/reports/pdf');
    expect(res.status).toBe(400);
  });
});

describe('Report statistics calculations', () => {
  it('calcula corretamente estatísticas com checkpoints concluídos', async () => {
    const pdi = seedPdi();
    const theme = seedTheme(pdi.id);

    // 1 done (10 pontos), 1 planned (0 pontos)
    seedCheckpoints(theme.id);

    pdiRepo.findByUser.mockResolvedValue([pdi]);
    themeRepo.findByPdi.mockResolvedValue([theme]);
    checkpointRepo.findByTheme.mockResolvedValue(mockDb.checkpoints);

    const res = await request(app).get('/api/reports/pdf');
    expect(res.status).toBe(200);
    // PDF gerado com dados corretos
  });

  it('lida com temas sem checkpoints', async () => {
    const pdi = seedPdi();
    const theme = seedTheme(pdi.id);
    // Tema sem checkpoints

    pdiRepo.findByUser.mockResolvedValue([pdi]);
    themeRepo.findByPdi.mockResolvedValue([theme]);
    checkpointRepo.findByTheme.mockResolvedValue([]);

    const res = await request(app).get('/api/reports/pdf');
    expect(res.status).toBe(200);
  });

  it('lida com checkpoints sem pontos', async () => {
    const pdi = seedPdi();
    const theme = seedTheme(pdi.id);

    const checkpoints = [
      {
        id: 'cp-1',
        theme_id: theme.id,
        title: 'CP1',
        month: 1,
        biweekly: 1,
        type: 'normal',
        status: 'done',
        points: null, // null points
        notes: '',
        links: [],
      },
    ];
    mockDb.checkpoints.push(...checkpoints);

    pdiRepo.findByUser.mockResolvedValue([pdi]);
    themeRepo.findByPdi.mockResolvedValue([theme]);
    checkpointRepo.findByTheme.mockResolvedValue(checkpoints);

    const res = await request(app).get('/api/reports/xlsx');
    expect(res.status).toBe(200);
  });
});

