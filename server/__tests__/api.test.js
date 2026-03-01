const request = require('supertest');
const express = require('express');
const fs = require('fs');
const path = require('path');
const os = require('os');

let tmpFile;
let app;

beforeEach(() => {
  // Arquivo temporário isolado por teste
  tmpFile = path.join(os.tmpdir(), `pdi-test-${Date.now()}.json`);
  process.env.DATA_FILE = tmpFile;

  // Limpa cache do módulo para reler DATA_FILE
  jest.resetModules();
  const apiRouter = require('../routes/api');
  app = express();
  app.use(express.json());
  app.use('/api', apiRouter);
});

afterEach(() => {
  if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
  delete process.env.DATA_FILE;
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
      tokenPosition: 0,
      checkpoints: [
        { id: 'cp-0-1', title: 'CP1', month: 1, biweekly: 1, type: 'normal', status: 'planned', points: 0, notes: '' },
        { id: 'cp-0-2', title: 'CP2', month: 1, biweekly: 2, type: 'bonus',  status: 'planned', points: 0, notes: '' },
      ],
    },
  ],
};

// ─── GET /api/data ─────────────────────────────────────────────────────────────

describe('GET /api/data', () => {
  it('retorna estrutura inicial quando data.json não existe', async () => {
    const res = await request(app).get('/api/data');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ config: null, oneOnOnes: [], evidence: [] });
  });

  it('retorna dados persistidos após criação do arquivo', async () => {
    fs.writeFileSync(tmpFile, JSON.stringify({ config: sampleConfig, oneOnOnes: [], evidence: [] }));
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

  it('persiste a configuração no arquivo', async () => {
    await request(app).put('/api/config').send(sampleConfig);
    const saved = JSON.parse(fs.readFileSync(tmpFile));
    expect(saved.config.title).toBe('PDI 2025');
    expect(saved.config.themes).toHaveLength(1);
  });
});

// ─── PUT /api/themes/:id ────────────────────────────────────────────────────────

describe('PUT /api/themes/:id', () => {
  beforeEach(async () => {
    await request(app).put('/api/config').send(sampleConfig);
  });

  it('atualiza nome e cor do tema', async () => {
    const res = await request(app)
      .put('/api/themes/theme-0')
      .send({ name: 'Soft Skills', color: '#22C55E' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });

    const data = JSON.parse(fs.readFileSync(tmpFile));
    expect(data.config.themes[0].name).toBe('Soft Skills');
    expect(data.config.themes[0].color).toBe('#22C55E');
  });

  it('atualiza tokenPosition do tema', async () => {
    const res = await request(app)
      .put('/api/themes/theme-0')
      .send({ tokenPosition: 2 });
    expect(res.status).toBe(200);
    const data = JSON.parse(fs.readFileSync(tmpFile));
    expect(data.config.themes[0].tokenPosition).toBe(2);
  });

  it('retorna 400 quando não há configuração', async () => {
    // Reset sem config
    fs.writeFileSync(tmpFile, JSON.stringify({ config: null, oneOnOnes: [], evidence: [] }));
    const res = await request(app).put('/api/themes/theme-0').send({ name: 'X' });
    expect(res.status).toBe(400);
  });

  it('retorna 404 para tema inexistente', async () => {
    const res = await request(app).put('/api/themes/nao-existe').send({ name: 'X' });
    expect(res.status).toBe(404);
  });
});

// ─── PUT /api/checkpoints/:themeId/:id ────────────────────────────────────────

describe('PUT /api/checkpoints/:themeId/:id', () => {
  beforeEach(async () => {
    await request(app).put('/api/config').send(sampleConfig);
  });

  it('atualiza status e pontos do checkpoint', async () => {
    const res = await request(app)
      .put('/api/checkpoints/theme-0/cp-0-1')
      .send({ status: 'done', points: 10, notes: 'Ótimo!' });
    expect(res.status).toBe(200);
    expect(res.body.checkpoint.status).toBe('done');
    expect(res.body.checkpoint.points).toBe(10);
  });

  it('persiste as alterações do checkpoint', async () => {
    await request(app)
      .put('/api/checkpoints/theme-0/cp-0-1')
      .send({ status: 'in-progress', points: 5, notes: 'Em andamento' });
    const data = JSON.parse(fs.readFileSync(tmpFile));
    const cp = data.config.themes[0].checkpoints[0];
    expect(cp.status).toBe('in-progress');
    expect(cp.notes).toBe('Em andamento');
  });

  it('retorna 400 quando não há configuração', async () => {
    fs.writeFileSync(tmpFile, JSON.stringify({ config: null, oneOnOnes: [], evidence: [] }));
    const res = await request(app).put('/api/checkpoints/theme-0/cp-0-1').send({ status: 'done' });
    expect(res.status).toBe(400);
  });

  it('retorna 404 para tema inexistente', async () => {
    const res = await request(app).put('/api/checkpoints/nao-existe/cp-0-1').send({ status: 'done' });
    expect(res.status).toBe(404);
  });

  it('retorna 404 para checkpoint inexistente', async () => {
    const res = await request(app).put('/api/checkpoints/theme-0/nao-existe').send({ status: 'done' });
    expect(res.status).toBe(404);
  });
});

