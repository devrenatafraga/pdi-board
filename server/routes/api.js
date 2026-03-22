const express = require('express');
const pdiRepo        = require('../db/repositories/pdiRepo');
const themeRepo      = require('../db/repositories/themeRepo');
const checkpointRepo = require('../db/repositories/checkpointRepo');
const oneOnOneRepo   = require('../db/repositories/oneOnOneRepo');
const evidenceRepo   = require('../db/repositories/evidenceRepo');

const router = express.Router();

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Builds the data shape the frontend expects from a pdi row + relations
function normalizeCheckpoint(cp) {
  return {
    id: cp.id,
    title: cp.title,
    month: cp.month,
    biweekly: cp.biweekly,
    type: cp.type,
    status: cp.status,
    points: cp.points,
    notes: cp.notes,
    links: cp.links ?? [],
  };
}

// Returns the active PDI for the authenticated user (or null)
// For now, "active" = the most recently created PDI.
// req.clerkUserId is injected by the requireAuth middleware (added in feature/auth).
// During this feature we fall back to a dev placeholder.
function getUserId(req) {
  return req.auth?.userId || req.headers['x-dev-user-id'] || 'dev-user';
}

async function getActivePdi(userId) {
  const pdis = await pdiRepo.findByUser(userId);
  return pdis[0] || null;
}

// ─── Routes ──────────────────────────────────────────────────────────────────

// GET /api/data — returns full PDI state in the shape the frontend expects
router.get('/data', async (req, res) => {
  try {
    const userId = getUserId(req);
    const pdi = await getActivePdi(userId);
    if (!pdi) return res.json({ config: null, oneOnOnes: [], evidence: [] });

    const themes = await themeRepo.findByPdi(pdi.id);
    const themesWithCheckpoints = await Promise.all(
      themes.map(async t => {
        const checkpoints = await checkpointRepo.findByTheme(t.id);
        return {
          id: t.id,
          name: t.name,
          color: t.color,
          tokenPosition: t.token_position,
          checkpoints: checkpoints.map(normalizeCheckpoint),
        };
      })
    );

    const [oneOnOnes, evidence] = await Promise.all([
      oneOnOneRepo.findByPdi(pdi.id),
      evidenceRepo.findByPdi(pdi.id),
    ]);

    res.json({
      config: {
        id: pdi.id,
        title: pdi.title,
        startDate: pdi.start_date,
        themes: themesWithCheckpoints,
      },
      oneOnOnes,
      evidence,
    });
  } catch (err) {
    console.error('GET /data', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// PUT /api/config — salva configuração inicial (temas + checkpoints)
router.put('/config', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { title, startDate, themes } = req.body;

    let pdi = await getActivePdi(userId);
    if (pdi) {
      await pdiRepo.update(pdi.id, userId, { title, startDate });
    } else {
      pdi = await pdiRepo.create(userId, { title, startDate });
    }

    // Recreate themes + checkpoints (setup wizard)
    for (let i = 0; i < themes.length; i++) {
      const t = themes[i];
      const theme = await themeRepo.create(pdi.id, { name: t.name, color: t.color, position: i });
      await checkpointRepo.bulkCreate(theme.id, t.checkpoints);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('PUT /config', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// PUT /api/themes/:id — atualiza tema (nome, cor, tokenPosition)
router.put('/themes/:id', async (req, res) => {
  try {
    const { name, color, tokenPosition } = req.body;
    const theme = await themeRepo.update(req.params.id, {
      name,
      color,
      token_position: tokenPosition,
    });
    if (!theme) return res.status(404).json({ error: 'Tema não encontrado' });
    res.json({ ok: true });
  } catch (err) {
    console.error('PUT /themes/:id', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// PUT /api/checkpoints/:themeId/:id — atualiza checkpoint
router.put('/checkpoints/:themeId/:id', async (req, res) => {
  try {
    const cp = await checkpointRepo.update(req.params.id, req.body);
    if (!cp) return res.status(404).json({ error: 'Checkpoint não encontrado' });
    res.json({ ok: true, checkpoint: cp });
  } catch (err) {
    console.error('PUT /checkpoints/:themeId/:id', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /api/oneOnOnes — registra 1:1
router.post('/oneOnOnes', async (req, res) => {
  try {
    const userId = getUserId(req);
    const pdi = await getActivePdi(userId);
    if (!pdi) return res.status(400).json({ error: 'PDI não encontrado' });
    const entry = await oneOnOneRepo.create(pdi.id, req.body);
    res.status(201).json(entry);
  } catch (err) {
    console.error('POST /oneOnOnes', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// DELETE /api/oneOnOnes/:id
router.delete('/oneOnOnes/:id', async (req, res) => {
  try {
    const userId = getUserId(req);
    const pdi = await getActivePdi(userId);
    if (!pdi) return res.status(400).json({ error: 'PDI não encontrado' });
    await oneOnOneRepo.remove(req.params.id, pdi.id);
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /oneOnOnes/:id', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /api/evidence — adiciona evidência
router.post('/evidence', async (req, res) => {
  try {
    const userId = getUserId(req);
    const pdi = await getActivePdi(userId);
    if (!pdi) return res.status(400).json({ error: 'PDI não encontrado' });
    const entry = await evidenceRepo.create(pdi.id, req.body);
    res.status(201).json(entry);
  } catch (err) {
    console.error('POST /evidence', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// DELETE /api/evidence/:id
router.delete('/evidence/:id', async (req, res) => {
  try {
    const userId = getUserId(req);
    const pdi = await getActivePdi(userId);
    if (!pdi) return res.status(400).json({ error: 'PDI não encontrado' });
    await evidenceRepo.remove(req.params.id, pdi.id);
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /evidence/:id', err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;
