import { useState } from 'react';
import { UserPlus, Edit3, Trash2, Search } from 'lucide-react';
import EmployeeForm from './EmployeeForm';
import { addEmployee, removeEmployee, getEmployees } from '../utils/storage';
import { colors } from '../styles/theme';

export default function EmployeeList() {
  const [employees, setEmployees] = useState(getEmployees);
  const [editing, setEditing] = useState(null); // null | 'new' | employee obj
  const [search, setSearch] = useState('');

  const filtered = employees.filter(e => {
    const term = search.toLowerCase();
    return e.name?.toLowerCase().includes(term) || e.pis?.includes(search) ||
      e.department?.toLowerCase().includes(term) || e.role?.toLowerCase().includes(term);
  });

  const handleSave = (emp) => {
    const list = addEmployee(emp);
    setEmployees(list);
    setEditing(null);
  };

  const handleDelete = (pis, name) => {
    if (!confirm(`Excluir ${name || pis}?`)) return;
    const list = removeEmployee(pis);
    setEmployees(list);
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>Funcionários ({employees.length})</h2>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: colors.inputBg, border: `1px solid ${colors.inputBorder}`, borderRadius: 8, padding: '6px 12px' }}>
            <Search size={16} color={colors.textDark} />
            <input type="text" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ background: 'none', border: 'none', color: colors.text, fontSize: 13, outline: 'none', width: 150, fontFamily: 'inherit' }} />
          </div>
          <button className="btn btn-green btn-sm" onClick={() => setEditing('new')}>
            <UserPlus size={16} /> Novo
          </button>
        </div>
      </div>

      {/* Form */}
      {editing && (
        <div className="card" style={{ marginBottom: 20 }}>
          <EmployeeForm
            employee={editing === 'new' ? null : editing}
            onSave={handleSave}
            onCancel={() => setEditing(null)}
          />
        </div>
      )}

      {/* Table */}
      <div className="card" style={{ overflow: 'auto', padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th>PIS/CPF</th>
              <th>Nome</th>
              <th className="hide-mobile">Setor</th>
              <th className="hide-mobile">Cargo</th>
              <th className="hide-mobile">Horário</th>
              <th>Status</th>
              <th style={{ width: 90 }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 30, color: colors.textDark }}>
                {employees.length === 0 ? 'Nenhum funcionário cadastrado. Importe um arquivo AFD ou cadastre manualmente.' : 'Nenhum resultado encontrado.'}
              </td></tr>
            ) : filtered.map(e => (
              <tr key={e.pis}>
                <td className="mono">{e.pis}</td>
                <td style={{ fontWeight: 500 }}>{e.name}</td>
                <td className="hide-mobile" style={{ color: colors.textMuted }}>{e.department || '-'}</td>
                <td className="hide-mobile" style={{ color: colors.textMuted }}>{e.role || '-'}</td>
                <td className="hide-mobile mono" style={{ fontSize: 12 }}>
                  {e.startTime || '08:00'} - {e.endTime || '17:48'}
                </td>
                <td>
                  <span style={{
                    padding: '3px 8px', borderRadius: 5, fontSize: 11, fontWeight: 600,
                    background: e.active !== false ? '#065f46' : '#44403c',
                    color: e.active !== false ? '#6ee7b7' : '#a8a29e',
                  }}>
                    {e.active !== false ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-outline btn-sm" style={{ padding: 5 }}
                      onClick={() => setEditing(e)} title="Editar">
                      <Edit3 size={14} />
                    </button>
                    <button className="btn btn-outline btn-sm" style={{ padding: 5, borderColor: '#7f1d1d', color: '#fca5a5' }}
                      onClick={() => handleDelete(e.pis, e.name)} title="Excluir">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
