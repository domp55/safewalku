-- ============================================================================
-- Migración 001 — Zonas de seguridad
--
-- Crea la base sobre la que trabaja el motor de rutas: las zonas geográficas
-- clasificadas por nivel de riesgo, la caché de trazados y el historial de uso.
--
-- Compatible con MariaDB 10.4+ (XAMPP) y MySQL 8. Se evitan a propósito las
-- collations utf8mb4_0900_* porque MariaDB no las reconoce.
--
-- Ejecutar una sola vez:  mysql -u root safewalku < 001_zonas_seguridad.sql
-- ============================================================================

USE `safewalku`;

-- ----------------------------------------------------------------------------
-- zona_seguridad — núcleo del cálculo de riesgo
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `zona_seguridad` (
  `id_zona`         INT NOT NULL AUTO_INCREMENT,
  `nombre`          VARCHAR(120)  NOT NULL,
  `descripcion`     VARCHAR(255)  DEFAULT NULL,
  `sector`          VARCHAR(100)  DEFAULT NULL,
  `ciudad`          VARCHAR(100)  NOT NULL DEFAULT 'Loja',
  `nivel`           ENUM('SEGURA','REGULAR','INSEGURA') NOT NULL,

  -- Peso que aporta al índice de riesgo de una ruta que la atraviesa.
  -- Referencia: SEGURA = 1, REGULAR = 4, INSEGURA = 10.
  `peso_riesgo`     DECIMAL(4,2)  NOT NULL DEFAULT 4.00,

  -- Modelamos las zonas como círculos (centro + radio) en lugar de polígonos.
  -- Es menos preciso, pero permite resolver "¿este punto está dentro?" con una
  -- distancia haversine, sin extensiones geoespaciales ni dependencias extra.
  `centro_lat`      DECIMAL(10,8) NOT NULL,
  `centro_lng`      DECIMAL(11,8) NOT NULL,
  `radio_metros`    INT           NOT NULL DEFAULT 250,

  -- Permite que una zona sea tranquila de día y peligrosa de noche.
  `franja_horaria`  ENUM('DIURNO','NOCTURNO','AMBOS') NOT NULL DEFAULT 'AMBOS',
  `factor_nocturno` DECIMAL(3,2)  NOT NULL DEFAULT 1.00,

  `fuente`          VARCHAR(120)  DEFAULT NULL,
  `estado`          ENUM('ACTIVO','INACTIVO') NOT NULL DEFAULT 'ACTIVO',
  `creado_por`      INT           DEFAULT NULL,
  `fecha_creacion`  DATETIME      DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` DATETIME  DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id_zona`),
  KEY `idx_zona_nivel` (`nivel`, `estado`),
  KEY `idx_zona_geo` (`centro_lat`, `centro_lng`),
  KEY `idx_zona_ciudad` (`ciudad`, `estado`),
  CONSTRAINT `zona_fk_admin` FOREIGN KEY (`creado_por`) REFERENCES `usuario` (`id_usuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ----------------------------------------------------------------------------
-- ruta_calculada — caché de trazados
--
-- OSRM y Nominatim son servicios públicos gratuitos con límite de peticiones.
-- Guardar la respuesta evita saturarlos y hace que la demo responda al instante
-- cuando se repite una consulta.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `ruta_calculada` (
  `id_calculo`     INT NOT NULL AUTO_INCREMENT,
  `hash_consulta`  CHAR(64) NOT NULL,   -- sha256(origen|destino|modo|franja)
  `respuesta_json` LONGTEXT NOT NULL,
  `fecha_calculo`  DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_calculo`),
  UNIQUE KEY `uq_hash_consulta` (`hash_consulta`),
  KEY `idx_fecha_calculo` (`fecha_calculo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ----------------------------------------------------------------------------
-- ruta_historial — qué rutas se consultan y cuáles se eligen
-- Alimenta las estadísticas del panel del administrador.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `ruta_historial` (
  `id_historial`  INT NOT NULL AUTO_INCREMENT,
  `id_usuario`    INT NOT NULL,
  `origen_lat`    DECIMAL(10,8) NOT NULL,
  `origen_lng`    DECIMAL(11,8) NOT NULL,
  `destino_lat`   DECIMAL(10,8) NOT NULL,
  `destino_lng`   DECIMAL(11,8) NOT NULL,
  `clasificacion_elegida` ENUM('SEGURA','REGULAR','INSEGURA') NOT NULL,
  `indice_riesgo` DECIMAL(5,2) NOT NULL,
  `fecha`         DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_historial`),
  KEY `idx_hist_usuario` (`id_usuario`),
  KEY `idx_hist_fecha` (`fecha`),
  CONSTRAINT `hist_fk_user` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ----------------------------------------------------------------------------
-- calle_segmento — faltaba en schema.sql
--
-- route.repository.poblarCalles() ya inserta en esta tabla, pero nunca se
-- incluyó en el esquema, así que la función fallaba con "table doesn't exist".
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `calle_segmento` (
  `id_segmento`     INT NOT NULL AUTO_INCREMENT,
  `id_ubicacion`    INT NOT NULL,
  `nivel_seguridad` ENUM('BAJO','MEDIO','ALTO') NOT NULL,
  `coordenadas`     LONGTEXT NOT NULL,
  PRIMARY KEY (`id_segmento`),
  KEY `idx_calle_ubicacion` (`id_ubicacion`),
  CONSTRAINT `calle_fk_ubi` FOREIGN KEY (`id_ubicacion`) REFERENCES `ubicacion` (`id_ubicacion`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ----------------------------------------------------------------------------
-- Campos nuevos en tablas existentes
--
-- Estos ALTER no son idempotentes: si la migración ya se aplicó, fallan con
-- "Duplicate column name". Es esperado, se ejecutan una sola vez.
-- ----------------------------------------------------------------------------

-- La categoría del incidente hoy se pierde: el frontend la recoge pero no se
-- persiste. La necesitamos para el mapa de calor y para ponderar el riesgo.
ALTER TABLE `reporte`
  ADD COLUMN `categoria` ENUM('ROBO','ACOSO','ACTIVIDAD_SOSPECHOSA','ILUMINACION',
                              'ACCIDENTE','VIOLENCIA','OTRO')
      NOT NULL DEFAULT 'OTRO' AFTER `descripcion`,
  ADD COLUMN `es_anonimo` TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN `observacion_admin` VARCHAR(255) DEFAULT NULL;

-- Datos del perfil que hoy están escritos a mano en PerfilEstudiante.jsx
ALTER TABLE `usuario`
  ADD COLUMN `telefono`  VARCHAR(20)  DEFAULT NULL,
  ADD COLUMN `carrera`   VARCHAR(100) DEFAULT NULL,
  ADD COLUMN `matricula` VARCHAR(30)  DEFAULT NULL;
