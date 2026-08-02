import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { useAuth } from '../context/AuthContext';
import { buildApiUrl } from '../services/api';

/**
 * Panel del administrador.
 *
 * Todo lo que se ve sale de consultas reales. Antes esta pantalla mostraba un
 * gráfico circular con porcentajes fijos, un total escrito a mano y una imagen
 * de Google haciendo de "mapa en tiempo real".
 */

const COLOR_ESTADO = {
  VALIDADO: '#16a34a',
  PENDIENTE: '#f59e0b',
  RECHAZADO: '#dc2626',
  DUPLICADO: '#94a3b8',
};

const COLOR_NIVEL = {
  ALTO: '#dc2626',
  MEDIO: '#f59e0b',
  BAJO: '#3b82f6',
};

const COLOR_ZONA = {
  SEGURA: 'bg-green-100 text-green-700 border-green-200',
  REGULAR: 'bg-amber-100 text-amber-700 border-amber-200',
  INSEGURA: 'bg-red-100 text-red-700 border-red-200',
};

const ETIQUETA_CATEGORIA = {
  ROBO: 'Robo o hurto',
  VIOLENCIA: 'Violencia',
  ACOSO: 'Acoso',
  ACTIVIDAD_SOSPECHOSA: 'Act. sospechosa',
  ACCIDENTE: 'Accidente',
  ILUMINACION: 'Iluminación',
  OTRO: 'Otro',
};

const CENTRO_LOJA = [-3.9905, -79.2045];

function autorizacion() {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  return { Authorization: `Bearer ${token}` };
}

