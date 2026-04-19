/**
 * Renderiza solo los botones de contacto que existen.
 * Si no tiene tel/ig/fb/web → no muestra nada.
 */
export default function ChannelButtons({ contact, layout = 'row' }) {
  const { tel, ig, fb, web } = contact;
  const hasAny = tel || ig || fb || web;
  if (!hasAny) return null;

  const stop = (e) => e.stopPropagation();

  const containerStyle = layout === 'full'
    ? { display: 'flex', gap: 8, flexWrap: 'wrap' }
    : { display: 'flex', gap: 6 };

  const btnStyle = layout === 'full'
    ? { flex: 1, justifyContent: 'center' }
    : { padding: '6px 10px', borderRadius: 10, fontSize: 13 };

  return (
    <div style={containerStyle} onClick={stop}>
      {tel && (
        <a
          href={`https://wa.me/54${tel}`}
          target="_blank"
          rel="noreferrer"
          className="glass-btn"
          style={{ ...btnStyle, color: '#30D158' }}
        >
          💬{layout === 'full' ? ' WhatsApp' : ''}
        </a>
      )}
      {tel && (
        <a
          href={`tel:+54${tel}`}
          className="glass-btn"
          style={{ ...btnStyle, color: '#0A84FF' }}
        >
          📞{layout === 'full' ? ' Llamar' : ''}
        </a>
      )}
      {ig && (
        <a
          href={`https://instagram.com/${ig}`}
          target="_blank"
          rel="noreferrer"
          className="glass-btn"
          style={{ ...btnStyle, color: '#BF5AF2' }}
        >
          📸{layout === 'full' ? ' Instagram' : ''}
        </a>
      )}
      {fb && (
        <a
          href={`https://facebook.com/${fb}`}
          target="_blank"
          rel="noreferrer"
          className="glass-btn"
          style={{ ...btnStyle, color: '#0A84FF' }}
        >
          📘{layout === 'full' ? ' Facebook' : ''}
        </a>
      )}
      {web && (
        <a
          href={`https://${web}`}
          target="_blank"
          rel="noreferrer"
          className="glass-btn"
          style={{ ...btnStyle, color: 'rgba(235,235,245,0.4)' }}
        >
          🌐{layout === 'full' ? ' Web' : ''}
        </a>
      )}
    </div>
  );
}
