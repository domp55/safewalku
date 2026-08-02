import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import BuscadorPrincipal from '../components/BuscadorPrincipal';
import PanelRutas from '../components/PanelRutas';
import { useMapConfig } from '../layouts/MainLayout';
import { useAuth } from '../context/AuthContext';
import { buildApiUrl } from '../services/api';

function autorizacion() {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  return { Authorization: `Bearer ${token}` };
}

export default function StudentApp() {
  const navigate = useNavigate();
  const { setMapConfig, defaultMapConfig } = useMapConfig();
  const { showToast } = useAuth();

  const [zonasRiesgo, setZonasRiesgo] = useState([]);
  const [userPos, setUserPos] = useState(null);

  const [origen, setOrigen] = useState(null);
  const [destino, setDestino] = useState(null);
  const [rutas, setRutas] = useState([]);
  const [rutaSeleccionada, setRutaSeleccionada] = useState(0);
  const [avisoRutas, setAvisoRutas] = useState(null);
  const [calculando, setCalculando] = useState(false);

  const [zonas, setZonas] = useState([]);
  const [mostrarZonas, setMostrarZonas] = useState(false);
  const [zonasAbiertas, setZonasAbiertas] = useState(false);

  // Cuál de los dos campos está esperando un clic en el mapa
  const [eligiendoEnMapa, setEligiendoEnMapa] = useState(null);

  // ---------------------------------------------------------------- GPS
  useEffect(() => {
    let watchId;
    let centradoInicial = false;

    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const nueva = [pos.coords.latitude, pos.coords.longitude];
        setUserPos(nueva);

        if (!centradoInicial) {
          setMapConfig((prev) => ({ ...prev, centro: nueva, zoom: 16 }));
          centradoInicial = true;
        }
      },
      (err) => console.warn('GPS no disponible:', err),
      { enableHighAccuracy: true }
    );

    return () => { if (watchId) navigator.geolocation.clearWatch(watchId); };
  }, [setMapConfig]);

  // ------------------------------------------------- Datos de referencia
  useEffect(() => {
    const cargar = async () => {
      try {
        const [resZonasRiesgo, resZonas] = await Promise.all([
          fetch(buildApiUrl('/reports/zonas/riesgo?ciudad=Loja'), { headers: autorizacion() }),
          fetch(buildApiUrl('/zonas'), { headers: autorizacion() }),
        ]);

        const jsonRiesgo = await resZonasRiesgo.json();
        if (jsonRiesgo.success && jsonRiesgo.data) setZonasRiesgo(jsonRiesgo.data);

        const jsonZonas = await resZonas.json();
        if (jsonZonas.success && jsonZonas.data) setZonas(jsonZonas.data);
      } catch (e) {
        console.error('Error cargando datos del mapa', e);
      }
    };
    cargar();
  }, []);

  // ------------------------------------------ Sincronizar con el mapa
  useEffect(() => {
    const marcadores = [];

    if (origen) {
      marcadores.push({
        position: [origen.lat, origen.lng],
        title: `Inicio: ${origen.nombre}`,
        desc: origen.direccion || 'Punto de partida',
        tipo: 'origen',
      });
    }

    if (destino) {
      marcadores.push({
        position: [destino.lat, destino.lng],
        title: `Llegada: ${destino.nombre}`,
        desc: destino.direccion || 'Punto de llegada',
        tipo: 'destino',
      });
    }

    setMapConfig((prev) => ({
      ...prev,
      markers: marcadores.length > 0 ? marcadores : defaultMapConfig.markers,
      rutas: rutas.length > 0 ? rutas : null,
      rutaSeleccionada,
      zonas,
      mostrarZonas,
      modoSeleccion: eligiendoEnMapa !== null,
    }));
  }, [origen, destino, rutas, rutaSeleccionada, zonas, mostrarZonas, eligiendoEnMapa, setMapConfig, defaultMapConfig]);

  // ------------------------------------------------------- Acciones
  const resolverDireccion = useCallback(async (lat, lng) => {
    try {
      const res = await fetch(buildApiUrl(`/ubicaciones/reversa?lat=${lat}&lng=${lng}`), {
        headers: autorizacion(),
      });
      const json = await res.json();
      if (json.success) return json.data;
    } catch (e) {
      console.error('Error en geocodificación inversa', e);
    }
    // Sin dirección seguimos adelante: el punto es válido igual
    return { nombre: 'Punto seleccionado', direccion: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, lat, lng };
  }, []);

  const usarGps = useCallback(async () => {
    if (!userPos) {
      showToast('Aún no tenemos tu ubicación GPS. Revisa los permisos del navegador.', 'error');
      return;
    }
    const punto = await resolverDireccion(userPos[0], userPos[1]);
    setOrigen({ ...punto, nombre: 'Mi ubicación actual', lat: userPos[0], lng: userPos[1] });
  }, [userPos, resolverDireccion, showToast]);

  const manejarClicEnMapa = useCallback(async (coords) => {
    const [lat, lng] = coords;
    const campo = eligiendoEnMapa;

    setEligiendoEnMapa(null);

    const punto = await resolverDireccion(lat, lng);
    const valor = { ...punto, lat, lng };

    if (campo === 'origen') setOrigen(valor);
    else setDestino(valor);
  }, [eligiendoEnMapa, resolverDireccion]);

  /**
   * Fija un punto desde el menú que aparece al tocar el mapa.
   * Es la vía principal: no hay que preparar nada antes, se toca y se elige.
   */
  const fijarDesdeMapa = useCallback(async (tipo, coords) => {
    const [lat, lng] = coords;
    const punto = await resolverDireccion(lat, lng);
    const valor = { ...punto, lat, lng };

    if (tipo === 'origen') setOrigen(valor);
    else setDestino(valor);

    // Las rutas dibujadas ya no corresponden a los puntos nuevos
    setRutas([]);
    setAvisoRutas(null);
  }, [resolverDireccion]);

  /** Arrastre de un marcador ya colocado. */
  const moverPunto = useCallback((tipo, coords) => {
    fijarDesdeMapa(tipo, coords);
  }, [fijarDesdeMapa]);

  // El mapa vive en el layout, así que le pasamos los manejadores por el contexto
  useEffect(() => {
    setMapConfig((prev) => ({
      ...prev,
      onSeleccionarPunto: manejarClicEnMapa,
      onFijarOrigen: (coords) => fijarDesdeMapa('origen', coords),
      onFijarDestino: (coords) => fijarDesdeMapa('destino', coords),
      onMoverPunto: moverPunto,
    }));
  }, [manejarClicEnMapa, fijarDesdeMapa, moverPunto, setMapConfig]);

  const calcularRutas = async () => {
    if (!origen || !destino) return;

    setCalculando(true);
    setAvisoRutas(null);

    try {
      const res = await fetch(buildApiUrl('/routes/alternativas'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...autorizacion() },
        body: JSON.stringify({
          origen: { lat: origen.lat, lng: origen.lng },
          destino: { lat: destino.lat, lng: destino.lng },
        }),
      });

      const json = await res.json();

      if (!json.success) {
        showToast(json.message || 'No fue posible calcular las rutas.', 'error');
        return;
      }

      setRutas(json.data);
      setRutaSeleccionada(0);
      setAvisoRutas(json.meta?.aviso ?? null);
    } catch (e) {
      console.error('Error calculando rutas', e);
      showToast('No se pudo conectar con el servidor.', 'error');
    } finally {
      setCalculando(false);
    }
  };

  const elegirRuta = async (indice) => {
    setRutaSeleccionada(indice);

    const ruta = rutas[indice];
    if (!ruta || !origen || !destino) return;

    // El registro alimenta las estadísticas del panel administrativo. Si falla
    // no se le dice nada al usuario: no afecta a lo que vino a hacer.
    try {
      await fetch(buildApiUrl('/routes/historial'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...autorizacion() },
        body: JSON.stringify({
          origen: { lat: origen.lat, lng: origen.lng },
          destino: { lat: destino.lat, lng: destino.lng },
          clasificacion_elegida: ruta.clasificacion,
          indice_riesgo: ruta.indice_riesgo,
        }),
      });
    } catch (e) {
      console.warn('No se pudo registrar la elección de ruta', e);
    }
  };

  const limpiarRutas = () => {
    setRutas([]);
    setAvisoRutas(null);
    setRutaSeleccionada(0);
    setMostrarZonas(false);
  };

  const intercambiar = () => {
    setOrigen(destino);
    setDestino(origen);
    setRutas([]);
  };


  return (
    <>
      {/*
        Barra de búsqueda flotante, centrada arriba.

        Va sobre el mapa en lugar de en un panel lateral: el mapa es lo que el
        estudiante mira, y robarle un tercio de la pantalla a un buscador que se
        usa una vez por trayecto no compensa.
      */}
      <div className="pointer-events-none absolute top-0 left-0 right-0 z-20 p-3 md:p-4 flex justify-center">
        <div className="pointer-events-auto w-full max-w-3xl bg-white/95 dark:bg-[#2B2B2F]/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200 dark:border-[#4A4A50] p-3 md:p-4 transition-colors duration-500">
          <BuscadorPrincipal
            origen={origen}
            destino={destino}
            onCambiarOrigen={setOrigen}
            onCambiarDestino={setDestino}
            onUsarGps={usarGps}
            onElegirEnMapa={setEligiendoEnMapa}
            onIntercambiar={intercambiar}
            onCalcular={calcularRutas}
            calculando={calculando}
          />

          {eligiendoEnMapa && (
            <div className="mt-2.5 flex items-center justify-between gap-2 bg-purple-100 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/30 rounded-xl px-3 py-2">
              <p className="text-[10px] font-bold text-purple-900 dark:text-purple-300">
                Toca el mapa para fijar el {eligiendoEnMapa}
              </p>
              <button
                onClick={() => setEligiendoEnMapa(null)}
                className="text-[10px] font-bold text-purple-700 hover:underline cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      </div>

      {/*
        Columna flotante a la izquierda con resultados y accesos.

        En móvil se ancla abajo y ocupa el ancho completo, como una hoja
        deslizable, para no tapar el mapa con un panel lateral estrecho.
      */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 md:inset-y-0 md:right-auto z-20 flex md:items-start md:pt-[112px] p-3 md:p-4">
        <div className="pointer-events-auto w-full md:w-[340px] lg:w-[360px] max-h-[52vh] md:max-h-[calc(100%-130px)] overflow-y-auto custom-scrollbar space-y-3 pb-[80px] md:pb-2">

          {/* Rutas calculadas */}
          {rutas.length > 0 && (
            <div className="bg-white/95 dark:bg-[#2B2B2F]/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200 dark:border-[#4A4A50] p-4 transition-colors duration-500">
              <PanelRutas
                rutas={rutas}
                seleccionada={rutaSeleccionada}
                onSeleccionar={elegirRuta}
                onLimpiar={limpiarRutas}
                aviso={avisoRutas}
                mostrarZonas={mostrarZonas}
                onAlternarZonas={() => setMostrarZonas((v) => !v)}
              />
            </div>
          )}

          {/* Accesos rápidos. El SOS va aparte y destacado: en una urgencia
              tiene que encontrarse sin leer nada. */}
          <div className="bg-white/95 dark:bg-[#2B2B2F]/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200 dark:border-[#4A4A50] p-3 space-y-2 transition-colors duration-500">
            <button
              onClick={() => navigate('/sos')}
              className="w-full group flex items-center justify-between gap-3 p-3 rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-md transition-all active:scale-[0.98] cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[20px] animate-pulse">emergency</span>
                <div className="text-left">
                  <p className="font-black text-xs tracking-wide">SOS Emergencia</p>
                  <p className="text-[10px] text-red-100 font-medium">Alerta con tu ubicación</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-[18px] group-hover:translate-x-0.5 transition-transform">chevron_right</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => navigate('/reportar')}
                className="group p-3 rounded-xl border border-slate-200 dark:border-[#4A4A50] bg-white dark:bg-[#3C3C40] hover:border-amber-300 hover:bg-amber-50/50 dark:hover:bg-[#4A4A50] transition-all text-left cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px] text-amber-700 dark:text-amber-400 block">report_problem</span>
                <p className="font-bold text-[11px] text-slate-900 dark:text-slate-100 mt-1.5">Reportar</p>
                <p className="text-[9px] text-slate-500 dark:text-[#A0A0A5] leading-tight">Incidente en el mapa</p>
              </button>

              <button
                onClick={() => navigate('/contactos')}
                className="group p-3 rounded-xl border border-slate-200 dark:border-[#4A4A50] bg-white dark:bg-[#3C3C40] hover:border-blue-300 hover:bg-blue-50/50 dark:hover:bg-[#4A4A50] transition-all text-left cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px] text-blue-700 dark:text-blue-400 block">contact_phone</span>
                <p className="font-bold text-[11px] text-slate-900 dark:text-slate-100 mt-1.5">Apoyo</p>
                <p className="text-[9px] text-slate-500 dark:text-[#A0A0A5] leading-tight">Llamar al 911</p>
              </button>
            </div>
          </div>

          {/* Zonas de riesgo, plegables para no tapar el mapa */}
          <div className="bg-white/95 dark:bg-[#2B2B2F]/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200 dark:border-[#4A4A50] overflow-hidden transition-colors duration-500">
            <button
              onClick={() => setZonasAbiertas((v) => !v)}
              className="w-full flex items-center justify-between gap-2 px-4 py-3 hover:bg-slate-50 dark:hover:bg-[#3C3C40] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-red-600">warning</span>
                <span className="text-[11px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                  Zonas de riesgo
                </span>
                <span className="text-[9px] text-red-600 dark:text-red-400 font-extrabold px-2 py-0.5 bg-red-100/80 dark:bg-red-500/10 rounded-full border border-red-200/50 dark:border-red-500/20">
                  {zonasRiesgo.length}
                </span>
              </div>
              <span className="material-symbols-outlined text-[18px] text-slate-400">
                {zonasAbiertas ? 'expand_less' : 'expand_more'}
              </span>
            </button>

            {zonasAbiertas && (
              <div className="px-3 pb-3 space-y-2 max-h-[240px] overflow-y-auto custom-scrollbar">
                {zonasRiesgo.map((zona) => (
                  <div
                    key={zona.id_reporte}
                    onClick={() => {
                      setMapConfig((prev) => ({
                        ...prev,
                        centro: [Number(zona.latitud), Number(zona.longitud)],
                        zoom: 18,
                        circle: {
                          center: [Number(zona.latitud), Number(zona.longitud)],
                          radius: zona.radio_metros,
                          color: '#ef4444',
                        },
                      }));
                      navigate('/detalle-zona');
                    }}
                    className="p-3 bg-white dark:bg-[#3C3C40] border border-slate-200 dark:border-[#4A4A50] rounded-xl flex gap-2.5 items-start shadow-sm hover:border-purple-300 transition-all cursor-pointer"
                  >
                    <span className={`material-symbols-outlined text-[18px] mt-0.5 p-1 rounded-lg border shrink-0 ${
                      zona.nivel_riesgo === 'ALTO'
                        ? 'text-red-500 bg-red-50 dark:bg-[#2B2B2F] border-red-100 dark:border-red-500/20'
                        : 'text-amber-500 bg-amber-50 dark:bg-[#2B2B2F] border-amber-100 dark:border-amber-500/20'
                    }`}>
                      {zona.nivel_riesgo === 'ALTO' ? 'warning' : 'visibility'}
                    </span>
                    <div className="min-w-0">
                      <h4 className="font-bold text-[11px] text-slate-900 dark:text-[#E0E0E5] truncate">{zona.ubicacion_nombre}</h4>
                      <p className="text-[9px] text-slate-500 dark:text-[#A0A0A5] mt-0.5 line-clamp-2">{zona.descripcion}</p>
                    </div>
                  </div>
                ))}

                {zonasRiesgo.length === 0 && (
                  <div className="p-3 bg-green-50 dark:bg-[#3C3C40] border border-green-100 dark:border-[#4A4A50] rounded-xl flex gap-2 items-center">
                    <span className="material-symbols-outlined text-green-600 text-[18px]">check_circle</span>
                    <p className="text-[10px] text-green-800 dark:text-[#E0E0E5] font-medium">
                      Sin zonas de riesgo activas ahora mismo.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
}
