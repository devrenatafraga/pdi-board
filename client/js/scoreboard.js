/* scoreboard.js — placar e histórico de 1:1s */

const Scoreboard = (() => {
  function render(data) {
    const container = document.getElementById('scoreboard-content');
    if (!container || !data.config) return;

    const { config, oneOnOnes } = data;

    container.innerHTML = `
      <div class="scoreboard-header">
        <h2>🏆 Placar Geral</h2>
        <button class="btn btn-primary btn-sm" id="btn-add-oneOnOne">+ Registrar 1:1</button>
      </div>

      <div class="score-cards">
        ${config.themes.map(theme => {
          const points = theme.checkpoints.reduce((s, c) => s + (c.points || 0), 0);
          const done = theme.checkpoints.filter(c => c.status === 'done').length;
          const pct = Math.round(done / 8 * 100);
          return `
            <div class="score-card" style="border-top-color:${theme.color}">
              <div class="score-card-theme">Tema</div>
              <div class="score-card-name">${theme.name}</div>
              <div class="score-card-points" style="color:${theme.color}">${points}</div>
              <div class="text-muted text-sm">${done}/8 checkpoints concluídos</div>
              <div class="score-card-progress">
                <div class="score-card-progress-label">
                  <span>Progresso</span><span>${pct}%</span>
                </div>
                <div class="progress-bar">
                  <div class="progress-bar-fill" style="width:${pct}%;background:${theme.color}"></div>
                </div>
              </div>
            </div>`;
        }).join('')}

        <!-- Total card -->
        <div class="score-card" style="border-top-color:var(--accent)">
          <div class="score-card-theme">Total Geral</div>
          <div class="score-card-name">Todos os Temas</div>
          <div class="score-card-points" style="color:var(--accent)">
            ${config.themes.reduce((s, t) => s + t.checkpoints.reduce((ss, c) => ss + (c.points || 0), 0), 0)}
          </div>
          <div class="text-muted text-sm">
            ${config.themes.reduce((s, t) => s + t.checkpoints.filter(c => c.status === 'done').length, 0)}/24 checkpoints concluídos
          </div>
          <div class="score-card-progress">
            <div class="score-card-progress-label">
              <span>Progresso Total</span>
              <span>${Math.round(config.themes.reduce((s, t) => s + t.checkpoints.filter(c => c.status === 'done').length, 0) / 24 * 100)}%</span>
            </div>
            <div class="progress-bar">
              <div class="progress-bar-fill" style="width:${Math.round(config.themes.reduce((s, t) => s + t.checkpoints.filter(c => c.status === 'done').length, 0) / 24 * 100)}%;background:var(--accent)"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- History -->
      <div class="history-section">
        <div class="section-title">
          Histórico de 1:1s
          <span>${oneOnOnes.length} registro${oneOnOnes.length !== 1 ? 's' : ''}</span>
        </div>
        ${oneOnOnes.length === 0 ? `
          <div class="empty-state">
            <div class="empty-icon">📅</div>
            <p>Nenhum 1:1 registrado ainda.</p>
          </div>` : `
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Tema</th>
                  <th>Checkpoint</th>
                  <th>Pontos</th>
                  <th>Observações</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                ${[...oneOnOnes].reverse().map(o => {
                  const theme = config.themes.find(t => t.id === o.themeId);
                  const cp = theme ? theme.checkpoints.find(c => c.id === o.checkpointId) : null;
                  return `
                    <tr>
                      <td>${formatDate(o.date)}</td>
                      <td>
                        ${theme ? `<span class="theme-color-badge" style="background:${theme.color}"></span>${theme.name}` : '—'}
                      </td>
                      <td>${cp ? cp.title : (o.checkpointId || '—')}</td>
                      <td><strong style="color:var(--warning)">${o.points > 0 ? `+${o.points}` : o.points}</strong></td>
                      <td class="text-muted">${o.notes || '—'}</td>
                      <td>
                        <button class="btn btn-ghost btn-sm delete-oo" data-id="${o.id}" title="Remover">🗑️</button>
                      </td>
                    </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>`}
      </div>`;

    document.getElementById('btn-add-oneOnOne').onclick = () => openOneOnOneModal(config);

    container.querySelectorAll('.delete-oo').forEach(btn => {
      btn.onclick = async () => {
        if (!confirm('Remover este registro?')) return;
        await API.delete(`/oneOnOnes/${btn.dataset.id}`);
        const newData = await API.get('/data');
        App.setData(newData);
        render(newData);
      };
    });
  }

  function openOneOnOneModal(config) {
    const modal = document.getElementById('oneOnOne-modal');
    const content = document.getElementById('oneOnOne-modal-content');
    const today = new Date().toISOString().slice(0, 10);

    content.innerHTML = `
      <h2>📅 Registrar Reunião 1:1</h2>
      <div class="form-group mt-4">
        <label>Data</label>
        <input type="date" id="oo-date" value="${today}" />
      </div>
      <div class="form-group mt-2">
        <label>Tema</label>
        <select id="oo-theme">
          <option value="">Selecione um tema...</option>
          ${config.themes.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group mt-2">
        <label>Checkpoint</label>
        <select id="oo-cp">
          <option value="">Selecione um checkpoint...</option>
        </select>
      </div>
      <div class="form-group mt-2">
        <label>Pontos</label>
        <input type="number" id="oo-points" value="0" min="-50" max="100" />
      </div>
      <div class="form-group mt-2">
        <label>Observações</label>
        <textarea id="oo-notes" placeholder="Anotações da reunião..."></textarea>
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost btn-sm" id="oo-cancel">Cancelar</button>
        <button class="btn btn-success" id="oo-save">💾 Salvar</button>
      </div>`;

    document.getElementById('oo-theme').onchange = function() {
      const theme = config.themes.find(t => t.id === this.value);
      const cpSel = document.getElementById('oo-cp');
      cpSel.innerHTML = '<option value="">Selecione um checkpoint...</option>';
      if (theme) {
        theme.checkpoints.forEach(c => {
          const opt = document.createElement('option');
          opt.value = c.id;
          opt.textContent = `CP${theme.checkpoints.indexOf(c)+1} — ${c.title}`;
          cpSel.appendChild(opt);
        });
      }
    };

    document.getElementById('oo-cancel').onclick = closeModal;
    document.getElementById('oo-save').onclick = async () => {
      const entry = {
        date: document.getElementById('oo-date').value,
        themeId: document.getElementById('oo-theme').value,
        checkpointId: document.getElementById('oo-cp').value,
        points: parseInt(document.getElementById('oo-points').value) || 0,
        notes: document.getElementById('oo-notes').value,
      };
      await API.post('/oneOnOnes', entry);
      closeModal();
      const data = await API.get('/data');
      App.setData(data);
      render(data);
    };

    modal.classList.remove('hidden');
    document.getElementById('close-oneOnOne-modal').onclick = closeModal;
    modal.onclick = e => { if (e.target === modal) closeModal(); };

    function closeModal() { modal.classList.add('hidden'); }
  }

  function formatDate(iso) {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  return { render, openOneOnOneModal };
})();
