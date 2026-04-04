const { getUserId } = require('../lib/authHelper');
const { calculateThemeStats, calculateTotalStats, getStatusLabel, getTypeLabel } = require('../lib/reportStats');
const { buildUpdateQuery } = require('../lib/queryBuilder');

describe('lib/authHelper', () => {
  it('getUserId returns userId from req.auth', () => {
    const req = { auth: { userId: 'user-123' } };
    expect(getUserId(req)).toBe('user-123');
  });

  it('getUserId returns null when req.auth is undefined', () => {
    const req = {};
    expect(getUserId(req)).toBeNull();
  });

  it('getUserId returns null when req.auth.userId is undefined', () => {
    const req = { auth: {} };
    expect(getUserId(req)).toBeNull();
  });
});

describe('lib/reportStats', () => {
  describe('calculateThemeStats', () => {
    it('calculates done count and total points for a theme', () => {
      const checkpoints = [
        { status: 'done', points: 10 },
        { status: 'done', points: 5 },
        { status: 'planned', points: 0 },
      ];
      const result = calculateThemeStats(checkpoints);
      expect(result).toEqual({ done: 2, points: 15, total: 3 });
    });

    it('handles empty checkpoints', () => {
      const result = calculateThemeStats([]);
      expect(result).toEqual({ done: 0, points: 0, total: 0 });
    });

    it('handles null points', () => {
      const checkpoints = [
        { status: 'done', points: null },
        { status: 'done', points: undefined },
      ];
      const result = calculateThemeStats(checkpoints);
      expect(result).toEqual({ done: 2, points: 0, total: 2 });
    });
  });

  describe('calculateTotalStats', () => {
    it('calculates aggregate stats across all themes', () => {
      const themes = [
        {
          checkpoints: [
            { status: 'done', points: 10 },
            { status: 'planned', points: 0 },
          ],
        },
        {
          checkpoints: [
            { status: 'done', points: 5 },
            { status: 'in-progress', points: 8 },
          ],
        },
      ];
      const result = calculateTotalStats(themes);
      expect(result).toEqual({ totalCheckpoints: 4, totalDone: 2, totalPoints: 23 });
    });

    it('handles empty themes', () => {
      const result = calculateTotalStats([]);
      expect(result).toEqual({ totalCheckpoints: 0, totalDone: 0, totalPoints: 0 });
    });
  });

  describe('getStatusLabel', () => {
    it('returns localized status for known statuses', () => {
      expect(getStatusLabel('planned')).toBe('Planejado');
      expect(getStatusLabel('in-progress')).toBe('Em Progresso');
      expect(getStatusLabel('done')).toBe('Concluído');
    });

    it('returns original status for unknown statuses', () => {
      expect(getStatusLabel('unknown')).toBe('unknown');
    });
  });

  describe('getTypeLabel', () => {
    it('returns localized type for known types', () => {
      expect(getTypeLabel('normal')).toBe('Checkpoint');
      expect(getTypeLabel('bonus')).toBe('Bônus');
      expect(getTypeLabel('milestone')).toBe('Milestone');
    });

    it('returns original type for unknown types', () => {
      expect(getTypeLabel('unknown')).toBe('unknown');
    });
  });
});

describe('lib/queryBuilder', () => {
  describe('buildUpdateQuery', () => {
    it('builds UPDATE query with allowed fields', () => {
      const fields = { name: 'New Name', color: '#fff', invalid: 'ignored' };
      const allowed = ['name', 'color'];
      const result = buildUpdateQuery(fields, allowed);
      expect(result.sets).toEqual(['name = $1', 'color = $2']);
      expect(result.values).toEqual(['New Name', '#fff']);
    });

    it('ignores fields not in allowed list', () => {
      const fields = { name: 'New', secret: 'hacked' };
      const allowed = ['name'];
      const result = buildUpdateQuery(fields, allowed);
      expect(result.sets).toHaveLength(1);
      expect(result.values).toHaveLength(1);
    });

    it('handles undefined fields', () => {
      const fields = { name: undefined, color: '#fff' };
      const allowed = ['name', 'color'];
      const result = buildUpdateQuery(fields, allowed);
      expect(result.sets).toEqual(['color = $1']);
      expect(result.values).toEqual(['#fff']);
    });

    it('returns empty sets and values when no fields match', () => {
      const fields = { secret: 'ignored' };
      const allowed = ['name', 'color'];
      const result = buildUpdateQuery(fields, allowed);
      expect(result.sets).toEqual([]);
      expect(result.values).toEqual([]);
    });

    it('increments parameter placeholders correctly', () => {
      const fields = { a: '1', b: '2', c: '3' };
      const allowed = ['a', 'b', 'c'];
      const result = buildUpdateQuery(fields, allowed);
      expect(result.sets).toEqual(['a = $1', 'b = $2', 'c = $3']);
    });
  });
});

