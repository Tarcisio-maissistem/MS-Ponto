import { getSettings, getEmployees } from './storage';

function timeToMinutes(date) {
  return date.getHours() * 60 + date.getMinutes();
}

function parseTime(str) {
  const [h, m] = str.split(':').map(Number);
  return h * 60 + m;
}

function getEmployeeSchedule(pis) {
  const employees = getEmployees();
  const emp = employees.find(e => e.pis === pis);
  const settings = getSettings();

  if (emp && emp.startTime && emp.endTime) {
    const start = parseTime(emp.startTime);
    const end = parseTime(emp.endTime);
    return {
      startMinutes: start,
      endMinutes: end,
      workMinutes: emp.workMinutes || (end - start - (emp.lunchMinutes || 60)),
      tolerance: emp.tolerance ?? settings.toleranceMinutes,
    };
  }

  return {
    startMinutes: parseTime(settings.defaultStartTime),
    endMinutes: parseTime(settings.defaultEndTime),
    workMinutes: settings.defaultWorkMinutes,
    tolerance: settings.toleranceMinutes,
  };
}

// Processar todas as batidas em registros diários
export function processRecords(punches) {
  const grouped = {};
  const nameMap = {};

  punches.forEach(p => {
    if (p.name) nameMap[p.pis] = p.name;
    const dateKey = p.datetime.toISOString().split('T')[0];
    const key = `${p.pis}_${dateKey}`;

    if (!grouped[key]) {
      grouped[key] = { pis: p.pis, dateKey, punches: [] };
    }
    grouped[key].punches.push(p.datetime);
  });

  const records = Object.values(grouped).map(g => {
    // Deduplicar batidas no mesmo minuto
    const unique = [];
    const seen = new Set();
    g.punches.sort((a, b) => a - b).forEach(p => {
      const k = `${p.getHours()}:${p.getMinutes()}`;
      if (!seen.has(k)) {
        seen.add(k);
        unique.push(p);
      }
    });

    return calculateDay(g.pis, g.dateKey, unique, nameMap[g.pis] || '');
  });

  return records.sort((a, b) => {
    if (a.pis !== b.pis) return a.pis.localeCompare(b.pis);
    return a.date - b.date;
  });
}

// Calcular métricas de um dia usando PARES de batidas
export function calculateDay(pis, dateKey, sortedPunches, name) {
  const schedule = getEmployeeSchedule(pis);
  const date = new Date(dateKey);
  const allPunches = [...sortedPunches];

  if (sortedPunches.length === 0) {
    return {
      pis, name, date,
      firstEntry: null, lastExit: null,
      allPunches: [], punchCount: 0,
      workedMinutes: 0, lateMinutes: 0, earlyMinutes: 0,
      extraMinutes: 0, saldo: 0, lunchMinutes: 0,
      status: 'absent', hasInconsistency: true,
      inconsistencyMsg: 'Sem batidas',
    };
  }

  const firstEntry = sortedPunches[0];
  const lastExit = sortedPunches[sortedPunches.length - 1];
  const hasOddPunches = sortedPunches.length % 2 !== 0;

  // Calcular horas trabalhadas usando PARES de batidas
  let workedMinutes = 0;
  let lunchMinutes = 0;

  if (sortedPunches.length >= 2) {
    for (let i = 0; i < sortedPunches.length - 1; i += 2) {
      const entrada = sortedPunches[i];
      const saida = sortedPunches[i + 1];
      if (saida) {
        workedMinutes += (saida - entrada) / (1000 * 60);
      }
    }

    // Calcular intervalo de almoço (entre 1º par e 2º par)
    if (sortedPunches.length >= 4) {
      const saidaAlmoco = sortedPunches[1];
      const retornoAlmoco = sortedPunches[2];
      lunchMinutes = Math.round((retornoAlmoco - saidaAlmoco) / (1000 * 60));
    }
  } else {
    // Apenas 1 batida - não dá para calcular
    workedMinutes = 0;
  }

  workedMinutes = Math.max(0, Math.round(workedMinutes));

  // Atraso (entrada após horário + tolerância)
  const entryMinutes = timeToMinutes(firstEntry);
  let lateMinutes = entryMinutes - schedule.startMinutes - schedule.tolerance;
  lateMinutes = Math.max(0, Math.round(lateMinutes));

  // Saída antecipada
  const exitMinutes = timeToMinutes(lastExit);
  let earlyMinutes = schedule.endMinutes - exitMinutes - schedule.tolerance;
  earlyMinutes = Math.max(0, Math.round(earlyMinutes));

  // Saldo = trabalhado - jornada padrão
  const saldo = workedMinutes - schedule.workMinutes;

  // Hora extra (saldo positivo)
  const extraMinutes = Math.max(0, saldo);

  // Status
  let status = 'normal';
  if (hasOddPunches) status = 'inconsistent';
  else if (lateMinutes > 0 && extraMinutes === 0) status = 'late';
  else if (earlyMinutes > 0 && extraMinutes === 0) status = 'early';
  else if (extraMinutes > 0) status = 'extra';

  // Inconsistências
  let hasInconsistency = hasOddPunches;
  let inconsistencyMsg = '';
  if (hasOddPunches) inconsistencyMsg = 'Batida ímpar (faltando entrada ou saída)';
  if (workedMinutes > 840) {
    hasInconsistency = true;
    inconsistencyMsg = 'Jornada acima de 14h - verificar';
  }

  return {
    pis, name, date,
    firstEntry, lastExit, allPunches,
    punchCount: allPunches.length,
    workedMinutes, lateMinutes, earlyMinutes,
    extraMinutes, saldo, lunchMinutes,
    status, hasInconsistency, inconsistencyMsg,
  };
}

// Resumo por funcionário
export function calculateSummary(records) {
  const byEmployee = {};

  records.forEach(r => {
    if (!byEmployee[r.pis]) {
      byEmployee[r.pis] = {
        pis: r.pis, name: r.name || '',
        days: 0, totalWorked: 0, totalLate: 0,
        totalEarly: 0, totalExtra: 0, totalSaldo: 0,
        lateCount: 0, earlyCount: 0, inconsistencyCount: 0,
      };
    }

    const e = byEmployee[r.pis];
    e.days++;
    e.totalWorked += r.workedMinutes;
    e.totalLate += r.lateMinutes;
    e.totalEarly += r.earlyMinutes;
    e.totalExtra += r.extraMinutes;
    e.totalSaldo += r.saldo;
    if (r.lateMinutes > 0) e.lateCount++;
    if (r.earlyMinutes > 0) e.earlyCount++;
    if (r.hasInconsistency) e.inconsistencyCount++;
  });

  return Object.values(byEmployee);
}
