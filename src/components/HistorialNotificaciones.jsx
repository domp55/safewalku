import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { buildApiUrl } from '../services/api';

/**
 * Moderación de reportes.
 *
 * Es la pantalla con más peso funcional del panel: solo los reportes que aquí
 * se validan pasan a influir en las rutas que ve toda la comunidad.
 */

const ESTADOS = [
  { valor: '', etiqueta: 'Todos' },
  { valor: 'PENDIENTE', etiqueta: 'Pendientes' },
  { valor: 'VALIDADO', etiqueta: 'Validados' },
  { valor: 'RECHAZADO', etiqueta: 'Rechazados' },
  { valor: 'DUPLICADO', etiqueta: 'Duplicados' },
];

const BADGE_ESTADO = {
  PENDIENTE: 'bg-amber-100 text-amber-700 border-amber-200',
  VALIDADO: 'bg-green-100 text-green-700 border-green-200',
  RECHAZADO: 'bg-red-100 text-red-700 border-red-200',
  DUPLICADO: 'bg-slate-100 text-slate-600 border-slate-200',
};

const BADGE_NIVEL = {
  ALTO: 'bg-red-50 text-red-700 border-red-200',
  MEDIO: 'bg-amber-50 text-amber-700 border-amber-200',
  BAJO: 'bg-blue-50 text-blue-700 border-blue-200',
};

const ETIQUETA_CATEGORIA = {
  ROBO: 'Robo o hurto',
  VIOLENCIA: 'Violencia',
  ACOSO: 'Acoso',
  ACTIVIDAD_SOSPECHOSA: 'Actividad sospechosa',
  ACCIDENTE: 'Accidente',
  ILUMINACION: 'Iluminación',
  OTRO: 'Otro',
};

function autorizacion() {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  return { Authorization: `Bearer ${token}` };
}

