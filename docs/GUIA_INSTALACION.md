# 🚀 Guía de Instalación y Ejecución Local — SafeWalk U

Esta guía contiene los pasos exactos para que cualquier compañero clone y ejecute **SafeWalk U** desde cero en su computadora usando **XAMPP (MySQL)** y **Node.js**.

---

## 🛠️ Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:
1. **Node.js** (versión 18 o superior) — [Descargar Node.js](https://nodejs.org/)
2. **XAMPP** (con el módulo MySQL/MariaDB) — [Descargar XAMPP](https://www.apachefriends.org/)
3. **Git** — [Descargar Git](https://git-scm.com/)

---

## 📥 Paso 1: Clonar el Repositorio

Abre una terminal (PowerShell o Git Bash) y ejecuta:

```bash
git clone https://github.com/domp55/safewalku.git
cd safewalku
```

---

## 🗄️ Paso 2: Configurar la Base de Datos en XAMPP

1. Abre **XAMPP Control Panel** e inicia los módulos **Apache** y **MySQL** presionando **Start**.
2. Abre tu navegador e ingresa a phpMyAdmin:
   👉 **`http://localhost/phpmyadmin`**
3. En la pestaña izquierda, haz clic en **Nueva** para crear la base de datos:
   - **Nombre de la base de datos:** `safewalku`
   - **Cotejamiento:** `utf8mb4_general_ci`
   - Haz clic en **Crear**.
4. Haz clic sobre la base de datos `safewalku` recién creada, ve a la pestaña **Importar** (o **SQL**) e importa los scripts ubicados en la carpeta `backend/db/` en este orden estricto:

   - **1º Importar:** `backend/db/schema_mariadb.sql` *(crea la estructura de tablas)*
   - **2º Importar:** `backend/db/seed.sql` *(crea el usuario Admin único y la estructura)*
   - **3º Importar:** `backend/db/seed_zonas.sql` *(carga las 24 zonas de seguridad de Loja)*

---

## ⚙️ Paso 3: Instalar Dependencias

Debes instalar las dependencias tanto en el **Backend** como en el **Frontend**.

### 1. Dependencias del Backend:
```bash
cd backend
npm install
```

### 2. Dependencias del Frontend (en la raíz del proyecto):
Vuelve a la carpeta raíz del proyecto y ejecuta:
```bash
cd ..
npm install
```

---

## 🔑 Paso 4: Verificar las Variables de Entorno del Backend

Verifica que dentro de la carpeta `backend/` exista el archivo `.env`. Si no existe, créalo con este contenido:

```env
PORT=3000

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=safewalku

JWT_SECRET=SafeWalk2026
JWT_EXPIRES=2h

CORS_ORIGIN=https://localhost:5173,http://localhost:5173,https://localhost:5174,http://localhost:5174
```

---

## 🏃 Paso 5: Ejecutar la Aplicación

Necesitarás abrir **dos terminales abiertas al mismo tiempo**:

### 💻 Terminal 1: Iniciar el Backend (Servidor API)
```bash
cd backend
npm run dev
```
*(Verás el mensaje: `Servidor corriendo en http://localhost:3000`)*

### 💻 Terminal 2: Iniciar el Frontend (Aplicación Web)
En la carpeta raíz del proyecto:
```bash
npm run dev
```
*(Verás el mensaje con el enlace: `https://localhost:5173/` o `https://localhost:5174/`)*

---

## 🔐 Paso 6: Iniciar Sesión en SafeWalk U

1. Abre tu navegador e ingresa a la dirección del Frontend (ej. `https://localhost:5173` o `https://localhost:5174`).
2. *Nota sobre la advertencia del navegador:* Como utiliza HTTPS local para habilitar el GPS, el navegador podría mostrar una advertencia de certificado local. Simplemente haz clic en **"Configuración avanzada"** -> **"Continuar a localhost (no seguro)"**.
3. Ingresa con las credenciales del Administrador:

| Campo | Valor |
|---|---|
| **Correo Electrónico** | `almorochogr@uide.edu.ec` |
| **Contraseña** | `morocho` |
| **Rol** | Administrador |

---

## 🛠️ Comprobaciones Rápidas / Solución de Problemas

- **Documentación Swagger de la API:** Accedible en `http://localhost:3000/api-docs`
- **Error `ECONNREFUSED 3306`:** Asegúrate de que el botón **Start** de MySQL en XAMPP esté en verde.
- **Acceso a la app de estudiante:** Puedes hacer clic en *"Registrarse"* en la pantalla de inicio para crear un nuevo usuario estudiante de prueba.
