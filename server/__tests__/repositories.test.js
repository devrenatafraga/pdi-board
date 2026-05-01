/**
 * repositories.test.js
 * Testes unitários dos repositórios — mocka apenas o pool (sem banco real).
 */

jest.mock('../db/pool');

const pool         = require('../db/pool');
const pdiRepo      = require('../db/repositories/pdiRepo');
const themeRepo    = require('../db/repositories/themeRepo');
const cpRepo       = require('../db/repositories/checkpointRepo');
const ooRepo       = require('../db/repositories/oneOnOneRepo');
const evRepo       = require('../db/repositories/evidenceRepo');

beforeEach(() => jest.clearAllMocks());

// ─── pdiRepo ──────────────────────────────────────────────────────────────────

describe('pdiRepo', () => {
  test('findByUser executa SELECT com clerk_user_id', async () => {
    const rows = [{ id: 'pdi-1', clerk_user_id: 'user-1', title: 'PDI' }];
    pool.query.mockResolvedValueOnce({ rows });
    const result = await pdiRepo.findByUser('user-1');
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('clerk_user_id'), ['user-1']);
    expect(result).toEqual(rows);
  });

  test('findById retorna linha quando encontrada', async () => {
    const row = { id: 'pdi-1', clerk_user_id: 'user-1' };
    pool.query.mockResolvedValueOnce({ rows: [row] });
    expect(await pdiRepo.findById('pdi-1', 'user-1')).toEqual(row);
  });

  test('findById retorna null quando não encontrado', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    expect(await pdiRepo.findById('nope', 'user-1')).toBeNull();
  });

  test('create insere e retorna novo pdi', async () => {
    const row = { id: 'new-id', clerk_user_id: 'user-1', title: 'Test', start_date: '2025-01-01' };
    pool.query.mockResolvedValueOnce({ rows: [row] });
    const result = await pdiRepo.create('user-1', { title: 'Test', startDate: '2025-01-01' });
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('INSERT'), expect.arrayContaining(['user-1', 'Test']));
    expect(result).toEqual(row);
  });

  test('update executa UPDATE e retorna linha atualizada', async () => {
    const row = { id: 'pdi-1', title: 'Novo' };
    pool.query.mockResolvedValueOnce({ rows: [row] });
    expect(await pdiRepo.update('pdi-1', 'user-1', { title: 'Novo', startDate: '2025-06-01' })).toEqual(row);
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE'), expect.any(Array));
  });

  test('update retorna null quando pdi não existe', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    expect(await pdiRepo.update('nope', 'user-1', { title: 'X', startDate: null })).toBeNull();
  });

  test('remove executa DELETE', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    await pdiRepo.remove('pdi-1', 'user-1');
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('DELETE'), ['pdi-1', 'user-1']);
  });
});

// ─── themeRepo ────────────────────────────────────────────────────────────────

describe('themeRepo', () => {
  test('findByPdi retorna temas do PDI', async () => {
    const rows = [{ id: 't1', pdi_id: 'pdi-1', name: 'Tech' }];
    pool.query.mockResolvedValueOnce({ rows });
    expect(await themeRepo.findByPdi('pdi-1')).toEqual(rows);
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('pdi_id'), ['pdi-1']);
  });

  test('findById retorna tema quando encontrado', async () => {
    const row = { id: 't1', name: 'Tech' };
    pool.query.mockResolvedValueOnce({ rows: [row] });
    expect(await themeRepo.findById('t1')).toEqual(row);
  });

  test('findById retorna null quando não encontrado', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    expect(await themeRepo.findById('nope')).toBeNull();
  });

  test('create insere tema', async () => {
    const row = { id: 't1', pdi_id: 'pdi-1', name: 'Tech', color: '#3B82F6', position: 0 };
    pool.query.mockResolvedValueOnce({ rows: [row] });
    const result = await themeRepo.create('pdi-1', { name: 'Tech', color: '#3B82F6', position: 0 });
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('INSERT'), expect.any(Array));
    expect(result).toEqual(row);
  });

  test('create insere tema com end_date', async () => {
    const row = { id: 't1', pdi_id: 'pdi-1', name: 'Tech', color: '#3B82F6', position: 0, end_date: '2025-06-01' };
    pool.query.mockResolvedValueOnce({ rows: [row] });
    const result = await themeRepo.create('pdi-1', { name: 'Tech', color: '#3B82F6', position: 0, endDate: '2025-06-01' });
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('INSERT'), expect.arrayContaining(['2025-06-01']));
    expect(result).toEqual(row);
  });

  test('update com campos válidos executa UPDATE', async () => {
    const row = { id: 't1', name: 'Updated', color: '#000' };
    pool.query.mockResolvedValueOnce({ rows: [row] });
    expect(await themeRepo.update('t1', { name: 'Updated', color: '#000' })).toEqual(row);
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE'), expect.any(Array));
  });

  test('update com end_date executa UPDATE', async () => {
    const row = { id: 't1', name: 'Tech', color: '#3B82F6', end_date: '2025-06-01' };
    pool.query.mockResolvedValueOnce({ rows: [row] });
    const result = await themeRepo.update('t1', { end_date: '2025-06-01' });
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE'), expect.arrayContaining(['2025-06-01']));
    expect(result).toEqual(row);
  });

  test('update retorna null quando não encontrado', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    expect(await themeRepo.update('nope', { name: 'X' })).toBeNull();
  });

  test('update sem campos válidos chama findById em vez de UPDATE', async () => {
    const row = { id: 't1', name: 'Same' };
    pool.query.mockResolvedValueOnce({ rows: [row] });
    const result = await themeRepo.update('t1', {});
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('SELECT'), expect.any(Array));
    expect(result).toEqual(row);
  });

  test('remove executa DELETE', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    await themeRepo.remove('t1');
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('DELETE'), ['t1']);
  });
});

