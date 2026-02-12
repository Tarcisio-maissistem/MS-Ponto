import { colors, fonts } from '../styles/theme';

export default function StatCard({ icon: Icon, title, value, color, subtitle }) {
  return (
    <div style={{
      background: colors.card,
      borderRadius: 14, padding: 18,
      display: 'flex', gap: 14, alignItems: 'center',
      border: `1px solid ${colors.cardBorder}`,
      borderLeft: `4px solid ${color}`,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 11,
        background: `${color}20`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color, flexShrink: 0,
      }}>
        <Icon size={22} />
      </div>
      <div>
        <div style={{ fontSize: 12, color: colors.textMuted }}>{title}</div>
        <div style={{ fontSize: 24, fontWeight: 700, fontFamily: fonts.mono }}>{value}</div>
        {subtitle && <div style={{ fontSize: 11, color: colors.textDark }}>{subtitle}</div>}
      </div>
    </div>
  );
}
