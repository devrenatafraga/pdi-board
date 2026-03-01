/* reports.js — geração e download de relatórios */

const Reports = (() => {
  function render(config) {
    const el = document.getElementById('reports-content');
    if (!el || !config) return;

    const totalDone  = config.themes.reduce((s, t) => s + t.checkpoints.filter(c => c.status === 'done').length, 0);
    const totalPts   = config.themes.reduce((s, t) => s + t.checkpoints.reduce((a, c) => a + (c.points || 0), 0), 0);
    const totalCps   = config.themes.length * 8;

    el.innerHTML = `
      <div class="instructions-wrapper">
        <h2 class="instructions-title">📊 Relatórios do PDI</h2>
        <p class="text-muted instructions-subtitle">${config.title} · Início: ${config.startDate}</p>

        <div class="card instructions-card">
          <div class="card-title">📈 Resumo Atual</div>
          <div class="scoring-grid" style="margin-top:12px">
            ${config.themes.map(t => {
              const d = t.checkpoints.filter(c => c.status === 'done').length;
              const p = t.checkpoints.reduce((s, c) => s + (c.points || 0), 0);
              return `<div class="scoring-item">
                <span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${t.color};margin-right:6px;vertical-align:middle"></span>
                <strong>${t.name}:</strong> ${d}/8 · ${p} pts
              </div>`;
            }).join('')}
            <div class="scoring-item"><strong>Total:</strong> ${totalDone}/${totalCps} checkpoints · ${totalPts} pts</div>
          </div>
        </div>

        <div class="card instructions-card">
          <div class="card-title">⬇️ Exportar Relatório</div>
          <p class="text-muted text-sm" style="margin-bottom:20px">Baixe o relatório completo do seu PDI com todos os checkpoints, status, pontos e notas.</p>
          <div class="report-buttons">
            <button class="report-btn" id="btn-report-pdf" onclick="Reports.download('pdf')">
              <span class="report-btn-icon">📄</span>
              <span class="report-btn-label">PDF</span>
              <span class="report-btn-desc">Adobe PDF · Ideal para impressão e compartilhamento</span>
            </button>
            <button class="report-btn" id="btn-report-docx" onclick="Reports.download('docx')">
              <span class="report-btn-icon">📝</span>
              <span class="report-btn-label">Word</span>
              <span class="report-btn-desc">.docx · Editável no Microsoft Word ou Google Docs</span>
            </button>
            <button class="report-btn" id="btn-report-xlsx" onclick="Reports.download('xlsx')">
              <span class="report-btn-icon">📊</span>
              <span class="report-btn-label">Excel</span>
              <span class="report-btn-desc">.xlsx · Planilha com uma aba por tema + resumo</span>
            </button>
          </div>
        </div>

        <div class="card">
          <div class="card-title">📋 O que está incluso no relatório</div>
          <ul class="instructions-list" style="margin-top:8px">
            <li>Cabeçalho com título do PDI, data de início e data de geração</li>
            <li>Para cada tema: tabela com todos os checkpoints, tipo, status, pontos e notas</li>
            <li>Links de evidência salvos em cada checkpoint (Excel)</li>
            <li>Resumo geral com total de checkpoints concluídos e pontuação</li>
          </ul>
        </div>
      </div>`;
  }

  async function download(format) {
    const btn = document.getElementById(`btn-report-${format}`);
    const originalHtml = btn ? btn.innerHTML : '';
    if (btn) btn.innerHTML = `<span class="report-btn-icon">⏳</span><span class="report-btn-label">Gerando...</span>`;

    try {
      const response = await fetch(`/api/reports/${format}`);
      if (!response.ok) throw new Error('Falha ao gerar relatório');
      const blob = await response.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `pdi-report.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Erro ao gerar relatório. Tente novamente.');
    } finally {
      if (btn) btn.innerHTML = originalHtml;
    }
  }

  return { render, download };
})();