/** Etiqueta de tendencia, honesta cuando no hay periodo previo con qué comparar. */
function Tendencia({ dato, sufijo = '' }) {
  if (!dato) return null;

  // Sin periodo anterior no hay porcentaje posible: se informa el absoluto en
  // lugar de inventar un "+100%".
  if (dato.porcentaje === null) {
    return (
      <span className="text-[10px] font-black text-slate-400">
        {dato.actual > 0 ? `+${dato.actual}${sufijo}` : 'sin datos previos'}
      </span>
    );
  }

  const sube = dato.sube;

  return (
    <span className={`text-[10px] font-black flex items-center gap-0.5 ${sube ? 'text-green-600' : 'text-red-500'}`}>
      <span className="material-symbols-outlined text-[12px]">
        {sube ? 'trending_up' : 'trending_down'}
      </span>
      {sube ? '+' : ''}{dato.porcentaje}%
    </span>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, showToast } = useAuth();

  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    try {
      const res = await fetch(buildApiUrl('/dashboard/resumen'), { headers: autorizacion() });
      const json = await res.json();
      if (json.success) setDatos(json.data);
      else showToast('No se pudo cargar el panel.', 'error');
    } catch (e) {
      console.error('Error cargando el dashboard', e);
      showToast('No se pudo conectar con el servidor.', 'error');
    } finally {
      setCargando(false);
    }
  }, [showToast]);

  useEffect(() => { cargar(); }, [cargar]);

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="material-symbols-outlined text-slate-300 text-[32px] animate-spin">progress_activity</span>
      </div>
    );
  }

  if (!datos) {
    return (
      <div className="text-center py-20">
        <span className="material-symbols-outlined text-slate-300 text-[32px]">error</span>
        <p className="text-xs text-slate-400 font-semibold mt-2">No hay datos que mostrar.</p>
      </div>
    );
  }

  const { metricas, estado, categoria, serie, puntos, zonas } = datos;

  // Gradiente del gráfico circular a partir de los porcentajes reales. Se
  // acumula el ángulo en vez de usar cada porcentaje suelto, para que los
  // segmentos queden pegados sin huecos por redondeo.
  let acumulado = 0;
  const segmentos = estado.datos.map((d) => {
    const desde = acumulado;
    acumulado += estado.total ? (d.total / estado.total) * 100 : 0;
    return `${COLOR_ESTADO[d.estado] ?? '#cbd5e1'} ${desde}% ${acumulado}%`;
  });
  const gradiente = segmentos.length
    ? `conic-gradient(${segmentos.join(', ')})`
    : 'conic-gradient(#e2e8f0 0% 100%)';

  const maxCategoria = Math.max(1, ...categoria.map((c) => c.total));
  const maxSerie = Math.max(1, ...serie.map((s) => s.total));

  const TARJETAS = [
    {
      icono: 'description', bg: 'bg-purple-50 text-purple-900',
      etiqueta: 'Reportes totales', valor: metricas.totalReportes,
      tendencia: metricas.tendencias.reportes,
    },
    {
      icono: 'pending', bg: 'bg-amber-50 text-amber-700',
      etiqueta: 'Pendientes de revisar', valor: metricas.pendientes,
      accion: () => navigate('/admin/notificaciones'),
    },
    {
      icono: 'emergency', bg: 'bg-red-50 text-red-700',
      etiqueta: 'Alertas SOS activas', valor: metricas.sosActivos,
      urgente: metricas.sosActivos > 0,
    },
    {
      icono: 'group', bg: 'bg-blue-50 text-blue-800',
      etiqueta: 'Usuarios activos', valor: metricas.usuariosRegistrados,
      tendencia: metricas.tendencias.usuarios,
    },
  ];

  return (
    <div className="space-y-6">

      <div className="flex justify-between items-start gap-4">
        <div>
          <h2 className="text-2xl font-black text-purple-950 tracking-tight">Dashboard General</h2>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Bienvenido, <span className="text-purple-950 font-bold">{user?.nombre ?? 'Administrador'}</span>.
            Comparativas sobre los últimos {metricas.dias_periodo} días.
          </p>
        </div>
        <button
          onClick={cargar}
          title="Actualizar datos"
          className="p-2.5 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 transition-colors cursor-pointer shrink-0"
        >
          <span className="material-symbols-outlined text-slate-500 text-[18px]">refresh</span>
        </button>
      </div>

      {/* Tarjetas */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {TARJETAS.map((m) => (
          <div
            key={m.etiqueta}
            onClick={m.accion}
            className={`bg-white p-5 rounded-2xl border shadow-sm transition-all duration-200 ${
              m.accion ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md' : ''
            } ${m.urgente ? 'border-red-300 ring-2 ring-red-100' : 'border-slate-200'}`}
          >
            <div className="flex items-start justify-between mb-3">
              <span className={`material-symbols-outlined p-2 rounded-xl text-[20px] ${m.bg}`}>{m.icono}</span>
              {m.tendencia && <Tendencia dato={m.tendencia} />}
            </div>
            <p className="text-[11px] text-slate-500 font-semibold">{m.etiqueta}</p>
            <p className={`text-2xl font-black mt-1 ${m.urgente ? 'text-red-600' : 'text-purple-950'}`}>
              {m.valor}
            </p>
          </div>
        ))}
      </section>

      {/* Gráficos */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Reportes por estado */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center">
          <h4 className="text-sm font-black text-purple-950 w-full mb-5">Reportes por estado</h4>

          <div className="relative w-40 h-40 mb-5">
            <div className="w-full h-full rounded-full" style={{ background: gradiente }} />
            <div className="absolute inset-4 bg-white rounded-full flex flex-col justify-center items-center shadow-inner">
              <span className="text-xl font-black text-purple-950">{estado.total}</span>
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Total</span>
            </div>
          </div>

          <div className="w-full space-y-2">
            {estado.datos.map((d) => (
              <div key={d.estado} className="flex items-center justify-between text-xs font-medium">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: COLOR_ESTADO[d.estado] ?? '#cbd5e1' }}
                  />
                  <span className="text-slate-500 capitalize">{d.estado.toLowerCase()}</span>
                </div>
                <span className="font-bold text-slate-800">{d.total} · {d.porcentaje}%</span>
              </div>
            ))}
            {estado.datos.length === 0 && (
              <p className="text-[11px] text-slate-400 font-semibold text-center">Aún no hay reportes.</p>
            )}
          </div>
        </div>

        {/* Mapa de incidentes */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h4 className="text-sm font-black text-purple-950">Mapa de incidentes</h4>
            <span className="text-[10px] font-bold text-slate-400">{puntos.length} ubicaciones</span>
          </div>

          <div className="flex-1 min-h-[280px] relative">
            {puntos.length > 0 ? (
              <MapContainer
                center={CENTRO_LOJA}
                zoom={13}
                scrollWheelZoom={false}
                className="w-full h-full absolute inset-0"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {puntos.map((p) => (
                  <CircleMarker
                    key={p.id_reporte}
                    center={[p.latitud, p.longitud]}
                    radius={p.tipo_reporte === 'SOS_PANICO' ? 11 : 7}
                    pathOptions={{
                      color: COLOR_NIVEL[p.nivel_riesgo] ?? '#64748b',
                      fillColor: COLOR_NIVEL[p.nivel_riesgo] ?? '#64748b',
                      // Los pendientes van huecos y los validados rellenos:
                      // así se distingue de un vistazo qué falta por revisar.
                      fillOpacity: p.estado === 'VALIDADO' ? 0.65 : 0.15,
                      weight: 2,
                    }}
                  >
                    <Popup>
                      <div className="text-xs font-sans p-1 min-w-[150px]">
                        <p className="font-bold text-slate-800">{p.ubicacion_nombre}</p>
                        <p className="text-slate-500 mt-0.5">
                          {p.tipo_reporte === 'SOS_PANICO'
                            ? 'Alerta SOS'
                            : (ETIQUETA_CATEGORIA[p.categoria] ?? p.categoria)}
                        </p>
                        <div className="flex gap-1 mt-1.5">
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                            {p.nivel_riesgo}
                          </span>
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                            {p.estado}
                          </span>
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
              </MapContainer>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300">
                <span className="material-symbols-outlined text-[32px]">location_off</span>
                <p className="text-xs font-semibold mt-1">Sin incidentes ubicados</p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 px-6 py-2.5 border-t border-slate-100 bg-slate-50/50">
            {Object.entries(COLOR_NIVEL).map(([nivel, color]) => (
              <div key={nivel} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-[10px] font-bold text-slate-500">{nivel}</span>
              </div>
            ))}
            <span className="text-[10px] text-slate-400 font-medium ml-auto">
              Relleno = validado · Hueco = pendiente
            </span>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Incidentes por categoría */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h4 className="text-sm font-black text-purple-950 mb-4">Incidentes por categoría</h4>

          <div className="space-y-2.5">
            {categoria.map((c) => (
              <div key={c.categoria}>
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-[11px] font-semibold text-slate-600">
                    {ETIQUETA_CATEGORIA[c.categoria] ?? c.categoria}
                  </span>
                  <span className="text-[11px] font-black text-slate-800">{c.total}</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-800 rounded-full transition-all duration-500"
                    style={{ width: `${(c.total / maxCategoria) * 100}%` }}
                  />
                </div>
              </div>
            ))}

            {categoria.length === 0 && (
              <p className="text-[11px] text-slate-400 font-semibold">Aún no hay incidentes clasificados.</p>
            )}
          </div>
        </div>

        {/* Zonas más reportadas */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h4 className="text-sm font-black text-purple-950 mb-1">Zonas con más reportes validados</h4>
          <p className="text-[10px] text-slate-400 font-medium mb-4">
            Solo cuentan los validados, que son los que influyen en las rutas.
          </p>

          <div className="space-y-2">
            {zonas.map((z, i) => (
              <div key={z.id_zona} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-500 text-[10px] font-black flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold text-slate-800 truncate">{z.nombre}</p>
                  {z.sector && <p className="text-[9px] text-slate-400">{z.sector}</p>}
                </div>
                <span className={`text-[9px] font-black px-2 py-0.5 rounded-md border shrink-0 ${COLOR_ZONA[z.nivel] ?? ''}`}>
                  {z.nivel}
                </span>
                <span className="text-sm font-black text-purple-950 w-6 text-right shrink-0">{z.total_reportes}</span>
              </div>
            ))}

            {zonas.length === 0 && (
              <p className="text-[11px] text-slate-400 font-semibold">Ninguna zona tiene reportes validados todavía.</p>
            )}
          </div>
        </div>
      </section>

      {/* Serie diaria */}
      <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-baseline justify-between mb-4">
          <h4 className="text-sm font-black text-purple-950">Reportes por día</h4>
          <span className="text-[10px] font-bold text-slate-400">últimos {serie.length} días</span>
        </div>

        {/* Se dibujan también los días en cero: omitirlos comprimiría el tiempo
            y sugeriría una frecuencia de incidentes que no existe. */}
        <div className="flex items-end gap-1 h-24">
          {serie.map((s) => (
            <div key={s.dia} className="flex-1 flex flex-col items-center justify-end h-full group relative">
              <div
                className={`w-full rounded-t transition-all duration-500 ${s.total > 0 ? 'bg-purple-800' : 'bg-slate-100'}`}
                style={{ height: s.total > 0 ? `${(s.total / maxSerie) * 100}%` : '3px' }}
              />
              <span className="absolute -top-5 text-[9px] font-black text-purple-950 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {s.total} · {s.dia.slice(5)}
              </span>
            </div>
          ))}
        </div>

        <div className="flex justify-between mt-2">
          <span className="text-[9px] font-bold text-slate-400">{serie[0]?.dia.slice(5)}</span>
          <span className="text-[9px] font-bold text-slate-400">{serie[serie.length - 1]?.dia.slice(5)}</span>
        </div>
      </section>

    </div>
  );
}
