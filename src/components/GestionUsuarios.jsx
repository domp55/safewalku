import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { buildApiUrl } from '../services/api';

const ROLES = ['Todos', 'ESTUDIANTE', 'ADMINISTRADOR'];

const BADGE_ESTADO = {
  ACTIVO: 'bg-green-100 text-green-700 border-green-200',
  INACTIVO: 'bg-slate-100 text-slate-500 border-slate-200',
  BANEADO: 'bg-red-100 text-red-700 border-red-200',
};

const BADGE_ROL = {
  ESTUDIANTE: 'bg-blue-50 text-blue-700 border-blue-200',
  ADMINISTRADOR: 'bg-purple-50 text-purple-700 border-purple-200',
};

const COLORES_AVATAR = [
  'bg-purple-200 text-purple-900',
  'bg-indigo-200 text-indigo-900',
  'bg-pink-200 text-pink-900',
  'bg-amber-200 text-amber-900',
  'bg-teal-200 text-teal-900',
];

const POR_PAGINA = 12;

function autorizacion() {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  return { Authorization: `Bearer ${token}` };
}

/** Color estable por usuario, para que no cambie en cada renderizado. */
function colorAvatar(id) {
  return COLORES_AVATAR[id % COLORES_AVATAR.length];
}

function iniciales(u) {
  return `${u.nombre?.charAt(0) ?? ''}${u.apellido?.charAt(0) ?? ''}`.toUpperCase() || '??';
}

