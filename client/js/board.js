/* board.js — renderização das trilhas */

const Board = (() => {
  const SQUARE_ICONS = {
    start: '🚀',
    normal: '⬜',
    bonus: '🎁',
    setback: '⚠️',
    milestone: '🏆',
  };
  const TYPE_LABELS = {
    start: 'Início',
    normal: 'Checkpoint',
    bonus: 'Bônus 🎁',
    setback: 'Retrocesso ⚠️',
    milestone: 'Milestone 🏆',
  };

  function renderBoard(themeIndex, config) {
    const theme = config.themes[themeIndex];
    const container = document.getElementById(`board-${themeIndex}`);
    if (!container) return;

    const doneCount = theme.checkpoints.filter(c => c.status === 'done').length;
    const totalPoints = theme.checkpoints.reduce((s, c) => s + (c.points || 0), 0);

    container.innerHTML = `
      <div class="board-header">
        <div>
          <h2><span class="board-theme-dot" style="background:${theme.color}"></span>${theme.name}</h2>
          <p class="board-subtitle">4 meses · 8 checkpoints · Início: ${formatDate(config.startDate)}</p>
        </div>
      </div>
      <div class="board-stats">
        <div class="stat-card">
          <div class="stat-label">Pontos</div>
          <div class="stat-value" style="color:${theme.color}">${totalPoints}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Concluídos</div>
          <div class="stat-value">${doneCount}/8</div>
        </div>
        <div class="stat-card" style="flex:2">
          <div class="stat-label">Progresso</div>
          <div class="progress-bar mt-2" style="margin-top:10px">
            <div class="progress-bar-fill" style="width:${Math.round(doneCount/8*100)}%; background:${theme.color}"></div>
          </div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:4px">${Math.round(doneCount/8*100)}%</div>
        </div>
      </div>
      <div class="board-track" id="track-${themeIndex}">
        ${renderTrack(theme, themeIndex)}
      </div>`;

    // bind clicks
    container.querySelectorAll('.square[data-cp-id]').forEach(el => {
      el.addEventListener('click', () => {
        const cpId = el.dataset.cpId;
        const cp = theme.checkpoints.find(c => c.id === cpId);
        openCheckpointModal(cp, theme, themeIndex, config);
      });
    });
  }

  function renderTrack(theme, themeIndex) {
    // Build full squares array: Start + 8 checkpoints + milestone (already in checkpoints as last)
    const startSquare = { id: `start-${themeIndex}`, type: 'start', title: 'Start', status: 'done', points: 0 };
    const allSquares = [startSquare, ...theme.checkpoints];

    // Group by month (start = month 0, then checkpoints)
    const months = [
      { label: '🚀 Início', squares: [startSquare] },
      { label: '📅 Mês 1', squares: theme.checkpoints.filter(c => c.month === 1) },
      { label: '📅 Mês 2', squares: theme.checkpoints.filter(c => c.month === 2) },
      { label: '📅 Mês 3', squares: theme.checkpoints.filter(c => c.month === 3) },
      { label: '📅 Mês 4', squares: theme.checkpoints.filter(c => c.month === 4) },
    ];

    return months.map((m, mi) => `
      <div class="month-row">
        <div class="month-label">${m.label}</div>
        <div class="month-squares" style="--theme-color:${theme.color}">
          ${m.squares.map((sq, si) => renderSquare(sq, theme, themeIndex, mi === 0 && si === 0)).join('')}
        </div>
      </div>
      ${mi < months.length - 1 ? `<div class="month-separator">↓</div>` : ''}
    `).join('');
  }

  function renderSquare(sq, theme, themeIndex, isStart) {
    const statusClass = isStart ? 'status-done' :
      sq.status === 'in-progress' ? 'status-progress' :
      sq.status === 'done' ? 'status-done' : 'status-planned';

    const borderStyle = sq.type === 'milestone' || sq.status === 'done'
      ? `border-color:${theme.color}; box-shadow: 0 0 0 3px ${theme.color}40, 0 2px 12px rgba(0,0,0,0.3);`
      : '';

    const isToken = sq.type === 'start';
    const attrs = sq.type !== 'start' ? `data-cp-id="${sq.id}"` : '';
    const clickable = sq.type !== 'start' ? '' : 'style="cursor:default"';

    return `
      <div class="square type-${sq.type} ${statusClass}" ${attrs} ${clickable} title="${sq.title}">
        <div class="square-icon" style="${borderStyle}">
          ${SQUARE_ICONS[sq.type] || '⬜'}
          ${isStart ? `<div class="token" id="token-${themeIndex}" draggable="true">🎯</div>` : ''}
        </div>
        <div class="square-label">${sq.title}</div>
        ${sq.type !== 'start' ? `<div class="square-points${sq.points > 0 ? ' has-points' : ''}">${sq.points > 0 ? `+${sq.points}pts` : ''}</div>` : ''}
      </div>`;
  }

  function openCheckpointModal(cp, theme, themeIndex, config) {
    const modal = document.getElementById('checkpoint-modal');
    const content = document.getElementById('checkpoint-modal-content');
    let localCp = { ...cp };

    function renderModalContent() {
      content.innerHTML = `
        <div class="cp-modal-header">
          <div class="cp-modal-icon">${SQUARE_ICONS[cp.type] || '⬜'}</div>
          <div class="cp-modal-meta">
            <div class="cp-type">${TYPE_LABELS[cp.type]} · Mês ${cp.month}</div>
            <h2>${cp.title}</h2>
          </div>
        </div>
        <div class="form-group">
          <label>Título do Checkpoint</label>
          <input type="text" id="cp-title" value="${localCp.title}" />
        </div>
        <div class="form-group mt-2">
          <label>Status</label>
          <div class="status-buttons">
            <button class="status-btn ${localCp.status === 'planned' ? 'active-planned' : ''}" data-status="planned">📋 Planejado</button>
            <button class="status-btn ${localCp.status === 'in-progress' ? 'active-progress' : ''}" data-status="in-progress">🔄 Em Progresso</button>
            <button class="status-btn ${localCp.status === 'done' ? 'active-done' : ''}" data-status="done">✅ Concluído</button>
          </div>
        </div>
        <div class="form-group mt-2">
          <label>Pontos</label>
          <input type="number" id="cp-points" value="${localCp.points}" min="0" max="100" />
        </div>
        <div class="form-group mt-2">
          <label>Notas da reunião</label>
          <textarea id="cp-notes">${localCp.notes || ''}</textarea>
        </div>
        <div class="modal-actions">
          <button class="btn btn-ghost btn-sm" id="cp-modal-cancel">Cancelar</button>
          <button class="btn btn-primary" id="cp-modal-save" style="background:${theme.color}">💾 Salvar</button>
        </div>`;

      // status buttons
      content.querySelectorAll('.status-btn').forEach(btn => {
        btn.onclick = () => {
          localCp.status = btn.dataset.status;
          content.querySelectorAll('.status-btn').forEach(b => {
            b.classList.remove('active-planned', 'active-progress', 'active-done');
          });
          btn.classList.add(`active-${localCp.status === 'in-progress' ? 'progress' : localCp.status}`);
        };
      });

      document.getElementById('cp-modal-cancel').onclick = closeModal;
      document.getElementById('cp-modal-save').onclick = async () => {
        localCp.title = document.getElementById('cp-title').value.trim() || cp.title;
        localCp.points = parseInt(document.getElementById('cp-points').value) || 0;
        localCp.notes = document.getElementById('cp-notes').value;
        await API.put(`/checkpoints/${theme.id}/${cp.id}`, localCp);
        closeModal();
        // Refresh board
        const data = await API.get('/data');
        App.setData(data);
        renderBoard(themeIndex, data.config);
        Scoreboard.render(data);
      };
    }

    renderModalContent();
    modal.classList.remove('hidden');
    document.getElementById('close-checkpoint-modal').onclick = closeModal;
    modal.onclick = e => { if (e.target === modal) closeModal(); };

    function closeModal() { modal.classList.add('hidden'); }
  }

  function formatDate(iso) {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  return {
    renderAll(config) {
      config.themes.forEach((_, i) => renderBoard(i, config));
      updateNavLabels(config);
    },
    renderBoard,
  };

  function updateNavLabels(config) {
    const colorEmojis = ['🟦', '🟩', '🟧'];
    config.themes.forEach((t, i) => {
      const btn = document.querySelector(`.nav-btn[data-frame="board-${i}"]`);
      if (btn) btn.textContent = `${colorEmojis[i]} ${t.name || `Tema ${i+1}`}`;
    });
  }
})();
