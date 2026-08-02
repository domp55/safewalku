import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { buildApiUrl } from '../services/api';

/**
 * Perfil del estudiante.
 *
 * Todo lo que muestra sale de la base. Antes tenía el teléfono, la carrera, la
 * matrícula y el tipo de sangre escritos en el código, y las estadísticas
 * fijas: "24 caminatas, 1 SOS, 3 reportes" para cualquiera que entrara.
 */

const BADGE_ESTADO = {
  PENDIENTE: 'bg-amber-100 text-amber-700 border-amber-200',
  VALIDADO: 'bg-green-100 text-green-700 border-green-200',
  RECHAZADO: 'bg-red-100 text-red-700 border-red-200',
  DUPLICADO: 'bg-slate-100 text-slate-600 border-slate-200',
};

const ETIQUETA_CATEGORIA = {
  ROBO: 'Robo o hurto',
  VIOLENCIA: 'Violencia',
  ACOSO: 'Acoso',
  ACTIVIDAD_SOSPECHOSA: 'Actividad sospechosa',
  ACCIDENTE: 'Accidente',
  ILUMINACION: 'Iluminación deficiente',
  OTRO: 'Otro',
};

function autorizacion() {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  return { Authorization: `Bearer ${token}` };
}

function fechaCorta(valor) {
  if (!valor) return '—';
  return new Date(valor).toLocaleDateString('es-EC', {
    timeZone: 'America/Guayaquil', day: '2-digit', month: 'short', year: 'numeric',
  });
}

/** Muestra el dato o avisa de que falta, en vez de inventarlo. */
function Dato({ etiqueta, valor, icono }) {
  const vacio = valor === null || valor === undefined || valor === '';
  return (
    <div className="flex items-start gap-2.5 py-2.5 border-b border-slate-100 dark:border-[#4A4A50] last:border-0">
      <span className="material-symbols-outlined text-[17px] text-slate-400 shrink-0 mt-0.5">{icono}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{etiqueta}</p>
        <p className={`text-xs font-bold mt-0.5 ${vacio ? 'text-slate-300 italic' : 'text-slate-800 dark:text-slate-200'}`}>
          {vacio ? 'No registrado' : valor}
        </p>
      </div>
    </div>
  );
}

