const express = require('express');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, HeadingLevel, WidthType } = require('docx');
const ExcelJS = require('exceljs');

const router = express.Router();
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, '../data.json');

function readData() {
  if (!fs.existsSync(DATA_FILE)) return { config: null, oneOnOnes: [], evidence: [] };
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
}

const STATUS_LABELS = { planned: 'Planejado', 'in-progress': 'Em Progresso', done: 'Concluído' };
const TYPE_LABELS   = { normal: 'Checkpoint', bonus: 'Bônus', setback: 'Retrocesso', milestone: 'Milestone', start: 'Início' };

// ─── PDF ──────────────────────────────────────────────────────────────────────
router.get('/pdf', (req, res) => {
  const data = readData();
  if (!data.config) return res.status(400).json({ error: 'Sem configuração' });

  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="pdi-report.pdf"`);
  doc.pipe(res);

  const { config } = data;

  // Header
  doc.fontSize(22).font('Helvetica-Bold').text('PDI Board — Relatório', { align: 'center' });
  doc.moveDown(0.3);
  doc.fontSize(12).font('Helvetica').fillColor('#666').text(config.title, { align: 'center' });
  doc.fontSize(10).text(`Início: ${config.startDate}  |  Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, { align: 'center' });
  doc.moveDown(1);

  config.themes.forEach((theme, ti) => {
    const done = theme.checkpoints.filter(c => c.status === 'done').length;
    const pts  = theme.checkpoints.reduce((s, c) => s + (c.points || 0), 0);

    doc.fontSize(15).font('Helvetica-Bold').fillColor('#000').text(`Tema ${ti + 1}: ${theme.name}`);
    doc.fontSize(10).font('Helvetica').fillColor('#444').text(`${done}/8 concluídos · ${pts} pontos`);
    doc.moveDown(0.5);

    // Table header
    const cols = { pos: 40, title: 180, type: 70, status: 80, pts: 45, notes: 130 };
    const tableX = 50;
    let y = doc.y;

    doc.fontSize(9).font('Helvetica-Bold').fillColor('#fff');
    doc.rect(tableX, y, 545, 18).fill('#333');
    doc.fillColor('#fff')
       .text('#',          tableX + 4,          y + 4, { width: cols.pos })
       .text('Checkpoint', tableX + cols.pos,    y + 4, { width: cols.title })
       .text('Tipo',       tableX + cols.pos + cols.title, y + 4, { width: cols.type })
       .text('Status',     tableX + cols.pos + cols.title + cols.type, y + 4, { width: cols.pts })
       .text('Pts',        tableX + cols.pos + cols.title + cols.type + cols.pts, y + 4, { width: cols.pts })
       .text('Notas',      tableX + cols.pos + cols.title + cols.type + cols.pts + cols.pts, y + 4, { width: cols.notes });
    y += 18;

    theme.checkpoints.forEach((cp, ci) => {
      const rowH = 16;
      const bg = ci % 2 === 0 ? '#f9f9f9' : '#ffffff';
      doc.rect(tableX, y, 545, rowH).fill(bg);
      doc.fontSize(8).font('Helvetica').fillColor('#222');
      const x0 = tableX;
      doc.text(String(ci + 1),                x0 + 4,                                          y + 4, { width: cols.pos })
         .text(cp.title,                       x0 + cols.pos,                                   y + 4, { width: cols.title - 4 })
         .text(TYPE_LABELS[cp.type] || cp.type, x0 + cols.pos + cols.title,                     y + 4, { width: cols.type })
         .text(STATUS_LABELS[cp.status] || cp.status, x0 + cols.pos + cols.title + cols.type,  y + 4, { width: cols.pts })
         .text(String(cp.points || 0),         x0 + cols.pos + cols.title + cols.type + cols.pts, y + 4, { width: cols.pts })
         .text((cp.notes || '').slice(0, 40),  x0 + cols.pos + cols.title + cols.type + cols.pts * 2, y + 4, { width: cols.notes });
      y += rowH;
      if (y > 740) { doc.addPage(); y = 50; }
    });

    doc.moveDown(1.5);
    y = doc.y;
  });

  // Summary
  const totalPts  = config.themes.reduce((s, t) => s + t.checkpoints.reduce((a, c) => a + (c.points || 0), 0), 0);
  const totalDone = config.themes.reduce((s, t) => s + t.checkpoints.filter(c => c.status === 'done').length, 0);
  doc.fontSize(13).font('Helvetica-Bold').fillColor('#000').text('Resumo Geral');
  doc.fontSize(11).font('Helvetica').fillColor('#333');
  doc.text(`Total de checkpoints concluídos: ${totalDone}/24`);
  doc.text(`Total de pontos acumulados: ${totalPts}`);

  doc.end();
});

