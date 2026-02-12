import { getEmployees, saveEmployees, getSettings, saveSettings, getRecords, saveRecords, getImportHistory } from './storage';

const CONFIG_VERSION = 1;
const APP_ID_CURRENT = 'MS Ponto V1.0';
const APP_ID_LEGACY = 'Ponto System';

/**
 * Exporta todas as configurações e dados para um arquivo JSON
 */
export function exportConfig() {
  const data = {
    _version: CONFIG_VERSION,
    _exportedAt: new Date().toISOString(),
    _app: APP_ID_CURRENT,
    employees: getEmployees(),
    settings: getSettings(),
    records: getRecords().map(r => ({
      ...r,
      date: r.date instanceof Date ? r.date.toISOString() : r.date,
      firstEntry: r.firstEntry instanceof Date ? r.firstEntry.toISOString() : r.firstEntry,
      lastExit: r.lastExit instanceof Date ? r.lastExit.toISOString() : r.lastExit,
      allPunches: (r.allPunches || []).map(p => p instanceof Date ? p.toISOString() : p),
    })),
    importHistory: getImportHistory(),
  };

  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;

  const settings = getSettings();
  const safeName = (settings.companyName || 'ponto').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
  link.download = `config_${safeName}_${new Date().toISOString().split('T')[0]}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Importa configurações de um arquivo JSON
 * Retorna { success, message, data }
 */
export function importConfig(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);

        if (!data._app || (data._app !== APP_ID_CURRENT && data._app !== APP_ID_LEGACY)) {
          resolve({ success: false, message: `Arquivo nao e uma configuracao valida do ${APP_ID_CURRENT}.` });
          return;
        }

        const result = { employees: 0, records: 0, settings: false };

        // Importar funcionarios
        if (Array.isArray(data.employees) && data.employees.length > 0) {
          const existing = getEmployees();
          const existingPis = new Set(existing.map(e => e.pis));
          let merged = [...existing];

          for (const emp of data.employees) {
            if (!emp.pis) continue;
            const idx = merged.findIndex(e => e.pis === emp.pis);
            if (idx >= 0) {
              merged[idx] = { ...merged[idx], ...emp };
            } else {
              merged.push(emp);
            }
            result.employees++;
          }
          saveEmployees(merged);
        }

        // Importar configuracoes
        if (data.settings && typeof data.settings === 'object') {
          const current = getSettings();
          saveSettings({ ...current, ...data.settings });
          result.settings = true;
        }

        // Importar registros
        if (Array.isArray(data.records) && data.records.length > 0) {
          const parsed = data.records.map(r => ({
            ...r,
            date: new Date(r.date),
            firstEntry: r.firstEntry ? new Date(r.firstEntry) : null,
            lastExit: r.lastExit ? new Date(r.lastExit) : null,
            allPunches: (r.allPunches || []).map(p => new Date(p)),
          }));

          const existing = getRecords();
          const merged = [...existing];

          for (const rec of parsed) {
            const key = `${rec.pis}_${rec.date.toISOString().split('T')[0]}`;
            const idx = merged.findIndex(r => `${r.pis}_${r.date.toISOString().split('T')[0]}` === key);
            if (idx >= 0) {
              merged[idx] = rec;
            } else {
              merged.push(rec);
            }
            result.records++;
          }
          saveRecords(merged);
        }

        const parts = [];
        if (result.employees > 0) parts.push(`${result.employees} funcionarios`);
        if (result.records > 0) parts.push(`${result.records} registros`);
        if (result.settings) parts.push('configuracoes');

        resolve({
          success: true,
          message: `Importado com sucesso: ${parts.join(', ')}.`,
          data: result,
        });

      } catch (err) {
        resolve({ success: false, message: `Erro ao ler arquivo: ${err.message}` });
      }
    };
    reader.readAsText(file);
  });
}

/**
 * Exporta apenas os funcionários (sem registros de ponto)
 */
export function exportEmployeesOnly() {
  const data = {
    _version: CONFIG_VERSION,
    _exportedAt: new Date().toISOString(),
    _app: APP_ID_CURRENT,
    employees: getEmployees(),
    settings: getSettings(),
  };

  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `funcionarios_${new Date().toISOString().split('T')[0]}.json`;
  link.click();
  URL.revokeObjectURL(url);
}
