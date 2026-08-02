import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { buildApiUrl } from '../services/api';
import logoClaro from '../assets/logo-claro.png';

/**
 * Registro de estudiantes de la UIDE.
 *
 * La validación se hace en los dos lados: aquí para dar respuesta inmediata y
 * explicar qué falta, y en el servidor porque es el único sitio donde la
 * comprobación es de fiar. Nada de lo que se valide aquí sustituye a lo de allá.
 */

const CARRERAS = [
  'Ingeniería en Software',
  'Ingeniería Industrial',
  'Ingeniería Automotriz',
  'Administración de Empresas',
  'Comercio Exterior',
  'Contabilidad y Auditoría',
  'Derecho',
  'Psicología',
  'Enfermería',
  'Odontología',
  'Medicina',
  'Gastronomía',
  'Diseño Gráfico',
  'Otra',
];

const PATRON_NOMBRE = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?:[ '-][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$/;

/**
 * Cédula ecuatoriana con dígito verificador.
 *
 * Se replica el algoritmo del servidor para poder avisar antes de enviar. Un
 * número inventado al azar se detecta casi siempre.
 */
function cedulaValida(valor) {
  const cedula = (valor || '').trim();
  if (!/^\d{10}$/.test(cedula)) return false;

  const provincia = Number(cedula.slice(0, 2));
  if (!((provincia >= 1 && provincia <= 24) || provincia === 30)) return false;
  if (Number(cedula[2]) > 5) return false;

  let suma = 0;
  for (let i = 0; i < 9; i++) {
    let producto = Number(cedula[i]) * (i % 2 === 0 ? 2 : 1);
    if (producto > 9) producto -= 9;
    suma += producto;
  }

  return (10 - (suma % 10)) % 10 === Number(cedula[9]);
}

function requisitosContrasena(valor) {
  const v = valor || '';
  return [
    { etiqueta: 'Mínimo 8 caracteres', ok: v.length >= 8 },
    { etiqueta: 'Una minúscula', ok: /[a-z]/.test(v) },
    { etiqueta: 'Una mayúscula', ok: /[A-Z]/.test(v) },
    { etiqueta: 'Un número', ok: /\d/.test(v) },
    { etiqueta: 'Un símbolo', ok: /[^A-Za-z0-9]/.test(v) },
  ];
}

export default function Registro() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    cedula: '',
    correo: '',
    telefono: '',
    carrera: '',
    contrasena: '',
    confirmarContrasena: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Cédula y teléfono solo admiten dígitos: se filtra al escribir para que
    // no haya que corregir después.
    const limpio =
      name === 'cedula' || name === 'telefono'
        ? value.replace(/\D/g, '')
        : value;

    setFormData((prev) => ({ ...prev, [name]: limpio }));
  };

  const validar = () => {
    const d = formData;

    if (!PATRON_NOMBRE.test(d.nombre.trim())) return 'El nombre solo puede contener letras.';
    if (!PATRON_NOMBRE.test(d.apellido.trim())) return 'El apellido solo puede contener letras.';
    if (!cedulaValida(d.cedula)) return 'La cédula no es válida. Revisa los 10 dígitos.';
    if (!/^[a-z0-9._%+-]+@uide\.edu\.ec$/i.test(d.correo.trim())) return 'Debes usar tu correo institucional @uide.edu.ec';
    if (!/^09\d{8}$/.test(d.telefono)) return 'El celular debe tener 10 dígitos y empezar por 09.';
    if (!CARRERAS.includes(d.carrera)) return 'Selecciona tu carrera.';
    if (requisitosContrasena(d.contrasena).some((r) => !r.ok)) return 'La contraseña no cumple todos los requisitos.';
    if (d.contrasena !== d.confirmarContrasena) return 'Las contraseñas no coinciden.';

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const problema = validar();
    if (problema) {
      setError(problema);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(buildApiUrl('/auth/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre:     formData.nombre.trim(),
          apellido:   formData.apellido.trim(),
          cedula:     formData.cedula,
          correo:     formData.correo.trim().toLowerCase(),
          telefono:   formData.telefono,
          carrera:    formData.carrera,
          contrasena: formData.contrasena,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const porCampo = data.errors ? Object.values(data.errors).flat().join(' ') : null;
        setError(porCampo || data.message || 'No fue posible crear la cuenta.');
        return;
      }

      setSuccess(true);
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      // Un fallo se informa como fallo. Antes este catch marcaba la cuenta
      // como creada y el usuario descubría el problema al no poder entrar.
      console.error('Error al registrar:', err);
      setError('No se pudo conectar con el servidor. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const reqs = requisitosContrasena(formData.contrasena);
  const claseCampo =
    'w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-900 transition-all font-medium text-slate-800';

  return (
    <div className="bg-[#f7f9fb] min-h-screen flex items-center justify-center p-4 relative overflow-hidden font-sans w-full">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-5%] w-[350px] h-[350px] bg-purple-900/5 rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] bg-indigo-800/5 rounded-full blur-3xl" />
      </div>

      <main className="relative z-10 w-full max-w-[480px] py-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-7 shadow-lg md:p-8">

          <div className="flex flex-col items-center mb-6">
            <img src={logoClaro} alt="SafeWalk" className="h-20 w-auto object-contain mb-1 drop-shadow-sm" />
            <h1 className="text-2xl font-black text-purple-950 tracking-tight">Crear cuenta</h1>
            <p className="text-xs text-slate-500 mt-1 text-center font-medium">
              Solo para estudiantes de la UIDE con correo institucional
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold flex gap-2 items-start">
              <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-xs font-semibold flex gap-2 items-center">
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              ¡Cuenta creada! Redirigiendo al inicio de sesión...
            </div>
          )}

          <form className="space-y-3.5" onSubmit={handleSubmit}>

            {/* Nombre y apellido van separados porque la tabla los guarda así y
                partir un "nombre completo" por el espacio adivina mal en cuanto
                alguien tiene dos nombres o dos apellidos. */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">Nombre</label>
                <input
                  name="nombre" type="text" required maxLength={100}
                  value={formData.nombre} onChange={handleChange}
                  placeholder="Martín" className={claseCampo}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">Apellido</label>
                <input
                  name="apellido" type="text" required maxLength={100}
                  value={formData.apellido} onChange={handleChange}
                  placeholder="García" className={claseCampo}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">Cédula</label>
                <input
                  name="cedula" type="text" required inputMode="numeric" maxLength={10}
                  value={formData.cedula} onChange={handleChange}
                  placeholder="1104567890"
                  className={`${claseCampo} ${
                    formData.cedula.length === 10 && !cedulaValida(formData.cedula)
                      ? 'border-red-300 bg-red-50'
                      : ''
                  }`}
                />
                {formData.cedula.length === 10 && !cedulaValida(formData.cedula) && (
                  <p className="text-[10px] font-bold text-red-600">Cédula no válida</p>
                )}
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">Celular</label>
                <input
                  name="telefono" type="text" required inputMode="tel" maxLength={10}
                  value={formData.telefono} onChange={handleChange}
                  placeholder="0991234567" className={claseCampo}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">Carrera</label>
              <select
                name="carrera" required value={formData.carrera} onChange={handleChange}
                className={`${claseCampo} cursor-pointer`}
              >
                <option value="">Selecciona tu carrera</option>
                {CARRERAS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">Correo institucional</label>
              <input
                name="correo" type="email" required maxLength={100}
                value={formData.correo} onChange={handleChange}
                placeholder="usuario@uide.edu.ec" className={claseCampo}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">Contraseña</label>
                <input
                  name="contrasena" type="password" required maxLength={72}
                  value={formData.contrasena} onChange={handleChange}
                  placeholder="••••••••" className={claseCampo}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">Repetir</label>
                <input
                  name="confirmarContrasena" type="password" required maxLength={72}
                  value={formData.confirmarContrasena} onChange={handleChange}
                  placeholder="••••••••"
                  className={`${claseCampo} ${
                    formData.confirmarContrasena && formData.contrasena !== formData.confirmarContrasena
                      ? 'border-red-300 bg-red-50'
                      : ''
                  }`}
                />
              </div>
            </div>

            {/* Requisitos en vivo: es más útil que un mensaje de error después
                de enviar, porque el usuario ve qué le falta mientras escribe. */}
            {formData.contrasena.length > 0 && (
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 bg-slate-50 border border-slate-100 rounded-xl p-2.5">
                {reqs.map((r) => (
                  <div key={r.etiqueta} className="flex items-center gap-1">
                    <span className={`material-symbols-outlined text-[13px] ${r.ok ? 'text-green-600' : 'text-slate-300'}`}>
                      {r.ok ? 'check_circle' : 'radio_button_unchecked'}
                    </span>
                    <span className={`text-[10px] font-semibold ${r.ok ? 'text-green-700' : 'text-slate-400'}`}>
                      {r.etiqueta}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || success}
              className="w-full bg-purple-900 hover:bg-purple-950 text-white font-bold text-sm py-3.5 rounded-xl shadow-md hover:shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer mt-1"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                  Registrando...
                </>
              ) : (
                <>
                  Crear mi cuenta
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500 font-medium">
              ¿Ya tienes cuenta?{' '}
              <Link to="/" className="text-purple-900 font-bold hover:underline">Inicia sesión</Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
