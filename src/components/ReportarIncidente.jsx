import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMapConfig } from '../layouts/MainLayout';
import { useAuth } from '../context/AuthContext';
import { buildApiUrl } from '../services/api';

/**
 * Las categorías coinciden con el enum de la base. El nivel de riesgo que
 * implica cada una lo decide el servidor, aquí solo se muestra para que el
 * usuario sepa qué peso va a tener su reporte.
 */
const CATEGORIAS = [
  { valor: 'ROBO', etiqueta: 'Robo o hurto', icono: 'e911_emergency', riesgo: 'ALTO' },
  { valor: 'VIOLENCIA', etiqueta: 'Violencia o agresión', icono: 'personal_injury', riesgo: 'ALTO' },
  { valor: 'ACOSO', etiqueta: 'Acoso o intimidación', icono: 'sentiment_dissatisfied', riesgo: 'MEDIO' },
  { valor: 'ACTIVIDAD_SOSPECHOSA', etiqueta: 'Actividad sospechosa', icono: 'visibility', riesgo: 'MEDIO' },
  { valor: 'ACCIDENTE', etiqueta: 'Accidente', icono: 'e911_avatar', riesgo: 'MEDIO' },
  { valor: 'ILUMINACION', etiqueta: 'Iluminación deficiente', icono: 'lightbulb', riesgo: 'BAJO' },
  { valor: 'OTRO', etiqueta: 'Otro incidente', icono: 'help', riesgo: 'BAJO' },
];

const COLOR_RIESGO = {
  ALTO: 'text-red-600 bg-red-50 border-red-200 dark:bg-red-500/10 dark:border-red-500/20',
  MEDIO: 'text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20',
  BAJO: 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/20',
};

const MAX_ARCHIVO_MB = 5;

function autorizacion() {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  return { Authorization: `Bearer ${token}` };
}

