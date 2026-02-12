// Parser de arquivo AFD - suporta Portaria 1510 e Portaria 671 (REP-P)
export function parseAFD(content) {
  const lines = content.split('\n');
  const punches = [];
  const names = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 30) continue;
    if (trimmed.startsWith('999999999')) continue;

    // ========== FORMATO PORTARIA 671 (REP-P) ==========
    const isoMatch = trimmed.match(/^\d{10}(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{4})/);
    if (isoMatch) {
      const isoDateStr = isoMatch[1];
      const dt = new Date(isoDateStr);
      if (isNaN(dt.getTime())) continue;

      const afterDatetime = trimmed.substring(34);

      // Registro tipo "A" = autorização com nome do funcionário
      const aMatch = afterDatetime.match(/^A(\d{9,11})\s+(.+?)(?:\s{2,}|\s+\d{3,})/);
      if (aMatch) {
        const pis = aMatch[1];
        const name = aMatch[2].trim();
        if (name) names[pis] = name;
        continue;
      }

      // Registro de batida confirmada (ponto)
      const punchMatch = afterDatetime.match(/^(\d{9,11})\s+[A-F0-9]{4}$/i);
      if (punchMatch) {
        const pis = punchMatch[1];
        punches.push({ pis, datetime: dt, name: names[pis] || '' });
        continue;
      }
      continue;
    }

    // ========== FORMATO PORTARIA 1510 (legado) ==========
    if (trimmed.length >= 34 && trimmed[9] === '3') {
      const dateStr = trimmed.substring(10, 18);
      const timeStr = trimmed.substring(18, 22);
      const pis = trimmed.substring(22, 34).trim();

      const day = parseInt(dateStr.substring(0, 2));
      const month = parseInt(dateStr.substring(2, 4)) - 1;
      const year = parseInt(dateStr.substring(4, 8));
      const hour = parseInt(timeStr.substring(0, 2));
      const minute = parseInt(timeStr.substring(2, 4));

      const dt = new Date(year, month, day, hour, minute);
      if (!isNaN(dt.getTime())) {
        punches.push({ pis, datetime: dt });
      }
    }
  }

  punches.forEach(p => {
    if (!p.name && names[p.pis]) p.name = names[p.pis];
  });

  return { punches, names };
}