// ─── DOCX ─────────────────────────────────────────────────────────────────────
router.get('/docx', async (req, res) => {
  const data = readData();
  if (!data.config) return res.status(400).json({ error: 'Sem configuração' });

  const { config } = data;
  const children = [];

  children.push(new Paragraph({ text: 'PDI Board — Relatório', heading: HeadingLevel.TITLE }));
  children.push(new Paragraph({ text: config.title, heading: HeadingLevel.HEADING_2 }));
  children.push(new Paragraph({ text: `Início: ${config.startDate} | Gerado: ${new Date().toLocaleDateString('pt-BR')}` }));
  children.push(new Paragraph({ text: '' }));

  config.themes.forEach((theme, ti) => {
    const done = theme.checkpoints.filter(c => c.status === 'done').length;
    const pts  = theme.checkpoints.reduce((s, c) => s + (c.points || 0), 0);

    children.push(new Paragraph({ text: `Tema ${ti + 1}: ${theme.name}`, heading: HeadingLevel.HEADING_1 }));
    children.push(new Paragraph({ text: `${done}/8 concluídos · ${pts} pontos` }));
    children.push(new Paragraph({ text: '' }));

    const headerRow = new TableRow({
      children: ['#', 'Checkpoint', 'Tipo', 'Status', 'Pts', 'Notas'].map(h =>
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })] })
      ),
    });

    const dataRows = theme.checkpoints.map((cp, ci) =>
      new TableRow({
        children: [
          String(ci + 1), cp.title, TYPE_LABELS[cp.type] || cp.type,
          STATUS_LABELS[cp.status] || cp.status, String(cp.points || 0), cp.notes || '',
        ].map(val => new TableCell({ children: [new Paragraph({ text: val })] }))
      })
    );

    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [headerRow, ...dataRows],
    }));
    children.push(new Paragraph({ text: '' }));
  });

  const totalPts  = config.themes.reduce((s, t) => s + t.checkpoints.reduce((a, c) => a + (c.points || 0), 0), 0);
  const totalDone = config.themes.reduce((s, t) => s + t.checkpoints.filter(c => c.status === 'done').length, 0);
  children.push(new Paragraph({ text: 'Resumo Geral', heading: HeadingLevel.HEADING_1 }));
  children.push(new Paragraph({ text: `Total checkpoints concluídos: ${totalDone}/24` }));
  children.push(new Paragraph({ text: `Total de pontos: ${totalPts}` }));

  const doc = new Document({ sections: [{ children }] });
  const buffer = await Packer.toBuffer(doc);

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  res.setHeader('Content-Disposition', 'attachment; filename="pdi-report.docx"');
  res.send(buffer);
});

// ─── XLSX ─────────────────────────────────────────────────────────────────────
router.get('/xlsx', async (req, res) => {
  const data = readData();
  if (!data.config) return res.status(400).json({ error: 'Sem configuração' });

  const { config } = data;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'PDI Board';
  workbook.created = new Date();

  // Summary sheet
  const summary = workbook.addWorksheet('Resumo');
  summary.columns = [
    { header: 'Tema', key: 'theme', width: 30 },
    { header: 'Concluídos', key: 'done', width: 12 },
    { header: 'Total', key: 'total', width: 8 },
    { header: 'Pontos', key: 'points', width: 10 },
    { header: '% Progresso', key: 'pct', width: 14 },
  ];
  summary.getRow(1).font = { bold: true };

  config.themes.forEach(theme => {
    const done = theme.checkpoints.filter(c => c.status === 'done').length;
    const pts  = theme.checkpoints.reduce((s, c) => s + (c.points || 0), 0);
    summary.addRow({ theme: theme.name, done, total: 8, points: pts, pct: `${Math.round(done / 8 * 100)}%` });
  });

  // One sheet per theme
  config.themes.forEach((theme, ti) => {
    const ws = workbook.addWorksheet(`Tema ${ti + 1}`);
    ws.columns = [
      { header: '#',          key: 'num',    width: 5  },
      { header: 'Checkpoint', key: 'title',  width: 28 },
      { header: 'Mês',        key: 'month',  width: 6  },
      { header: 'Tipo',       key: 'type',   width: 14 },
      { header: 'Status',     key: 'status', width: 14 },
      { header: 'Pontos',     key: 'points', width: 8  },
      { header: 'Notas',      key: 'notes',  width: 40 },
      { header: 'Links',      key: 'links',  width: 50 },
    ];
    ws.getRow(1).font = { bold: true };
    theme.checkpoints.forEach((cp, ci) => {
      ws.addRow({
        num:    ci + 1,
        title:  cp.title,
        month:  cp.month,
        type:   TYPE_LABELS[cp.type] || cp.type,
        status: STATUS_LABELS[cp.status] || cp.status,
        points: cp.points || 0,
        notes:  cp.notes || '',
        links:  (cp.links || []).join(', '),
      });
    });
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="pdi-report.xlsx"');
  await workbook.xlsx.write(res);
  res.end();
});

module.exports = router;
