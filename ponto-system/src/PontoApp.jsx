import React, { useState, useMemo } from 'react';
import { Clock, Upload, Download, Users, AlertTriangle, TrendingUp, CheckCircle, Search, Calendar } from 'lucide-react';

// Parser de arquivo AFD - suporta Portaria 1510 e Portaria 671 (REP-P)
const parseAFD = (content) => {
  const lines = content.split('\n');
  const punches = [];
  const names = {}; // mapear PIS -> nome do funcionário

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 30) continue;

    // Ignorar header (linha 1 muito longa com dados da empresa) e trailer (999...)
    if (trimmed.startsWith('999999999')) continue;

    // ========== FORMATO PORTARIA 671 (REP-P) ==========
    // Estrutura: NSR(10) + ISO_DateTime(24) + dados
    // ISO DateTime: 2026-02-12T13:02:00-0300
    const isoMatch = trimmed.match(/^\d{10}(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{4})/);
    if (isoMatch) {
      const isoDateStr = isoMatch[1];
      const dt = new Date(isoDateStr);
      if (isNaN(dt.getTime())) continue;

      const afterDatetime = trimmed.substring(34); // tudo após o datetime

      // Registro tipo "A" = autorização/acesso com nome do funcionário
      // Formato: A + PIS(9-11 dígitos) + espaço + Nome + dados
      const aMatch = afterDatetime.match(/^A(\d{9,11})\s+(.+?)(?:\s{2,}|\s+\d{3,})/);
      if (aMatch) {
        const pis = aMatch[1];
        const name = aMatch[2].trim();
        if (name) names[pis] = name;
        // Registros A são eventos de autorização, não batidas confirmadas
        continue;
      }

      // Registro de batida confirmada (ponto)
      // Formato: PIS(9-11 dígitos) + espaço + hash(4 chars)
      const punchMatch = afterDatetime.match(/^(\d{9,11})\s+[A-F0-9]{4}$/i);
      if (punchMatch) {
        const pis = punchMatch[1];
        punches.push({ pis, datetime: dt, name: names[pis] || '' });
        continue;
      }

      // Se não casou com nenhum padrão acima, é evento do sistema (só "02" etc)
      continue;
    }

    // ========== FORMATO PORTARIA 1510 (legado) ==========
    // Estrutura: NSR(9) + Tipo(1) + DDMMAAAA(8) + HHMM(4) + PIS(12)
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

  // Associar nomes aos punches que ainda não têm
  punches.forEach(p => {
    if (!p.name && names[p.pis]) {
      p.name = names[p.pis];
    }
  });

  return punches;
};

// Parser alternativo (CSV: PIS;DATA;HORA ou PIS,DATA,HORA)
const parseCSV = (content) => {
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
      
      // Tentar parsear data
      let dt = null;
      const dateParts = dateStr.split(/[\/\-]/);
      if (dateParts.length === 3) {
        const [d, m, y] = dateParts.map(Number);
        const timeParts = timeStr.split(':').map(Number);
        dt = new Date(y, m - 1, d, timeParts[0] || 0, timeParts[1] || 0);
      }
      
      if (dt && !isNaN(dt.getTime()) && pis.length >= 11) {
        punches.push({ pis, datetime: dt });
      }
    }
  }
  return punches;
};

