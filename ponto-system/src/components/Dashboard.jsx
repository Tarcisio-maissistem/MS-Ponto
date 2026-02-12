import { useState, useMemo } from 'react';
import { Users, Clock, AlertTriangle, TrendingUp, Download, Search, FileText } from 'lucide-react';
import FileImport from './FileImport';
import DateFilter from './DateFilter';
import PunchTable from './PunchTable';
import StatCard from './StatCard';
import { calculateSummary } from '../utils/calculations';
import { exportToCSV } from '../utils/exportCSV';
import { exportPDF } from '../utils/exportPDF';
import { getEmployees } from '../utils/storage';
import { colors } from '../styles/theme';

export default function Dashboard({ records, onImport, onRecordsUpdate }) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchPis, setSearchPis] = useState('');
  const [viewMode, setViewMode] = useState('detail'); // detail | summary

  const filtered = useMemo(() => {
    let list = records;

    if (startDate) {
      const s = new Date(startDate);
      s.setHours(0, 0, 0, 0);
      list = list.filter(r => r.date >= s);
    }
    if (endDate) {
      const e = new Date(endDate);
      e.setHours(23, 59, 59, 999);
      list = list.filter(r => r.date <= e);
    }
    if (searchPis) {
      const term = searchPis.toLowerCase();
      list = list.filter(r =>
        r.pis?.includes(searchPis) ||
        r.name?.toLowerCase().includes(term)
      );
    }

    return list;
  }, [records, startDate, endDate, searchPis]);

  const summary = useMemo(() => calculateSummary(filtered), [filtered]);

  const employees = getEmployees();
  const totalEmployees = employees.length || new Set(records.map(r => r.pis)).size;

  // Stats do período filtrado
  const totalLateCount = summary.reduce((a, s) => a + s.lateCount, 0);
  const totalInconsistencies = summary.reduce((a, s) => a + s.inconsistencyCount, 0);
  const totalExtraMinutes = summary.reduce((a, s) => a + s.totalExtra, 0);

  const exportFilters = {
    pis: searchPis || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  };

  const handleExportCSV = () => {
    exportToCSV(records, summary, exportFilters);
  };

  const handleExportPDF = () => {
    exportPDF(filtered, summary, exportFilters);
  };

  return (
    <div>
      {/* Importação */}
      {records.length === 0 && (
        <div style={{ marginBottom: 24 }}>
          <FileImport onImport={onImport} />
        </div>
      )}

      {records.length > 0 && (
        <>
          {/* Cards de estatísticas */}
          <div className="grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
            <StatCard icon={Users} title="Funcionários" value={totalEmployees}
              color={colors.blue} subtitle={`${summary.length} no período`} />
            <StatCard icon={Clock} title="Registros" value={filtered.length}
              color={colors.purple} subtitle={`de ${records.length} total`} />
            <StatCard icon={AlertTriangle} title="Atrasos" value={totalLateCount}
              color={colors.yellow} subtitle={`${totalInconsistencies} inconsistências`} />
            <StatCard icon={TrendingUp} title="Horas Extras"
              value={`${Math.floor(totalExtraMinutes / 60)}h${totalExtraMinutes % 60}m`}
              color={colors.green} subtitle="no período" />
          </div>

          {/* Filtros */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
              <DateFilter startDate={startDate} endDate={endDate}
                onStartChange={setStartDate} onEndChange={setEndDate} />

              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: colors.inputBg, border: `1px solid ${colors.inputBorder}`, borderRadius: 8, padding: '6px 12px' }}>
                  <Search size={14} color={colors.textDark} />
                  <input type="text" placeholder="Buscar PIS ou nome..."
                    value={searchPis} onChange={e => setSearchPis(e.target.value)}
                    style={{ background: 'none', border: 'none', color: colors.text, fontSize: 12, outline: 'none', width: 150, fontFamily: 'inherit' }} />
                </div>

                <div style={{ display: 'flex', gap: 4 }}>
                  <button className={`btn btn-sm ${viewMode === 'detail' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setViewMode('detail')}>Detalhes</button>
                  <button className={`btn btn-sm ${viewMode === 'summary' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setViewMode('summary')}>Resumo</button>
                </div>

                <button className="btn btn-green btn-sm" onClick={handleExportCSV}>
                  <Download size={14} /> CSV
                </button>
                <button className="btn btn-primary btn-sm" onClick={handleExportPDF}>
                  <FileText size={14} /> PDF
                </button>
              </div>
            </div>
          </div>

          {/* Importar mais */}
          <div style={{ marginBottom: 20 }}>
            <FileImport onImport={onImport} />
          </div>

          {/* Tabela */}
          <PunchTable
            records={filtered}
            showSummary={viewMode === 'summary'}
            summary={summary}
            onRecordsUpdate={onRecordsUpdate}
          />
        </>
      )}
    </div>
  );
}
