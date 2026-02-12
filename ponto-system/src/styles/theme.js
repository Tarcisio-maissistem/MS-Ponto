export const colors = {
  bg: '#0f172a',
  bgGradient: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
  card: 'rgba(30, 41, 59, 0.8)',
  cardBorder: 'rgba(148, 163, 184, 0.1)',
  text: '#e2e8f0',
  textMuted: '#94a3b8',
  textDark: '#64748b',
  blue: '#3b82f6',
  purple: '#8b5cf6',
  green: '#10b981',
  greenLight: '#6ee7b7',
  yellow: '#f59e0b',
  yellowLight: '#fcd34d',
  red: '#ef4444',
  redLight: '#fca5a5',
  gradientPrimary: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
  inputBg: 'rgba(15, 23, 42, 0.5)',
  inputBorder: 'rgba(148, 163, 184, 0.2)',
  tableBg: 'rgba(30, 41, 59, 0.6)',
  tableHeaderBg: 'rgba(15, 23, 42, 0.5)',
  tableHover: 'rgba(59, 130, 246, 0.05)',
  rowBorder: 'rgba(148, 163, 184, 0.05)',
};

export const statusColors = {
  normal: { label: 'Normal', bg: '#065f46', color: '#6ee7b7' },
  late: { label: 'Atraso', bg: '#78350f', color: '#fcd34d' },
  early: { label: 'Saída Antec.', bg: '#581c87', color: '#d8b4fe' },
  extra: { label: 'Hora Extra', bg: '#1e3a8a', color: '#93c5fd' },
  inconsistent: { label: 'Inconsistente', bg: '#7f1d1d', color: '#fca5a5' },
  absent: { label: 'Ausente', bg: '#44403c', color: '#a8a29e' },
};

export const fonts = {
  main: "'DM Sans', -apple-system, sans-serif",
  mono: "'JetBrains Mono', monospace",
};

export const globalCSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: ${fonts.main}; background: ${colors.bg}; color: ${colors.text}; }

  .btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; border-radius: 10px; font-weight: 600; font-size: 13px; cursor: pointer; transition: all 0.2s; border: none; font-family: inherit; color: white; }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-primary { background: ${colors.gradientPrimary}; }
  .btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(59,130,246,0.3); }
  .btn-green { background: ${colors.green}; }
  .btn-green:hover:not(:disabled) { background: #059669; }
  .btn-red { background: ${colors.red}; }
  .btn-red:hover:not(:disabled) { background: #dc2626; }
  .btn-outline { background: none; border: 1px solid ${colors.inputBorder}; color: ${colors.textMuted}; }
  .btn-outline:hover:not(:disabled) { border-color: ${colors.blue}; color: ${colors.blue}; }
  .btn-sm { padding: 6px 12px; font-size: 12px; border-radius: 6px; }

  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; padding: 12px 14px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: ${colors.textDark}; background: ${colors.tableHeaderBg}; border-bottom: 1px solid ${colors.cardBorder}; cursor: pointer; user-select: none; }
  th:hover { color: ${colors.text}; }
  td { padding: 11px 14px; font-size: 13px; border-bottom: 1px solid ${colors.rowBorder}; }
  tr:hover td { background: ${colors.tableHover}; }

  .mono { font-family: ${fonts.mono}; }
  .positive { color: ${colors.greenLight}; }
  .negative { color: ${colors.redLight}; }
  .warning { color: ${colors.yellowLight}; }

  .input { padding: 9px 13px; border-radius: 8px; border: 1px solid ${colors.inputBorder}; background: ${colors.inputBg}; color: ${colors.text}; font-size: 13px; font-family: inherit; outline: none; transition: border-color 0.2s; }
  .input:focus { border-color: ${colors.blue}; }
  .input-sm { padding: 6px 10px; font-size: 12px; }

  .card { background: ${colors.card}; border: 1px solid ${colors.cardBorder}; border-radius: 14px; padding: 20px; }

  .nav-tab { padding: 9px 18px; border-radius: 8px; font-weight: 500; font-size: 13px; cursor: pointer; transition: all 0.2s; color: ${colors.textMuted}; border: none; background: none; font-family: inherit; }
  .nav-tab:hover { color: ${colors.text}; }
  .nav-tab.active { background: rgba(59,130,246,0.2); color: #60a5fa; }

  @media (max-width: 768px) {
    .grid-4 { grid-template-columns: repeat(2, 1fr) !important; }
    .hide-mobile { display: none !important; }
    .flex-wrap-mobile { flex-wrap: wrap; }
    td, th { padding: 8px 8px; font-size: 12px; }
  }
  @media (max-width: 480px) {
    .grid-4 { grid-template-columns: 1fr !important; }
  }
`;
