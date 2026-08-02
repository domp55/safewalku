import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { buildApiUrl } from '../services/api';

/**
 * Ajustes del sistema.
 *
 * Antes esta pantalla tenía interruptores de notificaciones y de zonas que no
 * hacían nada: el botón "Guardar" solo escribía en la consola. Se reemplazaron
 * por lo que sí es real —la cuenta del administrador y el estado del sistema—
 * y por accesos a donde esa configuración se administra de verdad.
 *
 * Es preferible una pantalla honesta y corta a una llena de controles que
 * aparentan hacer algo.
 */

function autorizacion() {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  return { Authorization: `Bearer ${token}` };
}

/** Parámetros del motor de rutas. Viven en el código, no en la base. */
const PARAMETROS_MOTOR = [
  { etiqueta: 'Franja nocturna', valor: '18:00 – 06:00', detalle: 'Cuando se aplica el factor nocturno de cada zona' },
  { etiqueta: 'Vigencia de un reporte', valor: '90 días', detalle: 'Después deja de influir en el cálculo de rutas' },
  { etiqueta: 'Vida media del reporte', valor: '30 días', detalle: 'A los 30 días conserva el 37 % de su peso' },
  { etiqueta: 'Radio de influencia', valor: '150 m', detalle: 'Distancia a la que un incidente afecta a una ruta' },
  { etiqueta: 'Muestreo del trazado', valor: 'cada 30 m', detalle: 'Puntos evaluados a lo largo de cada ruta' },
  { etiqueta: 'Caché de rutas', valor: '6 horas', detalle: 'Tiempo que se reutiliza un cálculo ya hecho' },
];

