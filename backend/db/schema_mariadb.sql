CREATE DATABASE IF NOT EXISTS `safewalku` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `safewalku`;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table: usuario (debe ir primero, es referenciada por otras)
-- ----------------------------
DROP TABLE IF EXISTS `usuario`;
CREATE TABLE `usuario` (
  `id_usuario` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `apellido` varchar(100) NOT NULL,
  `cedula` varchar(10) DEFAULT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `carrera` varchar(100) DEFAULT NULL,
  `correo` varchar(100) NOT NULL,
  `contrasena` varchar(255) NOT NULL,
  `foto_perfil` varchar(255) DEFAULT NULL,
  `rol` enum('ESTUDIANTE','ADMINISTRADOR') NOT NULL,
  `fecha_registro` datetime DEFAULT CURRENT_TIMESTAMP,
  `estado` enum('ACTIVO','INACTIVO','BANEADO') NOT NULL DEFAULT 'ACTIVO',
  `motivo_baneo` varchar(255) DEFAULT NULL,
  `fecha_baneo` datetime DEFAULT NULL,
  `baneado_por` int DEFAULT NULL,
  PRIMARY KEY (`id_usuario`),
  UNIQUE KEY `correo` (`correo`),
  UNIQUE KEY `uq_usuario_cedula` (`cedula`),
  KEY `fk_usuario_baneado_por` (`baneado_por`),
  CONSTRAINT `usuario_fk_baneado_por` FOREIGN KEY (`baneado_por`) REFERENCES `usuario` (`id_usuario`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ----------------------------
-- Table: administrador
-- ----------------------------
DROP TABLE IF EXISTS `administrador`;
CREATE TABLE `administrador` (
  `id_administrador` int NOT NULL AUTO_INCREMENT,
  `id_usuario` int NOT NULL,
  `cargo` varchar(100) NOT NULL,
  `fecha_asignacion` date NOT NULL,
  PRIMARY KEY (`id_administrador`),
  UNIQUE KEY `id_usuario` (`id_usuario`),
  CONSTRAINT `administrador_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ----------------------------
-- Table: ubicacion
-- ----------------------------
DROP TABLE IF EXISTS `ubicacion`;
CREATE TABLE `ubicacion` (
  `id_ubicacion` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `direccion` varchar(255) NOT NULL,
  `ciudad` varchar(100) NOT NULL DEFAULT 'Loja',
  `radio_metros` int NOT NULL DEFAULT 50,
  `tipo_zona` enum('UNIVERSIDAD','CALLE','PARQUE','BARRIO','PARADERO','LUGAR_SEGURO','SERVICIO_EMERGENCIA') NOT NULL,
  PRIMARY KEY (`id_ubicacion`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ----------------------------
-- Table: coordenada
-- ----------------------------
DROP TABLE IF EXISTS `coordenada`;
CREATE TABLE `coordenada` (
  `id_coordenada` int NOT NULL AUTO_INCREMENT,
  `latitud` decimal(10,8) NOT NULL,
  `longitud` decimal(11,8) NOT NULL,
  `id_ubicacion` int NOT NULL,
  PRIMARY KEY (`id_coordenada`),
  UNIQUE KEY `id_ubicacion` (`id_ubicacion`),
  CONSTRAINT `coordenada_ibfk_1` FOREIGN KEY (`id_ubicacion`) REFERENCES `ubicacion` (`id_ubicacion`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ----------------------------
-- Table: contactoemergencia
-- ----------------------------
DROP TABLE IF EXISTS `contactoemergencia`;
CREATE TABLE `contactoemergencia` (
  `id_contacto` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `telefono` varchar(20) NOT NULL,
  `parentesco` enum('PADRE','MADRE','HERMANO','HERMANA','AMIGO','PAREJA','OTRO') NOT NULL,
  `id_usuario` int NOT NULL,
  PRIMARY KEY (`id_contacto`),
  KEY `id_usuario` (`id_usuario`),
  CONSTRAINT `contactoemergencia_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ----------------------------
-- Table: compartirubicacion
-- ----------------------------
DROP TABLE IF EXISTS `compartirubicacion`;
CREATE TABLE `compartirubicacion` (
  `id_compartir` int NOT NULL AUTO_INCREMENT,
  `fecha_inicio` datetime NOT NULL,
  `fecha_fin` datetime DEFAULT NULL,
  `estado` enum('ACTIVO','FINALIZADO') NOT NULL DEFAULT 'ACTIVO',
  `id_usuario` int NOT NULL,
  `id_contacto` int NOT NULL,
  PRIMARY KEY (`id_compartir`),
  KEY `id_usuario` (`id_usuario`),
  KEY `id_contacto` (`id_contacto`),
  CONSTRAINT `compartirubicacion_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`),
  CONSTRAINT `compartirubicacion_ibfk_2` FOREIGN KEY (`id_contacto`) REFERENCES `contactoemergencia` (`id_contacto`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ----------------------------
-- Table: reporte
-- ----------------------------
DROP TABLE IF EXISTS `reporte`;
CREATE TABLE `reporte` (
  `id_reporte` int NOT NULL AUTO_INCREMENT,
  `descripcion` text NOT NULL,
  `fecha_reporte` datetime DEFAULT CURRENT_TIMESTAMP,
  `nivel_riesgo` enum('BAJO','MEDIO','ALTO') NOT NULL,
  `estado` enum('PENDIENTE','VALIDADO','RECHAZADO','DUPLICADO') NOT NULL DEFAULT 'PENDIENTE',
  `tipo_reporte` enum('INCIDENTE','SOS_PANICO') NOT NULL DEFAULT 'INCIDENTE',
  `id_usuario` int NOT NULL,
  `id_ubicacion` int NOT NULL,
  `id_administrador` int DEFAULT NULL,
  `estado_registro` enum('ACTIVO','INACTIVO') DEFAULT 'ACTIVO',
  PRIMARY KEY (`id_reporte`),
  KEY `id_usuario` (`id_usuario`),
  KEY `id_ubicacion` (`id_ubicacion`),
  KEY `id_administrador` (`id_administrador`),
  CONSTRAINT `reporte_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`),
  CONSTRAINT `reporte_ibfk_2` FOREIGN KEY (`id_ubicacion`) REFERENCES `ubicacion` (`id_ubicacion`),
  CONSTRAINT `reporte_ibfk_3` FOREIGN KEY (`id_administrador`) REFERENCES `administrador` (`id_administrador`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ----------------------------
-- Table: evidencia
-- ----------------------------
DROP TABLE IF EXISTS `evidencia`;
CREATE TABLE `evidencia` (
  `id_evidencia` int NOT NULL AUTO_INCREMENT,
  `url_archivo` varchar(255) NOT NULL,
  `tipo_archivo` enum('IMAGEN','VIDEO') NOT NULL,
  `id_reporte` int NOT NULL,
  PRIMARY KEY (`id_evidencia`),
  KEY `id_reporte` (`id_reporte`),
  CONSTRAINT `evidencia_ibfk_1` FOREIGN KEY (`id_reporte`) REFERENCES `reporte` (`id_reporte`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ----------------------------
-- Table: lugarseguro
-- ----------------------------
DROP TABLE IF EXISTS `lugarseguro`;
CREATE TABLE `lugarseguro` (
  `id_lugar_seguro` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `id_ubicacion` int NOT NULL,
  PRIMARY KEY (`id_lugar_seguro`),
  KEY `id_ubicacion` (`id_ubicacion`),
  CONSTRAINT `lugarseguro_ibfk_1` FOREIGN KEY (`id_ubicacion`) REFERENCES `ubicacion` (`id_ubicacion`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ----------------------------
-- Table: ruta
-- ----------------------------
DROP TABLE IF EXISTS `ruta`;
CREATE TABLE `ruta` (
  `id_ruta` int NOT NULL AUTO_INCREMENT,
  `nombre_ruta` varchar(100) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `nivel_seguridad` enum('BAJO','MEDIO','ALTO') NOT NULL,
  `tiempo_estimado` int NOT NULL,
  PRIMARY KEY (`id_ruta`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ----------------------------
-- Table: ruta_ubicacion
-- ----------------------------
DROP TABLE IF EXISTS `ruta_ubicacion`;
CREATE TABLE `ruta_ubicacion` (
  `id_ruta_ubicacion` int NOT NULL AUTO_INCREMENT,
  `id_ruta` int NOT NULL,
  `id_ubicacion` int NOT NULL,
  `orden_punto` int NOT NULL,
  PRIMARY KEY (`id_ruta_ubicacion`),
  KEY `id_ruta` (`id_ruta`),
  KEY `id_ubicacion` (`id_ubicacion`),
  CONSTRAINT `ruta_ubicacion_ibfk_1` FOREIGN KEY (`id_ruta`) REFERENCES `ruta` (`id_ruta`),
  CONSTRAINT `ruta_ubicacion_ibfk_2` FOREIGN KEY (`id_ubicacion`) REFERENCES `ubicacion` (`id_ubicacion`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ----------------------------
-- Table: rutafavorita
-- ----------------------------
DROP TABLE IF EXISTS `rutafavorita`;
CREATE TABLE `rutafavorita` (
  `id_favorita` int NOT NULL AUTO_INCREMENT,
  `id_usuario` int NOT NULL,
  `id_ruta` int NOT NULL,
  `fecha_guardado` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_favorita`),
  KEY `id_usuario` (`id_usuario`),
  KEY `id_ruta` (`id_ruta`),
  CONSTRAINT `rutafavorita_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`),
  CONSTRAINT `rutafavorita_ibfk_2` FOREIGN KEY (`id_ruta`) REFERENCES `ruta` (`id_ruta`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ----------------------------
-- Table: servicioemergencia
-- ----------------------------
DROP TABLE IF EXISTS `servicioemergencia`;
CREATE TABLE `servicioemergencia` (
  `id_servicio` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `tipo` enum('POLICIA','UPC','BOMBEROS','HOSPITAL') NOT NULL,
  `telefono` varchar(20) NOT NULL,
  `id_ubicacion` int NOT NULL,
  PRIMARY KEY (`id_servicio`),
  KEY `id_ubicacion` (`id_ubicacion`),
  CONSTRAINT `servicioemergencia_ibfk_1` FOREIGN KEY (`id_ubicacion`) REFERENCES `ubicacion` (`id_ubicacion`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ----------------------------
-- Table: notificacion_admin
-- ----------------------------
DROP TABLE IF EXISTS `notificacion_admin`;
CREATE TABLE `notificacion_admin` (
  `id_notificacion` INT NOT NULL AUTO_INCREMENT,
  `tipo` ENUM('REPORTE_NUEVO','SOS_ACTIVADO','USUARIO_NUEVO') NOT NULL,
  `titulo` VARCHAR(150) NOT NULL,
  `detalle` VARCHAR(255) DEFAULT NULL,
  `id_reporte` INT DEFAULT NULL,
  `id_usuario` INT DEFAULT NULL,
  `leida` TINYINT(1) NOT NULL DEFAULT 0,
  `fecha` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_notificacion`),
  KEY `idx_notif_leida` (`leida`, `fecha`),
  KEY `idx_notif_reporte` (`id_reporte`),
  CONSTRAINT `notif_fk_reporte` FOREIGN KEY (`id_reporte`) REFERENCES `reporte` (`id_reporte`) ON DELETE CASCADE,
  CONSTRAINT `notif_fk_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuario` (`id_usuario`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

SET FOREIGN_KEY_CHECKS = 1;
