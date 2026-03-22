const pool = require('../pool');

async function findByPdi(pdiId) {
  const { rows } = await pool.query(
    'SELECT * FROM one_on_ones WHERE pdi_id = $1 ORDER BY created_at DESC',
    [pdiId]
  );
  return rows;
}

async function create(pdiId, { date, notes }) {
  const { rows } = await pool.query(
    'INSERT INTO one_on_ones (pdi_id, date, notes) VALUES ($1, $2, $3) RETURNING *',
    [pdiId, date, notes ?? '']
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
