const COLORS = ['#6366f1', '#06b6d4', '#f43f5e', '#34d399', '#fbbf24', '#a78bfa'];

function getInitials(name = '') {
  return name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase() || '?';
}

export default function Avatar({ name = '', size = 44, radius = 14 }) {
  const idx = (name.charCodeAt(0) || 0) % COLORS.length;
  const color = COLORS[idx];

  return (
    <div
      className="avatar"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        '--avatar-color': color,
        fontSize: size * 0.32,
      }}
    >
      {getInitials(name)}
    </div>
  );
}
