/* app.js - app bootstrap, navigation, and theme mode */

const App = (() => {
  let _data = null;

  function _diag(method, message, details) {
    const mappedMethod = method === 'log' ? 'info' : method;
    if (typeof Logger !== 'undefined' && typeof Logger[mappedMethod] === 'function') {
      Logger[mappedMethod](message, details);
    }
  }

  function setData(data) { _data = data; }

  async function init() {
    _diag('log', 'app.init:start');
    try {
      const data = await API.get('/data');
      _diag('log', 'app.init:data-loaded', { hasConfig: Boolean(data && data.config) });
      _data = data;

      if (!data.config) {
        _diag('warn', 'app.init:no-config');
        Setup.show();
        return;
      }

      showApp(data);
    } catch (err) {
      Logger.error('[App] Failed to load data', { message: err && err.message });
      _diag('error', 'app.init:failed', { message: err && err.message });
      const loginScreen = document.getElementById('login-screen');
      if (loginScreen) {
        loginScreen.classList.remove('hidden');
        loginScreen.innerHTML = `
          <div class="login-card">
            <div class="login-logo">⚠️</div>
            <h1 class="login-title">Authentication Error</h1>
            <p class="login-subtitle">${err.message}</p>
            <button class="btn-google-signin" onclick="location.reload()">Try Again</button>
            <p class="login-hint">If the issue persists, sign out and sign in again.</p>
          </div>`;
      }
    }
  }

  function showApp(data) {
    _diag('log', 'app.showApp:start', { themeCount: data.config.themes.length });
    document.getElementById('setup-overlay').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');

    Board.renderAll(data.config);
    Token.init(data.config);
    Dashboard.render(data);
    Scoreboard.render(data);
    Evidence.render(data);
    Reports.render(data.config);
    renderInstructions(data.config);

    document.querySelectorAll('.nav-btn[data-frame]:not([data-frame^="board-"])').forEach(btn => {
      btn.onclick = () => navigate(btn.dataset.frame);
    });

    document.getElementById('btn-reset-config').onclick = () => {
      if (confirm('⚠️ Isso vai iniciar o setup novamente. Os dados do board serão mantidos, mas a configuração será sobrescrita. Continuar?')) {
        document.getElementById('app').classList.add('hidden');
        Setup.show();
      }
    };

    initThemeToggle();

    navigate('dashboard');
    _diag('log', 'app.showApp:done');
  }

  function navigate(frameId) {
    document.querySelectorAll('.frame').forEach(f => f.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    const frame = document.getElementById(`frame-${frameId}`);
    if (frame) frame.classList.add('active');
    const btn = document.querySelector(`.nav-btn[data-frame="${frameId}"]`);
    if (btn) btn.classList.add('active');

    if (frameId && frameId.startsWith('board-') && typeof Board !== 'undefined' && typeof Board.redrawVisiblePath === 'function') {
      // Draw after frame becomes visible to avoid collapsed geometry.
      requestAnimationFrame(() => Board.redrawVisiblePath(frameId));
    }
  }

  function initThemeToggle() {
    const btn = document.getElementById('btn-theme-toggle');
    if (!btn) return;
    const saved = localStorage.getItem('pdi-theme') || 'dark';
    applyTheme(saved);
    btn.onclick = () => {
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      const next = current === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      localStorage.setItem('pdi-theme', next);
    };
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const btn = document.getElementById('btn-theme-toggle');
    if (btn) btn.textContent = theme === 'dark' ? '🌙' : '☀️';
  }

  function renderInstructions(config) {
    const el = document.getElementById('instructions-content');
    if (!el) return;

    const totalCps = config.themes.reduce((s, t) => s + t.checkpoints.length, 0);

    el.innerHTML = `
      <div class="instructions-wrapper">
        <h2 class="instructions-title">📋 ${config.title || 'PDI Board'}</h2>
        <p class="text-muted instructions-subtitle">Plano de Desenvolvimento Individual · Início: ${formatDate(config.startDate)}</p>

        <div class="card instructions-card">
          <div class="card-title">��️ Como funciona o Board</div>
          <ul class="instructions-list">
            <li>O PDI está dividido em <strong>${config.themes.length} tema${config.themes.length !== 1 ? 's' : ''}</strong>, cada um com <strong>4 meses</strong> de duração</li>
            <li>Cada tema possui <strong>8 checkpoints</strong> (2 por mês), registrados nas reuniões quinzenais de 1:1</li>
            <li>Total: <strong>${totalCps} checkpoints</strong> ao longo do período</li>
            <li>Arraste o peão pelas casas conforme avança nos checkpoints</li>
            <li>Clique em qualquer casa para atualizar status, pontos e notas</li>
          </ul>
        </div>

        <div class="card instructions-card">
          <div class="card-title">🎨 Trilhas do Tabuleiro</div>
          <div class="legend-grid">
            ${config.themes.map((t, i) => `
              <div class="legend-item">
                <div class="legend-icon">
                  <span class="theme-dot-lg" style="background:${t.color}"></span>
                </div>
                <div class="legend-text">
                  <strong>${t.name}</strong>
                  <span>Tema ${i+1} · 8 checkpoints</span>
                </div>
              </div>`).join('')}
          </div>
        </div>

        <div class="card instructions-card">
          <div class="card-title">🏠 Tipos de Casas</div>
          <div class="legend-grid">
            <div class="legend-item"><div class="legend-icon">🚀</div><div class="legend-text"><strong>Start</strong><span>Ponto de partida de cada trilha</span></div></div>
            <div class="legend-item"><div class="legend-icon">⬜</div><div class="legend-text"><strong>Checkpoint Normal</strong><span>Objetivo quinzenal do 1:1</span></div></div>
            <div class="legend-item"><div class="legend-icon">🎁</div><div class="legend-text"><strong>Casa Bônus</strong><span>Entrega excepcional = pontos extras</span></div></div>
            <div class="legend-item"><div class="legend-icon">⚠️</div><div class="legend-text"><strong>Casa Retrocesso</strong><span>Ponto de atenção / ajuste de rota</span></div></div>
            <div class="legend-item"><div class="legend-icon">🏆</div><div class="legend-text"><strong>Milestone</strong><span>Grande conquista final do tema</span></div></div>
          </div>
        </div>

        <div class="card">
          <div class="card-title">⭐ Pontuação Automática</div>
          <div class="scoring-grid">
            <div class="scoring-item">⬜ Checkpoint concluído: <strong class="score-success">+10 pts</strong></div>
            <div class="scoring-item">🎁 Bônus concluído: <strong class="score-bonus">+15 pts</strong></div>
            <div class="scoring-item">🏆 Milestone concluído: <strong class="score-warning">+25 pts</strong></div>
            <div class="scoring-item">⚠️ Retrocesso concluído: <strong class="score-danger">-5 pts</strong></div>
            <div class="scoring-item">🔄 Em progresso: <strong class="score-warning">metade da base</strong></div>
            <div class="scoring-item">📝 Notas preenchidas: <strong class="score-success">+2 pts</strong></div>
            <div class="scoring-item">🔗 Links: <strong class="score-bonus">+3 pts cada</strong> (máx. 3)</div>
          </div>
        </div>
      </div>`;
  }

  function formatDate(iso) {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  return { init, setData, navigate };
})();

// Initialized by auth.js once authentication is resolved.
