import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMapConfig } from '../layouts/MainLayout';
import { useAuth } from '../context/AuthContext';
import { buildApiUrl } from '../services/api';

export default function SafeWalkSOS() {
  const navigate = useNavigate();
  const { setMapConfig, defaultMapConfig } = useMapConfig();
  const [isAlertVisible, setIsAlertVisible] = useState(false);
  const [activeSosId, setActiveSosId] = useState(null);
  const [posicionUsuario, setPosicionUsuario] = useState(null);
  const [contactos, setContactos] = useState([]);
  const { user, showToast } = useAuth();

  // Contactos propios, para poder llamarlos con un toque durante la emergencia
  useEffect(() => {
    const cargar = async () => {
      try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const res = await fetch(buildApiUrl('/contactos/me'), {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (json.success) setContactos(json.data);
      } catch (e) {
        console.error('Error cargando contactos de confianza', e);
      }
    };
    cargar();
  }, []);

  useEffect(() => {
    let watchId;
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => setPosicionUsuario([pos.coords.latitude, pos.coords.longitude]),
        () => console.warn("GPS falló en SOS"),
        { enableHighAccuracy: true, maximumAge: 0 }
      );
    }
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
      setMapConfig(defaultMapConfig);
    };
  }, [setMapConfig, defaultMapConfig]);

  useEffect(() => {
    if (posicionUsuario) {
      if (isAlertVisible) {
        setMapConfig({
          centro: posicionUsuario,
          zoom: 18,
          markers: [{ position: posicionUsuario, title: "🚨 SOS ACTIVADO 🚨", desc: "Señal de auxilio en progreso. El personal de seguridad está en camino." }],
          circle: { center: posicionUsuario, radius: 80, color: '#ef4444' }
        });
      } else {
        setMapConfig({
          centro: posicionUsuario,
          zoom: 17,
          markers: [{ position: posicionUsuario, title: "Tu ubicación", desc: "Dispositivo móvil activo." }],
          circle: { center: posicionUsuario, radius: 40, color: '#330071' }
        });
      }
    }
  }, [posicionUsuario, isAlertVisible, setMapConfig]);

  const handleSOS = async () => {
    setIsAlertVisible(true);
    if ("vibrate" in navigator) navigator.vibrate([200, 100, 200, 100, 200]);

    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      // Sin coordenadas el backend rechaza la alerta: una señal de auxilio sin
      // ubicación no le sirve a nadie que tenga que acudir.
      if (!posicionUsuario) {
        showToast('No podemos enviar el SOS sin tu ubicación. Activa el GPS.', 'error');
        setIsAlertVisible(false);
        return;
      }

      // El id del usuario lo resuelve el servidor a partir del token
      const payload = {
        descripcion: "ALERTA SOS ACTIVADA DESDE DISPOSITIVO MÓVIL",
        latitud: posicionUsuario[0],
        longitud: posicionUsuario[1]
      };

      const res = await fetch(buildApiUrl('/reports/sos'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) setActiveSosId(data.data);
    } catch (e) {
      console.error("Error al activar SOS:", e);
    }
  };

  const handleCancelSOS = async () => {
    setIsAlertVisible(false);
    if (activeSosId) {
      try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        await fetch(buildApiUrl(`/reports/sos/${activeSosId}/cancelar`), {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` }
        });
        setActiveSosId(null);
      } catch (e) {
        console.error("Error al cancelar SOS:", e);
      }
    }
  };

  const telefonoLimpio = (n) => (n || '').replace(/[^\d+*#]/g, '');

  return (
    <div className="space-y-6">
      
      {/* Encabezado */}
      <div className="text-center bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-inner">
        <h1 className="text-lg font-black text-red-600 tracking-tight flex items-center justify-center gap-1.5 uppercase">
          <span className="material-symbols-outlined text-[22px] font-bold animate-pulse">emergency</span>
          Botón SOS de Pánico
        </h1>
        <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-wider">
          Acciona una señal de socorro a la central UIDE
        </p>
      </div>

      {/* Botón SOS de Pánico */}
      <div className="flex flex-col items-center justify-center py-4">
        <button 
          onClick={handleSOS}
          className="group relative flex items-center justify-center w-52 h-52 rounded-full bg-red-600 transition-all hover:bg-red-700 active:scale-95 cursor-pointer shadow-xl border-4 border-white ring-8 ring-red-150"
        >
          <div className="absolute inset-0 rounded-full border-4 border-white/20 group-hover:border-white/40 transition-colors animate-ping duration-1000" />
          <div className="flex flex-col items-center text-white">
            <span className="material-symbols-outlined text-5xl mb-2" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
            <span className="text-3xl tracking-tighter uppercase font-extrabold">🚨 AUXILIO</span>
          </div>
        </button>
        <p className="mt-4 text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center">
          Mantén presionado o presiona una vez
        </p>
      </div>

      {/* Llamada directa al 911 */}
      <a
        href="tel:911"
        className="flex items-center justify-center gap-2 w-full bg-red-600 hover:bg-red-700 text-white font-black py-3.5 rounded-2xl shadow-md transition-all active:scale-[0.98] text-sm"
      >
        <span className="material-symbols-outlined text-[20px]">call</span>
        Llamar al 911
      </a>

      {/* Contactos de confianza del propio usuario */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">Contactos de Confianza</h3>
          <button
            onClick={() => navigate('/contactos')}
            className="text-[10px] font-bold text-purple-800 hover:underline cursor-pointer"
          >
            Gestionar
          </button>
        </div>

        {contactos.length === 0 ? (
          <div className="text-center py-4 px-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl">
            <p className="text-[11px] font-semibold text-slate-500">
              No tienes contactos de confianza registrados
            </p>
            <button
              onClick={() => navigate('/contactos')}
              className="text-[10px] font-bold text-purple-800 hover:underline mt-1 cursor-pointer"
            >
              Agregar uno ahora
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {contactos.map((c) => (
              <a
                key={c.id_contacto}
                href={`tel:${telefonoLimpio(c.telefono)}`}
                className="flex items-center justify-between p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl transition-all cursor-pointer group shadow-sm"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Avatar con la inicial, en vez de una foto de archivo */}
                  <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-900 flex items-center justify-center font-black text-sm shrink-0 border border-purple-200">
                    {c.nombre.trim().charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{c.nombre}</p>
                    <p className="text-[10px] font-semibold text-slate-400">{c.telefono}</p>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-green-700 group-hover:bg-green-600 group-hover:text-white transition-all shadow-sm shrink-0">
                  <span className="material-symbols-outlined text-[16px]">call</span>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>

      {/* MODAL DE EMERGENCIA ACTIVO (Overlay sobre el sidebar) */}
      {isAlertVisible && (
        <div className="absolute inset-0 z-50 bg-red-650/95 flex flex-col items-center justify-center text-white p-6 text-center rounded-tr-3xl animate-[fadeIn_0.2s_ease-out]">
          <div className="animate-bounce mb-6">
            <span className="material-symbols-outlined text-7xl font-bold bg-white/10 p-4 rounded-3xl border border-white/20">broadcast_on_personal</span>
          </div>
          <h2 className="text-2xl font-black mb-2 uppercase tracking-wide">SEÑAL ENVIADA</h2>
          <p className="text-xs text-red-100 mb-8 max-w-xs leading-relaxed font-semibold">
            Tus familiares han sido alertados y la central de seguridad de la UIDE ha recibido tus coordenadas en tiempo real.
          </p>
          <button 
            onClick={handleCancelSOS}
            className="bg-white text-red-650 px-8 py-3.5 rounded-xl shadow-xl active:scale-95 transition-all text-xs uppercase tracking-wider font-extrabold cursor-pointer hover:bg-red-50"
          >
            CANCELAR SEÑAL
          </button>
        </div>
      )}

    </div>
  );
}