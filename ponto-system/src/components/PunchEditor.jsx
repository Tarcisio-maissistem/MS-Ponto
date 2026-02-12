import { useState } from 'react';
import { X, Plus, Trash2, Save, Clock } from 'lucide-react';
import { formatDate, getDayOfWeek, formatTime } from '../utils/formatters';
import { calculateDay } from '../utils/calculations';
import { updateRecord } from '../utils/storage';
import { colors } from '../styles/theme';

export default function PunchEditor({ record, onSave, onClose }) {
  // Converter batidas existentes em strings HH:MM para edição
  const initialPunches = (record.allPunches || []).map(p => {
    if (!p) return '';
    const d = new Date(p);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });

  // Garantir pelo menos 4 slots
  while (initialPunches.length < 4) initialPunches.push('');

  const [punches, setPunches] = useState(initialPunches);
  const [justification, setJustification] = useState(record.justification || '');

  const setPunch = (idx, val) => {
    const updated = [...punches];
    updated[idx] = val;
    setPunches(updated);
  };

  const addSlot = () => {
    setPunches([...punches, '']);
  };

  const removeSlot = (idx) => {
    if (punches.length <= 4) {
      // Não remove, apenas limpa
      setPunch(idx, '');
    } else {
      setPunches(punches.filter((_, i) => i !== idx));
    }
  };

  const handleSave = () => {
    // Converter strings HH:MM de volta para Date
    const dateBase = new Date(record.date);
    const year = dateBase.getFullYear();
    const month = dateBase.getMonth();
    const day = dateBase.getDate();

    const validPunches = punches
      .filter(p => p && p.includes(':'))
      .map(p => {
        const [h, m] = p.split(':').map(Number);
        return new Date(year, month, day, h, m, 0);
      })
      .sort((a, b) => a - b);

    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    // Recalcular o dia com as novas batidas
    const recalculated = calculateDay(record.pis, dateKey, validPunches, record.name || '');
    recalculated.manualEdit = true;
    recalculated.justification = justification;

    // Salvar no localStorage
    const allRecords = updateRecord(recalculated);

    if (onSave) onSave(allRecords);
    if (onClose) onClose();
  };

  // Preview em tempo real
  const previewPunches = punches
    .filter(p => p && p.includes(':'))
    .map(p => {
      const [h, m] = p.split(':').map(Number);
      const dateBase = new Date(record.date);
      return new Date(dateBase.getFullYear(), dateBase.getMonth(), dateBase.getDate(), h, m, 0);
    })
    .sort((a, b) => a - b);

  const dateKey = (() => {
    const d = new Date(record.date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();

  const preview = previewPunches.length > 0
    ? calculateDay(record.pis, dateKey, previewPunches, record.name || '')
    : null;

  const inputStyle = {
    padding: '8px 12px', borderRadius: 8,
    border: `1px solid ${colors.inputBorder}`,
    background: colors.inputBg, color: colors.text,
    fontSize: 14, fontFamily: "'JetBrains Mono', monospace",
    outline: 'none', width: 110, textAlign: 'center',
    colorScheme: 'dark',
  };

  const labels = ['Entrada 1', 'Saída 1', 'Entrada 2', 'Saída 2', 'Entrada 3', 'Saída 3'];

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 100, padding: 20,
    }} onClick={onClose}>
      <div
        style={{
          background: '#1e293b', border: `1px solid ${colors.cardBorder}`,
          borderRadius: 16, padding: 24, width: '100%', maxWidth: 480,
          maxHeight: '90vh', overflow: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 2 }}>Corrigir Batidas</h3>
            <div style={{ fontSize: 13, color: colors.textMuted }}>
              <span style={{ fontWeight: 500 }}>{record.name || record.pis}</span>
              {' - '}
              <span className="mono">{formatDate(record.date)} ({getDayOfWeek(record.date)})</span>
            </div>
          </div>
          <button className="btn btn-outline btn-sm" style={{ padding: 6 }} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Batidas */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: colors.textDark, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 8 }}>
            Horários das Batidas
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {punches.map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: colors.textDark, marginBottom: 2 }}>
                    {labels[i] || `Batida ${i + 1}`}
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <input
                      type="time"
                      style={inputStyle}
                      value={p}
                      onChange={e => setPunch(i, e.target.value)}
                    />
                    <button
                      className="btn btn-outline btn-sm"
                      style={{ padding: 4, borderColor: '#7f1d1d', color: '#fca5a5' }}
                      onClick={() => removeSlot(i)}
                      title="Limpar"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {punches.length < 6 && (
            <button className="btn btn-outline btn-sm" style={{ marginTop: 10 }} onClick={addSlot}>
              <Plus size={14} /> Adicionar Batida
            </button>
          )}
        </div>

        {/* Justificativa */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: colors.textDark, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>
            Justificativa da Correção
          </label>
          <textarea
            value={justification}
            onChange={e => setJustification(e.target.value)}
            placeholder="Ex: Funcionário esqueceu de bater o ponto na saída"
            style={{
              ...inputStyle, width: '100%', minHeight: 60, resize: 'vertical',
              fontFamily: 'inherit', fontSize: 13, textAlign: 'left',
            }}
          />
        </div>

        {/* Preview */}
        {preview && (
          <div style={{
            background: 'rgba(15,23,42,0.5)', borderRadius: 10, padding: 14,
            marginBottom: 20, border: `1px solid ${colors.cardBorder}`,
          }}>
            <div style={{ fontSize: 11, color: colors.textDark, marginBottom: 8, textTransform: 'uppercase', fontWeight: 600 }}>
              Preview do Cálculo
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              <PreviewItem label="Trabalhado" value={formatTime(preview.workedMinutes)} />
              <PreviewItem label="Almoço" value={preview.lunchMinutes ? formatTime(preview.lunchMinutes) : '--:--'} />
              <PreviewItem label="Atraso" value={formatTime(preview.lateMinutes)}
                color={preview.lateMinutes > 0 ? colors.yellowLight : undefined} />
              <PreviewItem label="H. Extra" value={formatTime(preview.extraMinutes)}
                color={preview.extraMinutes > 0 ? colors.greenLight : undefined} />
              <PreviewItem label="Saldo"
                value={`${preview.saldo >= 0 ? '+' : ''}${formatTime(preview.saldo)}`}
                color={preview.saldo >= 0 ? colors.greenLight : colors.redLight} />
              <PreviewItem label="Batidas" value={`${previewPunches.length} registros`} />
            </div>
          </div>
        )}

        {/* Ações */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-outline" onClick={onClose}>Cancelar</button>
          <button className="btn btn-green" onClick={handleSave}>
            <Save size={16} /> Salvar Correção
          </button>
        </div>
      </div>
    </div>
  );
}

function PreviewItem({ label, value, color }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: colors.textDark }}>{label}</div>
      <div className="mono" style={{ fontSize: 15, fontWeight: 600, color: color || colors.text }}>
        {value}
      </div>
    </div>
  );
}
