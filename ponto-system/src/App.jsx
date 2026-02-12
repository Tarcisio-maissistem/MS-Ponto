import { useState, useEffect } from 'react';
import { LayoutDashboard, Users, FileBarChart, Settings, Upload, Download, FolderUp, Trash2 } from 'lucide-react';
import Dashboard from './components/Dashboard';
import EmployeeList from './components/EmployeeList';
import MonthlyReport from './components/MonthlyReport';
import { getRecords, getEmployees, getSettings, saveSettings, clearAllData } from './utils/storage';
import { exportConfig, importConfig, exportEmployeesOnly } from './utils/configFile';
import { globalCSS, colors, fonts } from './styles/theme';

const APP_INFO = {
  name: 'MS Ponto V1.0',
  contact: {
    phone: '+55 (62) 3284-5750',
    developer: 'Tarcisio Rodrigues',
    website: 'https://maissistem.com.br',
    email: 'contato@maissistem.com.br',
  },
};

const contactEntries = [
  { label: 'Telefone', value: APP_INFO.contact.phone, href: `tel:${APP_INFO.contact.phone.replace(/[^+\d]/g, '')}` },
  { label: 'Email', value: APP_INFO.contact.email, href: `mailto:${APP_INFO.contact.email}` },
  { label: 'Site', value: APP_INFO.contact.website, href: APP_INFO.contact.website },
  { label: 'Desenvolvedor', value: APP_INFO.contact.developer },
];

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'employees', label: 'Funcionários', icon: Users },
  { id: 'report', label: 'Relatório Mensal', icon: FileBarChart },
  { id: 'settings', label: 'Configurações', icon: Settings },
];

