import React, { useEffect, useState, useCallback } from 'react';
import { useMapConfig } from '../layouts/MainLayout';
import { useAuth } from '../context/AuthContext';
import { buildApiUrl } from '../services/api';

/**
 * Servicios de auxilio y contactos personales, con llamada real.
 *
 * Los botones antes ejecutaban alert(). Ahora abren el marcador telefónico del
 * dispositivo con un enlace tel:, que es lo que pedía el cliente para el uso
 * desde el celular.
 */

const ESTILO_TIPO = {
  POLICIA: { icono: 'local_police', color: 'bg-blue-50 text-blue-900 border-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20' },
  UPC: { icono: 'shield', color: 'bg-indigo-50 text-indigo-900 border-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20' },
  BOMBEROS: { icono: 'fire_truck', color: 'bg-red-50 text-red-900 border-red-100 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20' },
  HOSPITAL: { icono: 'medical_services', color: 'bg-green-50 text-green-900 border-green-100 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20' },
};

const ETIQUETA_TIPO = {
  POLICIA: 'Policía',
  UPC: 'Unidad de Policía Comunitaria',
  BOMBEROS: 'Bomberos',
  HOSPITAL: 'Salud',
};

const ETIQUETA_PARENTESCO = {
  PADRE: 'Padre', MADRE: 'Madre', HERMANO: 'Hermano',
  HERMANA: 'Hermana', AMIGO: 'Amigo', PAREJA: 'Pareja', OTRO: 'Otro',
};

function autorizacion() {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  return { Authorization: `Bearer ${token}` };
}

