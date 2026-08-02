import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Circle, useMapEvents, Popup } from 'react-leaflet';
import { useAuth } from '../context/AuthContext';
import { buildApiUrl } from '../services/api';

/**
 * Gestión de zonas de seguridad.
 *
 * Es el módulo que mantiene el criterio con el que se calculan las rutas.
 * Hasta ahora las 24 zonas solo se podían tocar desde la base, lo que dejaba
 * el sistema sin forma de actualizarse cuando cambia la realidad de un sector.
 */

const CENTRO_LOJA = [-3.9905, -79.2045];

const COLOR_NIVEL = {
  SEGURA: '#16a34a',
  REGULAR: '#f59e0b',
  INSEGURA: '#dc2626',
};

const BADGE_NIVEL = {
  SEGURA: 'bg-green-100 text-green-700 border-green-200',
  REGULAR: 'bg-amber-100 text-amber-700 border-amber-200',
  INSEGURA: 'bg-red-100 text-red-700 border-red-200',
};

/** Pesos de referencia. El administrador puede afinarlos, pero parte de aquí. */
const PESO_SUGERIDO = { SEGURA: 1, REGULAR: 4, INSEGURA: 10 };

const FORM_VACIO = {
  nombre: '',
  descripcion: '',
  sector: '',
  nivel: 'REGULAR',
  peso_riesgo: 4,
  centro_lat: '',
  centro_lng: '',
  radio_metros: 300,
  franja_horaria: 'AMBOS',
  factor_nocturno: 1,
};

function autorizacion() {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  return { Authorization: `Bearer ${token}` };
}

