import { useState, useMemo } from 'react';
import { Edit3 } from 'lucide-react';
import StatusBadge from './StatusBadge';
import PunchEditor from './PunchEditor';
import { formatTime, formatHour, formatDate, getDayOfWeek } from '../utils/formatters';
import { colors, fonts } from '../styles/theme';

const PAGE_SIZE = 30;

export default function PunchTable({ records, showSummary = false, summary = [], onRecordsUpdate }) {
  const [sortCol, setSortCol] = useState('date');
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState(null);

  const toggleSort = (col) => {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
    setPage(0);
  };

  const arrow = (col) => sortCol === col ? (sortDir === 'asc' ? ' \u25B2' : ' \u25BC') : '';

  // Detail view
  const sortedRecords = useMemo(() => {
    const sorted = [...records].sort((a, b) => {
      let cmp = 0;
      switch (sortCol) {
        case 'name': cmp = (a.name || a.pis).localeCompare(b.name || b.pis); break;
        case 'date': cmp = a.date - b.date; break;
        case 'worked': cmp = a.workedMinutes - b.workedMinutes; break;
        case 'late': cmp = a.lateMinutes - b.lateMinutes; break;
        case 'extra': cmp = a.extraMinutes - b.extraMinutes; break;
        case 'saldo': cmp = a.saldo - b.saldo; break;
        default: cmp = a.date - b.date;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [records, sortCol, sortDir]);

  const totalPages = Math.ceil((showSummary ? summary.length : sortedRecords.length) / PAGE_SIZE);
  const pagedRecords = sortedRecords.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const pagedSummary = summary.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const Pagination = () => totalPages > 1 ? (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, padding: '12px 0' }}>
      <button className="btn btn-outline btn-sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Anterior</button>
      <span style={{ fontSize: 12, color: colors.textMuted }}>{page + 1} / {totalPages}</span>
      <button className="btn btn-outline btn-sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Próximo</button>
    </div>
  ) : null;

  const handleEditSave = (allRecords) => {
    setEditing(null);
    if (onRecordsUpdate) onRecordsUpdate(allRecords);
  };

  if (showSummary) {
    return (
      <div className="card" style={{ overflow: 'auto', padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th>Funcionário</th>
              <th>Dias</th>
              <th>Total Trab.</th>
              <th>Atrasos</th>
              <th>Tot. Atrasos</th>
              <th className="hide-mobile">Saídas Ant.</th>
              <th>Tot. Extras</th>
              <th>Saldo</th>
            </tr>
          </thead>
          <tbody>
            {pagedSummary.map((s, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 500 }}>{s.name || s.pis}<br />
                  <span style={{ fontSize: 11, color: colors.textDark }} className="mono">{s.pis}</span>
                </td>
                <td className="mono">{s.days}</td>
                <td className="mono">{formatTime(s.totalWorked)}</td>
                <td className={`mono ${s.lateCount > 0 ? 'warning' : ''}`}>{s.lateCount}</td>
                <td className={`mono ${s.totalLate > 0 ? 'warning' : ''}`}>{formatTime(s.totalLate)}</td>
                <td className={`mono hide-mobile ${s.earlyCount > 0 ? 'warning' : ''}`}>{s.earlyCount}</td>
                <td className={`mono ${s.totalExtra > 0 ? 'positive' : ''}`}>{formatTime(s.totalExtra)}</td>
                <td className={`mono ${s.totalSaldo >= 0 ? 'positive' : 'negative'}`} style={{ fontWeight: 600 }}>
                  {s.totalSaldo >= 0 ? '+' : ''}{formatTime(s.totalSaldo)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination />
      </div>
    );
  }

  return (
    <>
      <div className="card" style={{ overflow: 'auto', padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th onClick={() => toggleSort('name')}>Funcionário{arrow('name')}</th>
              <th onClick={() => toggleSort('date')}>Data{arrow('date')}</th>
              <th>E1</th>
              <th>S1</th>
              <th className="hide-mobile">E2</th>
              <th className="hide-mobile">S2</th>
              <th className="hide-mobile">Almoço</th>
              <th onClick={() => toggleSort('worked')}>Trab.{arrow('worked')}</th>
              <th onClick={() => toggleSort('late')}>Atraso{arrow('late')}</th>
              <th onClick={() => toggleSort('extra')}>Extra{arrow('extra')}</th>
              <th onClick={() => toggleSort('saldo')}>Saldo{arrow('saldo')}</th>
              <th>Status</th>
              <th style={{ width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {pagedRecords.length === 0 ? (
              <tr><td colSpan={13} style={{ textAlign: 'center', padding: 30, color: colors.textDark }}>
                Nenhum registro encontrado
              </td></tr>
            ) : pagedRecords.map((r, i) => {
              const p = r.allPunches || [];
              return (
                <tr key={i} style={r.hasInconsistency ? { background: 'rgba(239,68,68,0.05)' } : r.manualEdit ? { background: 'rgba(59,130,246,0.05)' } : undefined}>
                  <td>
                    <span style={{ fontWeight: 500 }}>{r.name || r.pis}</span>
                    {r.name && <br />}
                    {r.name && <span style={{ fontSize: 11, color: colors.textDark }} className="mono">{r.pis}</span>}
                  </td>
                  <td className="mono">
                    {formatDate(r.date)}
                    <br /><span style={{ fontSize: 11, color: colors.textDark }}>{getDayOfWeek(r.date)}</span>
                  </td>
                  <td className="mono">{formatHour(p[0])}</td>
                  <td className="mono">{formatHour(p[1])}</td>
                  <td className="mono hide-mobile">{formatHour(p[2])}</td>
                  <td className="mono hide-mobile">{formatHour(p[3])}</td>
                  <td className="mono hide-mobile" style={{ color: colors.textDark }}>{r.lunchMinutes ? formatTime(r.lunchMinutes) : '--:--'}</td>
                  <td className="mono">{formatTime(r.workedMinutes)}</td>
                  <td className={`mono ${r.lateMinutes > 0 ? 'warning' : ''}`}>{formatTime(r.lateMinutes)}</td>
                  <td className={`mono ${r.extraMinutes > 0 ? 'positive' : ''}`}>{formatTime(r.extraMinutes)}</td>
                  <td className={`mono ${r.saldo >= 0 ? 'positive' : 'negative'}`} style={{ fontWeight: 600 }}>
                    {r.saldo >= 0 ? '+' : ''}{formatTime(r.saldo)}
                  </td>
                  <td>
                    <StatusBadge status={r.status} />
                    {r.manualEdit && (
                      <div style={{ fontSize: 10, color: colors.blue, marginTop: 2 }}>Editado</div>
                    )}
                    {r.hasInconsistency && r.inconsistencyMsg && (
                      <div style={{ fontSize: 10, color: colors.redLight, marginTop: 3 }}>{r.inconsistencyMsg}</div>
                    )}
                  </td>
                  <td>
                    <button
                      className="btn btn-outline btn-sm"
                      style={{ padding: 4 }}
                      onClick={() => setEditing(r)}
                      title="Corrigir batidas"
                    >
                      <Edit3 size={13} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <Pagination />
      </div>

      {editing && (
        <PunchEditor
          record={editing}
          onSave={handleEditSave}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}
