import React, { useState } from 'react';

/**
 * Las tres alternativas de ruta, en tarjetas seleccionables.
 *
 * La distinción entre `clasificacion` y `nivel_absoluto` que hace el backend se
 * respeta aquí: la etiqueta grande es el puesto relativo entre las opciones, y
 * la barra de índice muestra el riesgo medido. Sin esa separación, en un
 * trayecto enteramente seguro la tercera tarjeta diría "insegura" y alarmaría
 * sin motivo.
 */

const ESTILO = {
  SEGURA: {
    icono: 'shield',
    borde: 'border-green-300 dark:border-green-500/40',
    fondo: 'bg-green-50/60 dark:bg-green-500/5',
    texto: 'text-green-700 dark:text-green-400',
    chip: 'bg-green-600',
  },
  REGULAR: {
    icono: 'shield_question',
    borde: 'border-amber-300 dark:border-amber-500/40',
    fondo: 'bg-amber-50/60 dark:bg-amber-500/5',
    texto: 'text-amber-700 dark:text-amber-400',
    chip: 'bg-amber-500',
  },
  INSEGURA: {
    icono: 'warning',
    borde: 'border-red-300 dark:border-red-500/40',
    fondo: 'bg-red-50/60 dark:bg-red-500/5',
    texto: 'text-red-700 dark:text-red-400',
    chip: 'bg-red-600',
  },
};

function formatearDistancia(metros) {
  if (metros < 1000) return `${metros} m`;
  return `${(metros / 1000).toFixed(1)} km`;
}