/** El marcador telefónico solo acepta dígitos, + y *. */
function normalizarTelefono(numero) {
  return (numero || '').replace(/[^\d+*#]/g, '');
}

/**
 * Botón de llamada.
 *
 * En móvil el enlace tel: abre el marcador. En escritorio casi nunca hay una
 * aplicación asociada, así que ahí se copia el número al portapapeles en lugar
 * de dejar al usuario con un clic que aparentemente no hace nada.
 */
function BotonLlamar({ numero, etiqueta, className = '' }) {
  const { showToast } = useAuth();
  const limpio = normalizarTelefono(numero);

  const esMovil = /Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent);

  const manejarClic = (e) => {
    if (esMovil) return; // dejamos que el enlace tel: haga su trabajo

    e.preventDefault();
    navigator.clipboard?.writeText(limpio)
      .then(() => showToast(`Número ${numero} copiado. Márcalo desde tu teléfono.`))
      .catch(() => showToast(`Marca el ${numero} desde tu teléfono.`));
  };

  return (
    <a
      href={`tel:${limpio}`}
      onClick={manejarClic}
      className={`w-full bg-slate-900 hover:bg-slate-950 text-white font-bold py-2.5 rounded-xl transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 text-xs ${className}`}
    >
      <span className="material-symbols-outlined text-[16px]">call</span>
      <span>{etiqueta ?? `Llamar ${numero}`}</span>
    </a>
  );
}

export default function ListaContactosApoyo() {
  const { setMapConfig, defaultMapConfig } = useMapConfig();
  const { showToast } = useAuth();

  const [servicios, setServicios] = useState([]);
  const [contactos, setContactos] = useState([]);
  const [cargando, setCargando] = useState(true);

  const [formAbierto, setFormAbierto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ nombre: '', telefono: '', parentesco: 'MADRE' });
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const [resServ, resCont] = await Promise.all([
        fetch(buildApiUrl('/servicios'), { headers: autorizacion() }),
        fetch(buildApiUrl('/contactos/me'), { headers: autorizacion() }),
      ]);

      const jsonServ = await resServ.json();
      if (jsonServ.success) setServicios(jsonServ.data);

      const jsonCont = await resCont.json();
      if (jsonCont.success) setContactos(jsonCont.data);
    } catch (e) {
      console.error('Error cargando contactos y servicios', e);
      showToast('No se pudieron cargar los contactos.', 'error');
    } finally {
      setCargando(false);
    }
  }, [showToast]);

  useEffect(() => { cargar(); }, [cargar]);

  // Servicios con coordenadas conocidas, marcados en el mapa
  useEffect(() => {
    const conUbicacion = servicios.filter((s) => s.latitud != null && s.longitud != null);

    setMapConfig((prev) => ({
      ...prev,
      centro: conUbicacion.length ? [conUbicacion[0].latitud, conUbicacion[0].longitud] : defaultMapConfig.centro,
      zoom: 14,
      markers: conUbicacion.map((s) => ({
        position: [s.latitud, s.longitud],
        title: s.nombre,
        desc: `${ETIQUETA_TIPO[s.tipo] ?? s.tipo} · ${s.telefono}`,
      })),
      circle: null,
      rutas: null,
      modoSeleccion: false,
    }));

    return () => setMapConfig(defaultMapConfig);
  }, [servicios, setMapConfig, defaultMapConfig]);

  // --------------------------------------------------------- Contactos
  const abrirNuevo = () => {
    setEditando(null);
    setForm({ nombre: '', telefono: '', parentesco: 'MADRE' });
    setFormAbierto(true);
  };

  const abrirEdicion = (c) => {
    setEditando(c.id_contacto);
    setForm({ nombre: c.nombre, telefono: c.telefono, parentesco: c.parentesco });
    setFormAbierto(true);
  };

  const guardar = async (e) => {
    e.preventDefault();

    if (form.nombre.trim().length < 2 || normalizarTelefono(form.telefono).length < 3) {
      showToast('Revisa el nombre y el teléfono.', 'error');
      return;
    }

    setGuardando(true);
    try {
      const url = editando ? `/contactos/${editando}` : '/contactos';
      const res = await fetch(buildApiUrl(url), {
        method: editando ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', ...autorizacion() },
        body: JSON.stringify(form),
      });

      const json = await res.json();

      if (!json.success) {
        showToast(json.message || 'No se pudo guardar el contacto.', 'error');
        return;
      }

      showToast(editando ? 'Contacto actualizado' : 'Contacto agregado');
      setFormAbierto(false);
      await cargar();
    } catch {
      showToast('No se pudo conectar con el servidor.', 'error');
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (id) => {
    try {
      const res = await fetch(buildApiUrl(`/contactos/${id}`), {
        method: 'DELETE',
        headers: autorizacion(),
      });
      const json = await res.json();
      if (json.success) {
        showToast('Contacto eliminado');
        await cargar();
      }
    } catch {
      showToast('No se pudo eliminar el contacto.', 'error');
    }
  };

  return (
    <div className="space-y-5">

      <div>
        <h2 className="text-xl font-black text-purple-950 dark:text-slate-100 tracking-tight">Contactos de Apoyo</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
          Desde el celular, los botones abren el marcador telefónico directamente.
        </p>
      </div>

      {/* Acceso inmediato al 911 */}
      <div className="bg-red-600 rounded-3xl p-4 shadow-lg">
        <div className="flex items-center gap-2 mb-2">
          <span className="material-symbols-outlined text-white text-[20px]">emergency</span>
          <div>
            <p className="text-white font-black text-sm leading-tight">Emergencia inmediata</p>
            <p className="text-red-100 text-[10px] font-semibold">Sistema integrado ECU 911</p>
          </div>
        </div>
        <BotonLlamar numero="911" etiqueta="Llamar al 911" className="!bg-white !text-red-700 hover:!bg-red-50" />
      </div>

      {/* Servicios de emergencia */}
      <section className="space-y-3">
        <h3 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase">
          Servicios de emergencia
        </h3>

        {cargando && (
          <p className="text-[11px] text-slate-400 font-semibold">Cargando servicios...</p>
        )}

        {!cargando && servicios.length === 0 && (
          <p className="text-[11px] text-slate-400 font-semibold">
            No hay servicios registrados. El administrador puede agregarlos.
          </p>
        )}

        <div className="space-y-3">
          {servicios.map((s) => {
            const estilo = ESTILO_TIPO[s.tipo] ?? ESTILO_TIPO.POLICIA;
            return (
              <div
                key={s.id_servicio}
                className="p-4 bg-white dark:bg-[#2B2B2F] border border-slate-200 dark:border-[#4A4A50] rounded-3xl shadow-sm hover:shadow-md transition-shadow space-y-3"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl border shadow-sm ${estilo.color}`}>
                    <span className="material-symbols-outlined text-[20px] block font-bold">{estilo.icono}</span>
                  </div>
                  <div className="min-w-0">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">
                      {ETIQUETA_TIPO[s.tipo] ?? s.tipo}
                    </span>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{s.nombre}</h4>
                    {s.direccion && (
                      <p className="text-[10px] text-slate-400 truncate">{s.direccion}</p>
                    )}
                  </div>
                </div>
                <BotonLlamar numero={s.telefono} />
              </div>
            );
          })}
        </div>
      </section>

      {/* Contactos personales */}
      <section className="space-y-3 pt-1">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase">
            Mis contactos de confianza
          </h3>
          <button
            onClick={abrirNuevo}
            className="text-[10px] font-bold text-purple-800 dark:text-purple-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[14px]">add</span>
            Agregar
          </button>
        </div>

        {contactos.length === 0 && !formAbierto && (
          <div className="text-center py-5 px-4 bg-slate-50 dark:bg-[#2B2B2F] border-2 border-dashed border-slate-200 dark:border-[#4A4A50] rounded-2xl">
            <span className="material-symbols-outlined text-slate-300 text-[26px]">contact_phone</span>
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1">
              Aún no tienes contactos de confianza
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Agrégalos para llamarlos con un toque desde la pantalla SOS.
            </p>
          </div>
        )}

        <div className="space-y-2">
          {contactos.map((c) => (
            <div
              key={c.id_contacto}
              className="flex items-center justify-between gap-2 p-3 bg-white dark:bg-[#2B2B2F] border border-slate-200 dark:border-[#4A4A50] rounded-2xl shadow-sm"
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* Avatar con iniciales, en lugar de una foto de archivo */}
                <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-500/20 text-purple-900 dark:text-purple-300 flex items-center justify-center font-black text-sm shrink-0 border border-purple-200 dark:border-purple-500/30">
                  {c.nombre.trim().charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{c.nombre}</p>
                  <p className="text-[10px] font-semibold text-slate-400">
                    {ETIQUETA_PARENTESCO[c.parentesco] ?? c.parentesco} · {c.telefono}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <a
                  href={`tel:${normalizarTelefono(c.telefono)}`}
                  title={`Llamar a ${c.nombre}`}
                  className="w-8 h-8 rounded-lg bg-green-50 dark:bg-green-500/10 flex items-center justify-center text-green-700 dark:text-green-400 hover:bg-green-600 hover:text-white transition-all"
                >
                  <span className="material-symbols-outlined text-[16px]">call</span>
                </a>
                <button
                  onClick={() => abrirEdicion(c)}
                  title="Editar"
                  className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-[#3C3C40] flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[15px]">edit</span>
                </button>
                <button
                  onClick={() => eliminar(c.id_contacto)}
                  title="Eliminar"
                  className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-[#3C3C40] flex items-center justify-center text-slate-500 hover:bg-red-600 hover:text-white transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[15px]">delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Formulario de contacto */}
        {formAbierto && (
          <form
            onSubmit={guardar}
            className="space-y-2.5 p-4 bg-slate-50 dark:bg-[#2B2B2F] border border-slate-200 dark:border-[#4A4A50] rounded-2xl"
          >
            <p className="text-[11px] font-black text-slate-700 dark:text-slate-200">
              {editando ? 'Editar contacto' : 'Nuevo contacto'}
            </p>

            <input
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              placeholder="Nombre"
              maxLength={100}
              className="w-full bg-white dark:bg-[#3C3C40] border border-slate-200 dark:border-[#4A4A50] rounded-xl py-2.5 px-3 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-purple-200"
            />

            <input
              value={form.telefono}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })}
              placeholder="Teléfono (ej. 0991234567)"
              inputMode="tel"
              maxLength={20}
              className="w-full bg-white dark:bg-[#3C3C40] border border-slate-200 dark:border-[#4A4A50] rounded-xl py-2.5 px-3 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-purple-200"
            />

            <select
              value={form.parentesco}
              onChange={(e) => setForm({ ...form, parentesco: e.target.value })}
              className="w-full bg-white dark:bg-[#3C3C40] border border-slate-200 dark:border-[#4A4A50] rounded-xl py-2.5 px-3 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-purple-200"
            >
              {Object.entries(ETIQUETA_PARENTESCO).map(([valor, etiqueta]) => (
                <option key={valor} value={valor}>{etiqueta}</option>
              ))}
            </select>

            <div className="flex gap-2 pt-0.5">
              <button
                type="submit"
                disabled={guardando}
                className="flex-1 bg-purple-900 hover:bg-purple-950 disabled:bg-slate-300 text-white text-[11px] font-bold py-2.5 rounded-xl transition-colors cursor-pointer"
              >
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
              <button
                type="button"
                onClick={() => setFormAbierto(false)}
                className="px-4 text-[11px] font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </section>

    </div>
  );
}
