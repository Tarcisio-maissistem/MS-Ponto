import { colors } from '../styles/theme';

export default function DateFilter({ startDate, endDate, onStartChange, onEndChange }) {
  const today = new Date();
  const todayISO = today.toISOString().split('T')[0];

  const setPreset = (preset) => {
    const d = new Date();
    let start, end;

    switch (preset) {
      case 'today':
        start = end = todayISO;
        break;
      case 'week': {
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(d.setDate(diff));
        start = monday.toISOString().split('T')[0];
        end = todayISO;
        break;
      }
      case 'month':
        start = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
        end = todayISO;
        break;
      case 'lastMonth': {
        const lm = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lmEnd = new Date(today.getFullYear(), today.getMonth(), 0);
        start = lm.toISOString().split('T')[0];
        end = lmEnd.toISOString().split('T')[0];
        break;
      }
      case 'all':
        start = '';
        end = '';
        break;
      default: return;
    }

    onStartChange(start);
    onEndChange(end);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 12, color: colors.textMuted, fontWeight: 600 }}>Período:</span>
      <input type="date" className="input input-sm" value={startDate} onChange={e => onStartChange(e.target.value)}
        style={{ colorScheme: 'dark' }} />
      <span style={{ color: colors.textDark }}>a</span>
      <input type="date" className="input input-sm" value={endDate} onChange={e => onEndChange(e.target.value)}
        style={{ colorScheme: 'dark' }} />
      <div style={{ display: 'flex', gap: 4 }}>
        {[
          ['today', 'Hoje'], ['week', 'Semana'], ['month', 'Mês'],
          ['lastMonth', 'Mês Ant.'], ['all', 'Tudo'],
        ].map(([key, label]) => (
          <button key={key} className="btn btn-outline btn-sm" onClick={() => setPreset(key)}>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
