import React, { useEffect, useMemo, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

import { useAuth } from '../context/AuthContext';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});
L.Marker.prototype.options.icon = DefaultIcon;

const COLOR_ZONA = {
  SEGURA: '#16a34a',
  REGULAR: '#f59e0b',
  INSEGURA: '#dc2626',
};

function ManejadorMapa({ centro, zoom = 17 }) {
  const map = useMap();

  useEffect(() => {
    if (map && Array.isArray(centro) && centro.length === 2 && !isNaN(centro[0])) {
      try {
        map.setView(centro, zoom, {
          animate: true,
          duration: 1.5
        });
      } catch (e) {
        console.warn("Leaflet setView error:", e);
      }
    }
  }, [map, centro, zoom]);

  // Invalidamos el tamaño del mapa una sola vez después de montar para prevenir glitches de renderizado
  useEffect(() => {
    if (map) {
      const timer = setTimeout(() => {
        try { map.invalidateSize(); } catch(e){}
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [map]);

  return null;
}

/**
 * Encuadra el mapa para que las rutas quepan enteras.
 *
 * Sin esto, tras calcular una ruta el mapa se queda donde estaba y el usuario
 * ve un trozo de línea sin saber hacia dónde va.
 */
function AjustarARutas({ rutas }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !Array.isArray(rutas) || rutas.length === 0) return;

    const puntos = rutas.flatMap((r) => r.coordenadas || []);
    if (puntos.length < 2) return;

    try {
      map.fitBounds(L.latLngBounds(puntos), { padding: [40, 40], maxZoom: 16 });
    } catch (e) {
      console.warn('Leaflet fitBounds error:', e);
    }
  }, [map, rutas]);

  return null;
}

/**
 * Captura los clics sobre el mapa.
 *
 * Hay dos modos. Con `activo` en true el clic fija directamente el punto que se
 * estaba pidiendo. Sin él, el clic abre un menú para elegir si ese punto es la
 * salida o la llegada, que es como se comporta Google Maps: no hay que preparar
 * nada antes, se toca el mapa y se decide ahí mismo.
 */
function SelectorDePunto({ activo, onSeleccionar, onClicLibre }) {
  useMapEvents({
    click(e) {
      const coords = [e.latlng.lat, e.latlng.lng];
      if (activo && onSeleccionar) {
        onSeleccionar(coords);
      } else if (onClicLibre) {
        onClicLibre(coords);
      }
    },
  });
  return null;
}

/** Menú que aparece al tocar un punto cualquiera del mapa. */
function MenuPunto({ posicion, onFijarOrigen, onFijarDestino, onCerrar }) {
  if (!posicion) return null;

  return (
    <Popup position={posicion} eventHandlers={{ remove: onCerrar }} closeButton={false}>
      <div className="font-sans p-0.5 min-w-[150px]">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
          Usar este punto como
        </p>
        <button
          onClick={onFijarOrigen}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-bold text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">trip_origin</span>
          Punto de inicio
        </button>
        <button
          onClick={onFijarDestino}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-bold text-purple-800 hover:bg-purple-50 transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">flag</span>
          Punto de llegada
        </button>
      </div>
    </Popup>
  );
}

function BotonCentrar({ userLocation }) {
  const map = useMap();
  if (!userLocation) return null;

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        map.setView(userLocation, 17, { animate: true, duration: 1 });
      }}
      className="absolute bottom-6 right-4 z-[1000] w-12 h-12 bg-white dark:bg-[#3C3C40] rounded-full shadow-xl flex items-center justify-center text-blue-600 dark:text-blue-400 border border-slate-100 dark:border-[#4A4A50] hover:bg-slate-50 dark:hover:bg-[#2B2B2F] transition-all cursor-pointer hover:scale-105 active:scale-95"
      title="Centrar en mi ubicación"
    >
      <span className="material-symbols-outlined text-[26px]">my_location</span>
    </button>
  );
}

