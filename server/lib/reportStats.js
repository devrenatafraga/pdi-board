/**
 * Report statistics calculations and labels
 */

const STATUS_LABELS = {
  planned: 'Planejado',
  'in-progress': 'Em Progresso',
  done: 'Concluído'
};

const TYPE_LABELS = {
  normal: 'Checkpoint',
  bonus: 'Bônus',
  setback: 'Retrocesso',
  milestone: 'Milestone',
  start: 'Início'
};

function calculateThemeStats(checkpoints) {
  const done = checkpoints.filter(c => c.status === 'done').length;
  const points = checkpoints.reduce((sum, c) => sum + (c.points || 0), 0);
  return { done, points, total: checkpoints.length };
}

function calculateTotalStats(themes) {
  const totalCheckpoints = themes.reduce((sum, t) => sum + t.checkpoints.length, 0);
  const totalDone = themes.reduce((sum, t) => sum + t.checkpoints.filter(c => c.status === 'done').length, 0);
  const totalPoints = themes.reduce((sum, t) => sum + t.checkpoints.reduce((a, c) => a + (c.points || 0), 0), 0);
  return { totalCheckpoints, totalDone, totalPoints };
}

function getStatusLabel(status) {
  return STATUS_LABELS[status] || status;
}

function getTypeLabel(type) {
  return TYPE_LABELS[type] || type;
}

module.exports = {
  STATUS_LABELS,
  TYPE_LABELS,
  calculateThemeStats,
  calculateTotalStats,
  getStatusLabel,
  getTypeLabel,
};

