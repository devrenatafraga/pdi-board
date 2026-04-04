/**
 * Dynamic UPDATE query builder for parameterized queries
 */

function buildUpdateQuery(fields, allowed) {
  const sets = [];
  const values = [];

  allowed.forEach(key => {
    if (fields[key] !== undefined) {
      sets.push(`${key} = $${values.length + 1}`);
      values.push(fields[key]);
    }
  });

  return { sets, values };
}

module.exports = { buildUpdateQuery };

