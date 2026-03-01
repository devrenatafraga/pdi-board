/* evidence.js — Parede de Evidências */

const Evidence = (() => {
  const TYPE_ICONS = { PR: '🔀', certificate: '🎓', praise: '🌟', other: '📎' };
  const TYPE_LABELS = { PR: 'Pull Request', certificate: 'Certificado', praise: 'Elogio', other: 'Outro' };

  let activeFilter = 'all';

  function render(data) {
    const container = document.getElementById('evidence-content');
    if (!container || !data.config) return;

    const { config, evidence } = data;

    const filtered = activeFilter === 'all'
      ? evidence
      : evidence.filter(e => e.themeId === activeFilter);

    container.innerHTML = `
      <div class="evidence-header">
        <h2>📌 Parede de Evidências</h2>
        <button class="btn btn-primary btn-sm" id="btn-add-evidence">+ Adicionar</button>
      </div>

      <div class="evidence-filters">
        <button class="filter-btn ${activeFilter === 'all' ? 'active' : ''}" data-filter="all">Todas</button>
        ${config.themes.map(t => `
          <button class="filter-btn ${activeFilter === t.id ? 'active' : ''}" data-filter="${t.id}" style="${activeFilter === t.id ? `background:${t.color};border-color:${t.color}` : ''}">
            <span class="theme-color-badge" style="background:${t.color}"></span>${t.name}
          </button>`).join('')}
      </div>

      <div class="evidence-grid">
        ${filtered.length === 0 ? `
          <div class="empty-state" style="grid-column:1/-1">
            <div class="empty-icon">📌</div>
            <p>Nenhuma evidência ${activeFilter !== 'all' ? 'neste tema ' : ''}ainda.<br>Adicione links de PRs, certificados e elogios!</p>
          </div>` :
          filtered.map(ev => {
            const theme = config.themes.find(t => t.id === ev.themeId);
            return `
              <div class="evidence-card">
                <div class="evidence-card-type type-${ev.type}">
                  ${TYPE_ICONS[ev.type] || '📎'} ${TYPE_LABELS[ev.type] || ev.type}
                  ${theme ? `<span style="margin-left:auto"><span class="theme-color-badge" style="background:${theme.color}"></span>${theme.name}</span>` : ''}
                </div>
                <div class="evidence-card-title">${ev.title}</div>
                ${ev.url ? `<a class="evidence-card-link" href="${ev.url}" target="_blank" rel="noopener">${ev.url}</a>` : ''}
                <div class="evidence-card-footer">
                  <span>${formatDate(ev.date)}</span>
                  <button class="evidence-card-delete delete-ev" data-id="${ev.id}" title="Remover">🗑️</button>
                </div>
              </div>`;
          }).join('')}
      </div>`;

    // Filter buttons
    container.querySelectorAll('.filter-btn').forEach(btn => {
      btn.onclick = () => {
        activeFilter = btn.dataset.filter;
        render(data);
      };
    });

    document.getElementById('btn-add-evidence').onclick = () => openEvidenceModal(config, data);

    container.querySelectorAll('.delete-ev').forEach(btn => {
      btn.onclick = async () => {
        if (!confirm('Remover esta evidência?')) return;
        await API.delete(`/evidence/${btn.dataset.id}`);
        const newData = await API.get('/data');
        App.setData(newData);
        render(newData);
      };
    });
  }

  function openEvidenceModal(config, data) {
    const modal = document.getElementById('evidence-modal');
    const content = document.getElementById('evidence-modal-content');
    const today = new Date().toISOString().slice(0, 10);

    content.innerHTML = `
      <h2>📌 Adicionar Evidência</h2>
      <div class="form-group mt-4">
        <label>Título</label>
        <input type="text" id="ev-title" placeholder="Ex: PR #42 — Feature de autenticação" />
      </div>
      <div class="form-group mt-2">
        <label>Link (URL)</label>
        <input type="url" id="ev-url" placeholder="https://..." />
      </div>
      <div class="form-group mt-2">
        <label>Tipo</label>
        <select id="ev-type">
          <option value="PR">🔀 Pull Request</option>
          <option value="certificate">🎓 Certificado</option>
          <option value="praise">🌟 Elogio</option>
          <option value="other">📎 Outro</option>
        </select>
      </div>
      <div class="form-group mt-2">
        <label>Tema relacionado</label>
        <select id="ev-theme">
          <option value="">— Nenhum —</option>
          ${config.themes.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group mt-2">
        <label>Data</label>
        <input type="date" id="ev-date" value="${today}" />
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost btn-sm" id="ev-cancel">Cancelar</button>
        <button class="btn btn-primary" id="ev-save">💾 Salvar</button>
      </div>`;

    document.getElementById('ev-cancel').onclick = closeModal;
    document.getElementById('ev-save').onclick = async () => {
      const title = document.getElementById('ev-title').value.trim();
      if (!title) { alert('Informe um título.'); return; }
      const entry = {
        title,
        url: document.getElementById('ev-url').value.trim(),
        type: document.getElementById('ev-type').value,
        themeId: document.getElementById('ev-theme').value,
        date: document.getElementById('ev-date').value,
      };
      await API.post('/evidence', entry);
      closeModal();
      const newData = await API.get('/data');
      App.setData(newData);
      render(newData);
    };

    modal.classList.remove('hidden');
    document.getElementById('close-evidence-modal').onclick = closeModal;
    modal.onclick = e => { if (e.target === modal) closeModal(); };

    function closeModal() { modal.classList.add('hidden'); }
  }

  function formatDate(iso) {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  return { render };
})();
