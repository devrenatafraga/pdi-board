/* board.js - renders dynamic board tracks */

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

  const BASE_POINTS = { normal: 10, bonus: 15, milestone: 25, setback: -5, start: 0 };

  function calcPoints(type, status, notes, links) {
    const base = BASE_POINTS[type] ?? 0;
    if (status === 'planned') return 0;
    const linkCount = Math.min((links || []).filter(l => l.trim()).length, 3);
    const hasNotes = (notes || '').trim().length > 0;
    if (status === 'in-progress') return Math.max(0, Math.round(base / 2));
    if (type === 'setback') return base;
    return base + (hasNotes ? 2 : 0) + linkCount * 3;
  }

  function renderBoard(themeIndex, config) {
    const theme = config.themes[themeIndex];
    const container = document.getElementById(`board-${themeIndex}`);
    if (!container) return;

    const totalCps = theme.checkpoints.length;
    const doneCount = theme.checkpoints.filter(c => c.status === 'done').length;
    const totalPoints = theme.checkpoints.reduce((s, c) => s + (c.points || 0), 0);
    const pct = totalCps ? Math.round(doneCount / totalCps * 100) : 0;

    const endDateDisplay = theme.endDate ? `Fim: ${formatDate(theme.endDate)} · ` : '';

    container.innerHTML = `
      <div class="board-header">
        <div>
          <h2><span class="board-theme-dot" style="background:${theme.color}"></span>${theme.name}</h2>
          <p class="board-subtitle">${totalCps} checkpoints · Início: ${formatDate(config.startDate)} · ${endDateDisplay}Gerado: ${new Date().toLocaleDateString('pt-BR')}</p>
        </div>
        <button class="btn btn-ghost btn-sm" id="edit-theme-btn-${themeIndex}" title="Editar tema">⚙️</button>
      </div>
      <div class="board-stats">
        <div class="stat-card">
          <div class="stat-label">Pontos</div>
          <div class="stat-value" style="color:${theme.color}">${totalPoints}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Concluídos</div>
          <div class="stat-value">${doneCount}/${totalCps}</div>
        </div>
        <div class="stat-card" style="flex:2">
          <div class="stat-label">Progresso</div>
          <div class="progress-bar mt-2" style="margin-top:10px">
            <div class="progress-bar-fill" style="width:${pct}%; background:${theme.color}"></div>
          </div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:4px">${pct}%</div>
        </div>
      </div>
      <div class="progress-line-wrap">
        ${renderTimeline(theme, config)}
      </div>
      <div class="board-track" id="track-${themeIndex}" style="--theme-color:${theme.color}">
        ${renderTrack(theme, themeIndex)}
      </div>`;

    // Draw after layout so geometry is available when frame becomes visible.
    requestAnimationFrame(() => drawTrackPath(themeIndex));

    const editBtn = document.getElementById(`edit-theme-btn-${themeIndex}`);
    if (editBtn) {
      editBtn.onclick = () => openThemeModal(theme, themeIndex, config);
    }

    container.querySelectorAll('.square[data-cp-id]').forEach(el => {
      el.addEventListener('click', () => {
        const cp = theme.checkpoints.find(c => c.id === el.dataset.cpId);
        openCheckpointModal(cp, theme, themeIndex, config);
      });
    });
  }

  function drawTrackPath(themeIndex) {
    const track = document.getElementById(`track-${themeIndex}`);
    if (!track) return;

    track.querySelector('.board-path-svg')?.remove();
    track.classList.remove('has-svg-path');

    const trackRect = track.getBoundingClientRect();
    // Hidden frames have zero geometry; redraw on navigation/resize.
    if (!trackRect.width || !trackRect.height) return;

    const rows = [...track.querySelectorAll('.month-row')];
    const rowsPoints = rows.map((row) => {
      const monthSquares = row.querySelector('.month-squares');
      if (!monthSquares) return [];

      const reversed = monthSquares.classList.contains('month-squares-reversed');
      const points = [...monthSquares.querySelectorAll('.square')].map((sq) => {
        const icon = sq.querySelector('.square-icon');
        const rect = (icon || sq).getBoundingClientRect();
        return {
          x: rect.left + rect.width / 2 - trackRect.left,
          y: rect.top + rect.height / 2 - trackRect.top,
        };
      });

      points.sort((a, b) => reversed ? b.x - a.x : a.x - b.x);
      return points;
    }).filter((p) => p.length);

    if (!rowsPoints.length) return;

    let d = '';
    const first = rowsPoints[0][0];
    d += `M ${first.x} ${first.y}`;

    for (let r = 0; r < rowsPoints.length; r++) {
      const row = rowsPoints[r];

      for (let i = 1; i < row.length; i++) {
        d += ` L ${row[i].x} ${row[i].y}`;
      }

      const nextRow = rowsPoints[r + 1];
      if (!nextRow) continue;

      const from = row[row.length - 1];
      const to = nextRow[0];
      const cp1x = from.x + (to.x - from.x) * 0.25;
      const cp2x = from.x + (to.x - from.x) * 0.75;
      d += ` C ${cp1x} ${from.y}, ${cp2x} ${to.y}, ${to.x} ${to.y}`;
    }

    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('class', 'board-path-svg');
    svg.setAttribute('viewBox', `0 0 ${Math.max(track.clientWidth, 1)} ${Math.max(track.clientHeight, 1)}`);
    svg.setAttribute('preserveAspectRatio', 'none');

    const path = document.createElementNS(svgNS, 'path');
    path.setAttribute('class', 'board-path-line');
    path.setAttribute('d', d);

    svg.appendChild(path);
    track.prepend(svg);
    track.classList.add('has-svg-path');
  }

  function redrawVisiblePath(frameId) {
    if (typeof frameId === 'string' && frameId.startsWith('board-')) {
      const idx = parseInt(frameId.replace('board-', ''), 10);
      if (!Number.isNaN(idx)) drawTrackPath(idx);
      return;
    }

    document.querySelectorAll('.frame[id^="frame-board-"]:not(.hidden)').forEach((frame) => {
      if (!frame.classList.contains('active')) return;
      const idx = parseInt(frame.id.replace('frame-board-', ''), 10);
      if (!Number.isNaN(idx)) drawTrackPath(idx);
    });
  }

  let _resizeBound = false;
  function bindPathResizeListener() {
    if (_resizeBound) return;
    _resizeBound = true;
    window.addEventListener('resize', () => {
      requestAnimationFrame(() => redrawVisiblePath());
    });
  }

  function renderTrack(theme, themeIndex) {
    const startSquare = { id: `start-${themeIndex}`, type: 'start', title: 'Start', status: 'done', points: 0 };

    const totalCps = theme.checkpoints.length;
    const months = [{ label: '🚀 Início', squares: [startSquare] }];
    const monthSet = [...new Set(theme.checkpoints.map(c => c.month))].sort((a, b) => a - b);
    monthSet.forEach(m => {
      months.push({
        label: `📅 Mês ${m}`,
        squares: theme.checkpoints.filter(c => c.month === m),
      });
    });

    let posCounter = 0;

    return months.map((m, mi) => {
      const isStartRow = mi === 0;
      const isReversed = !isStartRow && ((mi - 1) % 2 === 1);
      const connector = mi < months.length - 1;
      const connectorOnRight = !isReversed;

      const squaresHtml = m.squares.map((sq, si) => {
        const pos = posCounter++;
        return renderSquare(sq, theme, themeIndex, mi === 0 && si === 0, pos);
      }).join('');

      return `
        <div class="month-row">
          <div class="month-label">${m.label}</div>
          <div class="month-squares${isReversed ? ' month-squares-reversed' : ''}">
            ${squaresHtml}
          </div>
        </div>
        ${connector ? `
          <div class="month-connector ${connectorOnRight ? 'connector-right' : 'connector-left'}"></div>` : ''}
      `;
    }).join('');
  }

  function renderSquare(sq, theme, themeIndex, isStart, pos) {
    const statusClass = isStart ? 'status-done' :
      sq.status === 'in-progress' ? 'status-progress' :
      sq.status === 'done' ? 'status-done' : 'status-planned';

    const attrs = sq.type !== 'start' ? `data-cp-id="${sq.id}"` : '';
    const cursorStyle = sq.type === 'start' ? 'style="cursor:default"' : '';
    const doneMarker = !isStart && sq.status === 'done'
      ? `<div class="square-status-mark${sq.type === 'setback' ? ' is-negative' : ''}" aria-label="Concluído">${sq.type === 'setback' ? '✕' : '✓'}</div>`
      : '';

    return `
      <div class="square type-${sq.type} ${statusClass}" ${attrs} ${cursorStyle} title="${sq.title}" style="--sq-color:${theme.color}">
        <div class="square-pos">${pos === 0 ? '🏁' : pos}</div>
        <div class="square-icon">
          <span class="square-icon-inner">${SQUARE_ICONS[sq.type] || '⬜'}</span>
          ${doneMarker}
        </div>
        <div class="square-label">${sq.title}</div>
        ${sq.type !== 'start' ? `<div class="square-points${sq.points > 0 ? ' has-points' : sq.points < 0 ? ' neg-points' : ''}">${sq.points !== 0 ? `${sq.points > 0 ? '+' : ''}${sq.points}pts` : ''}</div>` : ''}
      </div>`;
  }

  function renderTimeline(theme, config) {
    const totalCps = theme.checkpoints.length;
    const done = theme.checkpoints.filter(c => c.status === 'done').length;
    const startDate = new Date(config.startDate);
    const now = new Date();
    const weeksSinceStart = Math.floor((now - startDate) / (7 * 24 * 60 * 60 * 1000));
    const expected = Math.min(totalCps, Math.max(0, Math.floor(weeksSinceStart / 2)));
    const delay = expected - done;
    const level = delay <= 0 ? 'ok' : delay === 1 ? 'warning' : 'danger';
    const statusText = level === 'ok' ? '✅ No prazo' : level === 'warning' ? '⚠️ 1 CP atrasado' : `🔴 ${delay} CPs atrasados`;
    const progressPct = totalCps ? Math.round((done / totalCps) * 100) : 0;

    // Generate biweekly dates
    const cpDates = Array.from({ length: totalCps }, (_, i) => {
      const d = new Date(startDate);
      d.setDate(d.getDate() + (i + 1) * 14);
      return d;
    });

    const dots = [{ pos: 0, label: 'Start', date: startDate, done: true, isStart: true }, 
                  ...theme.checkpoints.map((cp, i) => ({
                    pos: i + 1,
                    label: `CP${i + 1}`,
                    date: cpDates[i],
                    done: cp.status === 'done',
                    inProgress: cp.status === 'in-progress',
                    overdue: i + 1 <= expected && cp.status !== 'done',
                    isCurrent: i + 1 === done + 1,
                    isStart: false,
                  }))
    ];

    const dotsHtml = dots.map(d => {
      const classes = ['progress-dot-wrap'];
      const dotClasses = ['progress-dot'];
      if (d.done) dotClasses.push('done');
      if (d.inProgress) dotClasses.push('in-progress');
      if (d.overdue && !d.done) dotClasses.push('overdue');
      if (d.isCurrent) dotClasses.push('current');

      const dateStr = d.isStart ? formatDate(config.startDate) :
        `${d.date.getDate().toString().padStart(2,'0')}/${(d.date.getMonth()+1).toString().padStart(2,'0')}`;

      return `
        <div class="${classes.join(' ')}">
          ${d.isCurrent ? `<div class="progress-rocket">🚀</div>` : '<div style="height:22px"></div>'}
          <div class="${dotClasses.join(' ')}" style="${d.done ? `background:${theme.color};border-color:${theme.color}` : ''}">
            ${d.isStart ? '🏁' : d.pos}
            ${d.overdue && !d.done ? `<span class="progress-warn-badge">⚠️</span>` : ''}
          </div>
          <div class="progress-dot-num">${d.label}</div>
          <div class="progress-dot-date">${dateStr}</div>
        </div>`;
    }).join('');

    return `
      <div class="progress-line">
        <div class="progress-line-header">
          <span class="progress-line-title">📍 Timeline de Checkpoints</span>
          <span class="progress-status status-${level}">${statusText}</span>
        </div>
        <div class="progress-track" style="--theme-color:${theme.color};--progress-width:${progressPct}%">
          ${dotsHtml}
        </div>
      </div>`;
  }

  function openThemeModal(theme, themeIndex, config) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content" style="max-width:400px">
        <div class="modal-header">
          <h2>Editar Tema</h2>
          <button class="modal-close-btn">✕</button>
        </div>
        <div class="form-group">
          <label>Nome do Tema</label>
          <input type="text" id="theme-name-edit" value="${theme.name}" />
        </div>
        <div class="form-group">
          <label>Cor</label>
          <input type="color" id="theme-color-edit" value="${theme.color}" />
        </div>
        <div class="form-group">
          <label>Data Final (opcional)</label>
          <input type="date" id="theme-end-date-edit" value="${theme.endDate || ''}" />
        </div>
        <div class="modal-actions">
          <button class="btn btn-ghost btn-sm" id="theme-modal-cancel">Cancelar</button>
          <button class="btn btn-primary" id="theme-modal-save" style="background:${theme.color}">💾 Salvar</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const closeModal = () => modal.remove();

    document.querySelector('.modal-close-btn', modal).onclick = closeModal;
    document.getElementById('theme-modal-cancel').onclick = closeModal;

    document.getElementById('theme-modal-save').onclick = async () => {
      const newName = document.getElementById('theme-name-edit').value.trim() || theme.name;
      const newColor = document.getElementById('theme-color-edit').value;
      const newEndDate = document.getElementById('theme-end-date-edit').value;

      await API.put(`/themes/${theme.id}`, {
        name: newName,
        color: newColor,
        endDate: newEndDate,
      });

      closeModal();
      const data = await API.get('/data');
      App.setData(data);
      renderBoard(themeIndex, data.config);
      Scoreboard.render(data);
      Dashboard.render(data);
    };

    modal.onclick = e => { if (e.target === modal) closeModal(); };
  }

  function openCheckpointModal(cp, theme, themeIndex, config) {
    const modal = document.getElementById('checkpoint-modal');
    const content = document.getElementById('checkpoint-modal-content');
    let localCp = { ...cp };

    function renderModalContent() {
      const pts = calcPoints(cp.type, localCp.status, localCp.notes, localCp.links);
      const linkList = localCp.links || [];

      function pointsBreakdown() {
        if (localCp.status === 'planned') return '<span class="pts-muted">Nenhum ponto ainda</span>';
        const base = BASE_POINTS[cp.type] ?? 0;
        const hasNotes = (localCp.notes || '').trim().length > 0;
        const linkCount = Math.min((localCp.links || []).filter(l => l.trim()).length, 3);
        if (localCp.status === 'in-progress') return `Base (${cp.type}): <b>${Math.max(0, Math.round(base/2))}</b> <span class="pts-muted">(em progresso = metade)</span>`;
        if (cp.type === 'setback') return `Retrocesso concluído: <b>${base} pts</b>`;
        const parts = [`Base (${TYPE_LABELS[cp.type]}): <b>+${base}</b>`];
        if (hasNotes) parts.push('Notas: <b>+2</b>');
        if (linkCount > 0) parts.push(`Links (${linkCount}x): <b>+${linkCount * 3}</b>`);
        return parts.join(' · ');
      }

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
          <label>Notas da reunião</label>
          <textarea id="cp-notes">${localCp.notes || ''}</textarea>
        </div>
        <div class="form-group mt-2">
          <label>Links &amp; Evidências <span class="pts-muted">(+3 pts cada, máx. 3)</span></label>
          <div id="cp-links-list">
            ${linkList.map((l, i) => `
              <div class="link-row" data-idx="${i}">
                <input type="url" class="cp-link-input" value="${l}" placeholder="https://..." />
                <button class="btn btn-ghost btn-sm cp-link-remove" data-idx="${i}">✕</button>
              </div>`).join('')}
          </div>
          ${linkList.length < 3 ? `<button class="btn btn-ghost btn-sm mt-2" id="cp-add-link">＋ Adicionar link</button>` : ''}
        </div>
        <div class="auto-score-box" style="border-color:${theme.color}40">
          <span class="auto-score-label">⭐ Pontuação automática</span>
          <span class="auto-score-value" id="auto-score-value" style="color:${theme.color}">${pts > 0 ? '+' : ''}${pts} pts</span>
          <div class="auto-score-breakdown" id="auto-score-breakdown">${pointsBreakdown()}</div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-ghost btn-sm" id="cp-modal-cancel">Cancelar</button>
          <button class="btn btn-primary" id="cp-modal-save" style="background:${theme.color}">💾 Salvar</button>
        </div>`;

      function refreshScore() {
        localCp.notes = document.getElementById('cp-notes').value;
        localCp.links = [...document.querySelectorAll('.cp-link-input')].map(i => i.value);
        const newPts = calcPoints(cp.type, localCp.status, localCp.notes, localCp.links);
        document.getElementById('auto-score-value').textContent = `${newPts > 0 ? '+' : ''}${newPts} pts`;
        document.getElementById('auto-score-breakdown').innerHTML = pointsBreakdown();
      }

      content.querySelectorAll('.status-btn').forEach(btn => {
        btn.onclick = () => {
          localCp.status = btn.dataset.status;
          content.querySelectorAll('.status-btn').forEach(b => b.classList.remove('active-planned', 'active-progress', 'active-done'));
          btn.classList.add(`active-${localCp.status === 'in-progress' ? 'progress' : localCp.status}`);
          refreshScore();
        };
      });

      document.getElementById('cp-notes').oninput = refreshScore;

      const addLinkBtn = document.getElementById('cp-add-link');
      if (addLinkBtn) {
        addLinkBtn.onclick = () => {
          localCp.links = [...document.querySelectorAll('.cp-link-input')].map(i => i.value);
          localCp.links.push('');
          renderModalContent();
        };
      }

      content.querySelectorAll('.cp-link-remove').forEach(btn => {
        btn.onclick = () => {
          localCp.links = [...document.querySelectorAll('.cp-link-input')].map(i => i.value);
          localCp.links.splice(parseInt(btn.dataset.idx), 1);
          renderModalContent();
        };
      });

      content.querySelectorAll('.cp-link-input').forEach(inp => { inp.oninput = refreshScore; });

      document.getElementById('cp-modal-cancel').onclick = closeModal;
      document.getElementById('cp-modal-save').onclick = async () => {
        localCp.title = document.getElementById('cp-title').value.trim() || cp.title;
        localCp.notes = document.getElementById('cp-notes').value;
        localCp.links = [...document.querySelectorAll('.cp-link-input')].map(l => l.value.trim()).filter(Boolean);
        localCp.points = calcPoints(cp.type, localCp.status, localCp.notes, localCp.links);
        await API.put(`/checkpoints/${theme.id}/${cp.id}`, localCp);
        closeModal();
        const data = await API.get('/data');
        App.setData(data);
        renderBoard(themeIndex, data.config);
        Scoreboard.render(data);
        Dashboard.render(data);
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

  function ensureBoardFrames(config) {
    const main = document.getElementById('main-frames');
    main.querySelectorAll('.frame[id^="frame-board-"]').forEach(el => el.remove());
    const instructionsFrame = document.getElementById('frame-instructions');
    config.themes.forEach((_, i) => {
      const section = document.createElement('section');
      section.id = `frame-board-${i}`;
      section.className = 'frame';
      section.innerHTML = `<div class="board-wrapper" id="board-${i}"></div>`;
      instructionsFrame.insertAdjacentElement('afterend', section);
    });
  }

  function updateNavTabs(config) {
    const navTabs = document.getElementById('nav-tabs');
    navTabs.querySelectorAll('li[data-board-tab]').forEach(el => el.remove());
    const instructionsBtn = navTabs.querySelector('[data-frame="instructions"]');
    const instructionsLi = instructionsBtn ? instructionsBtn.closest('li') : null;
    let insertAfter = instructionsLi;
    config.themes.forEach((t, i) => {
      const li = document.createElement('li');
      li.setAttribute('data-board-tab', i);
      const btn = document.createElement('button');
      btn.className = 'nav-btn nav-theme-btn';
      btn.dataset.frame = `board-${i}`;
      btn.innerHTML = `<span class="nav-dot" style="background:${t.color}"></span>${t.name || `Tema ${i+1}`}`;
      li.appendChild(btn);
      if (insertAfter) {
        insertAfter.insertAdjacentElement('afterend', li);
        insertAfter = li;
      } else {
        navTabs.appendChild(li);
      }
    });
    navTabs.querySelectorAll('.nav-btn').forEach(btn => {
      btn.onclick = () => App.navigate(btn.dataset.frame);
    });
  }

  return {
    renderAll(config) {
      bindPathResizeListener();
      ensureBoardFrames(config);
      updateNavTabs(config);
      config.themes.forEach((_, i) => renderBoard(i, config));
    },
    redrawVisiblePath,
    renderBoard,
    calcPoints,
  };
})();