export default function GestionUsuarios() {
  const { user: usuarioActual, showToast } = useAuth();

  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState('Todos');
  const [pagina, setPagina] = useState(1);

  const [modal, setModal] = useState(null); // { modo: 'crear' | 'editar', usuario }
  const [form, setForm] = useState({ nombre: '', apellido: '', correo: '', contrasena: '', rol: 'ESTUDIANTE' });
  const [guardando, setGuardando] = useState(false);

  const [baneo, setBaneo] = useState(null); // usuario a suspender
  const [motivoBaneo, setMotivoBaneo] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const res = await fetch(buildApiUrl('/users'), { headers: autorizacion() });
      const json = await res.json();
      // El endpoint puede devolver el arreglo directo o envuelto en data
      const datos = Array.isArray(json) ? json : json.data;
      if (Array.isArray(datos)) setUsuarios(datos);
    } catch (e) {
      console.error('Error cargando usuarios', e);
      showToast('No se pudieron cargar los usuarios.', 'error');
    } finally {
      setCargando(false);
    }
  }, [showToast]);

  useEffect(() => { cargar(); }, [cargar]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return usuarios.filter((u) => {
      const coincideTexto =
        !q ||
        `${u.nombre} ${u.apellido}`.toLowerCase().includes(q) ||
        u.correo?.toLowerCase().includes(q);
      const coincideRol = filtroRol === 'Todos' || u.rol === filtroRol;
      return coincideTexto && coincideRol;
    });
  }, [usuarios, busqueda, filtroRol]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const visibles = filtrados.slice((paginaSegura - 1) * POR_PAGINA, paginaSegura * POR_PAGINA);

  useEffect(() => { setPagina(1); }, [busqueda, filtroRol]);

  // ------------------------------------------------------------ Acciones
  const abrirCrear = () => {
    setForm({ nombre: '', apellido: '', correo: '', contrasena: '', rol: 'ESTUDIANTE' });
    setModal({ modo: 'crear' });
  };

  const abrirEditar = (u) => {
    setForm({ nombre: u.nombre, apellido: u.apellido, correo: u.correo, contrasena: '', rol: u.rol });
    setModal({ modo: 'editar', usuario: u });
  };

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);

    try {
      let res;

      if (modal.modo === 'crear') {
        res = await fetch(buildApiUrl('/auth/register'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...autorizacion() },
          body: JSON.stringify(form),
        });
      } else {
        // Al editar no se toca la contraseña, así que se descarta del envío
        const { contrasena: _contrasena, ...sinClave } = form;
        res = await fetch(buildApiUrl(`/users/${modal.usuario.id_usuario}`), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...autorizacion() },
          body: JSON.stringify({ ...sinClave, estado: modal.usuario.estado }),
        });
      }

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        showToast(json.message || 'No se pudo guardar el usuario.', 'error');
        return;
      }

      showToast(modal.modo === 'crear' ? 'Usuario creado' : 'Usuario actualizado');
      setModal(null);
      await cargar();
    } catch {
      showToast('No se pudo conectar con el servidor.', 'error');
    } finally {
      setGuardando(false);
    }
  };

  const alternarEstado = async (u) => {
    const activando = u.estado === 'INACTIVO';

    try {
      const res = activando
        ? await fetch(buildApiUrl(`/users/${u.id_usuario}`), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...autorizacion() },
            body: JSON.stringify({
              nombre: u.nombre, apellido: u.apellido, correo: u.correo,
              rol: u.rol, estado: 'ACTIVO',
            }),
          })
        : await fetch(buildApiUrl(`/users/${u.id_usuario}`), {
            method: 'DELETE',
            headers: autorizacion(),
          });

      if (!res.ok) {
        showToast('No se pudo cambiar el estado.', 'error');
        return;
      }

      showToast(activando ? 'Cuenta reactivada' : 'Cuenta desactivada');
      await cargar();
    } catch {
      showToast('No se pudo conectar con el servidor.', 'error');
    }
  };

  const banear = async (e) => {
    e.preventDefault();

    if (motivoBaneo.trim().length < 10) {
      showToast('Explica el motivo con al menos 10 caracteres.', 'error');
      return;
    }

    try {
      const res = await fetch(buildApiUrl(`/users/${baneo.id_usuario}/banear`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...autorizacion() },
        body: JSON.stringify({ motivo: motivoBaneo.trim() }),
      });
      const json = await res.json();

      if (!json.success) {
        showToast(json.message || 'No se pudo suspender la cuenta.', 'error');
        return;
      }

      showToast('Cuenta suspendida');
      setBaneo(null);
      setMotivoBaneo('');
      await cargar();
    } catch {
      showToast('No se pudo conectar con el servidor.', 'error');
    }
  };

  const desbanear = async (u) => {
    try {
      const res = await fetch(buildApiUrl(`/users/${u.id_usuario}/desbanear`), {
        method: 'PATCH',
        headers: autorizacion(),
      });
      const json = await res.json();

      if (!json.success) {
        showToast(json.message || 'No se pudo levantar la suspension.', 'error');
        return;
      }

      showToast('Suspension levantada');
      await cargar();
    } catch {
      showToast('No se pudo conectar con el servidor.', 'error');
    }
  };

  const activos = usuarios.filter((u) => u.estado === 'ACTIVO').length;
  const baneados = usuarios.filter((u) => u.estado === 'BANEADO').length;

  return (
    <div className="space-y-6">

      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-purple-950 tracking-tight">Gestión de Usuarios</h2>
          <p className="text-sm text-slate-500 font-medium mt-0.5">
            {cargando ? 'Cargando...' : `${usuarios.length} usuarios · ${activos} activos${baneados ? ` · ${baneados} suspendidos` : ''}`}
          </p>
        </div>
        <button
          onClick={abrirCrear}
          className="flex items-center gap-2 bg-purple-900 hover:bg-purple-950 text-white px-4 py-2.5 rounded-xl shadow-md text-xs font-bold transition-all cursor-pointer shrink-0"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          Nuevo Usuario
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex gap-1 p-1 bg-slate-100/80 rounded-2xl">
          {ROLES.map((r) => (
            <button
              key={r}
              onClick={() => setFiltroRol(r)}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filtroRol === r ? 'bg-white text-purple-950 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {r === 'Todos' ? 'Todos' : r === 'ESTUDIANTE' ? 'Estudiantes' : 'Admins'}
            </button>
          ))}
        </div>

        <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-2 gap-2 shadow-sm w-full sm:w-72">
          <span className="material-symbols-outlined text-slate-400 text-[18px]">search</span>
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o correo..."
            className="flex-1 text-xs font-semibold text-slate-700 outline-none bg-transparent"
          />
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Usuario', 'Correo', 'Rol', 'Estado', 'Acciones'].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cargando && (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-xs text-slate-400 font-semibold">Cargando usuarios...</td></tr>
              )}

              {!cargando && visibles.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-xs text-slate-400 font-semibold">Sin resultados</td></tr>
              )}

              {visibles.map((u) => {
                const esYo = u.id_usuario === usuarioActual?.id_usuario;
                return (
                  <tr key={u.id_usuario} className={`hover:bg-slate-50/60 transition-colors ${u.estado === 'INACTIVO' ? 'opacity-60' : ''}`}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-black shrink-0 ${colorAvatar(u.id_usuario)}`}>
                          {iniciales(u)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {u.nombre} {u.apellido}
                            {esYo && <span className="ml-1.5 text-[9px] font-black text-purple-700">(tú)</span>}
                          </p>
                          <p className="text-[10px] text-slate-400">ID {u.id_usuario}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-600 font-medium">{u.correo}</td>
                    <td className="px-5 py-3">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${BADGE_ROL[u.rol] ?? ''}`}>
                        {u.rol === 'ADMINISTRADOR' ? 'Admin' : 'Estudiante'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${BADGE_ESTADO[u.estado] ?? ''}`}>
                        {u.estado}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => abrirEditar(u)}
                          title="Editar"
                          className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-all cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[15px]">edit</span>
                        </button>
                        <button
                          onClick={() => alternarEstado(u)}
                          disabled={esYo || u.estado === 'BANEADO'}
                          title={esYo ? 'No puedes desactivar tu propia cuenta' : (u.estado === 'ACTIVO' ? 'Desactivar' : 'Reactivar')}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                            u.estado === 'ACTIVO'
                              ? 'bg-slate-100 text-slate-500 hover:bg-amber-600 hover:text-white'
                              : 'bg-green-50 text-green-700 hover:bg-green-600 hover:text-white'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[15px]">
                            {u.estado === 'ACTIVO' ? 'person_off' : 'person_check'}
                          </span>
                        </button>

                        {/* Banear es distinto de desactivar: implica una falta,
                            lleva motivo y bloquea el inicio de sesion. Solo
                            aplica a estudiantes. */}
                        {u.estado === 'BANEADO' ? (
                          <button
                            onClick={() => desbanear(u)}
                            title="Levantar suspension"
                            className="w-8 h-8 rounded-lg bg-red-50 text-red-700 flex items-center justify-center hover:bg-green-600 hover:text-white transition-all cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[15px]">lock_open</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => { setBaneo(u); setMotivoBaneo(''); }}
                            disabled={esYo || u.rol === 'ADMINISTRADOR'}
                            title={u.rol === 'ADMINISTRADOR' ? 'No se puede suspender a un administrador' : 'Suspender por mal uso'}
                            className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-red-600 hover:text-white transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <span className="material-symbols-outlined text-[15px]">gavel</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {totalPaginas > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/50">
            <span className="text-[10px] font-bold text-slate-400">
              {filtrados.length} resultado(s) · página {paginaSegura} de {totalPaginas}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                disabled={paginaSegura === 1}
                className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-white border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <button
                onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                disabled={paginaSegura === totalPaginas}
                className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-white border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal crear / editar */}
      {modal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={guardar}
            className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-md space-y-4 border border-slate-100"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-purple-950 tracking-tight">
                {modal.modo === 'crear' ? 'Nuevo usuario' : 'Editar usuario'}
              </h3>
              <button
                type="button"
                onClick={() => setModal(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <input
                required value={form.nombre} maxLength={100}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="Nombre"
                className="bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-purple-200"
              />
              <input
                required value={form.apellido} maxLength={100}
                onChange={(e) => setForm({ ...form, apellido: e.target.value })}
                placeholder="Apellido"
                className="bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-purple-200"
              />
            </div>

            <input
              required type="email" value={form.correo} maxLength={100}
              onChange={(e) => setForm({ ...form, correo: e.target.value })}
              placeholder="correo@uide.edu.ec"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-purple-200"
            />

            {modal.modo === 'crear' && (
              <input
                required type="password" value={form.contrasena} minLength={6}
                onChange={(e) => setForm({ ...form, contrasena: e.target.value })}
                placeholder="Contraseña (mínimo 6 caracteres)"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-purple-200"
              />
            )}

            {/* Sin selector de rol: la aplicacion no crea administradores por
                ningun camino. Los que existen vienen cargados en la base. */}
            {modal.modo === 'crear' && (
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
                <span className="material-symbols-outlined text-[16px] text-slate-400">school</span>
                <span className="text-[11px] font-semibold text-slate-500">
                  Se creara como <strong className="text-slate-700">Estudiante</strong>. No es posible crear administradores.
                </span>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={guardando}
                className="flex-1 bg-purple-900 hover:bg-purple-950 disabled:bg-slate-300 text-white text-xs font-bold py-3 rounded-xl transition-colors cursor-pointer"
              >
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
              <button
                type="button"
                onClick={() => setModal(null)}
                className="px-5 text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}


      {/* Modal de suspension */}
      {baneo && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={banear}
            className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-md space-y-4 border border-slate-100"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px]">gavel</span>
              </div>
              <div>
                <h3 className="text-base font-black text-purple-950 tracking-tight">Suspender cuenta</h3>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  {baneo.nombre} {baneo.apellido} no podra iniciar sesion y vera el motivo que escribas.
                </p>
              </div>
            </div>

            <textarea
              value={motivoBaneo}
              onChange={(e) => setMotivoBaneo(e.target.value)}
              maxLength={255}
              placeholder="Motivo de la suspension. Se le mostrara al usuario al intentar entrar."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-red-200 resize-none h-24"
            />
            <p className="text-[10px] font-bold text-slate-400 -mt-2">
              {motivoBaneo.trim().length}/255 · minimo 10 caracteres
            </p>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={motivoBaneo.trim().length < 10}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white text-xs font-bold py-3 rounded-xl transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                Suspender cuenta
              </button>
              <button
                type="button"
                onClick={() => setBaneo(null)}
                className="px-5 text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
