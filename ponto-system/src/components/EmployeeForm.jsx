import { useState } from 'react';
import { colors } from '../styles/theme';

export default function EmployeeForm({ employee, onSave, onCancel }) {
  const [form, setForm] = useState({
    pis: employee?.pis || '',
    name: employee?.name || '',
    department: employee?.department || '',
    role: employee?.role || '',
    startTime: employee?.startTime || '08:00',
    endTime: employee?.endTime || '17:48',
    workMinutes: employee?.workMinutes || 528,
    tolerance: employee?.tolerance ?? 10,
    active: employee?.active ?? true,
  });

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.pis || !form.name) {
      alert('PIS/CPF e Nome são obrigatórios');
      return;
    }
    onSave(form);
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
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
        {employee ? 'Editar Funcionário' : 'Novo Funcionário'}
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 14 }}>
        <div>
          <label style={labelStyle}>PIS / CPF *</label>
          <input style={inputStyle} value={form.pis} onChange={e => set('pis', e.target.value.replace(/\D/g, ''))}
            placeholder="00000000000" maxLength={14} required />
        </div>
        <div>
          <label style={labelStyle}>Nome Completo *</label>
          <input style={inputStyle} value={form.name} onChange={e => set('name', e.target.value)}
            placeholder="Nome do funcionário" required />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div>
          <label style={labelStyle}>Departamento / Setor</label>
          <input style={inputStyle} value={form.department} onChange={e => set('department', e.target.value)}
            placeholder="Ex: Produção" />
        </div>
        <div>
          <label style={labelStyle}>Cargo</label>
          <input style={inputStyle} value={form.role} onChange={e => set('role', e.target.value)}
            placeholder="Ex: Operador" />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 14 }}>
        <div>
          <label style={labelStyle}>Entrada</label>
          <input type="time" style={{ ...inputStyle, colorScheme: 'dark' }}
            value={form.startTime} onChange={e => set('startTime', e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Saída</label>
          <input type="time" style={{ ...inputStyle, colorScheme: 'dark' }}
            value={form.endTime} onChange={e => set('endTime', e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Jornada (min)</label>
          <input type="number" style={inputStyle} value={form.workMinutes}
            onChange={e => set('workMinutes', parseInt(e.target.value) || 528)} />
        </div>
        <div>
          <label style={labelStyle}>Tolerância (min)</label>
          <input type="number" style={inputStyle} value={form.tolerance}
            onChange={e => set('tolerance', parseInt(e.target.value) || 10)} />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input type="checkbox" id="active" checked={form.active}
          onChange={e => set('active', e.target.checked)} />
        <label htmlFor="active" style={{ fontSize: 13, color: colors.textMuted }}>Funcionário ativo</label>
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        {onCancel && <button type="button" className="btn btn-outline" onClick={onCancel}>Cancelar</button>}
        <button type="submit" className="btn btn-green">Salvar</button>
      </div>
    </form>
  );
}
