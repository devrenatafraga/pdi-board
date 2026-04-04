const pool = require('../pool');
const { buildUpdateQuery } = require('../../lib/queryBuilder');

async function findByTheme(themeId) {
  const { rows } = await pool.query(
    `SELECT * FROM checkpoints WHERE theme_id = $1 ORDER BY month ASC, biweekly ASC`,
    [themeId]
  );
  return rows;
}

async function findById(id) {
  const { rows } = await pool.query('SELECT * FROM checkpoints WHERE id = $1', [id]);
  return rows[0] || null;
}

async function bulkCreate(themeId, checkpoints) {
  const results = [];
  for (const cp of checkpoints) {
    const { rows } = await pool.query(
      `INSERT INTO checkpoints (theme_id, title, month, biweekly, type, status, points, notes, links)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [themeId, cp.title, cp.month, cp.biweekly, cp.type, cp.status ?? 'planned',
       cp.points ?? 0, cp.notes ?? '', JSON.stringify(cp.links ?? [])]
    );
    results.push(rows[0]);
  }
  return results;
}

async function update(id, fields) {
  const allowed = ['title', 'status', 'points', 'notes', 'links'];
  const { sets, values } = buildUpdateQuery(fields, allowed);

  // Handle JSON serialization for links field
  const finalValues = values.map((v, i) => {
    const fieldName = allowed[i];
    return fieldName === 'links' ? JSON.stringify(v) : v;
  });

  if (!sets.length) return findById(id);
  finalValues.push(id);
  const { rows } = await pool.query(
    `UPDATE checkpoints SET ${sets.join(', ')} WHERE id = $${finalValues.length} RETURNING *`,
    finalValues
  );
  return rows[0] || null;
}

module.exports = { findByTheme, findById, bulkCreate, update };
