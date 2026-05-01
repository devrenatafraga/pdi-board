const pool = require('../pool');
const { buildUpdateQuery } = require('../../lib/queryBuilder');

async function findByPdi(pdiId) {
  const { rows } = await pool.query(
    'SELECT * FROM themes WHERE pdi_id = $1 ORDER BY position ASC',
    [pdiId]
  );
  return rows;
}

async function findById(id) {
  const { rows } = await pool.query('SELECT * FROM themes WHERE id = $1', [id]);
  return rows[0] || null;
}

async function create(pdiId, { name, color, position, endDate }) {
  const { rows } = await pool.query(
    'INSERT INTO themes (pdi_id, name, color, position, end_date) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [pdiId, name, color, position ?? 0, endDate ?? null]
  );
  return rows[0];
}

async function update(id, fields) {
  const allowed = ['name', 'color', 'position', 'token_position', 'end_date'];
  const { sets, values } = buildUpdateQuery(fields, allowed);
  if (!sets.length) return findById(id);
  values.push(id);
  const { rows } = await pool.query(
    `UPDATE themes SET ${sets.join(', ')} WHERE id = $${values.length} RETURNING *`,
    values
  );
  return rows[0] || null;
}

async function remove(id) {
  await pool.query('DELETE FROM themes WHERE id = $1', [id]);
}

module.exports = { findByPdi, findById, create, update, remove };
