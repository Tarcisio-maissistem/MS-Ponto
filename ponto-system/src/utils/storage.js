const KEYS = {
  EMPLOYEES: 'ponto_employees',
  RECORDS: 'ponto_records',
  SETTINGS: 'ponto_settings',
  IMPORTED: 'ponto_imported',
};

function safeGet(key, fallback) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('localStorage cheio ou indisponível:', e);
  }
}

// ======= FUNCIONÁRIOS =======

export function getEmployees() {
  return safeGet(KEYS.EMPLOYEES, []);
}

export function saveEmployees(employees) {
  safeSet(KEYS.EMPLOYEES, employees);
}

export function addEmployee(emp) {
  const list = getEmployees();
  const exists = list.find(e => e.pis === emp.pis);
  if (exists) {
    Object.assign(exists, emp);
  } else {
    list.push({ ...emp, active: true, createdAt: new Date().toISOString() });
  }
  saveEmployees(list);
  return list;
}

export function removeEmployee(pis) {
  const list = getEmployees().filter(e => e.pis !== pis);
  saveEmployees(list);
  return list;
}

// ======= REGISTROS =======

export function getRecords() {
  const records = safeGet(KEYS.RECORDS, []);
  return records.map(r => ({
    ...r,
    date: new Date(r.date),
    firstEntry: r.firstEntry ? new Date(r.firstEntry) : null,
    lastExit: r.lastExit ? new Date(r.lastExit) : null,
    allPunches: (r.allPunches || []).map(p => new Date(p)),
  }));
}

export function saveRecords(records) {
  const serializable = records.map(r => ({
    ...r,
    date: r.date instanceof Date ? r.date.toISOString() : r.date,
    firstEntry: r.firstEntry instanceof Date ? r.firstEntry.toISOString() : r.firstEntry,
    lastExit: r.lastExit instanceof Date ? r.lastExit.toISOString() : r.lastExit,
    allPunches: (r.allPunches || []).map(p => p instanceof Date ? p.toISOString() : p),
  }));
  safeSet(KEYS.RECORDS, serializable);
}

export function mergeRecords(newRecords) {
  const existing = getRecords();
  const merged = [...existing];

  for (const rec of newRecords) {
    const key = `${rec.pis}_${rec.date.toISOString().split('T')[0]}`;
    const idx = merged.findIndex(r => `${r.pis}_${r.date.toISOString().split('T')[0]}` === key);
    if (idx >= 0) {
      merged[idx] = rec;
    } else {
      merged.push(rec);
    }
  }

  saveRecords(merged);
  return merged;
}

export function updateRecord(updatedRecord) {
  const records = getRecords();
  const key = `${updatedRecord.pis}_${updatedRecord.date.toISOString().split('T')[0]}`;
  const idx = records.findIndex(r => `${r.pis}_${r.date.toISOString().split('T')[0]}` === key);
  if (idx >= 0) {
    records[idx] = updatedRecord;
  } else {
    records.push(updatedRecord);
  }
  saveRecords(records);
  return records;
}

// ======= CONFIGURAÇÕES =======

export const DEFAULT_SETTINGS = {
  companyName: '',
  defaultStartTime: '08:00',
  defaultEndTime: '17:48',
  defaultWorkMinutes: 528,
  toleranceMinutes: 10,
  lunchBreakMinutes: 60,
};

export function getSettings() {
  return { ...DEFAULT_SETTINGS, ...safeGet(KEYS.SETTINGS, {}) };
}

export function saveSettings(settings) {
  safeSet(KEYS.SETTINGS, settings);
}

// ======= IMPORTAÇÕES =======

export function getImportHistory() {
  return safeGet(KEYS.IMPORTED, []);
}

export function addImportHistory(entry) {
  const list = getImportHistory();
  list.push({ ...entry, date: new Date().toISOString() });
  if (list.length > 50) list.shift();
  safeSet(KEYS.IMPORTED, list);
}

// ======= LIMPAR =======

export function clearAllData() {
  Object.values(KEYS).forEach(k => localStorage.removeItem(k));
}