export default function PerfilEstudiante() {
  const navigate = useNavigate();
  const { user, updateUser, logout, showToast } = useAuth();
  const fotoInputRef = useRef(null);

  const [perfil, setPerfil] = useState(null);
  const [reportes, setReportes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [subiendoFoto, setSubiendoFoto] = useState(false);

  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({ nombre: '', apellido: '', correo: '' });
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const [resPerfil, resReportes] = await Promise.all([
        fetch(buildApiUrl('/users/me'), { headers: autorizacion() }),
        fetch(buildApiUrl('/reports/mis-reportes'), { headers: autorizacion() }),
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

      const jsonReportes = await resReportes.json();
      if (jsonReportes.success) setReportes(jsonReportes.data);
    } catch (e) {
      console.error('Error cargando el perfil', e);
      showToast('No se pudo cargar el perfil.', 'error');
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
      showToast('Perfil actualizado');
      setEditando(false);
      await cargar();
    } catch {
      showToast('No se pudo conectar con el servidor.', 'error');
    } finally {
      setGuardando(false);
    }
  };

  const subirFoto = async (e) => {
    const archivo = e.target.files[0];
    if (!archivo) return;

    if (archivo.size > 5 * 1024 * 1024) {
      showToast('La imagen supera los 5 MB permitidos.', 'error');
      e.target.value = '';
      return;
    }

    setSubiendoFoto(true);
    try {
      const datos = new FormData();
      datos.append('imagen', archivo);

      const res = await fetch(buildApiUrl(`/users/${perfil.id_usuario}/foto`), {
        method: 'PUT',
        headers: autorizacion(),
        body: datos,
      });

      const json = await res.json();

      // Si el servidor falla se informa. Antes se mostraba una vista previa
      // local y el usuario creía que su foto estaba guardada cuando no lo
      // estaba: al recargar volvía a la imagen anterior sin explicación.
      if (!json.success) {
        showToast(json.message || 'No se pudo subir la foto.', 'error');
        return;
      }

      setPerfil((p) => ({ ...p, foto_perfil: json.foto_url }));
      updateUser({ foto_perfil: json.foto_url });
      showToast('Foto actualizada');
    } catch {
      showToast('No se pudo subir la foto. Revisa tu conexión.', 'error');
    } finally {
      setSubiendoFoto(false);
      e.target.value = '';
    }
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="material-symbols-outlined text-slate-300 text-[32px] animate-spin">progress_activity</span>
      </div>
    );
  }

  if (!perfil) {
    return (
      <div className="text-center py-20">
        <span className="material-symbols-outlined text-slate-300 text-[32px]">person_off</span>
        <p className="text-xs text-slate-400 font-semibold mt-2">No se pudo cargar el perfil.</p>
      </div>
    );
  }

  const est = perfil.estadisticas;
  const iniciales = `${perfil.nombre?.charAt(0) ?? ''}${perfil.apellido?.charAt(0) ?? ''}`.toUpperCase();

  const claseCampo =
    'w-full bg-slate-50 dark:bg-[#3C3C40] border border-slate-200 dark:border-[#4A4A50] rounded-xl py-2.5 px-3 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-purple-200';

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-6">

      {/* Identificación */}
      <div className="flex flex-col md:flex-row items-center md:items-start gap-5 p-6 bg-white dark:bg-[#2B2B2F] border border-slate-200 dark:border-[#4A4A50] rounded-3xl shadow-sm transition-colors duration-500">

        <div
          className="relative group cursor-pointer shrink-0"
          onClick={() => fotoInputRef.current?.click()}
          title="Cambiar foto"
        >
          {perfil.foto_perfil ? (
            <img
              className="w-24 h-24 rounded-full object-cover border-4 border-purple-50 dark:border-[#4A4A50] shadow-md"
              alt="Foto de perfil"
              src={perfil.foto_perfil}
            />
          ) : (
            /* Avatar con iniciales en lugar de una foto de archivo ajena */
            <div className="w-24 h-24 rounded-full bg-purple-100 dark:bg-purple-500/20 text-purple-900 dark:text-purple-300 flex items-center justify-center text-2xl font-black border-4 border-purple-50 dark:border-[#4A4A50] shadow-md">
              {iniciales || '??'}
            </div>
          )}

          <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-[22px]">
              {subiendoFoto ? 'progress_activity' : 'photo_camera'}
            </span>
          </div>
        </div>

        <input type="file" ref={fotoInputRef} className="hidden" accept="image/*" onChange={subirFoto} />

        <div className="flex-1 text-center md:text-left min-w-0">
          <h2 className="text-xl font-black text-purple-950 dark:text-slate-100 tracking-tight">
            {perfil.nombre} {perfil.apellido}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5 truncate">{perfil.correo}</p>

          <div className="flex flex-wrap gap-1.5 justify-center md:justify-start mt-2">
            <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
              {perfil.rol === 'ADMINISTRADOR' ? 'Administrador' : 'Estudiante'}
            </span>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
              Desde {fechaCorta(perfil.fecha_registro)}
            </span>
          </div>

          <button
            onClick={() => setEditando((v) => !v)}
            className="mt-3 text-[11px] font-bold text-purple-800 dark:text-purple-400 hover:underline cursor-pointer flex items-center gap-1 mx-auto md:mx-0"
          >
            <span className="material-symbols-outlined text-[14px]">edit</span>
            {editando ? 'Cancelar edición' : 'Editar mis datos'}
          </button>
        </div>
      </div>

      {/* Edición */}
      {editando && (
        <form onSubmit={guardar} className="p-5 bg-white dark:bg-[#2B2B2F] border border-purple-200 dark:border-purple-500/30 rounded-3xl shadow-sm space-y-3">
          <h3 className="text-sm font-black text-purple-950 dark:text-slate-100">Editar mis datos</h3>

          <div className="grid grid-cols-2 gap-3">
            <input
              value={form.nombre} required maxLength={100}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              placeholder="Nombre" className={claseCampo}
            />
            <input
              value={form.apellido} required maxLength={100}
              onChange={(e) => setForm({ ...form, apellido: e.target.value })}
              placeholder="Apellido" className={claseCampo}
            />
          </div>

          <input
            type="email" value={form.correo} required maxLength={100}
            onChange={(e) => setForm({ ...form, correo: e.target.value })}
            placeholder="correo@uide.edu.ec" className={claseCampo}
          />

          <button
            type="submit" disabled={guardando}
            className="w-full bg-purple-900 hover:bg-purple-950 disabled:bg-slate-300 text-white text-xs font-bold py-2.5 rounded-xl transition-colors cursor-pointer"
          >
            {guardando ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </form>
      )}

      {/* Estadísticas reales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { etiqueta: 'Reportes', valor: est.reportes, color: 'text-amber-600', icono: 'report_problem' },
          { etiqueta: 'Validados', valor: est.validados, color: 'text-green-600', icono: 'verified' },
          { etiqueta: 'Alertas SOS', valor: est.sos, color: 'text-red-600', icono: 'emergency' },
          { etiqueta: 'Rutas usadas', valor: est.rutas, color: 'text-purple-900', icono: 'alt_route' },
        ].map((s) => (
          <div key={s.etiqueta} className="p-4 bg-white dark:bg-[#2B2B2F] border border-slate-200 dark:border-[#4A4A50] rounded-2xl shadow-sm text-center">
            <span className={`material-symbols-outlined text-[18px] ${s.color}`}>{s.icono}</span>
            <p className={`text-2xl font-black mt-1 ${s.color}`}>{s.valor}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{s.etiqueta}</p>
          </div>
        ))}
      </div>

      {/* Datos académicos */}
      <div className="p-5 bg-white dark:bg-[#2B2B2F] border border-slate-200 dark:border-[#4A4A50] rounded-3xl shadow-sm">
        <h3 className="text-sm font-black text-purple-950 dark:text-slate-100 mb-1">Mis datos</h3>
        <p className="text-[10px] text-slate-400 font-medium mb-2">
          Los campos vacíos corresponden a cuentas creadas antes de que el registro los pidiera.
        </p>

        <Dato etiqueta="Cédula" valor={perfil.cedula} icono="badge" />
        <Dato etiqueta="Celular" valor={perfil.telefono} icono="phone_iphone" />
        <Dato etiqueta="Carrera" valor={perfil.carrera} icono="school" />
        <Dato etiqueta="Matrícula" valor={perfil.matricula} icono="tag" />
        <Dato etiqueta="Contactos de emergencia" valor={`${est.contactos} registrado(s)`} icono="contact_phone" />
      </div>

      {/* Mis reportes */}
      <div className="p-5 bg-white dark:bg-[#2B2B2F] border border-slate-200 dark:border-[#4A4A50] rounded-3xl shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-black text-purple-950 dark:text-slate-100">Mis reportes</h3>
          <button
            onClick={() => navigate('/reportar')}
            className="text-[11px] font-bold text-purple-800 dark:text-purple-400 hover:underline cursor-pointer flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[14px]">add</span>
            Nuevo
          </button>
        </div>

        {reportes.length === 0 ? (
          <div className="text-center py-6">
            <span className="material-symbols-outlined text-slate-200 text-[26px]">description</span>
            <p className="text-[11px] font-semibold text-slate-400 mt-1">Aún no has enviado ningún reporte.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {reportes.map((r) => (
              <div
                key={r.id_reporte}
                className="p-3 bg-slate-50 dark:bg-[#3C3C40] border border-slate-200 dark:border-[#4A4A50] rounded-xl"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                      {ETIQUETA_CATEGORIA[r.categoria] ?? r.categoria}
                      <span className="text-slate-400 font-semibold"> · #{r.id_reporte}</span>
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{r.descripcion}</p>
                    <p className="text-[9px] text-slate-400 mt-1">
                      {r.ubicacion_nombre} · {fechaCorta(r.fecha_reporte)}
                      {r.es_anonimo && ' · anónimo'}
                    </p>
                  </div>
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-md border shrink-0 ${BADGE_ESTADO[r.estado] ?? ''}`}>
                    {r.estado}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={() => { logout(); navigate('/login'); }}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 text-xs font-bold hover:bg-red-100 transition-colors cursor-pointer"
      >
        <span className="material-symbols-outlined text-[16px]">logout</span>
        Cerrar sesión
      </button>

    </div>
  );
}