export default function App() {
  const [tab, setTab] = useState('dashboard');
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    setRecords(getRecords());
    setEmployees(getEmployees());
  }, []);

  const handleImport = (merged) => {
    setRecords(merged);
    setEmployees(getEmployees());
  };

  const refreshData = () => {
    setRecords(getRecords());
    setEmployees(getEmployees());
  };

  return (
    <>
      <style>{globalCSS}</style>
      <div style={{
        minHeight: '100vh',
        background: colors.bgGradient,
        fontFamily: fonts.main,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Top Navigation Bar */}
        <header style={{
          background: 'rgba(15, 23, 42, 0.9)',
          backdropFilter: 'blur(12px)',
          borderBottom: `1px solid ${colors.cardBorder}`,
          padding: '0 24px',
          position: 'sticky', top: 0, zIndex: 50,
        }}>
          <div style={{
            maxWidth: 1400, margin: '0 auto',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            height: 56,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: colors.gradientPrimary,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Upload size={16} color="white" />
              </div>
              <div>
                <span style={{ fontSize: 16, fontWeight: 700 }}>{APP_INFO.name}</span>
                <p style={{ fontSize: 11, marginTop: 4, color: colors.textMuted }}>Mais Sistem Solucoes Empresariais</p>
              </div>
            </div>

            <nav style={{ display: 'flex', gap: 4 }}>
              {TABS.map(t => (
                <button
                  key={t.id}
                  className={`nav-tab ${tab === t.id ? 'active' : ''}`}
                  onClick={() => { setTab(t.id); if (t.id !== 'settings') refreshData(); }}
                >
                  <t.icon size={15} style={{ marginRight: 6, verticalAlign: -2 }} />
                  <span className={t.id !== 'dashboard' ? 'hide-mobile-text' : ''}>{t.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </header>

        {/* Main Content */}
        <main style={{ flex: 1, maxWidth: 1400, margin: '0 auto', padding: '24px 20px', width: '100%' }}>
          {tab === 'dashboard' && (
            <Dashboard records={records} onImport={handleImport} onRecordsUpdate={refreshData} />
          )}

          {tab === 'employees' && (
            <EmployeeList />
          )}

          {tab === 'report' && (
            <MonthlyReport records={records} employees={employees} onRecordsUpdate={refreshData} />
          )}

          {tab === 'settings' && (
            <SettingsPanel onClear={() => { clearAllData(); setRecords([]); setEmployees([]); }} onRefresh={refreshData} />
          )}
        </main>
        <Footer entries={contactEntries} />
      </div>
    </>
  );
}

function SettingsPanel({ onClear, onRefresh }) {
  const [settings, setSettings] = useState(getSettings);
  const [importMsg, setImportMsg] = useState('');

  const update = (key, val) => {
    const updated = { ...settings, [key]: val };
    setSettings(updated);
    saveSettings(updated);
  };

  const handleImportConfig = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const result = await importConfig(file);
    setImportMsg(result.message);
    if (result.success) {
      setSettings(getSettings());
      if (onRefresh) onRefresh();
    }
    e.target.value = '';
  };

  const inputStyle = {
    padding: '9px 12px', borderRadius: 8,
    border: `1px solid ${colors.inputBorder}`,
    background: colors.inputBg, color: colors.text,
    fontSize: 13, fontFamily: 'inherit', outline: 'none',
    width: '100%',
  };

  const labelStyle = {
    fontSize: 12, fontWeight: 600, color: colors.textMuted,
    marginBottom: 4, display: 'block', textTransform: 'uppercase',
    letterSpacing: 0.5,
  };

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Configurações</h2>

      {/* Jornada Padrão */}
      <div className="card" style={{ marginBottom: 20, maxWidth: 600 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Jornada Padrão</h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div>
            <label style={labelStyle}>Entrada</label>
            <input type="time" style={{ ...inputStyle, colorScheme: 'dark' }}
              value={settings.defaultStartTime} onChange={e => update('defaultStartTime', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Saída</label>
            <input type="time" style={{ ...inputStyle, colorScheme: 'dark' }}
              value={settings.defaultEndTime} onChange={e => update('defaultEndTime', e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
          <div>
            <label style={labelStyle}>Jornada (min)</label>
            <input type="number" style={inputStyle}
              value={settings.defaultWorkMinutes} onChange={e => update('defaultWorkMinutes', parseInt(e.target.value) || 528)} />
          </div>
          <div>
            <label style={labelStyle}>Tolerância (min)</label>
            <input type="number" style={inputStyle}
              value={settings.toleranceMinutes} onChange={e => update('toleranceMinutes', parseInt(e.target.value) || 10)} />
          </div>
          <div>
            <label style={labelStyle}>Almoço (min)</label>
            <input type="number" style={inputStyle}
              value={settings.lunchBreakMinutes} onChange={e => update('lunchBreakMinutes', parseInt(e.target.value) || 60)} />
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <label style={labelStyle}>Nome da Empresa</label>
          <input style={inputStyle} placeholder="Nome que aparece no cabeçalho do PDF"
            value={settings.companyName} onChange={e => update('companyName', e.target.value)} />
        </div>
      </div>

      {/* Arquivo de Configuração */}
      <div className="card" style={{ marginBottom: 20, maxWidth: 600 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Arquivo de Configuração</h3>
        <p style={{ fontSize: 12, color: colors.textDark, marginBottom: 16 }}>
          Salve e restaure todos os dados (funcionários, registros e configurações) em um arquivo JSON.
          Use para backup ou para transferir dados entre computadores.
        </p>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
          <button className="btn btn-green btn-sm" onClick={exportConfig}>
            <Download size={14} /> Exportar Tudo (.json)
          </button>
          <button className="btn btn-outline btn-sm" onClick={exportEmployeesOnly}>
            <Download size={14} /> Só Funcionários
          </button>
          <label className="btn btn-primary btn-sm" style={{ cursor: 'pointer' }}>
            <FolderUp size={14} /> Importar Configuração
            <input type="file" accept=".json" style={{ display: 'none' }} onChange={handleImportConfig} />
          </label>
        </div>

        {importMsg && (
          <div style={{
            padding: '10px 14px', borderRadius: 8, fontSize: 13,
            background: importMsg.includes('sucesso') ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
            color: importMsg.includes('sucesso') ? colors.greenLight : colors.redLight,
            border: `1px solid ${importMsg.includes('sucesso') ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
          }}>
            {importMsg}
          </div>
        )}
      </div>

      {/* Zona de Perigo */}
      <div className="card" style={{ maxWidth: 600 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: colors.redLight }}>Zona de Perigo</h3>
        <p style={{ fontSize: 13, color: colors.textDark, marginBottom: 14 }}>
          Excluir todos os dados importados, cadastro de funcionários e configurações.
          Esta ação não pode ser desfeita.
        </p>
        <button className="btn btn-red btn-sm"
          onClick={() => { if (confirm('Tem certeza que deseja excluir TODOS os dados?')) onClear(); }}>
          <Trash2 size={14} /> Limpar Todos os Dados
        </button>
      </div>
    </div>
  );
}

function Footer({ entries }) {
  return (
    <footer style={{
      padding: '24px 20px',
      background: 'rgba(15, 23, 42, 0.9)',
      borderTop: `1px solid ${colors.cardBorder}`,
    }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: 18, justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ fontSize: 14, fontWeight: 600 }}>{APP_INFO.name}</p>
          <p style={{ fontSize: 12, color: colors.textMuted }}>Controle de ponto, exportações e configurações completas.</p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, minWidth: 240 }}>
          {entries.map(entry => (
            <div key={entry.label} style={{ fontSize: 12, color: colors.textMuted }}>
              <span style={{ fontWeight: 600, color: colors.text, display: 'block' }}>{entry.label}</span>
              {entry.href ? (
                <a
                  href={entry.href}
                  style={{ color: colors.greenLight, textDecoration: 'none' }}
                  target={entry.href.startsWith('http') ? '_blank' : undefined}
                  rel={entry.href.startsWith('http') ? 'noreferrer' : undefined}
                >
                  {entry.value}
                </a>
              ) : (
                <span>{entry.value}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
}
