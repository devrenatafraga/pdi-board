const express = require('express');
const PDFDocument = require('pdfkit');
const { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, HeadingLevel, WidthType } = require('docx');
const ExcelJS = require('exceljs');
const pdiRepo        = require('../db/repositories/pdiRepo');
const themeRepo      = require('../db/repositories/themeRepo');
const checkpointRepo = require('../db/repositories/checkpointRepo');
const { getUserId } = require('../lib/authHelper');
const logger = require('../lib/logger');
const {
  STATUS_LABELS,
  TYPE_LABELS,
  calculateThemeStats,
  calculateTotalStats
} = require('../lib/reportStats');

const router = express.Router();


async function loadReportData(req) {
  const userId = getUserId(req);
  if (!userId) return null;
  const pdis = await pdiRepo.findByUser(userId);
  const pdi = pdis[0];
  if (!pdi) return null;

  const themes = await themeRepo.findByPdi(pdi.id);
  const themesWithCheckpoints = await Promise.all(
    themes.map(async t => {
      const checkpoints = await checkpointRepo.findByTheme(t.id);
      return { ...t, checkpoints };
    })
  );

  return { pdi, themes: themesWithCheckpoints };
}

// PDF
router.get('/pdf', async (req, res) => {
   try {
     const data = await loadReportData(req);
     if (!data) return res.status(400).json({ error: 'No configuration found' });

     const { pdi, themes } = data;
     const doc = new PDFDocument({ margin: 50, size: 'A4' });
     res.setHeader('Content-Type', 'application/pdf');
     res.setHeader('Content-Disposition', `attachment; filename="pdi-report.pdf"`);
     doc.pipe(res);

     doc.fontSize(22).font('Helvetica-Bold').text('PDI Board — Relatório', { align: 'center' });
     doc.moveDown(0.3);
     doc.fontSize(12).font('Helvetica').fillColor('#666').text(pdi.title, { align: 'center' });
     doc.fontSize(10).text(`Início: ${pdi.start_date}  |  Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, { align: 'center' });
     doc.moveDown(1);

     const { totalCheckpoints } = calculateTotalStats(themes);

     themes.forEach((theme, ti) => {
       const { done, points } = calculateThemeStats(theme.checkpoints);
       const endDateStr = theme.end_date ? `  |  Fim: ${theme.end_date}` : '';

       doc.fontSize(15).font('Helvetica-Bold').fillColor('#000').text(`Tema ${ti + 1}: ${theme.name}`);
       doc.fontSize(10).font('Helvetica').fillColor('#444').text(`${done}/${theme.checkpoints.length} concluídos · ${points} pontos${endDateStr}`);
       doc.moveDown(0.5);

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
         doc.text(String(ci + 1),                tableX + 4,                                          y + 4, { width: cols.pos })
            .text(cp.title,                       tableX + cols.pos,                                   y + 4, { width: cols.title - 4 })
            .text(TYPE_LABELS[cp.type] || cp.type, tableX + cols.pos + cols.title,                     y + 4, { width: cols.type })
            .text(STATUS_LABELS[cp.status] || cp.status, tableX + cols.pos + cols.title + cols.type,  y + 4, { width: cols.pts })
            .text(String(cp.points || 0),         tableX + cols.pos + cols.title + cols.type + cols.pts, y + 4, { width: cols.pts })
            .text((cp.notes || '').slice(0, 40),  tableX + cols.pos + cols.title + cols.type + cols.pts * 2, y + 4, { width: cols.notes });
         y += rowH;
         if (y > 740) { doc.addPage(); y = 50; }
       });

       doc.moveDown(1.5);
       y = doc.y;
     });

     const { totalPoints, totalDone } = calculateTotalStats(themes);
     doc.fontSize(13).font('Helvetica-Bold').fillColor('#000').text('Resumo Geral');
     doc.fontSize(11).font('Helvetica').fillColor('#333');
     doc.text(`Total de checkpoints concluídos: ${totalDone}/${totalCheckpoints}`);
     doc.text(`Total de pontos acumulados: ${totalPoints}`);

      doc.end();
    } catch (err) {
      logger.error('PDF report generation error', {
        message: err && err.message,
        stack: err && err.stack,
      });
      res.status(500).json({ error: 'Failed to generate PDF report' });
    }
  });

// DOCX
router.get('/docx', async (req, res) => {
   try {
     const data = await loadReportData(req);
     if (!data) return res.status(400).json({ error: 'No configuration found' });

     const { pdi, themes } = data;
     const children = [];

     children.push(new Paragraph({ text: 'PDI Board — Relatório', heading: HeadingLevel.TITLE }));
     children.push(new Paragraph({ text: pdi.title, heading: HeadingLevel.HEADING_2 }));
     children.push(new Paragraph({ text: `Início: ${pdi.start_date} | Gerado: ${new Date().toLocaleDateString('pt-BR')}` }));
     children.push(new Paragraph({ text: '' }));

     const { totalCheckpoints } = calculateTotalStats(themes);

     themes.forEach((theme, ti) => {
       const { done, points } = calculateThemeStats(theme.checkpoints);
       const endDateStr = theme.end_date ? `  |  Fim: ${theme.end_date}` : '';

       children.push(new Paragraph({ text: `Tema ${ti + 1}: ${theme.name}`, heading: HeadingLevel.HEADING_1 }));
       children.push(new Paragraph({ text: `${done}/${theme.checkpoints.length} concluídos · ${points} pontos${endDateStr}` }));
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

       children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [headerRow, ...dataRows] }));
       children.push(new Paragraph({ text: '' }));
     });

     const { totalPoints, totalDone } = calculateTotalStats(themes);
     children.push(new Paragraph({ text: 'Resumo Geral', heading: HeadingLevel.HEADING_1 }));
     children.push(new Paragraph({ text: `Total checkpoints concluídos: ${totalDone}/${totalCheckpoints}` }));
     children.push(new Paragraph({ text: `Total de pontos: ${totalPoints}` }));

     const doc = new Document({ sections: [{ children }] });
     const buffer = await Packer.toBuffer(doc);

     res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
     res.setHeader('Content-Disposition', 'attachment; filename="pdi-report.docx"');
      res.send(buffer);
    } catch (err) {
      logger.error('DOCX report generation error', {
        message: err && err.message,
        stack: err && err.stack,
      });
      res.status(500).json({ error: 'Failed to generate DOCX report' });
    }
  });

// XLSX
router.get('/xlsx', async (req, res) => {
   try {
     const data = await loadReportData(req);
     if (!data) return res.status(400).json({ error: 'No configuration found' });

     const { themes } = data;
     const workbook = new ExcelJS.Workbook();
     workbook.creator = 'PDI Board';
     workbook.created = new Date();

     const summary = workbook.addWorksheet('Resumo');
     summary.columns = [
       { header: 'Tema', key: 'theme', width: 30 },
       { header: 'Data Final', key: 'endDate', width: 12 },
       { header: 'Concluídos', key: 'done', width: 12 },
       { header: 'Total', key: 'total', width: 8 },
       { header: 'Pontos', key: 'points', width: 10 },
       { header: '% Progresso', key: 'pct', width: 14 },
     ];
     summary.getRow(1).font = { bold: true };

     themes.forEach(theme => {
       const { done, points, total } = calculateThemeStats(theme.checkpoints);
       summary.addRow({ theme: theme.name, endDate: theme.end_date || '', done, total, points, pct: `${Math.round(done / total * 100)}%` });
     });

     themes.forEach((theme, ti) => {
       const ws = workbook.addWorksheet(`Tema ${ti + 1}`);
       const { done, points, total } = calculateThemeStats(theme.checkpoints);
       const endDateStr = theme.end_date ? `  ·  Data Final: ${theme.end_date}` : '';
       ws.pageSetup = { orientation: 'portrait', paperSize: 'letter' };
       
       // Add header with theme name and stats
       ws.mergeCells('A1:H1');
       const titleCell = ws.getCell('A1');
       titleCell.value = `${theme.name}${endDateStr}`;
       titleCell.font = { bold: true, size: 14 };
       titleCell.alignment = { horizontal: 'center' };
       
       ws.mergeCells('A2:H2');
       const statsCell = ws.getCell('A2');
       statsCell.value = `${done}/${total} concluídos · ${points} pontos`;
       statsCell.font = { italic: true, size: 11 };
       statsCell.alignment = { horizontal: 'center' };
       
       ws.addRow({});
       
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
       ws.getRow(4).font = { bold: true };
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
    } catch (err) {
      logger.error('XLSX report generation error', {
        message: err && err.message,
        stack: err && err.stack,
      });
      res.status(500).json({ error: 'Failed to generate XLSX report' });
    }
  });

module.exports = router;
