import { statusColors } from '../styles/theme';

export default function StatusBadge({ status }) {
  const { label, bg, color } = statusColors[status] || statusColors.normal;
  return (
    <span style={{
      padding: '4px 10px', borderRadius: 6,
      fontSize: 11, fontWeight: 600,
      background: bg, color,
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  );
}