function fechaCorta(valor) {
  if (!valor) return '—';
  return new Date(valor).toLocaleString('es-EC', {
    timeZone: 'America/Guayaquil',
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function HistorialNotificaciones() {
  const { showToast } = useAuth();

  const [reportes, setReportes] = useState([]);
  const [resumen, setResumen] = useState({ por_estado: {}, por_tipo: {} });
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [limite] = useState(15);
  const [cargando, setCargando] = useState(true);

  const [filtroEstado, setFiltroEstado] = useState('PENDIENTE');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [busqueda, setBusqueda] = useState('');

  const [expandido, setExpandido] = useState(null);
  const [evidencias, setEvidencias] = useState({});
  const [moderando, setModerando] = useState(null);
  const [observacion, setObservacion] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const params = new URLSearchParams({ pagina: String(pagina), limite: String(limite) });
      if (filtroEstado) params.set('estado', filtroEstado);
      if (filtroTipo) params.set('tipo', filtroTipo);
      if (busqueda.trim()) params.set('busqueda', busqueda.trim());

      const [resLista, resResumen] = await Promise.all([
        fetch(buildApiUrl(`/reports/admin/listado?${params}`), { headers: autorizacion() }),
        fetch(buildApiUrl('/reports/admin/resumen'), { headers: autorizacion() }),
      ]);

      const jsonLista = await resLista.json();
      if (jsonLista.success) {
        setReportes(jsonLista.datos);
        setTotal(jsonLista.total);
      }

      const jsonResumen = await resResumen.json();
      if (jsonResumen.success) setResumen(jsonResumen.data);
    } catch (e) {
      console.error('Error cargando reportes', e);
      showToast('No se pudieron cargar los reportes.', 'error');
    } finally {
      setCargando(false);
    }
  }, [pagina, limite, filtroEstado, filtroTipo, busqueda, showToast]);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => { setPagina(1); }, [filtroEstado, filtroTipo, busqueda]);

  const verEvidencias = async (id) => {
    if (evidencias[id]) return;
    try {
      const res = await fetch(buildApiUrl(`/reports/${id}/evidencias`), { headers: autorizacion() });
      const json = await res.json();
      if (json.success) setEvidencias((prev) => ({ ...prev, [id]: json.data }));
    } catch (e) {
      console.error('Error cargando evidencias', e);
    }
  };

  const alternarDetalle = (id) => {
    const nuevo = expandido === id ? null : id;
    setExpandido(nuevo);
    setModerando(null);
    setObservacion('');
    if (nuevo) verEvidencias(nuevo);
  };

  const moderar = async (id, estado) => {
    // Rechazar o duplicar exige motivo: el estudiante debe saber qué pasó con
    // su reporte, así que el formulario se abre antes de enviar.
    if ((estado === 'RECHAZADO' || estado === 'DUPLICADO') && moderando?.estado !== estado) {
      setModerando({ id, estado });
      setObservacion('');
      return;
    }

    try {
      const res = await fetch(buildApiUrl(`/reports/${id}/moderar`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...autorizacion() },
        body: JSON.stringify({ estado, observacion: observacion.trim() || undefined }),
      });

      const json = await res.json();

      if (!json.success) {
        showToast(json.message || 'No se pudo actualizar el reporte.', 'error');
        return;
      }

      showToast(
        estado === 'VALIDADO'
          ? 'Reporte validado. Ya influye en el cálculo de rutas.'
          : `Reporte marcado como ${estado.toLowerCase()}.`
      );

      setModerando(null);
      setObservacion('');
      await cargar();
    } catch {
      showToast('No se pudo conectar con el servidor.', 'error');
    }
  };

  const exportar = async () => {
    try {
      const params = new URLSearchParams();
      if (filtroEstado) params.set('estado', filtroEstado);
      if (filtroTipo) params.set('tipo', filtroTipo);

      const res = await fetch(buildApiUrl(`/reports/admin/exportar?${params}`), { headers: autorizacion() });
      const blob = await res.blob();

      const url = URL.createObjectURL(blob);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = `reportes-safewalk-${new Date().toISOString().slice(0, 10)}.csv`;
      enlace.click();
      URL.revokeObjectURL(url);
    } catch {
      showToast('No se pudo exportar el archivo.', 'error');
    }
  };

  const totalPaginas = Math.max(1, Math.ceil(total / limite));
  const pendientes = resumen.por_estado?.PENDIENTE ?? 0;

  return (
    <div className="space-y-6">

      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-purple-950 tracking-tight">Reportes y Alertas</h2>
          <p className="text-sm text-slate-500 font-medium mt-0.5">
            Solo los reportes validados influyen en las rutas que ven los estudiantes.
          </p>
        </div>
        <button
          onClick={exportar}
          className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl shadow-sm text-xs font-bold transition-all cursor-pointer shrink-0"
        >
          <span className="material-symbols-outlined text-[16px]">download</span>
          Exportar CSV
        </button>
      </div>

      {/* Contadores */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { etiqueta: 'Pendientes', valor: pendientes, icono: 'pending', color: 'bg-amber-50 text-amber-700' },
          { etiqueta: 'Validados', valor: resumen.por_estado?.VALIDADO ?? 0, icono: 'verified', color: 'bg-green-50 text-green-700' },
          { etiqueta: 'Rechazados', valor: resumen.por_estado?.RECHAZADO ?? 0, icono: 'block', color: 'bg-red-50 text-red-700' },
          { etiqueta: 'Alertas SOS', valor: resumen.por_tipo?.SOS_PANICO ?? 0, icono: 'emergency', color: 'bg-purple-50 text-purple-700' },
        ].map((m) => (
          <div key={m.etiqueta} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <span className={`material-symbols-outlined p-2 rounded-xl text-[18px] ${m.color}`}>{m.icono}</span>
            <p className="text-[11px] text-slate-500 font-semibold mt-2">{m.etiqueta}</p>
            <p className="text-2xl font-black text-purple-950">{m.valor}</p>
          </div>
        ))}
      </div>

      {pendientes > 0 && filtroEstado !== 'PENDIENTE' && (
        <button
          onClick={() => setFiltroEstado('PENDIENTE')}
          className="w-full flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-left hover:bg-amber-100 transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-amber-600 text-[18px]">info</span>
          <span className="text-xs font-bold text-amber-900">
            Hay {pendientes} reporte(s) esperando revisión. Verlos ahora
          </span>
        </button>
      )}

      {/* Filtros */}
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="flex gap-1 p-1 bg-slate-100/80 rounded-2xl overflow-x-auto">
          {ESTADOS.map((e) => (
            <button
              key={e.valor}
              onClick={() => setFiltroEstado(e.valor)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                filtroEstado === e.valor ? 'bg-white text-purple-950 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {e.etiqueta}
            </button>
          ))}
        </div>

        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm outline-none cursor-pointer"
        >
          <option value="">Todo tipo</option>
          <option value="INCIDENTE">Incidentes</option>
          <option value="SOS_PANICO">Alertas SOS</option>
        </select>

        <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-2 gap-2 shadow-sm flex-1">
          <span className="material-symbols-outlined text-slate-400 text-[18px]">search</span>
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por descripción, lugar o estudiante..."
            className="flex-1 text-xs font-semibold text-slate-700 outline-none bg-transparent"
          />
        </div>
      </div>

      {/* Listado */}
      <div className="space-y-2">
        {cargando && (
          <p className="text-center py-8 text-xs text-slate-400 font-semibold">Cargando reportes...</p>
        )}

        {!cargando && reportes.length === 0 && (
          <div className="text-center py-10 bg-white rounded-2xl border border-slate-200">
            <span className="material-symbols-outlined text-slate-300 text-[32px]">inbox</span>
            <p className="text-xs text-slate-400 font-semibold mt-1">No hay reportes con estos filtros</p>
          </div>
        )}

        {reportes.map((r) => {
          const abierto = expandido === r.id_reporte;
          const esSos = r.tipo_reporte === 'SOS_PANICO';

          return (
            <div
              key={r.id_reporte}
              className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
                esSos ? 'border-red-200' : 'border-slate-200'
              }`}
            >
              <button
                onClick={() => alternarDetalle(r.id_reporte)}
                className="w-full flex items-start gap-3 px-5 py-4 hover:bg-slate-50/60 transition-colors text-left cursor-pointer"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  esSos ? 'bg-red-600 text-white' : 'bg-amber-50 text-amber-700'
                }`}>
                  <span className="material-symbols-outlined text-[18px]">
                    {esSos ? 'emergency' : 'report_problem'}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-xs font-bold text-slate-900">
                      {esSos ? 'Botón de pánico' : (ETIQUETA_CATEGORIA[r.categoria] ?? r.categoria)}
                      <span className="text-slate-400 font-semibold"> · #{r.id_reporte}</span>
                    </h4>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-md border ${BADGE_NIVEL[r.nivel_riesgo] ?? ''}`}>
                        {r.nivel_riesgo}
                      </span>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-md border ${BADGE_ESTADO[r.estado] ?? ''}`}>
                        {r.estado}
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-600 font-medium mt-1 line-clamp-1">{r.descripcion}</p>

                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-400 font-semibold">
                    <span className="flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-[12px]">location_on</span>
                      {r.ubicacion_nombre}
                    </span>
                    <span>{fechaCorta(r.fecha_reporte)}</span>
                    <span>{r.nombre} {r.apellido}</span>
                    {r.total_evidencias > 0 && (
                      <span className="flex items-center gap-0.5 text-purple-600">
                        <span className="material-symbols-outlined text-[12px]">image</span>
                        {r.total_evidencias}
                      </span>
                    )}
                  </div>
                </div>

                <span className="material-symbols-outlined text-slate-300 text-[18px] shrink-0">
                  {abierto ? 'expand_less' : 'expand_more'}
                </span>
              </button>

              {abierto && (
                <div className="px-5 pb-4 pt-1 border-t border-slate-100 space-y-3">

                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Descripción completa</span>
                    <p className="text-[11px] text-slate-700 mt-1 leading-relaxed">{r.descripcion}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-[10px]">
                    <div>
                      <span className="font-black text-slate-400 uppercase tracking-widest block">Ubicación</span>
                      <p className="text-slate-700 font-semibold mt-0.5">{r.ubicacion_nombre}</p>
                      <p className="text-slate-400">{r.ubicacion_direccion}</p>
                      {r.latitud != null && (
                        <p className="text-slate-400 mt-0.5">{r.latitud.toFixed(5)}, {r.longitud.toFixed(5)}</p>
                      )}
                    </div>
                    <div>
                      <span className="font-black text-slate-400 uppercase tracking-widest block">Reportado por</span>
                      <p className="text-slate-700 font-semibold mt-0.5">
                        {r.nombre} {r.apellido}
                        {r.es_anonimo && (
                          <span className="ml-1 text-[9px] text-slate-400 font-bold">(anónimo)</span>
                        )}
                      </p>
                      {r.correo && <p className="text-slate-400">{r.correo}</p>}
                    </div>
                  </div>

                  {/* Evidencias */}
                  {evidencias[r.id_reporte]?.length > 0 && (
                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">
                        Evidencia adjunta
                      </span>
                      <div className="flex gap-2 flex-wrap">
                        {evidencias[r.id_reporte].map((ev) => (
                          <a
                            key={ev.id_evidencia}
                            href={ev.url_archivo}
                            target="_blank"
                            rel="noreferrer"
                            className="block w-24 h-24 rounded-xl overflow-hidden border border-slate-200 hover:border-purple-400 transition-colors relative bg-slate-50"
                          >
                            <img
                              src={ev.url_archivo}
                              alt="Evidencia"
                              className="w-full h-full object-cover"
                              // Parte de los adjuntos apuntan a servidores externos que
                              // pueden no existir. Un icono roto no le dice nada al
                              // administrador; este aviso sí.
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                            <span className="hidden absolute inset-0 flex-col items-center justify-center gap-1 text-slate-400 p-1">
                              <span className="material-symbols-outlined text-[18px]">broken_image</span>
                              <span className="text-[8px] font-bold text-center leading-tight">Imagen no disponible</span>
                            </span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {r.observacion_admin && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                        Observación del administrador
                      </span>
                      <p className="text-[11px] text-slate-700 font-medium mt-0.5">{r.observacion_admin}</p>
                    </div>
                  )}

                  {/* Formulario de motivo */}
                  {moderando?.id === r.id_reporte && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
                      <p className="text-[10px] font-black text-amber-900 uppercase tracking-wider">
                        Motivo para marcar como {moderando.estado.toLowerCase()}
                      </p>
                      <textarea
                        value={observacion}
                        onChange={(e) => setObservacion(e.target.value)}
                        maxLength={255}
                        placeholder="Explica brevemente por qué. El estudiante debe poder entender la decisión."
                        className="w-full bg-white border border-amber-200 rounded-lg py-2 px-3 text-[11px] font-medium text-slate-700 outline-none resize-none h-16"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => moderar(r.id_reporte, moderando.estado)}
                          disabled={!observacion.trim()}
                          className="px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 text-white transition-colors cursor-pointer disabled:cursor-not-allowed"
                        >
                          Confirmar
                        </button>
                        <button
                          onClick={() => { setModerando(null); setObservacion(''); }}
                          className="px-3 text-[10px] font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Acciones */}
                  {!moderando && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {r.estado !== 'VALIDADO' && (
                        <button
                          onClick={() => moderar(r.id_reporte, 'VALIDADO')}
                          className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider bg-green-600 hover:bg-green-700 text-white shadow-sm transition-all cursor-pointer flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[13px]">check</span>
                          Validar
                        </button>
                      )}
                      {r.estado !== 'RECHAZADO' && (
                        <button
                          onClick={() => moderar(r.id_reporte, 'RECHAZADO')}
                          className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider bg-white border border-red-200 text-red-700 hover:bg-red-50 transition-all cursor-pointer flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[13px]">block</span>
                          Rechazar
                        </button>
                      )}
                      {r.estado !== 'DUPLICADO' && (
                        <button
                          onClick={() => moderar(r.id_reporte, 'DUPLICADO')}
                          className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all cursor-pointer flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[13px]">content_copy</span>
                          Duplicado
                        </button>
                      )}
                      {r.estado === 'VALIDADO' && (
                        <span className="flex items-center gap-1 px-3 py-2 text-[10px] font-bold text-green-700">
                          <span className="material-symbols-outlined text-[13px]">verified</span>
                          Influye en el cálculo de rutas
                        </span>
                      )}
                    </div>
                  )}

                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Paginación */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-400">
            {total} reporte(s) · página {pagina} de {totalPaginas}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
              disabled={pagina === 1}
              className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-white border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            <button
              onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
              disabled={pagina === totalPaginas}
              className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-white border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
