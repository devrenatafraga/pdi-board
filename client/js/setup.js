/* setup.js — wizard de configuração inicial */

const THEME_COLORS = ['#3B82F6', '#22C55E', '#F97316', '#A855F7', '#EF4444', '#14B8A6'];

const Setup = (() => {
  let step = 0;
  let draft = {
    title: 'Meu PDI',
    startDate: '',
    themes: [
      { id: 'theme-0', name: '', color: THEME_COLORS[0], checkpoints: [] },
      { id: 'theme-1', name: '', color: THEME_COLORS[1], checkpoints: [] },
      { id: 'theme-2', name: '', color: THEME_COLORS[2], checkpoints: [] },
    ],
  };

  const STEPS = ['pdi-info', 'themes-name', 'checkpoints'];
  const STEP_LABELS = ['Informações', 'Temas', 'Checkpoints'];

  function buildDefaultCheckpoints(themeIndex) {
    const cps = [];
    for (let month = 1; month <= 4; month++) {
      for (let bi = 1; bi <= 2; bi++) {
        const num = (month - 1) * 2 + bi;
        cps.push({
          id: `cp-${themeIndex}-${num}`,
          title: `Checkpoint ${num}`,
          month,
          biweekly: bi,
          type: getSpecialType(num),
          status: 'planned',
          points: 0,
          notes: '',
        });
      }
    }
    return cps;
  }

  function getSpecialType(num) {
    if (num === 3) return 'bonus';
    if (num === 6) return 'setback';
    if (num === 8) return 'milestone';
    return 'normal';
  }

  function renderProgress() {
    return `<div class="setup-progress">
      ${STEPS.map((_, i) => `<div class="progress-dot ${i < step ? 'done' : i === step ? 'active' : ''}"></div>`).join('')}
    </div>`;
  }

  function renderStep0() {
    const today = new Date().toISOString().slice(0, 10);
    return `
      <div class="setup-step">
        ${renderProgress()}
        <div>
          <h1>🎲 Bem-vinda ao PDI Board!</h1>
          <p class="text-muted mt-2">Vamos configurar o seu plano de desenvolvimento personalizado. Isso levará menos de 2 minutos.</p>
        </div>
        <div class="form-group">
          <label>Nome do PDI</label>
          <input type="text" id="setup-pdi-title" value="${draft.title}" placeholder="Ex: PDI 2025 — Renata" />
        </div>
        <div class="form-group">
          <label>Data de Início</label>
          <input type="date" id="setup-start-date" value="${draft.startDate || today}" />
        </div>
        <div class="flex justify-between mt-4">
          <span></span>
          <button class="btn btn-primary" id="setup-next-0">Próximo →</button>
        </div>
      </div>`;
  }

  function renderStep1() {
    return `
      <div class="setup-step">
        ${renderProgress()}
        <div>
          <h2>🎨 Defina os 3 Temas</h2>
          <p class="text-muted mt-2">Cada tema terá 4 meses e 8 checkpoints. Escolha um nome e uma cor para cada trilha.</p>
        </div>
        ${draft.themes.map((t, i) => `
          <div class="card">
            <div class="form-group">
              <label>Tema ${i + 1} — Nome</label>
              <input type="text" class="theme-name-input" data-idx="${i}"
                value="${t.name}" placeholder="Ex: Hard Skills, Liderança, Arquitetura..." />
            </div>
            <div class="form-group mt-2">
              <label>Cor da trilha</label>
              <div class="theme-color-row">
                <input type="color" class="theme-color-input" data-idx="${i}" value="${t.color}" />
                <span class="text-muted text-sm">Será usada nas casas e no placar</span>
              </div>
            </div>
          </div>`).join('')}
        <div class="flex justify-between mt-4">
          <button class="btn btn-ghost" id="setup-back-1">← Voltar</button>
          <button class="btn btn-primary" id="setup-next-1">Próximo →</button>
        </div>
      </div>`;
  }

  function renderStep2() {
    const themeIdx = draft._cpThemeIdx || 0;
    const theme = draft.themes[themeIdx];
    return `
      <div class="setup-step">
        ${renderProgress()}
        <div>
          <h2>📋 Checkpoints: <span style="color:${theme.color}">${theme.name || `Tema ${themeIdx + 1}`}</span></h2>
          <p class="text-muted mt-2">Nomeie os 8 checkpoints (2 por mês). Você pode editar depois pelo board.</p>
          <p class="text-muted text-sm">🎁 Checkpoint 3 = Bônus  |  ⚠️ Checkpoint 6 = Retrocesso  |  🏆 Checkpoint 8 = Milestone</p>
        </div>
        <div class="checkpoints-grid">
          ${(theme.checkpoints.length ? theme.checkpoints : buildDefaultCheckpoints(themeIdx)).map((cp, i) => `
            <div class="form-group">
              <label style="color:${theme.color}">${squareIcon(cp.type)} CP ${i + 1} — Mês ${cp.month}</label>
              <input type="text" class="cp-name-input" data-idx="${i}"
                value="${cp.title}" placeholder="Checkpoint ${i + 1}" />
            </div>`).join('')}
        </div>
        <div class="flex justify-between mt-4">
          <button class="btn btn-ghost" id="setup-back-cp">← ${themeIdx === 0 ? 'Voltar' : `Tema ${themeIdx}`}</button>
          <button class="btn ${themeIdx < 2 ? 'btn-primary' : 'btn-success'}" id="setup-next-cp">
            ${themeIdx < 2 ? `Próximo: Tema ${themeIdx + 2} →` : '✅ Criar meu PDI Board!'}
          </button>
        </div>
      </div>`;
  }

  function squareIcon(type) {
    return { start: '🚀', normal: '⬜', bonus: '🎁', setback: '⚠️', milestone: '🏆' }[type] || '⬜';
  }

  function render() {
    const el = document.getElementById('setup-content');
    if (step === 0) { el.innerHTML = renderStep0(); bindStep0(); }
    else if (step === 1) { el.innerHTML = renderStep1(); bindStep1(); }
    else if (step === 2) { el.innerHTML = renderStep2(); bindStep2(); }
  }

  function bindStep0() {
    document.getElementById('setup-next-0').onclick = () => {
      draft.title = document.getElementById('setup-pdi-title').value.trim() || 'Meu PDI';
      draft.startDate = document.getElementById('setup-start-date').value;
      step = 1;
      render();
    };
  }

  function bindStep1() {
    document.getElementById('setup-back-1').onclick = () => { step = 0; render(); };
    document.getElementById('setup-next-1').onclick = () => {
      document.querySelectorAll('.theme-name-input').forEach(el => {
        draft.themes[+el.dataset.idx].name = el.value.trim() || `Tema ${+el.dataset.idx + 1}`;
      });
      document.querySelectorAll('.theme-color-input').forEach(el => {
        draft.themes[+el.dataset.idx].color = el.value;
      });
      draft._cpThemeIdx = 0;
      step = 2;
      render();
    };
  }

  function bindStep2() {
    const themeIdx = draft._cpThemeIdx;
    const theme = draft.themes[themeIdx];

    // save cp names from inputs
    function saveCpNames() {
      const cps = theme.checkpoints.length ? theme.checkpoints : buildDefaultCheckpoints(themeIdx);
      document.querySelectorAll('.cp-name-input').forEach((el, i) => {
        cps[i].title = el.value.trim() || `Checkpoint ${i + 1}`;
      });
      theme.checkpoints = cps;
    }

    document.getElementById('setup-back-cp').onclick = () => {
      saveCpNames();
      if (themeIdx === 0) { step = 1; render(); }
      else { draft._cpThemeIdx = themeIdx - 1; render(); }
    };

    document.getElementById('setup-next-cp').onclick = async () => {
      saveCpNames();
      if (themeIdx < 2) {
        draft._cpThemeIdx = themeIdx + 1;
        render();
      } else {
        await finalize();
      }
    };
  }

  async function finalize() {
    const config = {
      title: draft.title,
      startDate: draft.startDate,
      themes: draft.themes.map(t => ({
        id: t.id,
        name: t.name,
        color: t.color,
        tokenPosition: 0,
        checkpoints: t.checkpoints,
      })),
    };
    await API.put('/config', config);
    document.getElementById('setup-overlay').classList.add('hidden');
    App.init();
  }

  return {
    show() {
      step = 0;
      draft._cpThemeIdx = 0;
      document.getElementById('setup-overlay').classList.remove('hidden');
      render();
    },
  };
})();
