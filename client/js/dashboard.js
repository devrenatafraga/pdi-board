/* dashboard.js — visão geral do PDI */

const Dashboard = (() => {
  function render(data) {
    const container = document.getElementById('dashboard-content');
    if (!container || !data.config) return;

    const { config } = data;
    const totalCps = config.themes.reduce((s, t) => s + t.checkpoints.length, 0);
    const totalDone = config.themes.reduce((s, t) => s + t.checkpoints.filter(c => c.status === 'done').length, 0);
    const totalPoints = config.themes.reduce((s, t) => s + t.checkpoints.reduce((ss, c) => ss + (c.points || 0), 0), 0);
    const overallPct = totalCps ? Math.round(totalDone / totalCps * 100) : 0;

    const startDate = new Date(config.startDate);
    const now = new Date();
    const daysElapsed = Math.floor((now - startDate) / (24 * 60 * 60 * 1000));
    const totalDays = totalCps * 14; // biweekly
    const daysLeft = Math.max(0, totalDays - daysElapsed);

    container.innerHTML = `
      <div class="dashboard-wrapper">
        <div class="dashboard-header">
          <div>
            <h1 class="dashboard-title">🎲 ${config.title || 'PDI Board'}</h1>
            <p class="text-muted">Início: ${formatDate(config.startDate)} · ${config.themes.length} tema${config.themes.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        <!-- KPI Row -->
        <div class="kpi-row">
          <div class="kpi-card">
            <div class="kpi-icon">⭐</div>
            <div class="kpi-value">${totalPoints}</div>
            <div class="kpi-label">Pontos Totais</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon">✅</div>
            <div class="kpi-value">${totalDone}<span class="kpi-denom">/${totalCps}</span></div>
            <div class="kpi-label">Checkpoints</div>
          </div>
          <div class="kpi-card kpi-pct">
            <div class="kpi-icon">📈</div>
            <div class="kpi-value">${overallPct}<span class="kpi-denom">%</span></div>
            <div class="kpi-label">Progresso Geral</div>
            <div class="kpi-bar">
              <div class="kpi-bar-fill" style="width:${overallPct}%"></div>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon">⏳</div>
            <div class="kpi-value">${daysLeft}</div>
            <div class="kpi-label">Dias Restantes</div>
          </div>
        </div>

        <!-- Theme Cards Grid -->
        <div class="dashboard-section-title">🎨 Temas em Andamento</div>
        <div class="theme-cards-grid">
          ${config.themes.map((t, i) => renderThemeCard(t, i, config)).join('')}
        </div>

        <!-- Next checkpoints -->
        <div class="dashboard-section-title">📅 Próximos Checkpoints</div>
        ${renderUpcoming(config)}
      </div>`;

    // Click theme card → navigate to board
    container.querySelectorAll('.theme-card[data-frame]').forEach(card => {
      card.onclick = () => App.navigate(card.dataset.frame);
    });
  }

  function renderThemeCard(theme, i, config) {
    const done = theme.checkpoints.filter(c => c.status === 'done').length;
    const inProgress = theme.checkpoints.filter(c => c.status === 'in-progress').length;
    const total = theme.checkpoints.length;
    const points = theme.checkpoints.reduce((s, c) => s + (c.points || 0), 0);
    const pct = total ? Math.round(done / total * 100) : 0;

    const nextCp = theme.checkpoints.find(c => c.status !== 'done');
    const startDate = new Date(config.startDate);
    const nextCpDate = nextCp ? (() => {
      const idx = theme.checkpoints.indexOf(nextCp);
      const d = new Date(startDate);
      d.setDate(d.getDate() + (idx + 1) * 14);
      return `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}`;
    })() : null;

    return `
      <div class="theme-card" data-frame="board-${i}" style="--tc:${theme.color}">
        <div class="theme-card-top">
          <div class="theme-card-dot" style="background:${theme.color}"></div>
          <div class="theme-card-name">${theme.name}</div>
          <div class="theme-card-points" style="color:${theme.color}">${points} pts</div>
        </div>
        <div class="theme-card-ring-row">
          <svg class="ring-svg" viewBox="0 0 56 56">
            <circle cx="28" cy="28" r="22" fill="none" stroke="var(--border)" stroke-width="6"/>
            <circle cx="28" cy="28" r="22" fill="none" stroke="${theme.color}" stroke-width="6"
              stroke-dasharray="${2 * Math.PI * 22}" stroke-dashoffset="${2 * Math.PI * 22 * (1 - pct/100)}"
              stroke-linecap="round" transform="rotate(-90 28 28)" style="transition:stroke-dashoffset 0.6s ease"/>
            <text x="28" y="33" text-anchor="middle" font-size="11" font-weight="800" fill="${theme.color}">${pct}%</text>
          </svg>
          <div class="theme-card-stats">
            <div class="tc-stat"><span class="tc-stat-icon">✅</span><span>${done}/${total} CPs</span></div>
            ${inProgress > 0 ? `<div class="tc-stat"><span class="tc-stat-icon">🔄</span><span>${inProgress} em progresso</span></div>` : ''}
            ${nextCp ? `<div class="tc-stat"><span class="tc-stat-icon">📅</span><span>Próximo: ${nextCpDate}</span></div>` : '<div class="tc-stat tc-done"><span>🏆 Concluído!</span></div>'}
          </div>
        </div>
        <div class="theme-card-bar">
          <div class="theme-card-bar-fill" style="width:${pct}%;background:${theme.color}"></div>
        </div>
        <div class="theme-card-cta">Ver board →</div>
      </div>`;
  }

  function renderUpcoming(config) {
    const items = [];
    const startDate = new Date(config.startDate);
    const now = new Date();

    config.themes.forEach(theme => {
      theme.checkpoints.forEach((cp, i) => {
        if (cp.status === 'done') return;
        const d = new Date(startDate);
        d.setDate(d.getDate() + (i + 1) * 14);
        items.push({ theme, cp, date: d, idx: i });
      });
    });

    items.sort((a, b) => a.date - b.date);
    const upcoming = items.slice(0, 6);

    if (upcoming.length === 0) {
      return `<div class="empty-state"><div class="empty-icon">🏆</div><p>Todos os checkpoints concluídos!</p></div>`;
    }

    return `<div class="upcoming-list">
      ${upcoming.map(({ theme, cp, date }) => {
        const isPast = date < now;
        const dateStr = `${date.getDate().toString().padStart(2,'0')}/${(date.getMonth()+1).toString().padStart(2,'0')}/${date.getFullYear()}`;
        const statusIcon = cp.status === 'in-progress' ? '🔄' : isPast ? '⚠️' : '📋';
        return `
          <div class="upcoming-item ${isPast && cp.status !== 'done' ? 'upcoming-overdue' : ''}">
            <div class="upcoming-date ${isPast ? 'past' : ''}">${dateStr}</div>
            <div class="upcoming-dot" style="background:${theme.color}"></div>
            <div class="upcoming-info">
              <div class="upcoming-theme" style="color:${theme.color}">${theme.name}</div>
              <div class="upcoming-cp">${statusIcon} ${cp.title}</div>
            </div>
            <div class="upcoming-status status-tag-${cp.status}">
              ${cp.status === 'in-progress' ? '🔄 Em progresso' : isPast ? '⚠️ Atrasado' : '📋 Planejado'}
            </div>
          </div>`;
      }).join('')}
    </div>`;
  }

  function formatDate(iso) {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  return { render };
})();
