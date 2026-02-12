import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Download, FileText, AlertTriangle, Edit3 } from 'lucide-react';
import { formatTime, formatHour, formatDate, getDayOfWeek, getMonthName } from '../utils/formatters';
import { calculateSummary } from '../utils/calculations';
import { exportToCSV } from '../utils/exportCSV';
import { exportPDF } from '../utils/exportPDF';
import StatusBadge from './StatusBadge';
import PunchEditor from './PunchEditor';
import { colors, statusColors } from '../styles/theme';

export default function MonthlyReport({ records, employees, onRecordsUpdate }) {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());
  const [selectedPis, setSelectedPis] = useState('');
  const [editing, setEditing] = useState(null);

  const pisList = useMemo(() => {
    const map = {};
    records.forEach(r => { map[r.pis] = r.name || r.pis; });
    employees.forEach(e => { map[e.pis] = e.name || e.pis; });
    return Object.entries(map).sort((a, b) => a[1].localeCompare(b[1]));
  }, [records, employees]);

  const monthRecords = useMemo(() => {
    return records.filter(r => {
      const d = new Date(r.date);
      const matchMonth = d.getMonth() === month && d.getFullYear() === year;
      const matchPis = !selectedPis || r.pis === selectedPis;
      return matchMonth && matchPis;
    });
  }, [records, month, year, selectedPis]);

  const summary = useMemo(() => calculateSummary(monthRecords), [monthRecords]);

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Construir calendário do mês para cada funcionário
  const calendarData = useMemo(() => {
    if (!selectedPis) return null;

    const dayMap = {};
    monthRecords.forEach(r => {
      const day = new Date(r.date).getDate();
      dayMap[day] = r;
    });

    const days = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(year, month, d);
      const dow = dt.getDay();
      const isWeekend = dow === 0 || dow === 6;
      days.push({
        day: d, date: dt, dow, isWeekend,
        record: dayMap[d] || null,
      });
    }
    return days;
  }, [monthRecords, selectedPis, month, year, daysInMonth]);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const exportFilters = {
    pis: selectedPis || undefined,
    startDate: `${year}-${String(month + 1).padStart(2, '0')}-01`,
    endDate: `${year}-${String(month + 1).padStart(2, '0')}-${daysInMonth}`,
    monthName: `${getMonthName(month)} ${year}`,
  };

  const handleExportCSV = () => {
    exportToCSV(records, summary, exportFilters);
  };

  const handleExportPDF = () => {
    exportPDF(monthRecords, summary, exportFilters);
  };

  const empSummary = selectedPis ? summary.find(s => s.pis === selectedPis) : null;

  return (
    <div>
      {/* Header com seletor de mês */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-outline btn-sm" onClick={prevMonth}><ChevronLeft size={16} /></button>
          <h2 style={{ fontSize: 18, fontWeight: 700, minWidth: 180, textAlign: 'center' }}>
            {getMonthName(month)} {year}
          </h2>
          <button className="btn btn-outline btn-sm" onClick={nextMonth}><ChevronRight size={16} /></button>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select
            value={selectedPis}
            onChange={e => setSelectedPis(e.target.value)}
            className="input input-sm"
            style={{ minWidth: 200, colorScheme: 'dark' }}
          >
            <option value="">Todos os funcionários</option>
            {pisList.map(([pis, name]) => (
              <option key={pis} value={pis}>{name} ({pis})</option>
            ))}
          </select>
          <button className="btn btn-green btn-sm" onClick={handleExportCSV}>
            <Download size={14} /> CSV
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleExportPDF}>
            <FileText size={14} /> PDF
          </button>
        </div>
      </div>

      {/* Resumo do mês */}
      {selectedPis && empSummary ? (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>{empSummary.name || empSummary.pis}</h3>
              <span style={{ fontSize: 12, color: colors.textDark }} className="mono">{empSummary.pis}</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12 }}>
            <MiniStat label="Dias Trab." value={empSummary.days} />
            <MiniStat label="Total Trab." value={formatTime(empSummary.totalWorked)} />
            <MiniStat label="Atrasos" value={empSummary.lateCount} warning={empSummary.lateCount > 0} />
            <MiniStat label="Tot. Atrasos" value={formatTime(empSummary.totalLate)} warning={empSummary.totalLate > 0} />
            <MiniStat label="Saídas Ant." value={empSummary.earlyCount} warning={empSummary.earlyCount > 0} />
            <MiniStat label="H. Extras" value={formatTime(empSummary.totalExtra)} positive={empSummary.totalExtra > 0} />
            <MiniStat label="Saldo" value={`${empSummary.totalSaldo >= 0 ? '+' : ''}${formatTime(empSummary.totalSaldo)}`}
              positive={empSummary.totalSaldo >= 0} warning={empSummary.totalSaldo < 0} />
            <MiniStat label="Inconsist." value={empSummary.inconsistencyCount}
              warning={empSummary.inconsistencyCount > 0} />
          </div>
        </div>
      ) : !selectedPis && summary.length > 0 ? (
        /* Resumo geral de todos */
        <div className="card" style={{ overflow: 'auto', padding: 0, marginBottom: 20 }}>
          <table>
            <thead>
              <tr>
                <th>Funcionário</th>
                <th>Dias</th>
                <th>Total Trab.</th>
                <th>Atrasos</th>
                <th>Tot. Atrasos</th>
                <th className="hide-mobile">Saídas Ant.</th>
                <th>H. Extras</th>
                <th>Saldo</th>
              </tr>
            </thead>
            <tbody>
              {summary.map((s, i) => (
                <tr key={i} style={{ cursor: 'pointer' }} onClick={() => setSelectedPis(s.pis)}>
                  <td style={{ fontWeight: 500 }}>
                    {s.name || s.pis}<br />
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
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: 40, color: colors.textDark }}>
          Nenhum registro encontrado para {getMonthName(month)} {year}.
        </div>
      )}

      {/* Detalhamento dia a dia (quando selecionou funcionário) */}
      {selectedPis && calendarData && (
        <div className="card" style={{ overflow: 'auto', padding: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Dia</th>
                <th>E1</th>
                <th>S1</th>
                <th className="hide-mobile">E2</th>
                <th className="hide-mobile">S2</th>
                <th className="hide-mobile">Almoço</th>
                <th>Trab.</th>
                <th>Atraso</th>
                <th>Extra</th>
                <th>Saldo</th>
                <th>Status</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {calendarData.map(({ day, date, dow, isWeekend, record }) => {
                if (isWeekend && !record) {
                  return (
                    <tr key={day} style={{ opacity: 0.4 }}>
                      <td className="mono">
                        {String(day).padStart(2, '0')}<br />
                        <span style={{ fontSize: 10, color: colors.textDark }}>{getDayOfWeek(date)}</span>
                      </td>
                      <td colSpan={11} style={{ color: colors.textDark, fontSize: 12 }}>
                        {dow === 0 ? 'Domingo' : 'Sábado'}
                      </td>
                    </tr>
                  );
                }

                if (!record) {
                  // Dia útil sem registro
                  const isPast = date < today;
                  return (
                    <tr key={day} style={isPast ? { background: 'rgba(239,68,68,0.04)' } : undefined}>
                      <td className="mono">
                        {String(day).padStart(2, '0')}<br />
                        <span style={{ fontSize: 10, color: colors.textDark }}>{getDayOfWeek(date)}</span>
                      </td>
                      <td colSpan={10} style={{ color: colors.textDark, fontSize: 12 }}>
                        {isPast ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <AlertTriangle size={12} color={colors.yellowLight} /> Sem registro
                          </span>
                        ) : '--'}
                      </td>
                      <td>{isPast && <StatusBadge status="absent" />}</td>
                    </tr>
                  );
                }

                const p = record.allPunches || [];
                return (
                  <tr key={day} style={record.hasInconsistency ? { background: 'rgba(239,68,68,0.05)' } : undefined}>
                    <td className="mono">
                      {String(day).padStart(2, '0')}<br />
                      <span style={{ fontSize: 10, color: colors.textDark }}>{getDayOfWeek(date)}</span>
                    </td>
                    <td className="mono">{formatHour(p[0])}</td>
                    <td className="mono">{formatHour(p[1])}</td>
                    <td className="mono hide-mobile">{formatHour(p[2])}</td>
                    <td className="mono hide-mobile">{formatHour(p[3])}</td>
                    <td className="mono hide-mobile" style={{ color: colors.textDark }}>
                      {record.lunchMinutes ? formatTime(record.lunchMinutes) : '--:--'}
                    </td>
                    <td className="mono">{formatTime(record.workedMinutes)}</td>
                    <td className={`mono ${record.lateMinutes > 0 ? 'warning' : ''}`}>{formatTime(record.lateMinutes)}</td>
                    <td className={`mono ${record.extraMinutes > 0 ? 'positive' : ''}`}>{formatTime(record.extraMinutes)}</td>
                    <td className={`mono ${record.saldo >= 0 ? 'positive' : 'negative'}`} style={{ fontWeight: 600 }}>
                      {record.saldo >= 0 ? '+' : ''}{formatTime(record.saldo)}
                    </td>
                    <td>
                      <StatusBadge status={record.status} />
                      {record.manualEdit && (
                        <div style={{ fontSize: 10, color: colors.blue, marginTop: 2 }}>Editado</div>
                      )}
                      {record.hasInconsistency && record.inconsistencyMsg && (
                        <div style={{ fontSize: 10, color: colors.redLight, marginTop: 3 }}>{record.inconsistencyMsg}</div>
                      )}
                    </td>
                    <td>
                      <button
                        className="btn btn-outline btn-sm"
                        style={{ padding: 4 }}
                        onClick={() => setEditing(record)}
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
        </div>
      )}

      {editing && (
        <PunchEditor
          record={editing}
          onSave={(allRecords) => { setEditing(null); if (onRecordsUpdate) onRecordsUpdate(allRecords); }}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function MiniStat({ label, value, positive, warning }) {
  let valueColor = colors.text;
  if (positive) valueColor = colors.greenLight;
  if (warning) valueColor = colors.yellowLight;

  return (
    <div style={{ background: 'rgba(15,23,42,0.4)', borderRadius: 10, padding: '10px 14px', textAlign: 'center' }}>
      <div style={{ fontSize: 11, color: colors.textDark, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </div>
      <div className="mono" style={{ fontSize: 18, fontWeight: 600, color: valueColor }}>
        {value}
      </div>
    </div>
  );
}