function TarjetaRuta({ ruta, activa, onSeleccionar, onExpandir, expandida }) {
  const estilo = ESTILO[ruta.clasificacion] ?? ESTILO.REGULAR;

  return (
    <div
      onClick={onSeleccionar}
      className={`rounded-2xl border-2 p-3.5 cursor-pointer transition-all ${
        activa
          ? `${estilo.borde} ${estilo.fondo} shadow-md`
          : 'border-slate-200 dark:border-[#4A4A50] bg-white dark:bg-[#2B2B2F] hover:border-slate-300 opacity-75 hover:opacity-100'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-2 h-8 rounded-full shrink-0"
            style={{ backgroundColor: ruta.color }}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className={`material-symbols-outlined text-[16px] ${estilo.texto}`}>
                {estilo.icono}
              </span>
              <h4 className={`text-xs font-black tracking-tight ${estilo.texto}`}>
                Ruta {ruta.clasificacion.toLowerCase()}
              </h4>
            </div>
            <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
              {formatearDistancia(ruta.distancia_m)} · {ruta.duracion_min} min caminando
            </p>
          </div>
        </div>

        {activa && (
          <span className="material-symbols-outlined text-[18px] text-purple-800 dark:text-purple-400 shrink-0">
            check_circle
          </span>
        )}
      </div>

      {/* Índice de riesgo */}
      <div className="mb-2">
        <div className="flex justify-between items-baseline mb-1">
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
            Índice de riesgo
          </span>
          <span className="text-[10px] font-black text-slate-700 dark:text-slate-200">
            {ruta.indice_riesgo}/100
          </span>
        </div>
        <div className="h-1.5 w-full bg-slate-100 dark:bg-[#3C3C40] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${ruta.indice_riesgo}%`, backgroundColor: ruta.color }}
          />
        </div>
      </div>

      {activa && (
        <>
          <p className="text-[10px] leading-relaxed text-slate-600 dark:text-slate-300 font-medium">
            {ruta.recomendacion}
          </p>

          {(ruta.advertencias?.length > 0 || ruta.zonas_atravesadas?.length > 0) && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onExpandir();
              }}
              className="mt-2 text-[10px] font-bold text-purple-800 dark:text-purple-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              {expandida ? 'Ocultar detalle' : 'Ver detalle'}
              <span className="material-symbols-outlined text-[13px]">
                {expandida ? 'expand_less' : 'expand_more'}
              </span>
            </button>
          )}

          {expandida && (
            <div className="mt-2.5 space-y-2.5 border-t border-slate-200 dark:border-[#4A4A50] pt-2.5">
              {ruta.advertencias?.length > 0 && (
                <ul className="space-y-1">
                  {ruta.advertencias.map((a, i) => (
                    <li key={i} className="flex gap-1.5 text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed">
                      <span className="material-symbols-outlined text-[13px] text-amber-500 shrink-0 mt-px">info</span>
                      <span>{a}</span>
                    </li>
                  ))}
                </ul>
              )}

              {ruta.zonas_atravesadas?.length > 0 && (
                <div>
                  <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                    Zonas que atraviesa
                  </p>
                  <div className="space-y-1">
                    {ruta.zonas_atravesadas.map((z) => (
                      <div key={z.id_zona} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              (ESTILO[z.nivel] ?? ESTILO.REGULAR).chip
                            }`}
                          />
                          <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 truncate">
                            {z.nombre}
                          </span>
                        </div>
                        <span className="text-[9px] font-bold text-slate-400 shrink-0">
                          {z.metros} m
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {ruta.incidentes_cercanos > 0 && (
                <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg px-2 py-1.5">
                  <span className="material-symbols-outlined text-[14px] text-amber-600">report</span>
                  <span className="text-[10px] font-bold text-amber-800 dark:text-amber-400">
                    {ruta.incidentes_cercanos} incidente(s) reportado(s) cerca
                  </span>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function PanelRutas({
  rutas,
  seleccionada,
  onSeleccionar,
  onLimpiar,
  aviso,
  mostrarZonas,
  onAlternarZonas,
}) {
  const [expandida, setExpandida] = useState(null);

  if (!Array.isArray(rutas) || rutas.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-black text-purple-950 dark:text-slate-100 tracking-tight">
            {rutas.length === 1 ? 'Ruta disponible' : `${rutas.length} rutas encontradas`}
          </h3>
          <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
            Ordenadas de menor a mayor riesgo.
          </p>
        </div>
        <button
          onClick={onLimpiar}
          className="text-[10px] font-bold text-slate-500 hover:text-red-600 flex items-center gap-1 shrink-0 cursor-pointer transition-colors"
        >
          <span className="material-symbols-outlined text-[14px]">close</span>
          Limpiar
        </button>
      </div>

      {aviso && (
        <div className="flex gap-2 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl px-3 py-2">
          <span className="material-symbols-outlined text-[16px] text-amber-600 shrink-0">warning</span>
          <p className="text-[10px] font-semibold text-amber-800 dark:text-amber-400 leading-relaxed">{aviso}</p>
        </div>
      )}

      <div className="space-y-2">
        {rutas.map((ruta, i) => (
          <TarjetaRuta
            key={ruta.clasificacion}
            ruta={ruta}
            activa={i === seleccionada}
            onSeleccionar={() => {
              onSeleccionar(i);
              setExpandida(null);
            }}
            expandida={expandida === i}
            onExpandir={() => setExpandida(expandida === i ? null : i)}
          />
        ))}
      </div>

      <button
        onClick={onAlternarZonas}
        className={`w-full text-[10px] font-bold py-2 rounded-xl border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
          mostrarZonas
            ? 'bg-purple-50 dark:bg-purple-500/10 border-purple-300 dark:border-purple-500/30 text-purple-800 dark:text-purple-400'
            : 'bg-white dark:bg-[#2B2B2F] border-slate-200 dark:border-[#4A4A50] text-slate-500 hover:border-slate-300'
        }`}
      >
        <span className="material-symbols-outlined text-[14px]">
          {mostrarZonas ? 'visibility_off' : 'visibility'}
        </span>
        {mostrarZonas ? 'Ocultar zonas de seguridad' : 'Ver zonas de seguridad'}
      </button>
    </div>
  );
}
