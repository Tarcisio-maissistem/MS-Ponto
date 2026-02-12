export const formatTime = (minutes) => {
  if (minutes === 0 || minutes === undefined || minutes === null) return '00:00';
  const h = Math.floor(Math.abs(minutes) / 60);
  const m = Math.abs(minutes) % 60;
  const sign = minutes < 0 ? '-' : '';
  return `${sign}${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

export const formatHour = (date) => {
  if (!date) return '--:--';
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

export const formatDate = (date) => {
  if (!date) return '--/--/----';
  return date.toLocaleDateString('pt-BR');
};

export const formatDateISO = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const parseDateBR = (str) => {
  if (!str) return null;
  const [d, m, y] = str.split('/').map(Number);
  return new Date(y, m - 1, d);
};

export const getDayOfWeek = (date) => {
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  return days[new Date(date).getDay()];
};

export const getMonthName = (month) => {
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  return months[month];
};
