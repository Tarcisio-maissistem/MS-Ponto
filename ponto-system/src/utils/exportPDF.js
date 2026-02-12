import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatTime, formatHour, formatDate, getDayOfWeek, getMonthName } from './formatters';
import { getSettings } from './storage';

const STATUS_LABELS = {
  normal: 'Normal', late: 'Atraso', early: 'Saída Antec.',
  extra: 'Hora Extra', inconsistent: 'Inconsistente', absent: 'Ausente',
};

/**
 * Exporta relatório PDF completo para contabilidade
 */
export function exportPDF(records, summary, filters = {}) {
  const settings = getSettings();
  const companyName = settings.companyName || 'Empresa';

  let filtered = records;
  if (filters.pis) filtered = filtered.filter(r => r.pis === filters.pis);
  if (filters.startDate) {
    const s = new Date(filters.startDate); s.setHours(0, 0, 0, 0);
    filtered = filtered.filter(r => r.date >= s);
  }
  if (filters.endDate) {
    const e = new Date(filters.endDate); e.setHours(23, 59, 59, 999);
    filtered = filtered.filter(r => r.date <= e);
  }

  const filteredSummary = filters.pis
    ? summary.filter(s => s.pis === filters.pis)
    : summary;

  // Determinar período
  let periodoText = 'Todos os registros';
  if (filters.startDate && filters.endDate) {
    periodoText = `${formatDateBR(filters.startDate)} a ${formatDateBR(filters.endDate)}`;
  } else if (filters.startDate) {
    periodoText = `A partir de ${formatDateBR(filters.startDate)}`;
  } else if (filters.endDate) {
    periodoText = `Até ${formatDateBR(filters.endDate)}`;
  }
  if (filters.monthName) {
    periodoText = filters.monthName;
  }

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // ============ PÁGINA 1: RESUMO POR FUNCIONÁRIO ============
  addHeader(doc, companyName, 'RELATÓRIO DE PONTO - RESUMO', periodoText, pageWidth);

  if (filteredSummary.length > 0) {
    autoTable(doc, {
      startY: 42,
      head: [['Funcionário', 'PIS/CPF', 'Dias', 'Total Trab.', 'Atrasos', 'Tot. Atrasos', 'Saídas Ant.', 'H. Extras', 'Saldo']],
      body: filteredSummary.map(s => [
        s.name || '-',
        s.pis,
        s.days,
        formatTime(s.totalWorked),
        s.lateCount,
        formatTime(s.totalLate),
        s.earlyCount,
        formatTime(s.totalExtra),
        `${s.totalSaldo >= 0 ? '+' : ''}${formatTime(s.totalSaldo)}`,
      ]),
      styles: { fontSize: 8, cellPadding: 2, font: 'helvetica' },
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 30, font: 'courier' },
        2: { halign: 'center', cellWidth: 15 },
        3: { halign: 'center', cellWidth: 25, font: 'courier' },
        4: { halign: 'center', cellWidth: 18 },
        5: { halign: 'center', cellWidth: 25, font: 'courier' },
        6: { halign: 'center', cellWidth: 20 },
        7: { halign: 'center', cellWidth: 25, font: 'courier' },
        8: { halign: 'center', cellWidth: 25, font: 'courier', fontStyle: 'bold' },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 8) {
          const val = data.cell.raw;
          if (val.startsWith('+')) data.cell.styles.textColor = [16, 185, 129];
          else if (val.startsWith('-')) data.cell.styles.textColor = [239, 68, 68];
        }
        if (data.section === 'body' && data.column.index === 4) {
          if (parseInt(data.cell.raw) > 0) data.cell.styles.textColor = [245, 158, 11];
        }
      },
    });

    // Totais gerais
    const totalWorked = filteredSummary.reduce((a, s) => a + s.totalWorked, 0);
    const totalLate = filteredSummary.reduce((a, s) => a + s.totalLate, 0);
    const totalExtra = filteredSummary.reduce((a, s) => a + s.totalExtra, 0);
    const totalSaldo = filteredSummary.reduce((a, s) => a + s.totalSaldo, 0);

    const finalY = doc.lastAutoTable.finalY + 6;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(`TOTAIS GERAIS  |  Trabalhado: ${formatTime(totalWorked)}  |  Atrasos: ${formatTime(totalLate)}  |  Extras: ${formatTime(totalExtra)}  |  Saldo: ${totalSaldo >= 0 ? '+' : ''}${formatTime(totalSaldo)}`, 14, finalY);
  }

  addFooter(doc, pageWidth, pageHeight);

  // ============ PÁGINAS SEGUINTES: DETALHAMENTO POR FUNCIONÁRIO ============
  const byEmployee = {};
  filtered.forEach(r => {
    if (!byEmployee[r.pis]) byEmployee[r.pis] = { name: r.name || r.pis, pis: r.pis, records: [] };
    byEmployee[r.pis].records.push(r);
  });

  Object.values(byEmployee).forEach(emp => {
    emp.records.sort((a, b) => a.date - b.date);
    doc.addPage('landscape');

    addHeader(doc, companyName, `FOLHA DE PONTO - ${emp.name.toUpperCase()}`, `PIS/CPF: ${emp.pis}  |  ${periodoText}`, pageWidth);

    // Resumo individual
    const empSummary = filteredSummary.find(s => s.pis === emp.pis);
    if (empSummary) {
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(
        `Dias: ${empSummary.days}  |  Trabalhado: ${formatTime(empSummary.totalWorked)}  |  Atrasos: ${empSummary.lateCount} (${formatTime(empSummary.totalLate)})  |  Extras: ${formatTime(empSummary.totalExtra)}  |  Saldo: ${empSummary.totalSaldo >= 0 ? '+' : ''}${formatTime(empSummary.totalSaldo)}`,
        14, 40
      );
    }

    autoTable(doc, {
      startY: 44,
      head: [['Data', 'Dia', 'Entrada 1', 'Saída 1', 'Entrada 2', 'Saída 2', 'Almoço', 'Trabalhado', 'Atraso', 'H. Extra', 'Saldo', 'Status']],
      body: emp.records.map(r => {
        const p = r.allPunches || [];
        return [
          formatDate(r.date),
          getDayOfWeek(r.date),
          formatHour(p[0]),
          formatHour(p[1]),
          formatHour(p[2]),
          formatHour(p[3]),
          r.lunchMinutes ? formatTime(r.lunchMinutes) : '--:--',
          formatTime(r.workedMinutes),
          formatTime(r.lateMinutes),
          formatTime(r.extraMinutes),
          `${r.saldo >= 0 ? '+' : ''}${formatTime(r.saldo)}`,
          STATUS_LABELS[r.status] || r.status,
        ];
      }),
      styles: { fontSize: 7, cellPadding: 1.8, font: 'helvetica' },
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 6.5 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: {
        0: { cellWidth: 22, font: 'courier' },
        1: { cellWidth: 12, halign: 'center' },
        2: { cellWidth: 18, halign: 'center', font: 'courier' },
        3: { cellWidth: 18, halign: 'center', font: 'courier' },
        4: { cellWidth: 18, halign: 'center', font: 'courier' },
        5: { cellWidth: 18, halign: 'center', font: 'courier' },
        6: { cellWidth: 18, halign: 'center', font: 'courier' },
        7: { cellWidth: 22, halign: 'center', font: 'courier' },
        8: { cellWidth: 18, halign: 'center', font: 'courier' },
        9: { cellWidth: 18, halign: 'center', font: 'courier' },
        10: { cellWidth: 20, halign: 'center', font: 'courier', fontStyle: 'bold' },
        11: { cellWidth: 25, halign: 'center', fontSize: 6.5 },
      },
      didParseCell: (data) => {
        if (data.section === 'body') {
          // Colorir saldo
          if (data.column.index === 10) {
            const val = data.cell.raw;
            if (val.startsWith('+') && val !== '+00:00') data.cell.styles.textColor = [16, 185, 129];
            else if (val.startsWith('-')) data.cell.styles.textColor = [239, 68, 68];
          }
          // Colorir atraso
          if (data.column.index === 8 && data.cell.raw !== '00:00') {
            data.cell.styles.textColor = [245, 158, 11];
          }
          // Colorir status
          if (data.column.index === 11) {
            const status = data.cell.raw;
            if (status === 'Atraso') data.cell.styles.textColor = [245, 158, 11];
            else if (status === 'Inconsistente') data.cell.styles.textColor = [239, 68, 68];
            else if (status === 'Hora Extra') data.cell.styles.textColor = [59, 130, 246];
            else if (status === 'Ausente') data.cell.styles.textColor = [156, 163, 175];
          }
        }
      },
    });

    // Linha de assinatura
    const signY = Math.min(doc.lastAutoTable.finalY + 20, pageHeight - 30);
    doc.setDrawColor(150, 150, 150);
    doc.setLineWidth(0.3);
    doc.line(14, signY, 100, signY);
    doc.line(pageWidth - 100, signY, pageWidth - 14, signY);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text('Assinatura do Funcionário', 14, signY + 4);
    doc.text('Assinatura do Responsável', pageWidth - 100, signY + 4);

    addFooter(doc, pageWidth, pageHeight);
  });

  // Gerar nome do arquivo
  const dateStr = new Date().toISOString().split('T')[0];
  const safeName = companyName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
  doc.save(`Relatorio_Ponto_${safeName}_${dateStr}.pdf`);
}

