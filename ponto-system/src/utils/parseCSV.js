export function parseCSV(content) {
  const lines = content.split('\n');
  const punches = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const sep = trimmed.includes(';') ? ';' : ',';
    const parts = trimmed.split(sep);

    if (parts.length >= 3) {
      const pis = parts[0].replace(/\D/g, '');
      const dateStr = parts[1].trim();
      const timeStr = parts[2].trim();

      let dt = null;
      const dateParts = dateStr.split(/[/\-]/);
      if (dateParts.length === 3) {
        const [d, m, y] = dateParts.map(Number);
        const timeParts = timeStr.split(':').map(Number);
        dt = new Date(y, m - 1, d, timeParts[0] || 0, timeParts[1] || 0);
      }

      if (dt && !isNaN(dt.getTime()) && pis.length >= 9) {
        punches.push({ pis, datetime: dt, name: '' });
      }
    }
  }
  return { punches, names: {} };
}