export default function MapaInteractivo({
  centro = [-3.97245, -79.19933],
  zoom = 17,
  markers = [
    { position: [-3.97245, -79.19933], title: 'UIDE - Extensión Loja', desc: 'Calle Agustín Carrión Palacios, Sector Jipiro' }
  ],
  circle = null,
  polyline = null,
  rutas = null,
  rutaSeleccionada = 0,
  zonas = null,
  mostrarZonas = false,
  modoSeleccion = false,
  onSeleccionarPunto = null,
  onFijarOrigen = null,
  onFijarDestino = null,
  onMoverPunto = null,
}) {
  const [menuPunto, setMenuPunto] = useState(null);
  const [avisoGpsCerrado, setAvisoGpsCerrado] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [userAccuracy, setUserAccuracy] = useState(null);
  const [geoState, setGeoState] = useState('checking');
  const [geoError, setGeoError] = useState(null);

  const isManualLocationRef = useRef(false);

  // Extraemos el usuario para su foto de perfil
  const { user } = useAuth();

  useEffect(() => {
    let watchId;
    const startWatching = () => {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          // Si el usuario movió manualmente el marcador, ignoramos el GPS inexacto
          if (!isManualLocationRef.current) {
            setUserLocation([position.coords.latitude, position.coords.longitude]);
            setUserAccuracy(Math.round(position.coords.accuracy));
            setGeoError(null);
          }
        },
        (error) => {
          if (!isManualLocationRef.current) {
            setGeoError(error.message || 'No fue posible obtener la ubicación.');
            if (error.code === error.PERMISSION_DENIED) setGeoState('denied');
          }
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
      );
    };

    if (!navigator.geolocation) {
      setGeoError('La geolocalización no está disponible en este navegador.');
      setGeoState('error');
      return;
    }

    startWatching();

    return () => { if (watchId) navigator.geolocation.clearWatch(watchId); };
  }, []);

  const requestLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoState('granted');
        setUserAccuracy(Math.round(pos.coords.accuracy));
      },
      () => setGeoState('denied'),
      { enableHighAccuracy: true }
    );
  };

  const mapaMarkers = useMemo(() => {
    const baseMarkers = Array.isArray(markers) ? markers : [];

    if (!userLocation) {
      return baseMarkers;
    }

    return [
      ...baseMarkers,
      {
        position: userLocation,
        title: 'Tu ubicación actual',
        desc: userAccuracy
          ? `Precisión del GPS: ±${userAccuracy} metros. Mantén presionado y arrastra para corregir.`
          : 'Mantén presionado y arrastra este ícono para corregir tu ubicación manualmente.',
      }
    ];
  }, [markers, userLocation, userAccuracy]);

  const hayRutas = Array.isArray(rutas) && rutas.length > 0;

  return (
    <div className="w-full h-full min-h-[300px] relative z-0">

      {geoState === 'prompt' && (
        <div className="absolute inset-0 z-[2000] bg-slate-900/40 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center text-white rounded-3xl transition-all">
           <div className="bg-white/10 p-4 rounded-full mb-4 ring-4 ring-white/20">
             <span className="material-symbols-outlined text-4xl block">location_on</span>
           </div>
           <h3 className="text-xl font-bold mb-2 drop-shadow-md">Acompañamiento Activo</h3>
           <p className="text-sm text-slate-100 mb-6 max-w-[280px] drop-shadow-sm font-medium">SafeWalkU necesita tu ubicación para monitorear tu trayecto y alertar en caso de emergencia.</p>
           <button onClick={requestLocation} className="bg-purple-600 hover:bg-purple-500 text-white font-black tracking-wide py-3 px-8 rounded-2xl transition-all shadow-xl hover:shadow-purple-500/30 hover:-translate-y-1">
             Activar GPS
           </button>
        </div>
      )}

      {/*
        Aviso de GPS bloqueado.

        Antes era una capa a pantalla completa que dejaba el mapa inutilizable.
        Eso contradice el propio producto: elegir origen y destino a mano, sin
        GPS, es un caso de uso soportado, y el usuario que niega el permiso es
        precisamente quien más necesita poder tocar el mapa. Ahora es un aviso
        lateral que se puede cerrar.
      */}
      {geoState === 'denied' && !avisoGpsCerrado && (
        <div className="absolute left-3 right-3 md:right-auto md:max-w-[300px] top-3 z-[1200] rounded-2xl bg-white dark:bg-[#2B2B2F] shadow-xl border border-red-200 dark:border-red-500/30 p-3 flex gap-2.5">
          <span className="material-symbols-outlined text-red-500 text-[20px] shrink-0">location_off</span>
          <div className="min-w-0">
            <p className="text-[11px] font-black text-slate-800 dark:text-slate-100">Sin acceso a tu ubicación</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">
              Puedes seguir usando la app tocando el mapa para marcar tus puntos. Para activar el GPS,
              permite la ubicación desde el candado de la barra de direcciones.
            </p>
          </div>
          <button
            onClick={() => setAvisoGpsCerrado(true)}
            className="text-slate-300 hover:text-slate-500 shrink-0 self-start cursor-pointer"
            title="Cerrar aviso"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* Aviso del modo de selección de punto */}
      {modoSeleccion && (
        <div className="absolute left-1/2 -translate-x-1/2 top-3 z-[1500] rounded-2xl bg-purple-900 px-4 py-2.5 text-xs font-bold text-white shadow-xl border border-purple-700 flex items-center gap-2 animate-pulse">
          <span className="material-symbols-outlined text-[18px]">touch_app</span>
          Toca el mapa para marcar el punto
        </div>
      )}

      {geoError && geoState !== 'prompt' && geoState !== 'denied' && !modoSeleccion && (
        <div className="absolute left-3 top-3 z-[1000] rounded-xl bg-white/95 px-3 py-2 text-xs font-semibold text-slate-700 shadow-lg border border-slate-200">
          {geoError}
        </div>
      )}

      {/* Leyenda de las rutas */}
      {hayRutas && (
        <div className="absolute left-3 bottom-3 z-[1000] rounded-2xl bg-white/95 dark:bg-[#2B2B2F]/95 px-3 py-2.5 shadow-xl border border-slate-200 dark:border-[#4A4A50] backdrop-blur-sm">
          <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">Rutas</p>
          <div className="space-y-1">
            {rutas.map((r, i) => (
              <div key={r.clasificacion} className="flex items-center gap-2">
                <span
                  className="w-4 h-1 rounded-full shrink-0"
                  style={{ backgroundColor: r.color, opacity: i === rutaSeleccionada ? 1 : 0.4 }}
                />
                <span className={`text-[10px] ${i === rutaSeleccionada ? 'font-black text-slate-800 dark:text-slate-100' : 'font-medium text-slate-400 dark:text-slate-500'}`}>
                  {r.clasificacion}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <MapContainer
        center={centro}
        zoom={zoom}
        scrollWheelZoom
        className={`w-full h-full absolute inset-0 rounded-3xl overflow-hidden shadow-inner ${modoSeleccion ? 'cursor-crosshair' : ''}`}
        zoomControl={false}
      >
        <ManejadorMapa centro={centro} zoom={zoom} />
        <AjustarARutas rutas={rutas} />
        <SelectorDePunto
          activo={modoSeleccion}
          onSeleccionar={onSeleccionarPunto}
          onClicLibre={(coords) => setMenuPunto(coords)}
        />
        <MenuPunto
          posicion={menuPunto}
          onCerrar={() => setMenuPunto(null)}
          onFijarOrigen={() => {
            if (onFijarOrigen) onFijarOrigen(menuPunto);
            setMenuPunto(null);
          }}
          onFijarDestino={() => {
            if (onFijarDestino) onFijarDestino(menuPunto);
            setMenuPunto(null);
          }}
        />
        <BotonCentrar userLocation={userLocation} />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Zonas de seguridad, por debajo de todo lo demás */}
        {mostrarZonas && Array.isArray(zonas) && zonas.map((z) => (
          <Circle
            key={`zona-${z.id_zona}`}
            center={[z.centro_lat, z.centro_lng]}
            radius={z.radio_metros}
            pathOptions={{
              color: COLOR_ZONA[z.nivel] || '#94a3b8',
              fillColor: COLOR_ZONA[z.nivel] || '#94a3b8',
              fillOpacity: 0.12,
              weight: 1,
            }}
          >
            <Popup>
              <div className="text-xs font-sans p-1 min-w-[160px]">
                <p className="font-bold text-slate-800 text-sm mb-0.5">{z.nombre}</p>
                <p className="text-slate-500 font-medium leading-relaxed">{z.descripcion}</p>
                <span
                  className="inline-block mt-2 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider text-white"
                  style={{ backgroundColor: COLOR_ZONA[z.nivel] || '#94a3b8' }}
                >
                  {z.nivel}
                </span>
              </div>
            </Popup>
          </Circle>
        ))}

        {circle && (
          <Circle
            center={circle.center}
            pathOptions={{
              color: circle.color || '#ef4444',
              fillColor: circle.color || '#ef4444',
              fillOpacity: 0.15
            }}
            radius={circle.radius || 90}
          />
        )}

        {/* Las no seleccionadas se dibujan primero para que la elegida quede encima */}
        {hayRutas && rutas.map((r, i) => (
          i !== rutaSeleccionada && (
            <Polyline
              key={`ruta-${r.clasificacion}`}
              positions={r.coordenadas}
              pathOptions={{ color: r.color, weight: 4, opacity: 0.35, dashArray: '6, 8' }}
            />
          )
        ))}

        {hayRutas && rutas[rutaSeleccionada] && (
          <Polyline
            key={`ruta-activa-${rutas[rutaSeleccionada].clasificacion}`}
            positions={rutas[rutaSeleccionada].coordenadas}
            pathOptions={{ color: rutas[rutaSeleccionada].color, weight: 6, opacity: 0.95 }}
          />
        )}

        {mapaMarkers.map((marker, idx) => {
          let bgColor = 'bg-purple-900';
          let iconName = 'location_on';
          let pulse = false;
          let ringColor = 'border-white';
          let isUser = false;

          // Los puntos de inicio y llegada se arrastran para corregirlos sin
          // volver a buscar la dirección, igual que en Google Maps.
          const esRuta = marker.tipo === 'origen' || marker.tipo === 'destino';

          if (marker.title.includes('Tu ubicación')) {
            bgColor = 'bg-blue-600';
            iconName = 'my_location';
            pulse = true;
            isUser = true;
          } else if (marker.title.includes('SOS')) {
            bgColor = 'bg-red-600';
            iconName = 'warning';
            pulse = true;
          } else if (marker.tipo === 'origen') {
            bgColor = 'bg-emerald-600';
            iconName = 'trip_origin';
            ringColor = 'border-emerald-100';
          } else if (marker.tipo === 'destino') {
            bgColor = 'bg-purple-900';
            iconName = 'flag';
            ringColor = 'border-purple-200';
          } else if (marker.title.includes('Riesgo') || marker.title.includes('Reporte')) {
            bgColor = 'bg-amber-500';
            iconName = 'report';
          } else if (marker.title.includes('UIDE')) {
            bgColor = 'bg-purple-900';
            iconName = 'school';
            ringColor = 'border-purple-200';
          }

          let innerContent = `<span class="material-symbols-outlined" style="font-size: 20px; font-weight: 600;">${iconName}</span>`;

          if (isUser && user?.foto_perfil) {
            // Si es el marcador del usuario y tiene foto de perfil, mostramos la foto en lugar del icono
            innerContent = `<img src="${user.foto_perfil}" alt="Tu foto" class="w-full h-full object-cover rounded-full" />`;
          }

          const htmlString = `
            <div class="relative flex items-center justify-center w-9 h-9">
              ${pulse ? `<div class="absolute inset-0 rounded-full ${bgColor} animate-ping opacity-60 duration-1000"></div>` : ''}
              <div class="relative flex items-center justify-center w-9 h-9 ${bgColor} text-white rounded-full shadow-xl border-[2.5px] ${ringColor} z-10 transition-transform hover:scale-110 overflow-hidden">
                ${innerContent}
              </div>
            </div>
          `;

          const customIcon = L.divIcon({
            className: 'bg-transparent border-none',
            html: htmlString,
            iconSize: [36, 36],
            iconAnchor: [18, 18],
            popupAnchor: [0, -20]
          });

          return (
            <Marker
              key={`${marker.title}-${idx}`}
              position={marker.position}
              icon={customIcon}
              draggable={isUser || esRuta}
              eventHandlers={{
                dragend: (e) => {
                  const position = e.target.getLatLng();

                  if (isUser) {
                    isManualLocationRef.current = true; // Cancelar sobreescritura de GPS
                    setUserLocation([position.lat, position.lng]);
                  } else if (esRuta && onMoverPunto) {
                    onMoverPunto(marker.tipo, [position.lat, position.lng]);
                  }
                }
              }}
            >
              <Popup>
                <div className="text-xs font-sans p-1 min-w-[140px]">
                  <p className="font-bold text-slate-800 text-sm mb-0.5">{marker.title}</p>
                  <p className="text-slate-500 font-medium leading-relaxed">{marker.desc}</p>
                  {isUser && isManualLocationRef.current && (
                    <span className="inline-block mt-2 px-2 py-1 bg-amber-100 text-amber-700 font-bold rounded-md text-[10px] uppercase tracking-wider border border-amber-200">
                      Ubicación manual
                    </span>
                  )}
                  {esRuta && (
                    <span className="inline-block mt-2 text-[10px] text-slate-400 font-semibold">
                      Arrastra este punto para moverlo
                    </span>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {polyline && (
          <Polyline pathOptions={{ color: '#4a208c', weight: 5, dashArray: '10, 10' }} positions={polyline} />
        )}
      </MapContainer>
    </div>
  );
}