// Processar batidas e calcular jornada
const processRecords = (punches) => {
  // Agrupar por funcionário e data
  const grouped = {};
  const nameMap = {};

  punches.forEach(p => {
    if (p.name) nameMap[p.pis] = p.name;
    const dateKey = p.datetime.toISOString().split('T')[0];
    const key = `${p.pis}_${dateKey}`;

    if (!grouped[key]) {
      grouped[key] = {
        pis: p.pis,
        date: new Date(dateKey),
        punches: []
      };
    }
    grouped[key].punches.push(p.datetime);
  });
  
  // Calcular cada registro diário
  const records = Object.values(grouped).map(g => {
    // Deduplicar batidas no mesmo minuto
    const uniquePunches = [];
    const seen = new Set();
    g.punches.sort((a, b) => a - b).forEach(p => {
      const key = `${p.getHours()}:${p.getMinutes()}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniquePunches.push(p);
      }
    });
    const sorted = uniquePunches;
    const firstEntry = sorted[0];
    const lastExit = sorted[sorted.length - 1];
    
    // Jornada padrão: 08:00 às 17:48 (8h48 = 528 min)
    const standardStart = 8 * 60; // 08:00
    const standardEnd = 17 * 60 + 48; // 17:48
    const standardWork = 528; // 8h48
    const tolerance = 10;
    
    // Tempo trabalhado (descontando 1h de almoço)
    let workedMinutes = (lastExit - firstEntry) / (1000 * 60) - 60;
    workedMinutes = Math.max(0, Math.round(workedMinutes));
    
    // Atraso
    const entryMinutes = firstEntry.getHours() * 60 + firstEntry.getMinutes();
    let lateMinutes = entryMinutes - standardStart - tolerance;
    lateMinutes = Math.max(0, Math.round(lateMinutes));
    
    // Saída antecipada
    const exitMinutes = lastExit.getHours() * 60 + lastExit.getMinutes();
    let earlyMinutes = standardEnd - exitMinutes - tolerance;
    earlyMinutes = Math.max(0, Math.round(earlyMinutes));
    
    // Hora extra
    let extraMinutes = workedMinutes - standardWork;
    extraMinutes = Math.max(0, Math.round(extraMinutes));
    
    // Status
    let status = 'normal';
    if (lateMinutes > 0) status = 'late';
    if (earlyMinutes > 0) status = 'early';
    if (extraMinutes > 0) status = 'extra';
    
    return {
      pis: g.pis,
      name: nameMap[g.pis] || '',
      date: g.date,
      firstEntry,
      lastExit,
      punchCount: sorted.length,
      workedMinutes,
      lateMinutes,
      earlyMinutes,
      extraMinutes,
      status
    };
  });
  
  return records.sort((a, b) => {
    if (a.pis !== b.pis) return a.pis.localeCompare(b.pis);
    return a.date - b.date;
  });
};

// Resumo por funcionário
const calculateSummary = (records) => {
  const byEmployee = {};
  
  records.forEach(r => {
    if (!byEmployee[r.pis]) {
      byEmployee[r.pis] = {
        pis: r.pis,
        name: r.name || '',
        days: 0,
        totalWorked: 0,
        totalLate: 0,
        totalEarly: 0,
        totalExtra: 0,
        lateCount: 0
      };
    }
    
    byEmployee[r.pis].days++;
    byEmployee[r.pis].totalWorked += r.workedMinutes;
    byEmployee[r.pis].totalLate += r.lateMinutes;
    byEmployee[r.pis].totalEarly += r.earlyMinutes;
    byEmployee[r.pis].totalExtra += r.extraMinutes;
    if (r.lateMinutes > 0) byEmployee[r.pis].lateCount++;
  });
  
  return Object.values(byEmployee).map(e => ({
    ...e,
    balance: e.totalExtra - e.totalLate
  }));
};

// Formatar minutos para HH:MM
const formatTime = (minutes) => {
  if (minutes === 0 || minutes === undefined) return '00:00';
  const h = Math.floor(Math.abs(minutes) / 60);
  const m = Math.abs(minutes) % 60;
  const sign = minutes < 0 ? '-' : '';
  return `${sign}${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

// Formatar hora de Date
const formatHour = (date) => {
  if (!date) return '--:--';
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

// Formatar data
const formatDate = (date) => {
  return date.toLocaleDateString('pt-BR');
};

// Exportar para CSV/Excel
const exportToExcel = (records, summary) => {
  // Aba de registros detalhados
  const detailHeaders = ['PIS/CPF', 'Data', 'Entrada', 'Saída', 'Batidas', 'Trabalhado', 'Atraso', 'Saída Antec.', 'Extra', 'Status'];
  const detailRows = records.map(r => [
    r.pis,
    formatDate(r.date),
    formatHour(r.firstEntry),
    formatHour(r.lastExit),
    r.punchCount,
    formatTime(r.workedMinutes),
    formatTime(r.lateMinutes),
    formatTime(r.earlyMinutes),
    formatTime(r.extraMinutes),
    r.status === 'normal' ? 'Normal' : r.status === 'late' ? 'Atraso' : r.status === 'early' ? 'Saída Antec.' : 'Hora Extra'
  ]);
  
  // Aba de resumo
  const summaryHeaders = ['PIS/CPF', 'Dias', 'Total Trabalhado', 'Qtd Atrasos', 'Total Atrasos', 'Total Extras', 'Saldo'];
  const summaryRows = summary.map(s => [
    s.pis,
    s.days,
    formatTime(s.totalWorked),
    s.lateCount,
    formatTime(s.totalLate),
    formatTime(s.totalExtra),
    formatTime(s.balance)
  ]);
  
  // Criar CSV
  let csv = 'REGISTROS DETALHADOS\n';
  csv += detailHeaders.join(';') + '\n';
  csv += detailRows.map(r => r.join(';')).join('\n');
  csv += '\n\n\nRESUMO POR FUNCIONÁRIO\n';
  csv += summaryHeaders.join(';') + '\n';
  csv += summaryRows.map(r => r.join(';')).join('\n');
  
  // Download
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `relatorio_ponto_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

// Badge de status
const StatusBadge = ({ status }) => {
  const config = {
    normal: { label: 'Normal', bg: '#065f46', color: '#6ee7b7' },
    late: { label: 'Atraso', bg: '#78350f', color: '#fcd34d' },
    early: { label: 'Saída Antec.', bg: '#581c87', color: '#d8b4fe' },
    extra: { label: 'Hora Extra', bg: '#1e3a8a', color: '#93c5fd' }
  };
  const { label, bg, color } = config[status] || config.normal;
  
  return (
    <span style={{
      padding: '4px 10px',
      borderRadius: '6px',
      fontSize: '12px',
      fontWeight: 600,
      background: bg,
      color: color
    }}>
      {label}
    </span>
  );
};

// Card de estatística
const StatCard = ({ icon: Icon, title, value, color }) => (
  <div style={{
    background: 'rgba(30, 41, 59, 0.8)',
    borderRadius: '16px',
    padding: '20px',
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
    border: '1px solid rgba(148, 163, 184, 0.1)',
    borderLeft: `4px solid ${color}`
  }}>
    <div style={{
      width: '48px',
      height: '48px',
      borderRadius: '12px',
      background: `${color}20`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: color
    }}>
      <Icon size={24} />
    </div>
    <div>
      <div style={{ fontSize: '13px', color: '#94a3b8' }}>{title}</div>
      <div style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' }}>{value}</div>
    </div>
  </div>
);

export default function PontoApp() {
  const [records, setRecords] = useState([]);
  const [fileInfo, setFileInfo] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('detail');
  const [dragOver, setDragOver] = useState(false);
  
  const summary = useMemo(() => calculateSummary(records), [records]);
  
  const stats = useMemo(() => {
    const totalWorked = records.reduce((sum, r) => sum + r.workedMinutes, 0);
    const totalLate = records.filter(r => r.lateMinutes > 0).length;
    const totalExtra = records.reduce((sum, r) => sum + r.extraMinutes, 0);
    const employees = new Set(records.map(r => r.pis)).size;
    
    return { totalWorked, totalLate, totalExtra, employees };
  }, [records]);
  
  const filteredRecords = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return records.filter(r => r.pis.includes(searchTerm) || (r.name && r.name.toLowerCase().includes(term)));
  }, [records, searchTerm]);

  const filteredSummary = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return summary.filter(s => s.pis.includes(searchTerm) || (s.name && s.name.toLowerCase().includes(term)));
  }, [summary, searchTerm]);
  
  // Processar arquivo
  const handleFile = (file) => {
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      
      // Tentar parser AFD primeiro
      let punches = parseAFD(content);
      
      // Se não encontrou, tentar CSV
      if (punches.length === 0) {
        punches = parseCSV(content);
      }
      
      if (punches.length === 0) {
        alert('Nenhum registro encontrado no arquivo. Verifique o formato.');
        return;
      }
      
      const processed = processRecords(punches);
      setRecords(processed);
      setFileInfo({
        name: file.name,
        punches: punches.length,
        records: processed.length,
        employees: new Set(punches.map(p => p.pis)).size,
        date: new Date().toLocaleString('pt-BR')
      });
    };
    reader.readAsText(file, 'latin1');
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  };
  
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      fontFamily: "'DM Sans', -apple-system, sans-serif",
      color: '#e2e8f0',
      padding: '32px'
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        .btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          border-radius: 10px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
          font-family: inherit;
        }
        
        .btn-primary {
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          color: white;
        }
        
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(59, 130, 246, 0.3);
        }
        
        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
        }
        
        th {
          text-align: left;
          padding: 14px 16px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #64748b;
          background: rgba(15, 23, 42, 0.5);
          border-bottom: 1px solid rgba(148, 163, 184, 0.1);
        }
        
        td {
          padding: 14px 16px;
          font-size: 14px;
          border-bottom: 1px solid rgba(148, 163, 184, 0.05);
        }
        
        tr:hover td {
          background: rgba(59, 130, 246, 0.05);
        }
        
        .mono {
          font-family: 'JetBrains Mono', monospace;
        }
        
        .positive { color: #6ee7b7; }
        .negative { color: #fca5a5; }
        .warning { color: #fcd34d; }
        
        .tab {
          padding: 10px 20px;
          border-radius: 8px;
          font-weight: 500;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
          color: #94a3b8;
          border: none;
          background: none;
          font-family: inherit;
        }
        
        .tab:hover { color: #e2e8f0; }
        .tab.active {
          background: rgba(59, 130, 246, 0.2);
          color: #60a5fa;
        }
      `}</style>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            borderRadius: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Clock size={26} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 700 }}>Gestão de Ponto</h1>
            <p style={{ color: '#64748b', fontSize: '14px' }}>Importe o arquivo AFD e visualize os dados</p>
          </div>
        </div>
        
        <button 
          className="btn btn-primary"
          disabled={records.length === 0}
          onClick={() => exportToExcel(records, summary)}
        >
          <Download size={18} />
          Exportar Excel
        </button>
      </div>
      
      {/* Upload Area */}
      {records.length === 0 ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          style={{
            border: `2px dashed ${dragOver ? '#3b82f6' : 'rgba(59, 130, 246, 0.3)'}`,
            borderRadius: '20px',
            padding: '80px 40px',
            textAlign: 'center',
            background: dragOver ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.02)',
            transition: 'all 0.2s',
            cursor: 'pointer'
          }}
          onClick={() => document.getElementById('fileInput').click()}
        >
          <input
            id="fileInput"
            type="file"
            accept=".txt,.afd,.csv"
            style={{ display: 'none' }}
            onChange={(e) => handleFile(e.target.files[0])}
          />
          <div style={{
            width: '80px',
            height: '80px',
            background: 'rgba(59, 130, 246, 0.15)',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            color: '#3b82f6'
          }}>
            <Upload size={36} />
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 600, marginBottom: '8px' }}>
            Arraste o arquivo aqui
          </h2>
          <p style={{ color: '#64748b', marginBottom: '24px' }}>
            ou clique para selecionar
          </p>
          <p style={{ color: '#475569', fontSize: '13px' }}>
            Suporta: AFD (Portaria 671 / 1510) • TXT • CSV (PIS;DATA;HORA)
          </p>
        </div>
      ) : (
        <>
          {/* File Info */}
          {fileInfo && (
            <div style={{
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '12px',
              padding: '16px 20px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <CheckCircle size={20} color="#10b981" />
                <div>
                  <span style={{ fontWeight: 600 }}>{fileInfo.name}</span>
                  <span style={{ color: '#64748b', marginLeft: '16px', fontSize: '13px' }}>
                    {fileInfo.punches} batidas • {fileInfo.records} registros • {fileInfo.employees} funcionários
                  </span>
                </div>
              </div>
              <button
                onClick={() => { setRecords([]); setFileInfo(null); }}
                style={{
                  background: 'none',
                  border: '1px solid rgba(148, 163, 184, 0.3)',
                  color: '#94a3b8',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
              >
                Importar outro
              </button>
            </div>
          )}
          
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '24px' }}>
            <StatCard icon={Users} title="Funcionários" value={stats.employees} color="#3b82f6" />
            <StatCard icon={Calendar} title="Registros" value={records.length} color="#8b5cf6" />
            <StatCard icon={AlertTriangle} title="Atrasos" value={stats.totalLate} color="#f59e0b" />
            <StatCard icon={TrendingUp} title="Horas Extras" value={formatTime(stats.totalExtra)} color="#10b981" />
          </div>
          
          {/* Tabs */}
          <div style={{
            display: 'flex',
            gap: '4px',
            background: 'rgba(15, 23, 42, 0.5)',
            padding: '4px',
            borderRadius: '10px',
            width: 'fit-content',
            marginBottom: '20px'
          }}>
            <button className={`tab ${activeTab === 'detail' ? 'active' : ''}`} onClick={() => setActiveTab('detail')}>
              Registros Detalhados
            </button>
            <button className={`tab ${activeTab === 'summary' ? 'active' : ''}`} onClick={() => setActiveTab('summary')}>
              Resumo por Funcionário
            </button>
          </div>
          
          {/* Search */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(15, 23, 42, 0.5)',
            border: '1px solid rgba(148, 163, 184, 0.2)',
            borderRadius: '10px',
            padding: '10px 14px',
            marginBottom: '20px',
            width: '300px'
          }}>
            <Search size={18} color="#64748b" />
            <input
              type="text"
              placeholder="Buscar por PIS/CPF..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                background: 'none',
                border: 'none',
                color: '#e2e8f0',
                fontSize: '14px',
                width: '100%',
                outline: 'none',
                fontFamily: 'inherit'
              }}
            />
          </div>
          
          {/* Table */}
          <div style={{
            background: 'rgba(30, 41, 59, 0.6)',
            border: '1px solid rgba(148, 163, 184, 0.1)',
            borderRadius: '16px',
            overflow: 'hidden'
          }}>
            {activeTab === 'detail' ? (
              <table>
                <thead>
                  <tr>
                    <th>PIS/CPF</th>
                    <th>Data</th>
                    <th>Entrada</th>
                    <th>Saída</th>
                    <th>Batidas</th>
                    <th>Trabalhado</th>
                    <th>Atraso</th>
                    <th>Extra</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((r, i) => (
                    <tr key={i}>
                      <td className="mono">{r.name ? `${r.name} (${r.pis})` : r.pis}</td>
                      <td className="mono">{formatDate(r.date)}</td>
                      <td className="mono">{formatHour(r.firstEntry)}</td>
                      <td className="mono">{formatHour(r.lastExit)}</td>
                      <td className="mono">{r.punchCount}</td>
                      <td className="mono">{formatTime(r.workedMinutes)}</td>
                      <td className={`mono ${r.lateMinutes > 0 ? 'warning' : ''}`}>{formatTime(r.lateMinutes)}</td>
                      <td className={`mono ${r.extraMinutes > 0 ? 'positive' : ''}`}>{formatTime(r.extraMinutes)}</td>
                      <td><StatusBadge status={r.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>PIS/CPF</th>
                    <th>Dias Trabalhados</th>
                    <th>Total Trabalhado</th>
                    <th>Qtd Atrasos</th>
                    <th>Total Atrasos</th>
                    <th>Total Extras</th>
                    <th>Saldo (Banco)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSummary.map((s, i) => (
                    <tr key={i}>
                      <td className="mono">{s.name ? `${s.name} (${s.pis})` : s.pis}</td>
                      <td className="mono">{s.days}</td>
                      <td className="mono">{formatTime(s.totalWorked)}</td>
                      <td className={`mono ${s.lateCount > 0 ? 'warning' : ''}`}>{s.lateCount}</td>
                      <td className={`mono ${s.totalLate > 0 ? 'warning' : ''}`}>{formatTime(s.totalLate)}</td>
                      <td className={`mono ${s.totalExtra > 0 ? 'positive' : ''}`}>{formatTime(s.totalExtra)}</td>
                      <td className={`mono ${s.balance >= 0 ? 'positive' : 'negative'}`}>
                        {s.balance >= 0 ? '+' : ''}{formatTime(s.balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}