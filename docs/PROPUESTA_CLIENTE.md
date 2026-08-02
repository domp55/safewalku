# SafeWalk U — Propuesta de Trabajo

**Preparado por:** Diego López Saquicela
**Fecha:** 31 de julio de 2026
**Validez:** 15 días

---

## 1. Qué se va a implementar

### 🗺️ Rutas con tres niveles de seguridad
- Detección de la ubicación actual por GPS.
- Selección de **origen y destino** de tres formas: GPS, buscando la dirección, o tocando el mapa.
- Cálculo de **3 rutas reales por las calles de Loja** para cada trayecto:
  - 🟢 **Segura** — la de menor riesgo
  - 🟡 **Regular** — equilibrio entre distancia y riesgo
  - 🔴 **Insegura** — la más corta, con advertencias visibles
- Cada ruta muestra distancia, tiempo caminando, índice de riesgo (0–100) y las zonas que atraviesa.
- Las 3 rutas se dibujan sobre el mapa; al elegir una, se resalta.

### 📍 Modelo de zonas de seguridad de Loja
- **24 zonas cargadas** en la base de datos, clasificadas como segura, regular o insegura
  (Centro Histórico, Jipiro, Terminal Terrestre, Punzara, Motupe, La Tebaida, Vía a Zamora, entre otras).
- Zonas con **riesgo nocturno**: la misma ruta cambia de clasificación según la hora del día.
- El cálculo de riesgo combina: zonas registradas + reportes validados de los estudiantes + hora.

### ⚠️ Reporte de incidentes
- El usuario **elige en el mapa el punto exacto** donde ocurrió el hecho (GPS, búsqueda o toque).
- Categorías: robo, acoso, violencia, actividad sospechosa, iluminación deficiente, accidente.
- Descripción, foto adjunta opcional y opción de reporte anónimo.
- El reporte se guarda en el servidor y, una vez validado, **modifica las rutas de todos los usuarios**.

### 📞 Emergencias desde el celular
- Los botones de la pestaña de apoyo **marcan de verdad** el número: ECU 911, UPC Jipiro,
  Bomberos, Hospital Isidro Ayora y Cruz Roja.
- Botón SOS que envía la **ubicación real** del estudiante al administrador.
- Cada estudiante puede registrar sus contactos de emergencia personales.

### 🛠️ Panel del administrador
- **Gestión de zonas de seguridad**: crear, editar y desactivar zonas con su nivel, radio y franja
  horaria. Es el módulo que mantiene el criterio de las rutas.
- **Gestión de usuarios**: listado real desde la base de datos, búsqueda, filtro por rol, crear,
  editar, activar y desactivar. *(Hoy son 4 usuarios de ejemplo escritos en el código.)*
- **Historial de reportes y alertas**: datos reales con filtros por tipo, estado y fecha.
  *(Hoy son 6 alertas fijas.)*
- **Dashboard**: gráficos con datos reales de la base de datos. *(Hoy el gráfico tiene porcentajes
  fijos y el "mapa en tiempo real" es una imagen.)*

### 📱 Uso en celular
- Toda la aplicación ajustada a pantalla de teléfono.
- **HTTPS configurado** — requisito obligatorio para que el GPS funcione en el navegador del celular.

---

## 2. Qué se entrega

| | Entregable |
|:--:|---|
| 1 | **Aplicación funcionando y desplegada en AWS**, accesible desde cualquier navegador con una dirección `https://` |
| 2 | Base de datos en el servidor, con las 24 zonas y datos de prueba cargados |
| 3 | Código fuente completo en el repositorio |
| 4 | Usuarios de prueba: uno de estudiante y uno de administrador, listos para la presentación |
| 5 | Guía de 1 página con las credenciales, la dirección de la app y cómo reiniciar el servidor |

---

## 3. Precio

| | |
|---|---:|
| Desarrollo de todo lo listado en el punto 1 | $ 100,00 |
| Despliegue en AWS con HTTPS y dominio funcionando | $ 50,00 |
| **TOTAL** | **$ 150,00** |

**Forma de pago:** 50 % al iniciar · 50 % contra entrega funcionando.
**Plazo:** 3 días desde el anticipo.
**Garantía:** 15 días de corrección de errores sin costo.

---

## 4. No incluye

- **Costos de AWS.** Con cuenta nueva la capa gratuita cubre 12 meses; de lo contrario son
  $ 10–20 mensuales, a cargo del cliente.
- Aplicación nativa para iOS o Android (es una aplicación web que se abre desde el navegador).
- Levantamiento de datos reales de criminalidad en campo.
- Integración con sistemas oficiales de la Policía Nacional o el ECU 911.
- Cambios de alcance pedidos después de aprobado este documento.

---

## 5. Nota sobre los datos de zonas

Las clasificaciones de zonas seguras, regulares e inseguras son **datos simulados**, creados para que
el sistema funcione y sea demostrable. **No provienen de la Policía Nacional ni del ECU 911** y así
quedan marcados dentro del sistema.

El módulo de gestión de zonas del administrador permite reemplazarlos por datos oficiales cuando
existan, sin tocar el código.
