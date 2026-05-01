const request = require('supertest');
const express = require('express');

// ─── Mocks declarados antes de qualquer import ────────────────────────────────

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

jest.mock('../db/repositories/oneOnOneRepo', () => ({
  findByPdi: jest.fn(),
  create: jest.fn(),
  remove: jest.fn(),
}));

jest.mock('../db/repositories/evidenceRepo', () => ({
  findByPdi: jest.fn(),
  create: jest.fn(),
  remove: jest.fn(),
}));

// ─── Estado em memória (resetado em beforeEach) ───────────────────────────────

let mockDb;

function resetDb() {
  mockDb = { pdis: [], themes: [], checkpoints: [], oneOnOnes: [], evidence: [] };
}

function genUuid() {
  return `uuid-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

// ─── Setup ────────────────────────────────────────────────────────────────────

let app;

beforeEach(() => {
  resetDb();
  jest.clearAllMocks();

  // Reuse the module-scoped mocks
  const pdiRepo        = require('../db/repositories/pdiRepo');
  const themeRepo      = require('../db/repositories/themeRepo');
  const checkpointRepo = require('../db/repositories/checkpointRepo');
  const oneOnOneRepo   = require('../db/repositories/oneOnOneRepo');
  const evidenceRepo   = require('../db/repositories/evidenceRepo');

  // ── pdiRepo ──
  pdiRepo.findByUser.mockImplementation(userId =>
    Promise.resolve(mockDb.pdis.filter(p => p.clerk_user_id === userId))
  );
  pdiRepo.findById.mockImplementation((id, userId) =>
    Promise.resolve(mockDb.pdis.find(p => p.id === id && p.clerk_user_id === userId) || null)
  );
  pdiRepo.create.mockImplementation((userId, { title, startDate }) => {
    const pdi = { id: genUuid(), clerk_user_id: userId, title, start_date: startDate, created_at: new Date().toISOString() };
    mockDb.pdis.push(pdi);
    return Promise.resolve(pdi);
  });
  pdiRepo.update.mockImplementation((id, userId, fields) => {
    const pdi = mockDb.pdis.find(p => p.id === id && p.clerk_user_id === userId);
    if (!pdi) return Promise.resolve(null);
    Object.assign(pdi, { title: fields.title, start_date: fields.startDate });
    return Promise.resolve(pdi);
  });

  // ── themeRepo ──
  themeRepo.findByPdi.mockImplementation(pdiId =>
    Promise.resolve(mockDb.themes.filter(t => t.pdi_id === pdiId).sort((a, b) => a.position - b.position))
  );
  themeRepo.findById.mockImplementation(id =>
    Promise.resolve(mockDb.themes.find(t => t.id === id) || null)
  );
  themeRepo.create.mockImplementation((pdiId, { name, color, position, endDate }) => {
    const theme = { id: genUuid(), pdi_id: pdiId, name, color, position: position ?? 0, token_position: 0, end_date: endDate ?? null };
    mockDb.themes.push(theme);
    return Promise.resolve(theme);
  });
  themeRepo.update.mockImplementation((id, fields) => {
    const theme = mockDb.themes.find(t => t.id === id);
    if (!theme) return Promise.resolve(null);
    if (fields.name !== undefined) theme.name = fields.name;
    if (fields.color !== undefined) theme.color = fields.color;
    if (fields.token_position !== undefined) theme.token_position = fields.token_position;
    if (fields.end_date !== undefined) theme.end_date = fields.end_date;
    return Promise.resolve(theme);
  });
  themeRepo.remove.mockImplementation(id => {
    mockDb.themes = mockDb.themes.filter(t => t.id !== id);
    // Simula ON DELETE CASCADE de checkpoints vinculados ao tema removido.
    mockDb.checkpoints = mockDb.checkpoints.filter(c => c.theme_id !== id);
    return Promise.resolve();
  });

  // ── checkpointRepo ──
  checkpointRepo.findByTheme.mockImplementation(themeId =>
    Promise.resolve(
      mockDb.checkpoints
        .filter(c => c.theme_id === themeId)
        .sort((a, b) => a.month - b.month || a.biweekly - b.biweekly)
    )
  );
  checkpointRepo.findById.mockImplementation(id =>
    Promise.resolve(mockDb.checkpoints.find(c => c.id === id) || null)
  );
  checkpointRepo.bulkCreate.mockImplementation((themeId, checkpoints) => {
    const created = checkpoints.map(cp => ({
      id: genUuid(), theme_id: themeId, title: cp.title,
      month: cp.month, biweekly: cp.biweekly, type: cp.type,
      status: cp.status ?? 'planned', points: cp.points ?? 0,
      notes: cp.notes ?? '', links: cp.links ?? [],
    }));
    mockDb.checkpoints.push(...created);
    return Promise.resolve(created);
  });
  checkpointRepo.update.mockImplementation((id, fields) => {
    const cp = mockDb.checkpoints.find(c => c.id === id);
    if (!cp) return Promise.resolve(null);
    ['title', 'status', 'points', 'notes', 'links'].forEach(k => {
      if (fields[k] !== undefined) cp[k] = fields[k];
    });
    return Promise.resolve(cp);
  });

  // ── oneOnOneRepo ──
  oneOnOneRepo.findByPdi.mockImplementation(pdiId =>
    Promise.resolve(mockDb.oneOnOnes.filter(o => o.pdi_id === pdiId))
  );
  oneOnOneRepo.create.mockImplementation((pdiId, { date, notes }) => {
    const entry = { id: genUuid(), pdi_id: pdiId, date, notes: notes ?? '', created_at: new Date().toISOString() };
    mockDb.oneOnOnes.push(entry);
    return Promise.resolve(entry);
  });
  oneOnOneRepo.remove.mockImplementation((id, pdiId) => {
    mockDb.oneOnOnes = mockDb.oneOnOnes.filter(o => !(o.id === id && o.pdi_id === pdiId));
    return Promise.resolve();
  });

  // ── evidenceRepo ──
  evidenceRepo.findByPdi.mockImplementation(pdiId =>
    Promise.resolve(mockDb.evidence.filter(e => e.pdi_id === pdiId))
  );
  evidenceRepo.create.mockImplementation((pdiId, { title, url, checkpointId }) => {
    const entry = { id: genUuid(), pdi_id: pdiId, checkpoint_id: checkpointId ?? null, title, url: url ?? '', created_at: new Date().toISOString() };
    mockDb.evidence.push(entry);
    return Promise.resolve(entry);
  });
  evidenceRepo.remove.mockImplementation((id, pdiId) => {
    mockDb.evidence = mockDb.evidence.filter(e => !(e.id === id && e.pdi_id === pdiId));
    return Promise.resolve();
  });

  const apiRouter     = require('../routes/api');
  const reportsRouter = require('../routes/reports');
  app = express();
  app.use(express.json());
  app.use((req, _res, next) => { req.auth = { userId: 'test-user' }; next(); });
  app.use('/api', apiRouter);
  app.use('/api/reports', reportsRouter);
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const sampleConfig = {
  title: 'PDI 2025',
  startDate: '2025-01-01',
  themes: [
    {
      id: 'theme-0',
      name: 'Hard Skills',
      color: '#3B82F6',
      endDate: '2025-06-01',
      tokenPosition: 0,
      checkpoints: [
        { id: 'cp-0-1', title: 'CP1', month: 1, biweekly: 1, type: 'normal', status: 'planned', points: 0, notes: '' },
        { id: 'cp-0-2', title: 'CP2', month: 1, biweekly: 2, type: 'bonus',  status: 'planned', points: 0, notes: '' },
      ],
    },
  ],
};

async function seedConfig() {
  return request(app).put('/api/config').send(sampleConfig);
}

// ─── getUserId — auth branches ────────────────────────────────────────────────

describe('getUserId — autenticação via req.auth.userId', () => {
  it('usa req.auth.userId quando disponível (Clerk auth)', async () => {
    // Monta app que injeta req.auth em vez do header
    const pdiRepo = require('../db/repositories/pdiRepo');
    pdiRepo.findByUser.mockResolvedValue([]);

    const apiRouter = require('../routes/api');
    const clerkApp = express();
    clerkApp.use(express.json());
    clerkApp.use((req, _res, next) => { req.auth = { userId: 'clerk-user-99' }; next(); });
    clerkApp.use('/api', apiRouter);

    const res = await request(clerkApp).get('/api/data');
    expect(res.status).toBe(200);
    expect(pdiRepo.findByUser).toHaveBeenCalledWith('clerk-user-99');
  });

  it('returns 401 when req.auth.userId is missing', async () => {
    const apiRouter = require('../routes/api');
    const unauthApp = express();
    unauthApp.use(express.json());
    unauthApp.use('/api', apiRouter);

    const res = await request(unauthApp).get('/api/data');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Unauthorized' });
  });
});

// ─── GET /api/data ─────────────────────────────────────────────────────────────

describe('GET /api/data', () => {
  it('retorna estrutura inicial quando não há PDI cadastrado', async () => {
    const res = await request(app).get('/api/data');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ config: null, oneOnOnes: [], evidence: [] });
  });

  it('retorna dados persistidos após criação do PDI', async () => {
    await seedConfig();
    const res = await request(app).get('/api/data');
    expect(res.status).toBe(200);
    expect(res.body.config.title).toBe('PDI 2025');
  });
});

// ─── PUT /api/config ───────────────────────────────────────────────────────────

describe('PUT /api/config', () => {
  it('salva a configuração e retorna ok', async () => {
    const res = await request(app).put('/api/config').send(sampleConfig);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('persiste temas e checkpoints', async () => {
    await seedConfig();
    const res = await request(app).get('/api/data');
    expect(res.body.config.themes).toHaveLength(1);
    expect(res.body.config.themes[0].name).toBe('Hard Skills');
    expect(res.body.config.themes[0].checkpoints).toHaveLength(2);
  });

  it('persiste end_date do tema e retorna em GET /api/data', async () => {
    await seedConfig();
    const res = await request(app).get('/api/data');
    expect(res.body.config.themes[0].endDate).toBe('2025-06-01');
  });

  it('substitui temas antigos ao salvar nova configuração (sem duplicar)', async () => {
    await request(app).put('/api/config').send({
      ...sampleConfig,
      themes: [
        ...sampleConfig.themes,
        {
          id: 'theme-1',
          name: 'Soft Skills',
          color: '#22C55E',
          tokenPosition: 0,
          checkpoints: [
            { id: 'cp-1-1', title: 'CP A', month: 1, biweekly: 1, type: 'normal', status: 'planned', points: 0, notes: '' },
            { id: 'cp-1-2', title: 'CP B', month: 1, biweekly: 2, type: 'bonus', status: 'planned', points: 0, notes: '' },
          ],
        },
      ],
    });

    await request(app).put('/api/config').send({
      ...sampleConfig,
      themes: [
        {
          id: 'theme-0',
          name: 'Novo Tema Unico',
          color: '#A855F7',
          tokenPosition: 0,
          checkpoints: [
            { id: 'cp-x-1', title: 'Novo CP1', month: 1, biweekly: 1, type: 'normal', status: 'planned', points: 0, notes: '' },
            { id: 'cp-x-2', title: 'Novo CP2', month: 1, biweekly: 2, type: 'milestone', status: 'planned', points: 0, notes: '' },
          ],
        },
      ],
    });

    const res = await request(app).get('/api/data');
    expect(res.status).toBe(200);
    expect(res.body.config.themes).toHaveLength(1);
    expect(res.body.config.themes[0].name).toBe('Novo Tema Unico');
    expect(res.body.config.themes[0].checkpoints).toHaveLength(2);
    expect(mockDb.themes).toHaveLength(1);
    expect(mockDb.checkpoints).toHaveLength(2);
  });
});

// ─── PUT /api/themes/:id ────────────────────────────────────────────────────────

describe('PUT /api/themes/:id', () => {
  let themeId;

  beforeEach(async () => {
    await seedConfig();
    const data = await request(app).get('/api/data');
    themeId = data.body.config.themes[0].id;
  });

  it('atualiza nome e cor do tema', async () => {
    const res = await request(app).put(`/api/themes/${themeId}`).send({ name: 'Soft Skills', color: '#22C55E' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    const theme = mockDb.themes.find(t => t.id === themeId);
    expect(theme.name).toBe('Soft Skills');
    expect(theme.color).toBe('#22C55E');
  });

  it('atualiza tokenPosition do tema', async () => {
    await request(app).put(`/api/themes/${themeId}`).send({ tokenPosition: 2 });
    const theme = mockDb.themes.find(t => t.id === themeId);
    expect(theme.token_position).toBe(2);
  });

  it('atualiza end_date do tema', async () => {
    await request(app).put(`/api/themes/${themeId}`).send({ endDate: '2025-12-31' });
    const theme = mockDb.themes.find(t => t.id === themeId);
    expect(theme.end_date).toBe('2025-12-31');
  });

  it('retorna 404 para tema inexistente', async () => {
    const res = await request(app).put('/api/themes/nao-existe').send({ name: 'X' });
    expect(res.status).toBe(404);
  });
});

// ─── PUT /api/checkpoints/:themeId/:id ────────────────────────────────────────

describe('PUT /api/checkpoints/:themeId/:id', () => {
  let themeId, cpId, cpBonusId;

  beforeEach(async () => {
    await seedConfig();
    const data = await request(app).get('/api/data');
    themeId   = data.body.config.themes[0].id;
    cpId      = data.body.config.themes[0].checkpoints[0].id;
    cpBonusId = data.body.config.themes[0].checkpoints[1].id;
  });

  it('atualiza status e pontos do checkpoint', async () => {
    const res = await request(app)
      .put(`/api/checkpoints/${themeId}/${cpId}`)
      .send({ status: 'done', points: 10, notes: 'Ótimo!' });
    expect(res.status).toBe(200);
    expect(res.body.checkpoint.status).toBe('done');
    expect(res.body.checkpoint.points).toBe(10);
  });

  it('persiste as alterações do checkpoint', async () => {
    await request(app)
      .put(`/api/checkpoints/${themeId}/${cpId}`)
      .send({ status: 'in-progress', points: 5, notes: 'Em andamento' });
    const cp = mockDb.checkpoints.find(c => c.id === cpId);
    expect(cp.status).toBe('in-progress');
    expect(cp.notes).toBe('Em andamento');
  });

  it('salva links de evidência no checkpoint', async () => {
    const links = ['https://github.com/org/repo/pull/1', 'https://notion.so/nota'];
    const res = await request(app)
      .put(`/api/checkpoints/${themeId}/${cpId}`)
      .send({ status: 'done', points: 15, notes: 'Concluído', links });
    expect(res.status).toBe(200);
    expect(res.body.checkpoint.links).toEqual(links);
  });

  it('salva pontos auto-calculados enviados pelo cliente', async () => {
    const res = await request(app)
      .put(`/api/checkpoints/${themeId}/${cpId}`)
      .send({ status: 'done', points: 18, notes: 'Notas', links: ['https://a.com', 'https://b.com'] });
    expect(res.status).toBe(200);
    expect(res.body.checkpoint.points).toBe(18);
  });

  it('salva pontos de bônus com links', async () => {
    const links = ['https://x.com', 'https://y.com', 'https://z.com'];
    const res = await request(app)
      .put(`/api/checkpoints/${themeId}/${cpBonusId}`)
      .send({ status: 'done', points: 26, notes: 'Entrega excepcional', links });
    expect(res.status).toBe(200);
    expect(res.body.checkpoint.points).toBe(26);
    expect(res.body.checkpoint.links).toHaveLength(3);
  });

  it('aceita checkpoint sem links (campo opcional)', async () => {
    const res = await request(app)
      .put(`/api/checkpoints/${themeId}/${cpId}`)
      .send({ status: 'done', points: 10, notes: '' });
    expect(res.status).toBe(200);
  });

  it('retorna 404 para checkpoint inexistente', async () => {
    const res = await request(app).put(`/api/checkpoints/${themeId}/nao-existe`).send({ status: 'done' });
    expect(res.status).toBe(404);
  });
});

// ─── POST /api/oneOnOnes ───────────────────────────────────────────────────────

describe('POST /api/oneOnOnes', () => {
  beforeEach(() => seedConfig());

  const newEntry = { date: '2025-01-15', notes: 'Reunião produtiva' };

  it('cria registro de 1:1 e retorna com id gerado', async () => {
    const res = await request(app).post('/api/oneOnOnes').send(newEntry);
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.notes).toBe('Reunião produtiva');
  });

  it('persiste o registro', async () => {
    await request(app).post('/api/oneOnOnes').send(newEntry);
    expect(mockDb.oneOnOnes).toHaveLength(1);
    expect(mockDb.oneOnOnes[0].date).toBe('2025-01-15');
  });

  it('acumula múltiplos registros', async () => {
    await request(app).post('/api/oneOnOnes').send(newEntry);
    await request(app).post('/api/oneOnOnes').send({ ...newEntry, date: '2025-01-29' });
    expect(mockDb.oneOnOnes).toHaveLength(2);
  });
});

// ─── DELETE /api/oneOnOnes/:id ─────────────────────────────────────────────────

describe('DELETE /api/oneOnOnes/:id', () => {
  beforeEach(() => seedConfig());

  it('remove registro de 1:1 pelo id', async () => {
    const created = await request(app).post('/api/oneOnOnes').send({ date: '2025-01-15', notes: '' });
    const res = await request(app).delete(`/api/oneOnOnes/${created.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(mockDb.oneOnOnes).toHaveLength(0);
  });

  it('não falha ao tentar remover id inexistente', async () => {
    const res = await request(app).delete('/api/oneOnOnes/nao-existe');
    expect(res.status).toBe(200);
  });
});

