import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildApiUrl } from '../services/api';

/**
 * Campana de notificaciones del administrador.
 *
 * Se refresca por sondeo cada 30 segundos. No usa WebSockets a propósito: para
 * el volumen de este sistema no compensan la complejidad de mantener una
 * conexión abierta, y un retraso de medio minuto es aceptable incluso para un
 * SOS, que además llega al panel de alertas por su cuenta.
 */

const INTERVALO_SONDEO_MS = 30000;

const ESTILO_TIPO = {
  SOS_ACTIVADO: {
    icono: 'emergency',
    color: 'bg-red-50 text-red-600 border-red-200',
    urgente: true,
  },
  REPORTE_NUEVO: {
    icono: 'report_problem',
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    urgente: false,
  },
  USUARIO_NUEVO: {
    icono: 'person_add',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    urgente: false,
  },
};

function autorizacion() {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  return { Authorization: `Bearer ${token}` };
}

/** "hace 3 min", "hace 2 h", "hace 5 d". */
function haceCuanto(fecha) {
  const ms = Date.now() - new Date(fecha).getTime();
  const min = Math.floor(ms / 60000);

  if (min < 1) return 'ahora mismo';
  if (min < 60) return `hace ${min} min`;

  const horas = Math.floor(min / 60);
  if (horas < 24) return `hace ${horas} h`;

  return `hace ${Math.floor(horas / 24)} d`;
}

export default function CampanaNotificaciones() {
  const navigate = useNavigate();

  const [notificaciones, setNotificaciones] = useState([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef(null);

  const cargar = useCallback(async () => {
    try {
      const res = await fetch(buildApiUrl('/notificaciones?limite=15'), {
        headers: autorizacion(),
      });

      if (!res.ok) return;

      const json = await res.json();
      if (json.success) {
        setNotificaciones(json.data);
        setNoLeidas(json.no_leidas);
      }
    } catch (e) {
      // Un fallo de red no debe llenar la consola cada 30 segundos
      console.debug('No se pudieron cargar las notificaciones', e);
    }
  }, []);

  useEffect(() => {
    cargar();
    const id = setInterval(cargar, INTERVALO_SONDEO_MS);
    return () => clearInterval(id);
  }, [cargar]);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const alClicFuera = (e) => {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target)) {
        setAbierto(false);
      }
    };
    document.addEventListener('mousedown', alClicFuera);
    return () => document.removeEventListener('mousedown', alClicFuera);
  }, []);

  const abrirNotificacion = async (n) => {
    setAbierto(false);

    if (!n.leida) {
      // Se marca en local antes de esperar al servidor para que la interfaz
      // responda al instante; el sondeo siguiente corrige si algo falló.
      setNotificaciones((prev) =>
        prev.map((x) => (x.id_notificacion === n.id_notificacion ? { ...x, leida: true } : x))
      );
      setNoLeidas((v) => Math.max(0, v - 1));

      try {
        await fetch(buildApiUrl(`/notificaciones/${n.id_notificacion}/leida`), {
          method: 'PATCH',
          headers: autorizacion(),
        });
      } catch {
        cargar();
      }
    }

    navigate('/admin/notificaciones');
  };

  const marcarTodas = async () => {
    setNoLeidas(0);
    setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));

    try {
      await fetch(buildApiUrl('/notificaciones/leidas'), {
        method: 'PATCH',
        headers: autorizacion(),
      });
    } catch {
      cargar();
    }
  };

  const haySos = notificaciones.some((n) => n.tipo === 'SOS_ACTIVADO' && !n.leida);

  return (
    <div className="relative" ref={contenedorRef}>
      <button
        onClick={() => setAbierto((v) => !v)}
        title={noLeidas > 0 ? `${noLeidas} notificación(es) sin leer` : 'Notificaciones'}
        className="relative p-2 rounded-full text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer flex items-center"
      >
        <span className={`material-symbols-outlined text-[22px] ${haySos ? 'text-red-600' : ''}`}>
          notifications
        </span>

        {noLeidas > 0 && (
          <span
            className={`absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow ${
              haySos ? 'bg-red-600 animate-pulse' : 'bg-purple-800'
            }`}
          >
            {noLeidas > 99 ? '99+' : noLeidas}
          </span>
        )}
      </button>

      {abierto && (
        <div className="absolute right-0 top-12 w-[340px] bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden">

          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <div>
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Notificaciones
              </span>
              {noLeidas > 0 && (
                <span className="ml-2 text-[10px] font-bold text-purple-700">{noLeidas} sin leer</span>
              )}
            </div>
            {noLeidas > 0 && (
              <button
                onClick={marcarTodas}
                className="text-[10px] font-bold text-slate-500 hover:text-purple-800 cursor-pointer transition-colors"
              >
                Marcar todas
              </button>
            )}
          </div>

          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-50">
            {notificaciones.length === 0 && (
              <div className="px-4 py-8 text-center">
                <span className="material-symbols-outlined text-slate-200 text-[28px]">notifications_off</span>
                <p className="text-[11px] text-slate-400 font-semibold mt-1">Sin notificaciones</p>
              </div>
            )}

            {notificaciones.map((n) => {
              const estilo = ESTILO_TIPO[n.tipo] ?? ESTILO_TIPO.REPORTE_NUEVO;

              return (
                <button
                  key={n.id_notificacion}
                  onClick={() => abrirNotificacion(n)}
                  className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer flex gap-3 ${
                    n.leida ? 'opacity-60' : ''
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${estilo.color}`}>
                    <span className="material-symbols-outlined text-[16px]">{estilo.icono}</span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-1.5">
                      <p className={`text-[11px] leading-snug flex-1 ${n.leida ? 'font-semibold text-slate-600' : 'font-bold text-slate-900'}`}>
                        {n.titulo}
                      </p>
                      {!n.leida && (
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-700 shrink-0 mt-1.5" />
                      )}
                    </div>

                    {n.detalle && (
                      <p className="text-[10px] text-slate-500 font-medium mt-0.5 truncate">{n.detalle}</p>
                    )}

                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] font-bold text-slate-400">{haceCuanto(n.fecha)}</span>
                      {n.estado_reporte && (
                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${
                          n.estado_reporte === 'PENDIENTE'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                          {n.estado_reporte}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => { setAbierto(false); navigate('/admin/notificaciones'); }}
            className="w-full px-4 py-2.5 text-[11px] font-bold text-purple-800 hover:bg-purple-50 border-t border-slate-100 transition-colors cursor-pointer"
          >
            Ver todos los reportes
          </button>
        </div>
      )}
    </div>
  );
}
