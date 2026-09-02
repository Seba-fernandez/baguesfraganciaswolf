import { useState } from 'react';
import { ESTADOS_PEDIDO_LISTA, PAGO } from '../../data/constants';
import { pesos } from '../../lib/format';
import { linkWhatsApp, mensajeParaCliente } from '../../lib/whatsapp';
import { IconChat } from '../ui/Icon';
import s from './panel.module.css';

export default function PedidoSheet({ pedido, onClose, onUpdate, onDelete }) {
  const [notas, setNotas] = useState(pedido.notas_conversacion || '');
  const [senia, setSenia] = useState(pedido.senia_monto || '');
  const [retiro, setRetiro] = useState(pedido.fecha_retiro_estimada || '');

  const cliente = pedido.customer || {};
  const guardarCampo = (patch) => onUpdate(pedido.id, patch);

  const escribirCliente = () => {
    const msg = mensajeParaCliente(pedido.estado, { nombreCliente: cliente.nombre?.split(' ')[0] || '' });
    window.open(linkWhatsApp(cliente.telefono, msg), '_blank', 'noopener');
  };

  return (
    <>
      <div className={s.overlay} onClick={onClose} />
      <div className={`${s.sheet} glass-strong`}>
        <span className={s.handle} />
        <h3 className={s.sheetTitle}>Pedido #{pedido.numero}</h3>
        <p className={s.subtitle}>
          {cliente.nombre} · {cliente.telefono}
          {pedido.canal === 'web' ? ' · llegó de la web' : ''}
        </p>

        <button className={`${s.btn} ${s.btnGhost}`} style={{ marginTop: 12 }} onClick={escribirCliente}>
          <IconChat size={16} /> Escribir al cliente por WhatsApp
        </button>

        {/* ---- ítems ---- */}
        <div className={s.field}>
          <label className={s.label}>Perfumes del pedido</label>
          <div className={s.list}>
            {(pedido.items || []).map((it) => (
              <div key={it.id} className={s.card} style={{ padding: 12 }}>
                <div className={s.cardRow}>
                  <span className={s.cardName} style={{ fontSize: 14 }}>{it.nombre_snapshot}</span>
                  <span className={s.cardMoney}>x{it.cantidad}</span>
                </div>
                <span className={s.cardMeta}>{pesos(it.precio_unitario)} c/u</span>
              </div>
            ))}
          </div>
          <p className={s.cardMeta} style={{ marginTop: 6, textAlign: 'right' }}>
            Total estimado: <strong>{pesos(pedido.total_estimado)}</strong>
          </p>
        </div>

        {/* ---- estado ---- */}
        <div className={s.field}>
          <label className={s.label}>Estado</label>
          <div className={s.options}>
            {ESTADOS_PEDIDO_LISTA.map((e) => {
              const on = pedido.estado === e.id;
              return (
                <button
                  key={e.id}
                  className={`${s.option} ${on ? s.optionOn : ''}`}
                  style={on ? { background: e.bg, borderColor: e.rim, color: e.color } : undefined}
                  onClick={() => guardarCampo({ estado: e.id })}
                >
                  <span className={s.optionDot} style={{ background: e.color }} />
                  {e.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ---- pago ---- */}
        <div className={s.field}>
          <label className={s.label}>Pago</label>
          <div className={s.options}>
            {Object.values(PAGO).map((p) => {
              const on = pedido.pago === p.id;
              return (
                <button
                  key={p.id}
                  className={`${s.option} ${on ? s.optionOn : ''}`}
                  style={on ? { background: `${p.color}22`, borderColor: `${p.color}66`, color: p.color } : undefined}
                  onClick={() => guardarCampo({ pago: p.id })}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className={s.row2}>
          <div className={s.field}>
            <label className={s.label}>Seña ($)</label>
            <input
              className={s.input}
              inputMode="numeric"
              value={senia}
              onChange={(e) => setSenia(e.target.value.replace(/\D/g, ''))}
              onBlur={() => guardarCampo({ senia_monto: Number(senia) || 0 })}
            />
          </div>
          <div className={s.field}>
            <label className={s.label}>Retira el</label>
            <input
              className={s.input}
              type="date"
              value={retiro || ''}
              onChange={(e) => setRetiro(e.target.value)}
              onBlur={() => guardarCampo({ fecha_retiro_estimada: retiro || null })}
            />
          </div>
        </div>

        <div className={s.field}>
          <label className={s.label}>Detalle de la conversación</label>
          <textarea
            className={s.textarea}
            placeholder="Qué le dijiste: si sabe que llega el viernes, si está esperando confirmación…"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            onBlur={() => guardarCampo({ notas_conversacion: notas })}
          />
        </div>

        <div className={s.btnRow}>
          <button
            className={`${s.btn} ${s.btnDanger}`}
            onClick={() => {
              if (confirm(`¿Borrar el pedido #${pedido.numero}?`)) { onDelete(pedido.id); onClose(); }
            }}
          >
            Borrar
          </button>
          <button className={`${s.btn} ${s.btnPrimary}`} onClick={onClose}>Listo</button>
        </div>
      </div>
    </>
  );
}