// ─── POST /api/oneOnOnes ───────────────────────────────────────────────────────

describe('POST /api/oneOnOnes', () => {
  const newEntry = {
    date: '2025-01-15',
    themeId: 'theme-0',
    checkpointId: 'cp-0-1',
    points: 10,
    notes: 'Reunião produtiva',
  };

  it('cria registro de 1:1 e retorna com id gerado', async () => {
    const res = await request(app).post('/api/oneOnOnes').send(newEntry);
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.points).toBe(10);
    expect(res.body.notes).toBe('Reunião produtiva');
  });

  it('persiste o registro no arquivo', async () => {
    await request(app).post('/api/oneOnOnes').send(newEntry);
    const data = JSON.parse(fs.readFileSync(tmpFile));
    expect(data.oneOnOnes).toHaveLength(1);
    expect(data.oneOnOnes[0].date).toBe('2025-01-15');
  });

  it('acumula múltiplos registros', async () => {
    await request(app).post('/api/oneOnOnes').send(newEntry);
    await request(app).post('/api/oneOnOnes').send({ ...newEntry, date: '2025-01-29' });
    const data = JSON.parse(fs.readFileSync(tmpFile));
    expect(data.oneOnOnes).toHaveLength(2);
  });
});

// ─── DELETE /api/oneOnOnes/:id ─────────────────────────────────────────────────

describe('DELETE /api/oneOnOnes/:id', () => {
  it('remove registro de 1:1 pelo id', async () => {
    const created = await request(app).post('/api/oneOnOnes').send({
      date: '2025-01-15', themeId: 'theme-0', checkpointId: 'cp-0-1', points: 10, notes: '',
    });
    const id = created.body.id;

    const res = await request(app).delete(`/api/oneOnOnes/${id}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });

    const data = JSON.parse(fs.readFileSync(tmpFile));
    expect(data.oneOnOnes).toHaveLength(0);
  });

  it('não falha ao tentar remover id inexistente', async () => {
    const res = await request(app).delete('/api/oneOnOnes/nao-existe');
    expect(res.status).toBe(200);
  });
});

// ─── POST /api/evidence ────────────────────────────────────────────────────────

describe('POST /api/evidence', () => {
  const newEv = {
    title: 'PR #42 — Feature X',
    url: 'https://github.com/devrenatafraga/pdi-board/pull/42',
    type: 'PR',
    themeId: 'theme-0',
    date: '2025-01-20',
  };

  it('cria evidência e retorna com id gerado', async () => {
    const res = await request(app).post('/api/evidence').send(newEv);
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.title).toBe('PR #42 — Feature X');
    expect(res.body.type).toBe('PR');
  });

  it('persiste a evidência no arquivo', async () => {
    await request(app).post('/api/evidence').send(newEv);
    const data = JSON.parse(fs.readFileSync(tmpFile));
    expect(data.evidence).toHaveLength(1);
    expect(data.evidence[0].url).toBe(newEv.url);
  });

  it('suporta tipos diferentes de evidência', async () => {
    const types = ['PR', 'certificate', 'praise', 'other'];
    for (const type of types) {
      await request(app).post('/api/evidence').send({ ...newEv, type });
    }
    const data = JSON.parse(fs.readFileSync(tmpFile));
    expect(data.evidence).toHaveLength(4);
    expect(data.evidence.map(e => e.type)).toEqual(types);
  });
});

// ─── DELETE /api/evidence/:id ──────────────────────────────────────────────────

describe('DELETE /api/evidence/:id', () => {
  it('remove evidência pelo id', async () => {
    const created = await request(app).post('/api/evidence').send({
      title: 'Certificado AWS', url: '', type: 'certificate', themeId: 'theme-0', date: '2025-02-01',
    });
    const id = created.body.id;

    const res = await request(app).delete(`/api/evidence/${id}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });

    const data = JSON.parse(fs.readFileSync(tmpFile));
    expect(data.evidence).toHaveLength(0);
  });

  it('não remove outras evidências ao deletar uma específica', async () => {
    const ev1 = await request(app).post('/api/evidence').send({ title: 'EV1', url: '', type: 'PR', themeId: '', date: '' });
    const ev2 = await request(app).post('/api/evidence').send({ title: 'EV2', url: '', type: 'PR', themeId: '', date: '' });

    await request(app).delete(`/api/evidence/${ev1.body.id}`);

    const data = JSON.parse(fs.readFileSync(tmpFile));
    expect(data.evidence).toHaveLength(1);
    expect(data.evidence[0].id).toBe(ev2.body.id);
  });

  it('não falha ao tentar remover id inexistente', async () => {
    const res = await request(app).delete('/api/evidence/nao-existe');
    expect(res.status).toBe(200);
  });
});
