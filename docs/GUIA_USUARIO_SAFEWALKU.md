# 📖 Manual de Usuario y Guía Completa de Funcionalidades — SafeWalk U

> **SafeWalk U** es una aplicación web de movilidad segura (PWA) diseñada para fortalecer la protección de los estudiantes de la **Universidad Internacional del Ecuador (UIDE, Extensión Loja)** al desplazarse a pie por la ciudad.

---

## 📌 Índice de Contenidos
1. [Visión General del Sistema](#1-visión-general-del-sistema)
2. [Acceso al Sistema y Roles](#2-acceso-al-sistema-y-roles)
3. [Guía para Estudiantes (Módulo de Navegación y Seguridad)](#3-guía-para-estudiantes-módulo-de-navegación-y-seguridad)
   - [3.1. Navegación Inteligente y Cálculo de 3 Rutas](#31-navegación-inteligente-y-cálculo-de-3-rutas)
   - [3.2. Selección de Origen y Destino](#32-selección-de-origen-y-destino)
   - [3.3. Reporte de Incidentes Geolocalizados](#33-reporte-de-incidentes-geolocalizados)
   - [3.4. Botón SOS de Pánico y Red de Apoyo](#34-botón-sos-de-pánico-y-red-de-apoyo)
   - [3.5. Llamadas Telefónicas de Emergencia](#35-llamadas-telefónicas-de-emergencia)
   - [3.6. Perfil de Estudiante y Rutas Favoritas](#36-perfil-de-estudiante-y-rutas-favoritas)
4. [Guía para Administradores (Panel de Control y Gestión)](#4-guía-para-administradores-panel-de-control-y-gestión)
   - [4.1. Dashboard y Analítica en Vivo](#41-dashboard-y-analítica-en-vivo)
   - [4.2. Moderación de Reportes Ciudadanos](#42-moderación-de-reportes-ciudadanos)
   - [4.3. Gestión de Zonas de Seguridad de Loja](#43-gestión-de-zonas-de-seguridad-de-loja)
   - [4.4. Control de Usuarios y Suspensión de Cuentas](#44-control-de-usuarios-y-suspensión-de-cuentas)
   - [4.5. Centro de Notificaciones y Alertas SOS](#45-centro-de-notificaciones-y-alertas-sos)
5. [Funcionamiento Interno del Motor de Riesgo](#5-funcionamiento-interno-del-motor-de-riesgo)
6. [Preguntas Frecuentes (FAQ)](#6-preguntas-frecuentes-faq)

---

## 1. Visión General del Sistema

A diferencia de las aplicaciones de navegación convencionales (como Google Maps o Waze) que priorizan exclusivamente la velocidad o la distancia corta, **SafeWalk U introduce una capa de evaluación de riesgo urbano en tiempo real**.

### Concepto Clave
> *"Como Google Maps, pero en lugar de mostrarte únicamente la ruta más rápida, calcula y resalta la ruta más segura para ti según la hora y los antecedentes de la ciudad."*

---

## 2. Acceso al Sistema y Roles

SafeWalk U es accesible desde cualquier navegador web en computadora, tablet o teléfono celular (optimizado como Progressive Web App sobre contexto seguro HTTPS para el uso de GPS).

### Tipos de Cuenta
- 🎓 **Estudiante / Usuario General:** Accede a las herramientas de navegación, reporte de incidentes, llamadas de apoyo y activación del botón SOS.
- 🛡️ **Administrador / Moderador:** Accede al panel de control integral para validar reportes, administrar usuarios, supervisar alertas SOS y ajustar las zonas de riesgo de Loja.

---

## 3. Guía para Estudiantes (Módulo de Navegación y Seguridad)

### 3.1. Navegación Inteligente y Cálculo de 3 Rutas
Al ingresar el punto de partida y el destino, SafeWalk U procesa las calles de Loja y genera **tres alternativas simultáneas**, clasificadas con un código visual intuitivo:

1. 🟢 **Ruta Segura (Recomendada):**
   - Transita prioritariamente por avenidas principales, zonas bien iluminadas y áreas con bajo historial de incidentes.
   - Muestra el menor Índice de Riesgo acumulado.
2. 🟡 **Ruta Regular (Equilibrada):**
   - Representa un balance intermedio entre distancia, tiempo a pie y riesgo moderado.
3. 🔴 **Ruta Insegura (Advertencia):**
   - Corresponde a la trayectoria más directa o corta, pero atraviesa sectores clasificados de alto riesgo o con reportes recientes. Muestra avisos de precaución visibles en pantalla.

#### Métricas Visibles en Cada Ruta:
- **Distancia:** Medida exacta en kilómetros o metros.
- **Tiempo estimado a pie:** Calculado a una velocidad promedio de caminata.
- **Índice de Riesgo (Escala 0 a 100):** Donde **0 es riesgo mínimo** y **100 es riesgo crítico**.
- **Zonas Transitadas:** Listado de los barrios o sectores de Loja que cruza el trayecto.

---

### 3.2. Selección de Origen y Destino
El estudiante dispone de **tres métodos flexibles** para establecer su trayecto:

- **Opción A (Ubicación por GPS):** Presiona el botón *"Mi ubicación actual"* para fijar el origen automáticamente mediante el GPS del dispositivo.
- **Opción B (Buscador Inteligente):** Escribe el nombre de la calle, barrio o punto de interés (ej. *Campus UIDE, Jipiro, Terminal Terrestre, Parque Central*).
- **Opción C (Toque Directo en Mapa):** Toca cualquier punto sobre el mapa interactivo y selecciona en el menú contextual si ese punto será el **Origen** o el **Destino**. Los marcadores se pueden arrastrar libremente para ajustar la posición exacta. *(Funciona perfectamente sin GPS activo).*

---

### 3.3. Reporte de Incidentes Geolocalizados
La seguridad se fortalece con el aporte colaborativo de los propios estudiantes. Si presencias o sufres un percance:

1. **Ubica el punto en el mapa:** Toca la ubicación exacta del hecho.
2. **Selecciona la Categoría:**
   - 🚨 *Robo / Asalto*
   - ⚠️ *Acoso / Hostigamiento*
   - 👊 *Violencia*
   - 👁️ *Actividad Sospechosa*
   - 💡 *Iluminación Deficiente*
   - 🚗 *Accidente de Tránsito*
   - ❓ *Otro*
3. **Detalles del Reporte:** Escribe una breve descripción de lo sucedido.
4. **Adjuntar Evidencia (Opcional):** Sube una fotografía tomándola al instante o desde la galería del celular.
5. **Modo Anónimo:** Marca la casilla *"Enviar de forma anónima"* si prefieres no vincular tu nombre al reporte.
6. **Estado del Reporte:** El reporte pasará a estado *Pendiente* hasta que un Administrador lo revise y lo **Valide**, momento en el cual actualizará automáticamente las rutas de todos los estudiantes.

---

### 3.4. Botón SOS de Pánico y Red de Apoyo
En situaciones de riesgo inminente, el estudiante cuenta con herramientas de auxilio inmediato:

- 🆘 **Botón de Pánico SOS:**
  - Ubicado de forma prominente en la interfaz.
  - Al presionarlo, emite una **alerta prioritaria e instantánea** al panel del administrador transmitiendo las coordenadas GPS en tiempo real del estudiante.
- 👨‍👩‍👧 **Contactos Personales de Emergencia:**
  - El estudiante puede registrar números de confianza (padres, hermanos, pareja, amigos).
  - Permite enviarles alertas o realizar llamadas rápidas desde la app.

---

### 3.5. Llamadas Telefónicas de Emergencia
Desde la pestaña de Apoyo / Emergencias, la aplicación integra botones de **marcado telefónico directo** que abren la app de llamadas del teléfono:

- 🚑 **ECU 911** (Línea Única de Emergencias)
- 👮 **Policía Nacional** (`101`)
- 🚒 **Cuerpo de Bomberos** (`102`)
- 🏥 **Cruz Roja Ecuatoriana** (`131`)
- 🏢 **UPC Jipiro** (Unidad de Policía Comunitaria cercana)
- 🏥 **Hospital Isidro Ayora**

---

### 3.6. Perfil de Estudiante y Rutas Favoritas
- **Perfil Personal:** Edición de datos personales, avatar, correo y cambio de contraseña.
- **Mis Reportes:** Historial privado de los incidentes que el estudiante ha registrado y el estado en el que se encuentran.
- **Rutas Guardadas:** Posibilidad de almacenar trayectos frecuentes (ej. *Casa ↔ Universidad*) para iniciarlos con un solo clic.

---

## 4. Guía para Administradores (Panel de Control y Gestión)

El perfil de **Administrador** le otorga al personal autorizado el control total sobre la seguridad y los datos de la plataforma.

### 4.1. Dashboard y Analítica en Vivo
- **Métricas Globales:** Total de usuarios registrados, cantidad de reportes validados/pendientes y alertas SOS recibidas.
- **Gráficos Estadísticos:** Distribución de incidentes por categoría, mapas de calor y volumen de alertas por franja horaria.
- **Monitor en Tiempo Real:** Vista interactiva de la actividad reciente en la ciudad de Loja.

---

### 4.2. Moderación de Reportes Ciudadanos
Para evitar información falsa o mal intencionada, todo reporte ingresado por la comunidad pasa por la bandeja de moderación:

- **Bandeja de Entrada:** Muestra los reportes clasificados con fecha, tipo, foto adjunta y coordenadas.
- **Acciones Disponibles:**
  - ✅ **Validar:** Aprueba el reporte. Al validarlo, el motor de cálculo incrementa el riesgo de esa zona y recalcula las rutas de la comunidad.
  - ❌ **Rechazar:** Descarta el reporte por inconsistente o falso.
  - 🔄 **Marcar como Duplicado:** Asocia el reporte a otro evento idéntico reportado anteriormente.

---

### 4.3. Gestión de Zonas de Seguridad de Loja (CRUD)
El administrador gestiona el mapa base de **24 zonas de Loja** (Centro Histórico, Jipiro, Terminal Terrestre, Motupe, La Tebaida, Vía a Zamora, Punzara, etc.):

- **Crear Nueva Zona:** Define el nombre, coordenadas centrales y radio de cobertura en metros.
- **Asignación de Nivel Base:** Establece si la zona es originalmente 🟢 *Segura*, 🟡 *Regular* o 🔴 *Insegura*.
- **Configuración de Riesgo Nocturno:** Ajusta qué zonas incrementan automáticamente su peligrosidad al caer la noche.
- **Editar / Desactivar Zonas:** Modifica o inhabilita sectores temporalmente sin afectar la base de datos.

---

### 4.4. Control de Usuarios y Suspensión de Cuentas
- **Directorio de Usuarios:** Búsqueda y filtrado de la base de datos por rol (*Estudiante* / *Administrador*).
- **Creación de Administradores:** Asignación de nuevos roles administrativos.
- **Edición y Mantenimiento:** Modificación de información de usuario.
- **Gestión de Estado (Activo / Inactivo):** Inactivación o suspensión de cuentas en caso de detectar mal uso del sistema (reportes falsos reiterados o uso indebido de botones SOS).

---

### 4.5. Centro de Notificaciones y Alertas SOS
- **Campana de Alertas en Cabecera:** Indicador visual en tiempo real que notifica la llegada de una nueva alerta de pánico SOS o un incidente crítico.
- **Historial de Alertas SOS:** Registro auditable con fecha, hora, estudiante emisor y ubicación GPS exacta para coordinación con las autoridades de seguridad del campus.

---

## 5. Funcionamiento Interno del Motor de Riesgo

El aspecto diferenciador de SafeWalk U es su **Motor Dinámico de Cálculo de Riesgo**, el cual evalúa los trayectos combinando tres variables:

```
    ┌─────────────────────────┐    ┌─────────────────────────┐    ┌─────────────────────────┐
    │   Zonas de Seguridad    │    │  Reportes Validados por │    │      Factor Horario     │
    │   (24 sectores de Loja) │ +  │      la Comunidad       │ +  │   (Día vs. Franja Noche │
    │   con riesgo base       │    │  (decay en 90 días)     │    │      18:00 a 06:00)     │
    └─────────────────────────┘    └─────────────────────────┘    └─────────────────────────┘
                                                │
                                                ▼
                                  ┌───────────────────────────┐
                                  │ MOTOR DE CÁLCULO DE RIESGO│
                                  │ (Muestreo cada 30 metros) │
                                  └───────────────────────────┘
                                                │
                                                ▼
                                    🟢 SEGURA   🟡 REGULAR   🔴 INSEGURA
```

### Principios Fundamentales:
- **Muestreo Espacial de Precisión:** La app no calcula el riesgo de forma global, sino que analiza la ruta trazada tomando puntos cada **30 metros**.
- **Aprendizaje Comunitario:** A mayor número de reportes validados, más preciso se vuelve el cálculo para todos los usuarios.
- **Decaimiento Temporal (90 días):** Los reportes no quedan permanentes para siempre; pierden peso progresivamente con el tiempo para reflejar la realidad actual de la calle.
- **Sensibilidad Nocturna:** El mismo trayecto incrementa su puntaje de riesgo durante la franja nocturna (18:00 a 06:00). Ejemplo: En el trayecto *Campus UIDE ↔ Centro Histórico*, la ruta segura pasa de un índice de **10 (Día)** a **19 (Noche)**, mientras que la ruta insegura escala de **19 (Día)** a **39 (Noche)**.

---

## 6. Preguntas Frecuentes (FAQ)

### ¿Necesito tener el GPS encendido para usar la app?
> **No necesariamente.** Puedes ingresar tu origen y destino escribiendo en el buscador o tocando directamente en el mapa. El GPS solo es necesario para la detección automática y para emitir alertas SOS con tu posición exacta.

### ¿Si hago un reporte anónimo, otros estudiantes sabrán quién soy?
> **No.** Los reportes marcados como anónimos no muestran el nombre ni la foto del estudiante en la plataforma ni para otros usuarios.

### ¿Las zonas de seguridad provienen de la Policía Nacional?
> **Nota de demostración:** Las clasificaciones de zonas seguras, regulares e inseguras precargadas corresponden a datos simulados con fines académicos y de demostración. El panel administrativo permite a la universidad actualizar estas zonas con datos oficiales en el futuro.

---

*SafeWalk U — Movilidad segura para la comunidad universitaria.*