/**
 * Exporta folha de ponto mensal de um funcionário específico
 */
export function exportMonthlyPDF(records, employeeSummary, monthName) {
  exportPDF(records, employeeSummary ? [employeeSummary] : [], { monthName });
}

// ============ Helpers ============

function addHeader(doc, companyName, title, subtitle, pageWidth) {
  // Barra azul no topo
  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, pageWidth, 24, 'F');

  // Linha accent
  doc.setFillColor(59, 130, 246);
  doc.rect(0, 24, pageWidth, 1.5, 'F');

  // Nome da empresa
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text(companyName.toUpperCase(), 14, 11);

  // Título do relatório
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(200, 210, 225);
  doc.text(title, 14, 18);

  // Data de emissão
  doc.setFontSize(7);
  doc.text(`Emitido em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, pageWidth - 14, 11, { align: 'right' });

  // Período
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 60, 60);
  doc.text(`Período: ${subtitle}`, 14, 32);
}

function addFooter(doc, pageWidth, pageHeight) {
  const pageNum = doc.internal.getNumberOfPages();
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(160, 160, 160);
  doc.text(`MS Ponto V1.0 - Relatorio gerado automaticamente`, 14, pageHeight - 6);
  doc.text(`Pagina ${pageNum}`, pageWidth - 14, pageHeight - 6, { align: 'right' });
}

function formatDateBR(isoStr) {
  if (!isoStr) return '';
  const [y, m, d] = isoStr.split('-');
  return `${d}/${m}/${y}`;
}