export default function ReportarIncidente() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const { setMapConfig, defaultMapConfig } = useMapConfig();
  const { showToast } = useAuth();

  const [categoria, setCategoria] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [esAnonimo, setEsAnonimo] = useState(false);
  const [archivo, setArchivo] = useState(null);
  const [enviando, setEnviando] = useState(false);

  // Punto donde ocurrió el incidente, elegido por el usuario
  const [lugar, setLugar] = useState(null);
  const [resolviendo, setResolviendo] = useState(false);
  const [gps, setGps] = useState(null);

  // ------------------------------------------------------------- GPS
  useEffect(() => {
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setGps([pos.coords.latitude, pos.coords.longitude]),
      (err) => console.warn('GPS no disponible:', err),
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const resolverDireccion = useCallback(async (lat, lng) => {
    setResolviendo(true);
    try {
      const res = await fetch(buildApiUrl(`/ubicaciones/reversa?lat=${lat}&lng=${lng}`), {
        headers: autorizacion(),
      });
      const json = await res.json();
      if (json.success) return { ...json.data, lat, lng };
    } catch (e) {
      console.error('Error resolviendo la dirección', e);
    } finally {
      setResolviendo(false);
    }
    return { nombre: 'Punto seleccionado', direccion: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, lat, lng };
  }, []);

  const fijarPunto = useCallback(async (coords) => {
    const [lat, lng] = coords;
    setLugar(await resolverDireccion(lat, lng));
  }, [resolverDireccion]);

  const usarGps = async () => {
    if (!gps) {
      showToast('Aún no tenemos tu ubicación. Revisa los permisos del navegador.', 'error');
      return;
    }
    await fijarPunto(gps);
  };

  // --------------------------------------------------- Mapa compartido
  useEffect(() => {
    setMapConfig((prev) => ({
      ...prev,
      centro: lugar ? [lugar.lat, lugar.lng] : (gps ?? defaultMapConfig.centro),
      zoom: lugar ? 17 : 16,
      markers: lugar
        ? [{
            position: [lugar.lat, lugar.lng],
            title: 'Ubicación del incidente',
            desc: lugar.direccion,
            tipo: 'origen',
          }]
        : defaultMapConfig.markers,
      circle: lugar ? { center: [lugar.lat, lugar.lng], radius: 60, color: '#f59e0b' } : null,
      rutas: null,
      // En esta pantalla el clic en el mapa siempre marca el incidente, así que
      // no tiene sentido preguntar "¿inicio o llegada?" como en el buscador.
      modoSeleccion: true,
      onSeleccionarPunto: fijarPunto,
    }));

    return () => setMapConfig(defaultMapConfig);
  }, [lugar, gps, fijarPunto, setMapConfig, defaultMapConfig]);

  // ------------------------------------------------------- Evidencia
  const elegirArchivo = (e) => {
    const f = e.target.files[0];
    if (!f) return;

    if (f.size > MAX_ARCHIVO_MB * 1024 * 1024) {
      showToast(`La imagen supera los ${MAX_ARCHIVO_MB} MB permitidos.`, 'error');
      e.target.value = '';
      return;
    }

    if (!f.type.startsWith('image/')) {
      showToast('Solo se admiten imágenes.', 'error');
      e.target.value = '';
      return;
    }

    setArchivo(f);
  };

  // --------------------------------------------------------- Envío
  const enviar = async (e) => {
    e.preventDefault();

    if (!categoria) {
      showToast('Selecciona el tipo de incidente.', 'error');
      return;
    }

    if (descripcion.trim().length < 10) {
      showToast('Describe el suceso con al menos 10 caracteres.', 'error');
      return;
    }

    if (!lugar) {
      showToast('Marca en el mapa dónde ocurrió el incidente.', 'error');
      return;
    }

    setEnviando(true);

    try {
      const res = await fetch(buildApiUrl('/reports/incidente'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...autorizacion() },
        body: JSON.stringify({
          categoria,
          descripcion: descripcion.trim(),
          latitud: lugar.lat,
          longitud: lugar.lng,
          nombre_lugar: lugar.nombre?.slice(0, 100),
          direccion: lugar.direccion?.slice(0, 255),
          es_anonimo: esAnonimo,
        }),
      });

      const json = await res.json();

      if (!json.success) {
        showToast(json.message || 'No fue posible registrar el reporte.', 'error');
        return;
      }

      const reporte = json.data;

      // La evidencia va aparte porque necesita el id del reporte ya creado.
      // Si falla, el reporte igual quedó registrado y se avisa sin perderlo.
      if (archivo) {
        try {
          const datos = new FormData();
          datos.append('evidencia', archivo);
          datos.append('id_reporte', reporte.id_reporte);

          const resEv = await fetch(buildApiUrl('/evidencias/subir'), {
            method: 'POST',
            headers: autorizacion(),
            body: datos,
          });

          const jsonEv = await resEv.json();
          if (jsonEv.success) reporte.evidencia_url = jsonEv.data.url_archivo;
          else showToast('El reporte se guardó, pero la imagen no pudo adjuntarse.', 'error');
        } catch {
          showToast('El reporte se guardó, pero la imagen no pudo adjuntarse.', 'error');
        }
      }

      navigate('/resumen-reporte', { state: { reporte } });
    } catch (e) {
      console.error('Error enviando el reporte', e);
      showToast('No se pudo conectar con el servidor.', 'error');
    } finally {
      setEnviando(false);
    }
  };

  const categoriaElegida = CATEGORIAS.find((c) => c.valor === categoria);

  return (
    <div className="space-y-5">

      <button
        onClick={() => navigate('/app')}
        className="text-xs font-bold text-purple-900 dark:text-purple-400 hover:text-purple-950 flex items-center gap-1.5 cursor-pointer"
      >
        <span className="material-symbols-outlined text-[16px] font-bold">arrow_back</span>
        <span>Volver al Inicio</span>
      </button>

      <div>
        <h2 className="text-xl font-black text-purple-950 dark:text-slate-100 tracking-tight">Reportar Incidente</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
          Tu reporte llega al administrador. Una vez validado, empieza a influir en las rutas que ve toda la comunidad.
        </p>
      </div>

      <form onSubmit={enviar} className="space-y-4 pt-1">

        {/* Ubicación del incidente */}
        <div className="space-y-1.5">
          <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            ¿Dónde ocurrió?
          </label>

          {lugar ? (
            <div className="flex items-start gap-3 bg-amber-50/70 dark:bg-amber-500/10 p-3 rounded-xl border border-amber-200 dark:border-amber-500/20">
              <span className="material-symbols-outlined text-amber-700 bg-white dark:bg-[#2B2B2F] p-1.5 rounded-lg border border-amber-100 dark:border-amber-500/20 shadow-sm text-[18px] shrink-0">
                location_on
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-amber-950 dark:text-amber-300 truncate">{lugar.nombre}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug line-clamp-2">{lugar.direccion}</p>
              </div>
              <button
                type="button"
                onClick={() => setLugar(null)}
                className="text-[10px] font-bold text-slate-400 hover:text-red-600 shrink-0 cursor-pointer"
              >
                Cambiar
              </button>
            </div>
          ) : (
            <div className="bg-slate-50 dark:bg-[#2B2B2F] border-2 border-dashed border-slate-200 dark:border-[#4A4A50] rounded-xl p-3.5 text-center">
              <span className="material-symbols-outlined text-slate-300 text-[22px]">touch_app</span>
              <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                {resolviendo ? 'Resolviendo la dirección...' : 'Toca el mapa para marcar el punto exacto'}
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={usarGps}
            className="w-full flex items-center justify-center gap-1.5 text-[10px] font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-lg py-2 hover:bg-blue-100 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[14px]">my_location</span>
            Usar mi ubicación actual
          </button>
        </div>

        {/* Tipo de incidente */}
        <div className="space-y-1.5">
          <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Tipo de incidente
          </label>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIAS.map((c) => (
              <button
                key={c.valor}
                type="button"
                onClick={() => setCategoria(c.valor)}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  categoria === c.valor
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-500/10 dark:border-purple-500/50 shadow-sm'
                    : 'border-slate-200 dark:border-[#4A4A50] bg-white dark:bg-[#2B2B2F] hover:border-slate-300'
                }`}
              >
                <span className={`material-symbols-outlined text-[17px] shrink-0 ${categoria === c.valor ? 'text-purple-800 dark:text-purple-400' : 'text-slate-400'}`}>
                  {c.icono}
                </span>
                <span className={`text-[10px] font-bold leading-tight ${categoria === c.valor ? 'text-purple-950 dark:text-purple-300' : 'text-slate-600 dark:text-slate-300'}`}>
                  {c.etiqueta}
                </span>
              </button>
            ))}
          </div>

          {categoriaElegida && (
            <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold ${COLOR_RIESGO[categoriaElegida.riesgo]}`}>
              <span className="material-symbols-outlined text-[13px]">info</span>
              Este tipo de incidente se registra con nivel de riesgo {categoriaElegida.riesgo}
            </div>
          )}
        </div>

        {/* Descripción */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-baseline">
            <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              ¿Qué ocurrió?
            </label>
            <span className={`text-[9px] font-bold ${descripcion.trim().length < 10 ? 'text-slate-300' : 'text-green-600'}`}>
              {descripcion.length}/1000
            </span>
          </div>
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            className="w-full bg-slate-50 dark:bg-[#2B2B2F] border border-slate-200 dark:border-[#4A4A50] rounded-xl py-3 px-4 focus:ring-2 focus:ring-purple-200 focus:border-purple-900 transition-all outline-none text-xs font-medium text-slate-700 dark:text-slate-200 resize-none h-24"
            placeholder="Cuenta brevemente qué pasó, a qué hora y cualquier detalle que ayude a otros estudiantes..."
            maxLength={1000}
          />
        </div>

        {/* Evidencia */}
        <div className="space-y-1.5">
          <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Foto (opcional)
          </label>

          <input type="file" ref={fileInputRef} className="hidden" onChange={elegirArchivo} accept="image/*" />

          {archivo ? (
            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-xl">
              <div className="flex items-center gap-2 overflow-hidden">
                <span className="material-symbols-outlined text-green-700 text-[18px]">check_circle</span>
                <span className="text-[11px] font-semibold text-green-950 dark:text-green-300 truncate">{archivo.name}</span>
                <span className="text-[9px] text-green-600 shrink-0">({(archivo.size / 1024).toFixed(0)} KB)</span>
              </div>
              <button
                type="button"
                onClick={() => { setArchivo(null); fileInputRef.current.value = ''; }}
                className="text-red-600 text-[10px] font-bold hover:underline shrink-0 ml-2 cursor-pointer"
              >
                Quitar
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current.click()}
              className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-200 dark:border-[#4A4A50] rounded-xl hover:bg-slate-50 dark:hover:bg-[#2B2B2F] transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-slate-400 text-[18px]">add_a_photo</span>
              <span className="text-[10px] font-bold text-slate-500">Adjuntar imagen (máx. {MAX_ARCHIVO_MB} MB)</span>
            </button>
          )}
        </div>

        {/* Anónimo */}
        <button
          type="button"
          onClick={() => setEsAnonimo((v) => !v)}
          className="w-full flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-[#4A4A50] bg-white dark:bg-[#2B2B2F] hover:border-slate-300 transition-colors cursor-pointer text-left"
        >
          <span className={`material-symbols-outlined text-[18px] shrink-0 ${esAnonimo ? 'text-purple-800 dark:text-purple-400' : 'text-slate-300'}`}>
            {esAnonimo ? 'check_box' : 'check_box_outline_blank'}
          </span>
          <div>
            <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200">Reportar de forma anónima</p>
            <p className="text-[9px] text-slate-400 leading-snug">Tu nombre no se mostrará junto al reporte.</p>
          </div>
        </button>

        <button
          type="submit"
          disabled={enviando}
          className="w-full bg-purple-900 hover:bg-purple-950 disabled:bg-slate-300 dark:disabled:bg-[#3C3C40] text-white font-bold py-3.5 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-1.5 text-xs uppercase tracking-wider"
        >
          {enviando ? (
            <>
              <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
              Enviando...
            </>
          ) : (
            <>
              <span>Enviar reporte</span>
              <span className="material-symbols-outlined text-[16px] font-bold">send</span>
            </>
          )}
        </button>

      </form>
    </div>
  );
}