// ─── POST /api/evidence ────────────────────────────────────────────────────────

describe('POST /api/evidence', () => {
  beforeEach(() => seedConfig());

  const newEv = {
    title: 'PR #42 — Feature X',
    url: 'https://github.com/devrenatafraga/pdi-board/pull/42',
    type: 'PR',
  };

  it('cria evidência e retorna com id gerado', async () => {
    const res = await request(app).post('/api/evidence').send(newEv);
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.title).toBe('PR #42 — Feature X');
  });

  it('persiste a evidência', async () => {
    await request(app).post('/api/evidence').send(newEv);
    expect(mockDb.evidence).toHaveLength(1);
    expect(mockDb.evidence[0].url).toBe(newEv.url);
  });

  it('suporta tipos diferentes de evidência', async () => {
    const types = ['PR', 'certificate', 'praise', 'other'];
    for (const type of types) {
      await request(app).post('/api/evidence').send({ ...newEv, type });
    }
    expect(mockDb.evidence).toHaveLength(4);
  });
});

// ─── DELETE /api/evidence/:id ──────────────────────────────────────────────────

describe('DELETE /api/evidence/:id', () => {
  beforeEach(() => seedConfig());

  it('remove evidência pelo id', async () => {
    const created = await request(app).post('/api/evidence').send({ title: 'Cert AWS', url: '' });
    const res = await request(app).delete(`/api/evidence/${created.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(mockDb.evidence).toHaveLength(0);
  });

  it('não remove outras evidências ao deletar uma específica', async () => {
    const ev1 = await request(app).post('/api/evidence').send({ title: 'EV1', url: '' });
    const ev2 = await request(app).post('/api/evidence').send({ title: 'EV2', url: '' });
    await request(app).delete(`/api/evidence/${ev1.body.id}`);
    expect(mockDb.evidence).toHaveLength(1);
    expect(mockDb.evidence[0].id).toBe(ev2.body.id);
  });

  it('não falha ao tentar remover id inexistente', async () => {
    const res = await request(app).delete('/api/evidence/nao-existe');
    expect(res.status).toBe(200);
  });
});

// ─── GET /api/reports/:format ──────────────────────────────────────────────────

describe('GET /api/reports/:format', () => {
  beforeEach(() => seedConfig());

  it('gera relatório PDF com status 200 e content-type correto', async () => {
    const res = await request(app).get('/api/reports/pdf');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/pdf/);
  });

  it('gera relatório DOCX com status 200 e content-type correto', async () => {
    const res = await request(app).get('/api/reports/docx');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/wordprocessingml|docx|openxmlformats/);
  });

  it('gera relatório XLSX com status 200 e content-type correto', async () => {
    const res = await request(app).get('/api/reports/xlsx');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/spreadsheetml|xlsx|openxmlformats/);
  });

  it('retorna 400 quando não há PDI configurado para PDF', async () => {
    resetDb();
    const res = await request(app).get('/api/reports/pdf');
    expect(res.status).toBe(400);
  });
});
