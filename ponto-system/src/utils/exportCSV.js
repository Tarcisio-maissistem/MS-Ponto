import { formatTime, formatHour, formatDate } from './formatters';

export function exportToCSV(records, summary, filters = {}) {
  let filtered = records;

  if (filters.pis) {
    filtered = filtered.filter(r => r.pis === filters.pis);
  }
  if (filters.startDate) {
    const start = new Date(filters.startDate);
    start.setHours(0, 0, 0, 0);
    filtered = filtered.filter(r => r.date >= start);
  }
  if (filters.endDate) {
    const end = new Date(filters.endDate);
    end.setHours(23, 59, 59, 999);
    filtered = filtered.filter(r => r.date <= end);
  }

  const filteredSummary = filters.pis
    ? summary.filter(s => s.pis === filters.pis)
    : summary;

  const detailHeaders = ['PIS/CPF', 'Nome', 'Data', 'Entrada 1', 'Saída 1', 'Entrada 2', 'Saída 2',
    'Trabalhado', 'Almoço', 'Atraso', 'Saída Antec.', 'H.Extra', 'Saldo', 'Status'];

  const detailRows = filtered.map(r => {
    const p = r.allPunches || [];
    return [
      r.pis, r.name || '', formatDate(r.date),
      formatHour(p[0]), formatHour(p[1]), formatHour(p[2]), formatHour(p[3]),
      formatTime(r.workedMinutes), formatTime(r.lunchMinutes),
      formatTime(r.lateMinutes), formatTime(r.earlyMinutes),
      formatTime(r.extraMinutes), formatTime(r.saldo),
      statusLabel(r.status),
    ];
  });

  const summaryHeaders = ['PIS/CPF', 'Nome', 'Dias', 'Total Trabalhado',
    'Qtd Atrasos', 'Total Atrasos', 'Qtd Saídas Antec.', 'Total Extras', 'Saldo Banco'];

  const summaryRows = filteredSummary.map(s => [
    s.pis, s.name || '', s.days, formatTime(s.totalWorked),
    s.lateCount, formatTime(s.totalLate),
    s.earlyCount, formatTime(s.totalExtra), formatTime(s.totalSaldo),
  ]);

  let csv = 'REGISTROS DETALHADOS\n';
  csv += detailHeaders.join(';') + '\n';
  csv += detailRows.map(r => r.join(';')).join('\n');
  csv += '\n\n\nRESUMO POR FUNCIONÁRIO\n';
  csv += summaryHeaders.join(';') + '\n';
  csv += summaryRows.map(r => r.join(';')).join('\n');

  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `relatorio_ponto_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function statusLabel(status) {
  const map = {
    normal: 'Normal', late: 'Atraso', early: 'Saída Antec.',
    extra: 'Hora Extra', inconsistent: 'Inconsistente', absent: 'Ausente',
  };
  return map[status] || status;
}