export default function AdminSettings() {
  const navigate = useNavigate();
  const { updateUser, showToast } = useAuth();

  const [perfil, setPerfil] = useState(null);
  const [sistema, setSistema] = useState(null);
  const [cargando, setCargando] = useState(true);

  const [form, setForm] = useState({ nombre: '', apellido: '', correo: '' });
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const [resPerfil, resResumen] = await Promise.all([
        fetch(buildApiUrl('/users/me'), { headers: autorizacion() }),
        fetch(buildApiUrl('/dashboard/resumen'), { headers: autorizacion() }),
      ]);

      const jsonPerfil = await resPerfil.json();
      if (jsonPerfil.success) {
        setPerfil(jsonPerfil.data);
        setForm({
          nombre: jsonPerfil.data.nombre,
          apellido: jsonPerfil.data.apellido,
          correo: jsonPerfil.data.correo,
        });
      }

      const jsonResumen = await resResumen.json();
      if (jsonResumen.success) setSistema(jsonResumen.data);
    } catch (e) {
      console.error('Error cargando los ajustes', e);
      showToast('No se pudo cargar la configuración.', 'error');
    } finally {
      setCargando(false);
    }
  }, [showToast]);

  useEffect(() => { cargar(); }, [cargar]);

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      const res = await fetch(buildApiUrl('/users/me'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...autorizacion() },
        body: JSON.stringify(form),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        showToast(json.message || 'No se pudieron guardar los cambios.', 'error');
        return;
      }

      updateUser({ nombre: form.nombre, apellido: form.apellido, correo: form.correo });
      showToast('Datos actualizados');
      await cargar();
    } catch {
      showToast('No se pudo conectar con el servidor.', 'error');
    } finally {
      setGuardando(false);
    }
  };

  const claseCampo =
    'w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-purple-200';

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="material-symbols-outlined text-slate-300 text-[32px] animate-spin">progress_activity</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">

      <div>
        <h2 className="text-2xl font-black text-purple-950 tracking-tight">Configuración</h2>
        <p className="text-sm text-slate-500 font-medium mt-0.5">
          Tu cuenta, el estado del sistema y los parámetros del motor de rutas.
        </p>
      </div>

      {/* Cuenta del administrador */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h3 className="text-sm font-black text-slate-900 mb-4">Mi cuenta</h3>

        <form onSubmit={guardar} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Nombre</label>
              <input
                value={form.nombre} required maxLength={100}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className={claseCampo}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Apellido</label>
              <input
                value={form.apellido} required maxLength={100}
                onChange={(e) => setForm({ ...form, apellido: e.target.value })}
                className={claseCampo}
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
              Correo institucional
            </label>
            <input
              type="email" value={form.correo} required maxLength={100}
              onChange={(e) => setForm({ ...form, correo: e.target.value })}
              className={claseCampo}
            />
          </div>

          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
            <span className="material-symbols-outlined text-[15px] text-slate-400">shield_person</span>
            <span className="text-[11px] font-semibold text-slate-500">
              Rol <strong className="text-slate-700">{perfil?.rol}</strong>. Los administradores no se crean
              desde la aplicación: se asignan directamente en la base de datos.
            </span>
          </div>

          <button
            type="submit" disabled={guardando}
            className="bg-purple-900 hover:bg-purple-950 disabled:bg-slate-300 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-colors cursor-pointer"
          >
            {guardando ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </form>
      </section>

      {/* Estado del sistema */}
      {sistema && (
        <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-black text-slate-900 mb-4">Estado del sistema</h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { etiqueta: 'Reportes', valor: sistema.metricas.totalReportes },
              { etiqueta: 'Pendientes', valor: sistema.metricas.pendientes },
              { etiqueta: 'Usuarios activos', valor: sistema.metricas.usuariosRegistrados },
              { etiqueta: 'Zonas inseguras', valor: sistema.metricas.rutasRiesgo },
            ].map((m) => (
              <div key={m.etiqueta} className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                <p className="text-xl font-black text-purple-950">{m.valor}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{m.etiqueta}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => navigate('/admin/zonas')}
              className="flex items-center gap-1.5 text-[11px] font-bold text-purple-800 bg-purple-50 border border-purple-200 px-3 py-2 rounded-xl hover:bg-purple-100 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[15px]">map</span>
              Administrar zonas de seguridad
            </button>
            <button
              onClick={() => navigate('/admin/notificaciones')}
              className="flex items-center gap-1.5 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl hover:bg-amber-100 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[15px]">report_problem</span>
              Revisar reportes pendientes
            </button>
            <button
              onClick={() => navigate('/admin/usuarios')}
              className="flex items-center gap-1.5 text-[11px] font-bold text-blue-800 bg-blue-50 border border-blue-200 px-3 py-2 rounded-xl hover:bg-blue-100 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[15px]">group</span>
              Gestionar usuarios
            </button>
          </div>
        </section>
      )}

      {/* Parámetros del motor */}
      <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h3 className="text-sm font-black text-slate-900">Parámetros del motor de rutas</h3>
        <p className="text-[11px] text-slate-500 font-medium mt-0.5 mb-4">
          Estos valores están definidos en el código. Se muestran aquí para que quede constancia de cómo
          se calcula el riesgo; cambiarlos requiere modificar el sistema, no esta pantalla.
        </p>

        <div className="divide-y divide-slate-100">
          {PARAMETROS_MOTOR.map((p) => (
            <div key={p.etiqueta} className="flex items-start justify-between gap-4 py-2.5">
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-slate-700">{p.etiqueta}</p>
                <p className="text-[10px] text-slate-400">{p.detalle}</p>
              </div>
              <span className="text-[11px] font-black text-purple-950 shrink-0">{p.valor}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Origen de los datos */}
      <section className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
        <div className="flex gap-2.5">
          <span className="material-symbols-outlined text-[18px] text-amber-600 shrink-0">warning</span>
          <div>
            <h3 className="text-xs font-black text-amber-900">Sobre los datos de zonas</h3>
            <p className="text-[11px] text-amber-800 font-medium leading-relaxed mt-1">
              Las 24 zonas cargadas son <strong>datos simulados</strong> creados para la demostración.
              No provienen de la Policía Nacional ni del ECU 911. Antes de un uso real deben
              reemplazarse por información verificada desde la pantalla de zonas.
            </p>
          </div>
        </div>
      </section>

    </div>
  );
}
