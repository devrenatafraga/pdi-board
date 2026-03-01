const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const DATA_FILE = path.join(__dirname, '../data.json');

function readData() {
  if (!fs.existsSync(DATA_FILE)) {
    const initial = { config: null, oneOnOnes: [], evidence: [] };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function genId() {
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// GET /api/data
router.get('/data', (req, res) => {
  res.json(readData());
});

// PUT /api/config — salva configuração inicial (temas, checkpoints)
router.put('/config', (req, res) => {
  const data = readData();
  data.config = req.body;
  writeData(data);
  res.json({ ok: true });
});

// PUT /api/themes/:id — atualiza tema (nome, cor, tokenPosition)
router.put('/themes/:id', (req, res) => {
  const data = readData();
  if (!data.config) return res.status(400).json({ error: 'Configuração não encontrada' });
  const theme = data.config.themes.find(t => t.id === req.params.id);
  if (!theme) return res.status(404).json({ error: 'Tema não encontrado' });
  Object.assign(theme, req.body);
  writeData(data);
  res.json({ ok: true });
});

// PUT /api/checkpoints/:themeId/:id — atualiza checkpoint
router.put('/checkpoints/:themeId/:id', (req, res) => {
  const data = readData();
  if (!data.config) return res.status(400).json({ error: 'Configuração não encontrada' });
  const theme = data.config.themes.find(t => t.id === req.params.themeId);
  if (!theme) return res.status(404).json({ error: 'Tema não encontrado' });
  const cp = theme.checkpoints.find(c => c.id === req.params.id);
  if (!cp) return res.status(404).json({ error: 'Checkpoint não encontrado' });
  Object.assign(cp, req.body);
  writeData(data);
  res.json({ ok: true, checkpoint: cp });
});

// POST /api/oneOnOnes — registra 1:1
router.post('/oneOnOnes', (req, res) => {
  const data = readData();
  const entry = { id: genId(), ...req.body };
  data.oneOnOnes.push(entry);
  writeData(data);
  res.status(201).json(entry);
});

// DELETE /api/oneOnOnes/:id
router.delete('/oneOnOnes/:id', (req, res) => {
  const data = readData();
  data.oneOnOnes = data.oneOnOnes.filter(o => o.id !== req.params.id);
  writeData(data);
  res.json({ ok: true });
});

// POST /api/evidence — adiciona evidência
router.post('/evidence', (req, res) => {
  const data = readData();
  const entry = { id: genId(), ...req.body };
  data.evidence.push(entry);
  writeData(data);
  res.status(201).json(entry);
});

// DELETE /api/evidence/:id
router.delete('/evidence/:id', (req, res) => {
  const data = readData();
  data.evidence = data.evidence.filter(e => e.id !== req.params.id);
  writeData(data);
  res.json({ ok: true });
});

module.exports = router;
