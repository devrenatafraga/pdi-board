/* app.js — inicialização e navegação */

const App = (() => {
  let _data = null;

  function setData(data) {
    _data = data;
  }

  async function init() {
    const data = await API.get('/data');
    _data = data;

    if (!data.config) {
      Setup.show();
      return;
    }

    showApp(data);
  }

  function showApp(data) {
    document.getElementById('setup-overlay').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');

    // Render all sections
    Board.renderAll(data.config);
    Token.init(data.config);
    Scoreboard.render(data);
    Evidence.render(data);
    renderInstructions(data.config);

    // Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.onclick = () => navigate(btn.dataset.frame);
    });

    // Reset config button
    document.getElementById('btn-reset-config').onclick = () => {
      if (confirm('⚠️ Isso vai iniciar o setup novamente. Os dados do board serão mantidos, mas a configuração será sobrescrita. Continuar?')) {
        document.getElementById('app').classList.add('hidden');
        Setup.show();
      }
    };
  }

  function navigate(frameId) {
    document.querySelectorAll('.frame').forEach(f => f.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    const frame = document.getElementById(`frame-${frameId}`);
    if (frame) frame.classList.add('active');
    const btn = document.querySelector(`.nav-btn[data-frame="${frameId}"]`);
    if (btn) btn.classList.add('active');
  }

  function renderInstructions(config) {
    const el = document.getElementById('instructions-content');
    if (!el) return;

    const totalCheckpoints = 3 * 8;
    el.innerHTML = `
      <div style="max-width:800px">
        <h2 style="font-size:24px;margin-bottom:8px">📋 ${config.title || 'PDI Board'}</h2>
        <p class="text-muted" style="margin-bottom:32px">Plano de Desenvolvimento Individual · Início: ${formatDate(config.startDate)}</p>

        <div class="card" style="margin-bottom:20px">
          <div class="card-title">🗺️ Como funciona o Board</div>
          <ul style="color:var(--text-muted);font-size:14px;line-height:2;padding-left:18px">
            <li>O PDI está dividido em <strong style="color:var(--text)">3 temas</strong>, cada um com <strong style="color:var(--text)">4 meses</strong> de duração</li>
            <li>Cada tema possui <strong style="color:var(--text)">8 checkpoints</strong> (2 por mês), registrados nas reuniões quinzenais de 1:1</li>
            <li>Total: <strong style="color:var(--text)">${totalCheckpoints} checkpoints</strong> ao longo do período</li>
            <li>Arraste o peão 🎯 pelas casas conforme avança nos checkpoints</li>
            <li>Clique em qualquer casa para atualizar status, pontos e notas</li>
          </ul>
        </div>

        <div class="card" style="margin-bottom:20px">
          <div class="card-title">🎨 Trilhas do Tabuleiro</div>
          <div class="legend-grid">
            ${config.themes.map((t, i) => `
              <div class="legend-item">
                <div class="legend-icon">
                  <span style="display:block;width:32px;height:32px;border-radius:50%;background:${t.color};margin:auto"></span>
                </div>
                <div class="legend-text">
                  <strong>${t.name}</strong>
                  <span>Tema ${i+1} · 8 checkpoints</span>
                </div>
              </div>`).join('')}
          </div>
        </div>

        <div class="card" style="margin-bottom:20px">
          <div class="card-title">🏠 Tipos de Casas</div>
          <div class="legend-grid">
            <div class="legend-item">
              <div class="legend-icon">🚀</div>
              <div class="legend-text"><strong>Start</strong><span>Ponto de partida de cada trilha</span></div>
            </div>
            <div class="legend-item">
              <div class="legend-icon">⬜</div>
              <div class="legend-text"><strong>Checkpoint Normal</strong><span>Objetivo quinzenal do 1:1</span></div>
            </div>
            <div class="legend-item">
              <div class="legend-icon">🎁</div>
              <div class="legend-text"><strong>Casa Bônus</strong><span>Entrega excepcional = pontos extras</span></div>
            </div>
            <div class="legend-item">
              <div class="legend-icon">⚠️</div>
              <div class="legend-text"><strong>Casa Retrocesso</strong><span>Ponto de atenção / ajuste de rota</span></div>
            </div>
            <div class="legend-item">
              <div class="legend-icon">🏆</div>
              <div class="legend-text"><strong>Milestone</strong><span>Grande conquista final do tema</span></div>
            </div>
          </div>
        </div>

        <div class="card" style="margin-bottom:20px">
          <div class="card-title">🔄 Dinâmica dos 1:1s (quinzenal)</div>
          <ol style="color:var(--text-muted);font-size:14px;line-height:2.2;padding-left:18px">
            <li><strong style="color:var(--text)">Antes:</strong> Revise o board e prepare os pontos do checkpoint</li>
            <li><strong style="color:var(--text)">Durante:</strong> Abra o tema foco, mova o peão, atualize pontos e notas</li>
            <li><strong style="color:var(--text)">Após:</strong> Registre o 1:1 no Placar e adicione evidências relevantes</li>
          </ol>
        </div>

        <div class="card">
          <div class="card-title">⭐ Sistema de Pontuação (sugestão)</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:8px">
            <div style="font-size:13px;color:var(--text-muted)">✅ Checkpoint concluído: <strong style="color:var(--success)">+10 pts</strong></div>
            <div style="font-size:13px;color:var(--text-muted)">🎁 Casa Bônus: <strong style="color:#60b0ff">+15 pts</strong></div>
            <div style="font-size:13px;color:var(--text-muted)">🏆 Milestone: <strong style="color:var(--warning)">+25 pts</strong></div>
            <div style="font-size:13px;color:var(--text-muted)">⚠️ Retrocesso: <strong style="color:var(--danger)">-5 pts</strong></div>
          </div>
          <p class="text-muted text-sm mt-2">Adapte os valores com seu gestor na primeira reunião!</p>
        </div>
      </div>`;
  }

  function formatDate(iso) {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  return { init, setData };
})();

// Inicializa ao carregar
window.addEventListener('DOMContentLoaded', () => App.init());
