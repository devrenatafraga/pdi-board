const pool = require('../pool');

async function findByPdi(pdiId) {
  const { rows } = await pool.query(
    'SELECT * FROM evidence WHERE pdi_id = $1 ORDER BY created_at DESC',
    [pdiId]
  );
  return rows;
}

async function create(pdiId, { title, url, checkpointId }) {
  const { rows } = await pool.query(
    'INSERT INTO evidence (pdi_id, checkpoint_id, title, url) VALUES ($1, $2, $3, $4) RETURNING *',
    [pdiId, checkpointId ?? null, title, url ?? '']
  );
  return rows[0];
}

async function remove(id, pdiId) {
  await pool.query(
    'DELETE FROM evidence WHERE id = $1 AND pdi_id = $2',
    [id, pdiId]
  );
}

module.exports = { findByPdi, create, remove };
