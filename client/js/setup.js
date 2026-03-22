/* setup.js — wizard de configuração inicial (temas dinâmicos 1-6) */

const THEME_COLORS = ['#3B82F6', '#22C55E', '#F97316', '#A855F7', '#EF4444', '#14B8A6'];
const MAX_THEMES = 6;
const MIN_THEMES = 1;

const Setup = (() => {
  let step = 0;
  let draft = {
    title: 'Meu PDI',
    startDate: '',
    themes: [
      { id: 'theme-0', name: '', color: THEME_COLORS[0], checkpoints: [] },
      { id: 'theme-1', name: '', color: THEME_COLORS[1], checkpoints: [] },
    ],
    _cpThemeIdx: 0,
  };

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
    const totalSteps = 2 + draft.themes.length; // pdi-info + themes-name + N checkpoints steps
    const currentIdx = step === 0 ? 0 : step === 1 ? 1 : 2 + draft._cpThemeIdx;
    return `<div class="setup-progress">
      ${Array.from({ length: totalSteps }, (_, i) =>
        `<div class="progress-dot ${i < currentIdx ? 'done' : i === currentIdx ? 'active' : ''}"></div>`
      ).join('')}
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
          <h2>🎨 Defina os Temas</h2>
          <p class="text-muted mt-2">Cada tema terá 4 meses e 8 checkpoints. Você pode ter de ${MIN_THEMES} a ${MAX_THEMES} temas.</p>
        </div>
        <div id="themes-list">
          ${draft.themes.map((t, i) => renderThemeRow(t, i)).join('')}
        </div>
        ${draft.themes.length < MAX_THEMES ? `
          <button class="btn btn-ghost btn-sm mt-2" id="add-theme-btn">＋ Adicionar Tema</button>` : ''}
        <div class="flex justify-between mt-4">
          <button class="btn btn-ghost" id="setup-back-1">← Voltar</button>
          <button class="btn btn-primary" id="setup-next-1">Próximo →</button>
        </div>
      </div>`;
  }

  function renderThemeRow(t, i) {
    return `
      <div class="card theme-row" data-theme-row="${i}">
        <div class="theme-row-header">
          <span class="theme-row-num" style="background:${t.color}">T${i + 1}</span>
          <div class="form-group" style="flex:1">
            <label>Nome do Tema ${i + 1}</label>
            <input type="text" class="theme-name-input" data-idx="${i}"
              value="${t.name}" placeholder="Ex: Hard Skills, Liderança, Arquitetura..." />
          </div>
          <div class="form-group" style="width:50px">
            <label>Cor</label>
            <input type="color" class="theme-color-input" data-idx="${i}" value="${t.color}" />
          </div>
          ${draft.themes.length > MIN_THEMES ? `
            <button class="btn btn-ghost btn-sm remove-theme-btn" data-idx="${i}" title="Remover tema" style="align-self:flex-end;margin-bottom:2px">✕</button>` : ''}
        </div>
      </div>`;
  }

  function renderStep2() {
    const themeIdx = draft._cpThemeIdx;
    const theme = draft.themes[themeIdx];
    const isLast = themeIdx === draft.themes.length - 1;
    return `
      <div class="setup-step">
        ${renderProgress()}
        <div>
          <h2>📋 Checkpoints: <span style="color:${theme.color}">${theme.name || `Tema ${themeIdx + 1}`}</span></h2>
          <p class="text-muted mt-2">Nomeie os 8 checkpoints (2 por mês). Você pode editar depois pelo board.</p>
          <p class="text-muted text-sm">🎁 CP 3 = Bônus  |  ⚠️ CP 6 = Retrocesso  |  🏆 CP 8 = Milestone</p>
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
          <button class="btn ${isLast ? 'btn-success' : 'btn-primary'}" id="setup-next-cp">
            ${isLast ? '✅ Criar meu PDI Board!' : `Próximo: Tema ${themeIdx + 2} →`}
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

    const addBtn = document.getElementById('add-theme-btn');
    if (addBtn) {
      addBtn.onclick = () => {
        saveThemeNamesAndColors();
        const idx = draft.themes.length;
        draft.themes.push({
          id: `theme-${idx}`,
          name: '',
          color: THEME_COLORS[idx % THEME_COLORS.length],
          checkpoints: [],
        });
        render();
      };
    }

    document.querySelectorAll('.remove-theme-btn').forEach(btn => {
      btn.onclick = () => {
        saveThemeNamesAndColors();
        const idx = +btn.dataset.idx;
        draft.themes.splice(idx, 1);
        // Re-assign IDs
        draft.themes.forEach((t, i) => { t.id = `theme-${i}`; });
        render();
      };
    });
  }

  function saveThemeNamesAndColors() {
    document.querySelectorAll('.theme-name-input').forEach(el => {
      if (draft.themes[+el.dataset.idx]) {
        draft.themes[+el.dataset.idx].name = el.value.trim() || `Tema ${+el.dataset.idx + 1}`;
      }
    });
    document.querySelectorAll('.theme-color-input').forEach(el => {
      if (draft.themes[+el.dataset.idx]) {
        draft.themes[+el.dataset.idx].color = el.value;
      }
    });
  }

  function bindStep2() {
    const themeIdx = draft._cpThemeIdx;
    const theme = draft.themes[themeIdx];

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
      if (themeIdx < draft.themes.length - 1) {
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
      draft = {
        title: 'Meu PDI',
        startDate: '',
        themes: [
          { id: 'theme-0', name: '', color: THEME_COLORS[0], checkpoints: [] },
          { id: 'theme-1', name: '', color: THEME_COLORS[1], checkpoints: [] },
        ],
        _cpThemeIdx: 0,
      };
      document.getElementById('setup-overlay').classList.remove('hidden');
      render();
    },
  };
})();
