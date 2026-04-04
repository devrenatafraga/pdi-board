const express = require('express');
const pdiRepo        = require('../db/repositories/pdiRepo');
const themeRepo      = require('../db/repositories/themeRepo');
const checkpointRepo = require('../db/repositories/checkpointRepo');
const oneOnOneRepo   = require('../db/repositories/oneOnOneRepo');
const evidenceRepo   = require('../db/repositories/evidenceRepo');
const logger = require('../lib/logger');
const { getUserId } = require('../lib/authHelper');

const router = express.Router();

// Shape checkpoint data for the frontend contract.
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


async function getActivePdi(userId) {
  const pdis = await pdiRepo.findByUser(userId);
  return pdis[0] || null;
}

// GET /api/data
router.get('/data', async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
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
     logger.error('GET /data failed', {
       message: err && err.message,
       stack: err && err.stack
     });
     res.status(500).json({ error: 'Internal server error' });
   }
});

// PUT /api/config
router.put('/config', async (req, res) => {
   try {
     const userId = getUserId(req);
     if (!userId) return res.status(401).json({ error: 'Unauthorized' });
     const { title, startDate, themes } = req.body;

     let pdi = await getActivePdi(userId);
     if (pdi) {
       await pdiRepo.update(pdi.id, userId, { title, startDate });
     } else {
       pdi = await pdiRepo.create(userId, { title, startDate });
     }

     // Replace setup themes/checkpoints instead of appending duplicates.
     const existingThemes = await themeRepo.findByPdi(pdi.id);
     for (const existingTheme of existingThemes) {
       await themeRepo.remove(existingTheme.id);
     }

     // Recreate themes and checkpoints from the incoming payload.
     for (let i = 0; i < themes.length; i++) {
       const t = themes[i];
       const theme = await themeRepo.create(pdi.id, { name: t.name, color: t.color, position: i });
       await checkpointRepo.bulkCreate(theme.id, t.checkpoints);
     }

     res.json({ ok: true });
   } catch (err) {
     logger.error('PUT /config failed', {
       message: err && err.message,
       stack: err && err.stack
     });
     res.status(500).json({ error: 'Internal server error' });
   }
});

// PUT /api/themes/:id
router.put('/themes/:id', async (req, res) => {
   try {
     const { name, color, tokenPosition } = req.body;
     const theme = await themeRepo.update(req.params.id, {
       name,
       color,
       token_position: tokenPosition,
     });
     if (!theme) return res.status(404).json({ error: 'Theme not found' });
     res.json({ ok: true });
   } catch (err) {
     logger.error('PUT /themes/:id failed', {
       message: err && err.message,
       stack: err && err.stack,
       themeId: req.params.id
     });
     res.status(500).json({ error: 'Internal server error' });
   }
});

// PUT /api/checkpoints/:themeId/:id
router.put('/checkpoints/:themeId/:id', async (req, res) => {
   try {
     const cp = await checkpointRepo.update(req.params.id, req.body);
     if (!cp) return res.status(404).json({ error: 'Checkpoint not found' });
     res.json({ ok: true, checkpoint: cp });
   } catch (err) {
     logger.error('PUT /checkpoints/:themeId/:id failed', {
       message: err && err.message,
       stack: err && err.stack,
       themeId: req.params.themeId,
       checkpointId: req.params.id,
     });
     res.status(500).json({ error: 'Internal server error' });
   }
});

// POST /api/oneOnOnes
router.post('/oneOnOnes', async (req, res) => {
   try {
     const userId = getUserId(req);
     if (!userId) return res.status(401).json({ error: 'Unauthorized' });
     const pdi = await getActivePdi(userId);
     if (!pdi) return res.status(400).json({ error: 'PDI not found' });
     const entry = await oneOnOneRepo.create(pdi.id, req.body);
     res.status(201).json(entry);
   } catch (err) {
     logger.error('POST /oneOnOnes failed', {
       message: err && err.message,
       stack: err && err.stack
     });
     res.status(500).json({ error: 'Internal server error' });
   }
});

// DELETE /api/oneOnOnes/:id
router.delete('/oneOnOnes/:id', async (req, res) => {
   try {
     const userId = getUserId(req);
     if (!userId) return res.status(401).json({ error: 'Unauthorized' });
     const pdi = await getActivePdi(userId);
     if (!pdi) return res.status(400).json({ error: 'PDI not found' });
     await oneOnOneRepo.remove(req.params.id, pdi.id);
     res.json({ ok: true });
   } catch (err) {
     logger.error('DELETE /oneOnOnes/:id failed', {
       message: err && err.message,
       stack: err && err.stack
     });
     res.status(500).json({ error: 'Internal server error' });
   }
});

// POST /api/evidence
router.post('/evidence', async (req, res) => {
   try {
     const userId = getUserId(req);
     if (!userId) return res.status(401).json({ error: 'Unauthorized' });
     const pdi = await getActivePdi(userId);
     if (!pdi) return res.status(400).json({ error: 'PDI not found' });
     const entry = await evidenceRepo.create(pdi.id, req.body);
     res.status(201).json(entry);
   } catch (err) {
     logger.error('POST /evidence failed', {
       message: err && err.message,
       stack: err && err.stack
     });
     res.status(500).json({ error: 'Internal server error' });
   }
});

// DELETE /api/evidence/:id
router.delete('/evidence/:id', async (req, res) => {
   try {
     const userId = getUserId(req);
     if (!userId) return res.status(401).json({ error: 'Unauthorized' });
     const pdi = await getActivePdi(userId);
     if (!pdi) return res.status(400).json({ error: 'PDI not found' });
     await evidenceRepo.remove(req.params.id, pdi.id);
     res.json({ ok: true });
   } catch (err) {
     logger.error('DELETE /evidence/:id failed', {
       message: err && err.message,
       stack: err && err.stack
     });
     res.status(500).json({ error: 'Internal server error' });
   }
});

module.exports = router;
