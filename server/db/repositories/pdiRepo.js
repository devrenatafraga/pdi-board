const pool = require('../pool');

async function findByUser(clerkUserId) {
  const { rows } = await pool.query(
    'SELECT * FROM pdis WHERE clerk_user_id = $1 ORDER BY created_at DESC',
    [clerkUserId]
  );
  return rows;
}

async function findById(id, clerkUserId) {
  const { rows } = await pool.query(
    'SELECT * FROM pdis WHERE id = $1 AND clerk_user_id = $2',
    [id, clerkUserId]
  );
  return rows[0] || null;
}

async function create(clerkUserId, { title, startDate }) {
  const { rows } = await pool.query(
    'INSERT INTO pdis (clerk_user_id, title, start_date) VALUES ($1, $2, $3) RETURNING *',
    [clerkUserId, title, startDate]
  );
  return rows[0];
}

async function update(id, clerkUserId, fields) {
  const { rows } = await pool.query(
    `UPDATE pdis SET title = $1, start_date = $2 WHERE id = $3 AND clerk_user_id = $4 RETURNING *`,
    [fields.title, fields.startDate, id, clerkUserId]
  );
  return rows[0] || null;
}

async function remove(id, clerkUserId) {
  await pool.query(
    'DELETE FROM pdis WHERE id = $1 AND clerk_user_id = $2',
    [id, clerkUserId]
  );
}

module.exports = { findByUser, findById, create, update, remove };
