const pool = require('../pool');

async function findByPdi(pdiId) {
  const { rows } = await pool.query(
    'SELECT * FROM one_on_ones WHERE pdi_id = $1 ORDER BY date DESC',
    [pdiId]
  );
  return rows;
}

async function create(pdiId, { date, notes, themeId, checkpointId, points }) {
  const { rows } = await pool.query(
    'INSERT INTO one_on_ones (pdi_id, date, notes, theme_id, checkpoint_id, points) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
    [pdiId, date, notes ?? '', themeId ?? null, checkpointId ?? null, points ?? 0]
  );
  return rows[0];
}

async function remove(id, pdiId) {
  await pool.query(
    'DELETE FROM one_on_ones WHERE id = $1 AND pdi_id = $2',
    [id, pdiId]
  );
}

module.exports = { findByPdi, create, remove };