/** Captura clics en el mapa para situar una zona nueva. */
function SelectorMapa({ activo, onElegir }) {
  useMapEvents({
    click(e) {
      if (activo) onElegir(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function GestionZonas() {
  const { showToast } = useAuth();

  const [zonas, setZonas] = useState([]);
  const [impacto, setImpacto] = useState({});
  const [cargando, setCargando] = useState(true);

  const [filtroNivel, setFiltroNivel] = useState('');
  const [busqueda, setBusqueda] = useState('');

  const [form, setForm] = useState(null);      // null = panel cerrado
  const [editando, setEditando] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const [resZonas, resImpacto] = await Promise.all([
        fetch(buildApiUrl('/zonas?incluir_inactivas=true'), { headers: autorizacion() }),
        fetch(buildApiUrl('/zonas/impacto'), { headers: autorizacion() }),
      ]);

      const jsonZonas = await resZonas.json();
      if (jsonZonas.success) setZonas(jsonZonas.data);

      const jsonImpacto = await resImpacto.json();
      if (jsonImpacto.success) {
        const mapa = {};
        jsonImpacto.data.forEach((z) => { mapa[z.id_zona] = z.total_reportes; });
        setImpacto(mapa);
      }
    } catch (e) {
      console.error('Error cargando zonas', e);
      showToast('No se pudieron cargar las zonas.', 'error');
    } finally {
      setCargando(false);
    }
  }, [showToast]);

  useEffect(() => { cargar(); }, [cargar]);

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return zonas.filter((z) => {
      const coincideTexto = !q || z.nombre.toLowerCase().includes(q) || (z.sector ?? '').toLowerCase().includes(q);
      const coincideNivel = !filtroNivel || z.nivel === filtroNivel;
      return coincideTexto && coincideNivel;
    });
  }, [zonas, busqueda, filtroNivel]);

  const activas = zonas.filter((z) => z.estado === 'ACTIVO');

  // ------------------------------------------------------------ Acciones
  const abrirNueva = () => {
    setEditando(null);
    setForm({ ...FORM_VACIO });
  };

  const abrirEdicion = (z) => {
    setEditando(z.id_zona);
    setForm({
      nombre: z.nombre,
      descripcion: z.descripcion ?? '',
      sector: z.sector ?? '',
      nivel: z.nivel,
      peso_riesgo: z.peso_riesgo,
      centro_lat: z.centro_lat,
      centro_lng: z.centro_lng,
      radio_metros: z.radio_metros,
      franja_horaria: z.franja_horaria,
      factor_nocturno: z.factor_nocturno,
    });
  };

  const elegirEnMapa = (lat, lng) => {
    setForm((f) => ({ ...f, centro_lat: Number(lat.toFixed(6)), centro_lng: Number(lng.toFixed(6)) }));
  };

  const cambiarNivel = (nivel) => {
    // Al cambiar el nivel se ajusta el peso a su valor de referencia, salvo
    // que el administrador ya lo hubiera afinado a mano.
    setForm((f) => ({
      ...f,
      nivel,
      peso_riesgo: PESO_SUGERIDO[f.nivel] === Number(f.peso_riesgo) ? PESO_SUGERIDO[nivel] : f.peso_riesgo,
    }));
  };

  const guardar = async (e) => {
    e.preventDefault();

    if (form.nombre.trim().length < 3) {
      showToast('El nombre debe tener al menos 3 caracteres.', 'error');
      return;
    }
    if (form.centro_lat === '' || form.centro_lng === '') {
      showToast('Toca el mapa para situar la zona.', 'error');
      return;
    }

    setGuardando(true);
    try {
      const cuerpo = {
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim() || undefined,
        sector: form.sector.trim() || undefined,
        ciudad: 'Loja',
        nivel: form.nivel,
        peso_riesgo: Number(form.peso_riesgo),
        centro_lat: Number(form.centro_lat),
        centro_lng: Number(form.centro_lng),
        radio_metros: Number(form.radio_metros),
        franja_horaria: form.franja_horaria,
        factor_nocturno: Number(form.factor_nocturno),
      };

      const res = await fetch(buildApiUrl(editando ? `/zonas/${editando}` : '/zonas'), {
        method: editando ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', ...autorizacion() },
        body: JSON.stringify(editando ? { ...cuerpo, estado: 'ACTIVO' } : cuerpo),
      });

      const json = await res.json();

      if (!json.success) {
        const porCampo = json.errors ? Object.values(json.errors).flat().join(' ') : null;
        showToast(porCampo || json.message || 'No se pudo guardar la zona.', 'error');
        return;
      }

      showToast(editando ? 'Zona actualizada. Las rutas se recalcularán con el criterio nuevo.' : 'Zona creada.');
      setForm(null);
      setEditando(null);
      await cargar();
    } catch {
      showToast('No se pudo conectar con el servidor.', 'error');
    } finally {
      setGuardando(false);
    }
  };

  const desactivar = async (z) => {
    try {
      const res = await fetch(buildApiUrl(`/zonas/${z.id_zona}`), {
        method: 'DELETE',
        headers: autorizacion(),
      });
      const json = await res.json();
      if (!json.success) {
        showToast(json.message || 'No se pudo desactivar.', 'error');
        return;
      }
      showToast('Zona desactivada. Deja de influir en el cálculo de rutas.');
      await cargar();
    } catch {
      showToast('No se pudo conectar con el servidor.', 'error');
    }
  };

  const reactivar = async (z) => {
    try {
      const res = await fetch(buildApiUrl(`/zonas/${z.id_zona}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...autorizacion() },
        body: JSON.stringify({
          nombre: z.nombre, descripcion: z.descripcion ?? undefined, sector: z.sector ?? undefined,
          ciudad: z.ciudad, nivel: z.nivel, peso_riesgo: z.peso_riesgo,
          centro_lat: z.centro_lat, centro_lng: z.centro_lng, radio_metros: z.radio_metros,
          franja_horaria: z.franja_horaria, factor_nocturno: z.factor_nocturno,
          estado: 'ACTIVO',
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast('Zona reactivada.');
        await cargar();
      } else {
        showToast(json.message || 'No se pudo reactivar.', 'error');
      }
    } catch {
      showToast('No se pudo conectar con el servidor.', 'error');
    }
  };

  const claseCampo =
    'w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-purple-200';

  return (
    <div className="space-y-6">

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-purple-950 tracking-tight">Zonas de Seguridad</h2>
          <p className="text-sm text-slate-500 font-medium mt-0.5">
            {cargando ? 'Cargando...' : `${activas.length} zonas activas de ${zonas.length}. Definen el criterio con el que se calculan las rutas.`}
          </p>
        </div>
        <button
          onClick={abrirNueva}
          className="flex items-center gap-2 bg-purple-900 hover:bg-purple-950 text-white px-4 py-2.5 rounded-xl shadow-md text-xs font-bold transition-all cursor-pointer shrink-0"
        >
          <span className="material-symbols-outlined text-[16px]">add_location_alt</span>
          Nueva zona
        </button>
      </div>

      {/* Aviso sobre el origen de los datos. Va visible en el panel, no solo en
          el seed, porque quien administra debe saber qué está manejando. */}
      <div className="flex gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
        <span className="material-symbols-outlined text-[17px] text-amber-600 shrink-0">info</span>
        <p className="text-[11px] font-semibold text-amber-900 leading-relaxed">
          Las zonas cargadas son <strong>datos simulados</strong> creados para la demostración. No provienen
          de la Policía Nacional ni del ECU 911. Reemplázalas por información verificada antes de un uso real.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Mapa */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
            <h4 className="text-sm font-black text-purple-950">Mapa de zonas</h4>
            {form && (
              <span className="text-[10px] font-bold text-purple-700 flex items-center gap-1 animate-pulse">
                <span className="material-symbols-outlined text-[14px]">touch_app</span>
                Toca el mapa para situar la zona
              </span>
            )}
          </div>

          <div className="h-[440px] relative">
            <MapContainer center={CENTRO_LOJA} zoom={12} scrollWheelZoom className="w-full h-full absolute inset-0">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <SelectorMapa activo={!!form} onElegir={elegirEnMapa} />

              {filtradas.filter((z) => z.estado === 'ACTIVO').map((z) => (
                <Circle
                  key={z.id_zona}
                  center={[z.centro_lat, z.centro_lng]}
                  radius={z.radio_metros}
                  pathOptions={{
                    color: COLOR_NIVEL[z.nivel],
                    fillColor: COLOR_NIVEL[z.nivel],
                    fillOpacity: editando === z.id_zona ? 0.35 : 0.12,
                    weight: editando === z.id_zona ? 3 : 1,
                  }}
                  eventHandlers={{ click: () => !form && abrirEdicion(z) }}
                >
                  <Popup>
                    <div className="text-xs font-sans p-1 min-w-[160px]">
                      <p className="font-bold text-slate-800">{z.nombre}</p>
                      <p className="text-slate-500 mt-0.5">{z.descripcion}</p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Peso {z.peso_riesgo} · radio {z.radio_metros} m
                        {z.franja_horaria !== 'AMBOS' && ` · ${z.franja_horaria.toLowerCase()}`}
                      </p>
                    </div>
                  </Popup>
                </Circle>
              ))}

              {/* Vista previa de la zona que se está creando o editando */}
              {form && form.centro_lat !== '' && (
                <Circle
                  center={[Number(form.centro_lat), Number(form.centro_lng)]}
                  radius={Number(form.radio_metros)}
                  pathOptions={{
                    color: COLOR_NIVEL[form.nivel],
                    fillColor: COLOR_NIVEL[form.nivel],
                    fillOpacity: 0.3,
                    weight: 3,
                    dashArray: '6, 6',
                  }}
                />
              )}
            </MapContainer>
          </div>

          <div className="flex items-center gap-4 px-5 py-2.5 border-t border-slate-100 bg-slate-50/50">
            {Object.entries(COLOR_NIVEL).map(([nivel, color]) => (
              <div key={nivel} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-[10px] font-bold text-slate-500">{nivel}</span>
              </div>
            ))}
            <span className="text-[10px] text-slate-400 font-medium ml-auto">Toca una zona para editarla</span>
          </div>
        </div>

        {/* Formulario o listado */}
        <div className="lg:col-span-2 space-y-4">

          {form ? (
            <form onSubmit={guardar} className="bg-white rounded-2xl border border-purple-200 shadow-sm p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-black text-purple-950">
                  {editando ? 'Editar zona' : 'Nueva zona'}
                </h4>
                <button
                  type="button"
                  onClick={() => { setForm(null); setEditando(null); }}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              <input
                value={form.nombre} maxLength={120} required
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="Nombre de la zona" className={claseCampo}
              />

              <input
                value={form.sector} maxLength={100}
                onChange={(e) => setForm({ ...form, sector: e.target.value })}
                placeholder="Sector o barrio (opcional)" className={claseCampo}
              />

              <textarea
                value={form.descripcion} maxLength={255}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                placeholder="Descripción: qué caracteriza a esta zona"
                className={`${claseCampo} resize-none h-16`}
              />

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">Nivel</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {['SEGURA', 'REGULAR', 'INSEGURA'].map((n) => (
                    <button
                      key={n} type="button" onClick={() => cambiarNivel(n)}
                      className={`py-2 rounded-lg text-[10px] font-black border transition-all cursor-pointer ${
                        form.nivel === n ? BADGE_NIVEL[n] + ' ring-2 ring-offset-1' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                    Peso de riesgo
                  </label>
                  <input
                    type="number" step="0.5" min="0.1" max="99" required
                    value={form.peso_riesgo}
                    onChange={(e) => setForm({ ...form, peso_riesgo: e.target.value })}
                    className={claseCampo}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                    Radio: {form.radio_metros} m
                  </label>
                  <input
                    type="range" min="50" max="2000" step="25"
                    value={form.radio_metros}
                    onChange={(e) => setForm({ ...form, radio_metros: e.target.value })}
                    className="w-full accent-purple-800 cursor-pointer mt-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Franja</label>
                  <select
                    value={form.franja_horaria}
                    onChange={(e) => setForm({ ...form, franja_horaria: e.target.value })}
                    className={`${claseCampo} cursor-pointer`}
                  >
                    <option value="AMBOS">Todo el día</option>
                    <option value="DIURNO">Diurna</option>
                    <option value="NOCTURNO">Nocturna</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                    Factor nocturno
                  </label>
                  <input
                    type="number" step="0.1" min="1" max="5" required
                    value={form.factor_nocturno}
                    onChange={(e) => setForm({ ...form, factor_nocturno: e.target.value })}
                    className={claseCampo}
                  />
                </div>
              </div>

              <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                El factor nocturno multiplica el peso entre las 18:00 y las 06:00. Con 1 la zona no
                cambia de noche; una zona segura pero desierta al anochecer merece un factor alto.
              </p>

              <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Centro</p>
                <p className="text-[11px] font-bold text-slate-700 mt-0.5">
                  {form.centro_lat === ''
                    ? 'Toca el mapa para situarla'
                    : `${Number(form.centro_lat).toFixed(5)}, ${Number(form.centro_lng).toFixed(5)}`}
                </p>
              </div>

              <button
                type="submit"
                disabled={guardando}
                className="w-full bg-purple-900 hover:bg-purple-950 disabled:bg-slate-300 text-white text-xs font-bold py-3 rounded-xl transition-colors cursor-pointer"
              >
                {guardando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear zona'}
              </button>
            </form>
          ) : (
            <>
              <div className="flex gap-2">
                <select
                  value={filtroNivel}
                  onChange={(e) => setFiltroNivel(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm outline-none cursor-pointer"
                >
                  <option value="">Todos los niveles</option>
                  <option value="SEGURA">Seguras</option>
                  <option value="REGULAR">Regulares</option>
                  <option value="INSEGURA">Inseguras</option>
                </select>

                <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-2 gap-2 shadow-sm flex-1">
                  <span className="material-symbols-outlined text-slate-400 text-[16px]">search</span>
                  <input
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar zona..."
                    className="flex-1 text-xs font-semibold text-slate-700 outline-none bg-transparent min-w-0"
                  />
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
                {filtradas.map((z) => (
                  <div
                    key={z.id_zona}
                    className={`px-4 py-3 hover:bg-slate-50 transition-colors ${z.estado === 'INACTIVO' ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLOR_NIVEL[z.nivel] }} />
                          <p className="text-[11px] font-bold text-slate-800 truncate">{z.nombre}</p>
                        </div>
                        <p className="text-[9px] text-slate-400 mt-0.5">
                          {z.sector ?? 'Sin sector'} · peso {z.peso_riesgo} · {z.radio_metros} m
                          {z.franja_horaria !== 'AMBOS' && ` · ${z.franja_horaria.toLowerCase()}`}
                        </p>
                        {impacto[z.id_zona] > 0 && (
                          <p className="text-[9px] font-bold text-purple-700 mt-0.5">
                            {impacto[z.id_zona]} reporte(s) validado(s) dentro
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => abrirEdicion(z)}
                          title="Editar"
                          className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-all cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[14px]">edit</span>
                        </button>
                        {z.estado === 'ACTIVO' ? (
                          <button
                            onClick={() => desactivar(z)}
                            title="Desactivar: deja de influir en las rutas"
                            className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-red-600 hover:text-white transition-all cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[14px]">visibility_off</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => reactivar(z)}
                            title="Reactivar"
                            className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center text-green-700 hover:bg-green-600 hover:text-white transition-all cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[14px]">visibility</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {filtradas.length === 0 && !cargando && (
                  <p className="px-4 py-8 text-center text-xs text-slate-400 font-semibold">Sin resultados</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
