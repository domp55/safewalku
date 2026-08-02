import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMapConfig } from '../layouts/MainLayout';

/**
 * Comprobante del reporte ya registrado.
 *
 * Antes esta pantalla era un segundo paso que hacía el POST, y su catch
 * simulaba éxito cuando el backend fallaba: el usuario veía "Reporte recibido"
 * aunque no se hubiera guardado nada. Ahora el envío ocurre en la pantalla
 * anterior y aquí solo se muestra lo que el servidor devolvió.
 */

const ETIQUETA_CATEGORIA = {
  ROBO: 'Robo o hurto',
  VIOLENCIA: 'Violencia o agresión',
  ACOSO: 'Acoso o intimidación',
  ACTIVIDAD_SOSPECHOSA: 'Actividad sospechosa',
  ACCIDENTE: 'Accidente',
  ILUMINACION: 'Iluminación deficiente',
  OTRO: 'Otro incidente',
};

const COLOR_RIESGO = {
  ALTO: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:border-red-500/20',
  MEDIO: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20',
  BAJO: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/20',
};

export default function ResumenReporte() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setMapConfig, defaultMapConfig } = useMapConfig();

  const reporte = location.state?.reporte ?? null;

  useEffect(() => {
    if (!reporte?.latitud) return;

    setMapConfig((prev) => ({
      ...prev,
      centro: [reporte.latitud, reporte.longitud],
      zoom: 17,
      markers: [{
        position: [reporte.latitud, reporte.longitud],
        title: `Reporte #${reporte.id_reporte}`,
        desc: reporte.ubicacion_nombre,
      }],
      circle: { center: [reporte.latitud, reporte.longitud], radius: 80, color: '#ba1a1a' },
      rutas: null,
      modoSeleccion: false,
    }));

    return () => setMapConfig(defaultMapConfig);
  }, [reporte, setMapConfig, defaultMapConfig]);

  // Llegar aquí sin reporte significa entrar por URL directa o recargar
  if (!reporte) {
    return (
      <div className="space-y-4 text-center py-10">
        <span className="material-symbols-outlined text-slate-300 text-[40px]">description</span>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          No hay ningún reporte que mostrar.
        </p>
        <button
          onClick={() => navigate('/reportar')}
          className="text-xs font-bold text-purple-900 dark:text-purple-400 hover:underline cursor-pointer"
        >
          Crear un reporte
        </button>
      </div>
    );
  }

  const fecha = reporte.fecha_reporte
    ? new Date(reporte.fecha_reporte).toLocaleString('es-EC', { timeZone: 'America/Guayaquil' })
    : '—';

  return (
    <div className="space-y-5">

      {/* Confirmación */}
      <div className="flex flex-col items-center text-center pt-2">
        <div className="w-14 h-14 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 text-green-600 rounded-2xl flex items-center justify-center mb-3 shadow-sm">
          <span className="material-symbols-outlined text-[28px] font-bold">check</span>
        </div>
        <h2 className="text-xl font-black text-purple-950 dark:text-slate-100 tracking-tight">Reporte registrado</h2>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed max-w-[300px]">
          Queda en revisión del administrador. Una vez validado, empezará a influir en las rutas
          que ve toda la comunidad.
        </p>
      </div>

      {/* Comprobante */}
      <div className="bg-slate-50 dark:bg-[#2B2B2F] border border-slate-100 dark:border-[#4A4A50] rounded-3xl p-5 shadow-inner space-y-4">

        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#4A4A50]">
          <div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">N.º de reporte</span>
            <span className="text-lg font-black text-purple-950 dark:text-slate-100">#{reporte.id_reporte}</span>
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20">
            {reporte.estado}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Categoría</span>
            <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
              {ETIQUETA_CATEGORIA[reporte.categoria] ?? reporte.categoria}
            </span>
          </div>
          <div className="space-y-1">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Nivel de riesgo</span>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border inline-block ${COLOR_RIESGO[reporte.nivel_riesgo] ?? ''}`}>
              {reporte.nivel_riesgo}
            </span>
          </div>
        </div>

        <div className="space-y-1">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Ubicación</span>
          <div className="text-[11px] font-bold text-purple-950 dark:text-slate-200 flex items-start gap-1.5">
            <span className="material-symbols-outlined text-[15px] shrink-0 mt-px">location_on</span>
            <div className="min-w-0">
              <p className="truncate">{reporte.ubicacion_nombre}</p>
              <p className="text-[9px] font-medium text-slate-400 truncate">{reporte.ubicacion_direccion}</p>
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Fecha y hora</span>
          <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[15px]">schedule</span>
            <span>{fecha}</span>
          </div>
        </div>

        <div className="space-y-1">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Descripción</span>
          <p className="text-[11px] text-slate-700 dark:text-slate-300 bg-white dark:bg-[#3C3C40] border border-slate-200/65 dark:border-[#4A4A50] p-3 rounded-2xl leading-relaxed shadow-sm font-medium">
            {reporte.descripcion}
          </p>
        </div>

        {reporte.evidencia_url && (
          <div className="space-y-1">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Evidencia adjunta</span>
            <img
              src={reporte.evidencia_url}
              alt="Evidencia del reporte"
              className="w-full max-h-40 object-cover rounded-2xl border border-slate-200 dark:border-[#4A4A50] shadow-sm"
            />
          </div>
        )}

        {reporte.es_anonimo && (
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-[#3C3C40] border border-slate-200 dark:border-[#4A4A50] rounded-lg px-2.5 py-1.5">
            <span className="material-symbols-outlined text-[14px] text-slate-500">visibility_off</span>
            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">Enviado de forma anónima</span>
          </div>
        )}

      </div>

      <div className="space-y-2">
        <button
          onClick={() => navigate('/app')}
          className="w-full bg-purple-900 hover:bg-purple-950 text-white py-3 rounded-xl text-xs uppercase tracking-wider font-bold shadow-md hover:shadow-lg transition-colors cursor-pointer"
        >
          Volver al inicio
        </button>
        <button
          onClick={() => navigate('/reportar')}
          className="w-full text-[11px] font-bold text-slate-500 hover:text-purple-900 py-2 transition-colors cursor-pointer"
        >
          Reportar otro incidente
        </button>
      </div>

    </div>
  );
}