// ─── checkpointRepo ───────────────────────────────────────────────────────────

describe('checkpointRepo', () => {
  test('findByTheme retorna checkpoints ordenados', async () => {
    const rows = [{ id: 'cp1', theme_id: 't1' }];
    pool.query.mockResolvedValueOnce({ rows });
    expect(await cpRepo.findByTheme('t1')).toEqual(rows);
  });

  test('findById retorna checkpoint quando encontrado', async () => {
    const row = { id: 'cp1' };
    pool.query.mockResolvedValueOnce({ rows: [row] });
    expect(await cpRepo.findById('cp1')).toEqual(row);
  });

  test('findById retorna null quando não encontrado', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    expect(await cpRepo.findById('nope')).toBeNull();
  });

  test('bulkCreate insere todos os checkpoints', async () => {
    const cps = [
      { title: 'CP1', month: 1, biweekly: 1, type: 'normal' },
      { title: 'CP2', month: 1, biweekly: 2, type: 'bonus' },
    ];
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 'cp1' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'cp2' }] });
    const result = await cpRepo.bulkCreate('t1', cps);
    expect(pool.query).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(2);
  });

  test('update com campos válidos executa UPDATE', async () => {
    const row = { id: 'cp1', status: 'done', points: 10 };
    pool.query.mockResolvedValueOnce({ rows: [row] });
    expect(await cpRepo.update('cp1', { status: 'done', points: 10 })).toEqual(row);
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE'), expect.any(Array));
  });

   test('update with links field updates checkpoint', async () => {
     const row = { id: 'cp1', links: ['https://github.com'] };
     pool.query.mockResolvedValueOnce({ rows: [row] });
     const result = await cpRepo.update('cp1', { links: ['https://github.com'] });
     expect(result).toEqual(row);
     expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE'), expect.any(Array));
   });

  test('update sem campos válidos chama findById', async () => {
    const row = { id: 'cp1', status: 'planned' };
    pool.query.mockResolvedValueOnce({ rows: [row] });
    expect(await cpRepo.update('cp1', {})).toEqual(row);
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('SELECT'), expect.any(Array));
  });

  test('update retorna null quando não encontrado', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    expect(await cpRepo.update('nope', { status: 'done' })).toBeNull();
  });
});

// ─── oneOnOneRepo ─────────────────────────────────────────────────────────────

describe('oneOnOneRepo', () => {
  test('findByPdi retorna registros do PDI', async () => {
    const rows = [{ id: 'oo1', pdi_id: 'pdi-1' }];
    pool.query.mockResolvedValueOnce({ rows });
    expect(await ooRepo.findByPdi('pdi-1')).toEqual(rows);
  });

  test('create insere e retorna registro', async () => {
    const row = { id: 'oo1', pdi_id: 'pdi-1', date: '2025-01-15', notes: 'ok' };
    pool.query.mockResolvedValueOnce({ rows: [row] });
    const result = await ooRepo.create('pdi-1', { date: '2025-01-15', notes: 'ok' });
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('INSERT'), expect.any(Array));
    expect(result).toEqual(row);
  });

  test('create usa string vazia para notes quando ausente', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'oo1' }] });
    await ooRepo.create('pdi-1', { date: '2025-01-15' });
    expect(pool.query.mock.calls[0][1]).toContain('');
  });

  test('remove executa DELETE com id e pdi_id', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    await ooRepo.remove('oo1', 'pdi-1');
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('DELETE'), ['oo1', 'pdi-1']);
  });
});

// ─── evidenceRepo ─────────────────────────────────────────────────────────────

describe('evidenceRepo', () => {
  test('findByPdi retorna evidências do PDI', async () => {
    const rows = [{ id: 'ev1', pdi_id: 'pdi-1' }];
    pool.query.mockResolvedValueOnce({ rows });
    expect(await evRepo.findByPdi('pdi-1')).toEqual(rows);
  });

  test('create insere evidência', async () => {
    const row = { id: 'ev1', pdi_id: 'pdi-1', title: 'PR #42', url: 'https://github.com/pr/42' };
    pool.query.mockResolvedValueOnce({ rows: [row] });
    const result = await evRepo.create('pdi-1', { title: 'PR #42', url: 'https://github.com/pr/42' });
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('INSERT'), expect.any(Array));
    expect(result).toEqual(row);
  });

  test('create usa null para checkpointId quando ausente', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'ev1' }] });
    await evRepo.create('pdi-1', { title: 'X', url: '' });
    expect(pool.query.mock.calls[0][1]).toContain(null);
  });

  test('remove executa DELETE com id e pdi_id', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    await evRepo.remove('ev1', 'pdi-1');
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('DELETE'), ['ev1', 'pdi-1']);
  });
});
