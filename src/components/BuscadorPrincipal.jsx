import React, { useState, useEffect, useRef } from 'react';
import { buildApiUrl } from '../services/api';

/**
 * Barra de búsqueda de origen y destino.
 *
 * Está pensada como barra horizontal flotando sobre el mapa, no como tarjeta en
 * un panel lateral: cuanto menos alto ocupe, más mapa queda a la vista. Por eso
 * las etiquetas van dentro de los campos y la ayuda se muestra solo mientras no
 * hay nada elegido.
 */

function CampoUbicacion({
  icono,
  colorIcono,
  valor,
  placeholder,
  onSeleccionar,
  onPedirMapa,
  onPedirGps,
  mostrarGps = false,
}) {
  const [texto, setTexto] = useState('');
  const [sugerencias, setSugerencias] = useState([]);
  const [abierto, setAbierto] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const contenedorRef = useRef(null);

  // Cuando el punto llega desde fuera (GPS o clic en el mapa) reflejamos su
  // nombre sin disparar una búsqueda nueva.
  useEffect(() => {
    if (valor?.nombre) {
      setTexto(valor.nombre);
      setAbierto(false);
    } else if (valor === null) {
      setTexto('');
    }
  }, [valor]);

  useEffect(() => {
    const cerrar = (e) => {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target)) {
        setAbierto(false);
      }
    };
    document.addEventListener('mousedown', cerrar);
    return () => document.removeEventListener('mousedown', cerrar);
  }, []);

  useEffect(() => {
    if (texto.length < 3 || texto === valor?.nombre) {
      setSugerencias([]);
      return;
    }

    // 400 ms no es cosmético: es el límite de una petición por segundo que
    // impone Nominatim, del que depende la búsqueda de direcciones.
    const temporizador = setTimeout(async () => {
      setBuscando(true);
      try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const res = await fetch(buildApiUrl(`/ubicaciones/geocodificar?q=${encodeURIComponent(texto)}`), {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setSugerencias(json.data);
          setAbierto(true);
        }
      } catch (e) {
        console.error('Error buscando ubicaciones:', e);
      } finally {
        setBuscando(false);
      }
    }, 400);

    return () => clearTimeout(temporizador);
  }, [texto, valor]);

  const seleccionar = (sug) => {
    setTexto(sug.nombre);
    setSugerencias([]);
    setAbierto(false);
    onSeleccionar({
      nombre: sug.nombre,
      direccion: sug.direccion,
      lat: Number(sug.lat),
      lng: Number(sug.lng),
    });
  };

  return (
    <div className="relative flex-1 min-w-0" ref={contenedorRef}>
      <div className="relative">
        <span className={`material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[17px] pointer-events-none ${colorIcono}`}>
          {icono}
        </span>

        <input
          className="w-full bg-slate-50 dark:bg-[#3C3C40] border border-slate-200 dark:border-[#4A4A50] rounded-xl py-2.5 pl-9 pr-[58px] text-xs font-semibold text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-200 dark:focus:ring-purple-500/30 focus:border-purple-600 focus:bg-white transition-colors"
          placeholder={placeholder}
          type="text"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onFocus={() => sugerencias.length > 0 && setAbierto(true)}
        />

        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center">
          {buscando && (
            <span className="material-symbols-outlined text-[13px] text-slate-300 animate-spin mr-0.5">progress_activity</span>
          )}
          {mostrarGps && (
            <button
              type="button"
              onClick={onPedirGps}
              title="Usar mi ubicación actual"
              className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[15px] block">my_location</span>
            </button>
          )}
          <button
            type="button"
            onClick={onPedirMapa}
            title="Elegir tocando el mapa"
            className="p-1.5 rounded-lg text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-500/10 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[15px] block">location_searching</span>
          </button>
        </div>
      </div>

      {abierto && sugerencias.length > 0 && (
        <ul className="absolute z-[70] w-full min-w-[260px] bg-white dark:bg-[#2B2B2F] border border-slate-200 dark:border-[#4A4A50] rounded-xl mt-1 shadow-2xl max-h-60 overflow-y-auto">
          {sugerencias.map((sug, i) => (
            <li
              key={`${sug.origen}-${sug.id_ubicacion ?? i}-${sug.lat}`}
              className="px-3 py-2 text-xs hover:bg-purple-50 dark:hover:bg-purple-900/20 cursor-pointer border-b border-slate-50 dark:border-[#4A4A50] last:border-0 flex items-start gap-2"
              onClick={() => seleccionar(sug)}
            >
              {/* Los lugares propios llevan distintivo: son los que el
                  estudiante busca a diario y conviene distinguirlos de OSM. */}
              <span className={`material-symbols-outlined text-[15px] mt-0.5 shrink-0 ${sug.origen === 'safewalk' ? 'text-purple-700' : 'text-slate-300'}`}>
                {sug.origen === 'safewalk' ? 'verified' : 'place'}
              </span>
              <div className="min-w-0">
                <div className="font-bold text-slate-700 dark:text-slate-200 truncate">{sug.nombre}</div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{sug.direccion}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function BuscadorPrincipal({
  origen,
  destino,
  onCambiarOrigen,
  onCambiarDestino,
  onUsarGps,
  onElegirEnMapa,
  onIntercambiar,
  onCalcular,
  calculando = false,
}) {
  const listo = origen && destino;
  const vacio = !origen && !destino;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (listo && !calculando) onCalcular();
      }}
    >
      <div className="flex flex-col md:flex-row md:items-center gap-2">

        <CampoUbicacion
          icono="trip_origin"
          colorIcono="text-emerald-600"
          valor={origen}
          placeholder="Punto de inicio"
          mostrarGps
          onSeleccionar={onCambiarOrigen}
          onPedirGps={onUsarGps}
          onPedirMapa={() => onElegirEnMapa('origen')}
        />

        <button
          type="button"
          onClick={onIntercambiar}
          disabled={!listo}
          title="Intercambiar inicio y llegada"
          className="hidden md:flex w-8 h-8 shrink-0 rounded-lg bg-slate-50 dark:bg-[#3C3C40] border border-slate-200 dark:border-[#4A4A50] items-center justify-center text-slate-500 hover:text-purple-800 hover:border-purple-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-[15px]">swap_horiz</span>
        </button>

        <CampoUbicacion
          icono="flag"
          colorIcono="text-purple-800 dark:text-purple-400"
          valor={destino}
          placeholder="Punto de llegada"
          onSeleccionar={onCambiarDestino}
          onPedirMapa={() => onElegirEnMapa('destino')}
        />

        <button
          type="submit"
          disabled={!listo || calculando}
          className="shrink-0 bg-purple-900 hover:bg-purple-950 disabled:bg-slate-300 dark:disabled:bg-[#3C3C40] disabled:text-white/60 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
        >
          {calculando ? (
            <>
              <span className="material-symbols-outlined text-[15px] animate-spin">progress_activity</span>
              <span className="md:hidden lg:inline">Calculando</span>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[15px]">alt_route</span>
              <span className="md:hidden lg:inline">Ver rutas</span>
            </>
          )}
        </button>
      </div>

      {/* La ayuda solo aparece mientras no hay nada elegido: una vez que el
          usuario entendió cómo funciona, deja de robar espacio al mapa. */}
      {vacio && (
        <p className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400 mt-2 px-1">
          <span className="material-symbols-outlined text-[13px] text-blue-600">touch_app</span>
          Escribe una dirección, o toca cualquier punto del mapa para elegirlo como inicio o llegada.
        </p>
      )}
    </form>
  );
}
