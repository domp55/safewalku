-- ============================================================================
-- Migración 002 — Datos de registro y baneo de usuarios
--
-- Añade los campos que el formulario de registro pasa a pedir (cédula) y el
-- estado de baneo para usuarios que hagan mal uso del sistema.
--
-- Compatible con MariaDB 10.4+ (XAMPP) y MySQL 8.
-- Ejecutar una sola vez:  mysql -u root safewalku < 002_registro_y_baneo.sql
-- ============================================================================

USE `safewalku`;

-- ----------------------------------------------------------------------------
-- Cédula
--
-- 10 dígitos, sin guiones. Se guarda como VARCHAR y no como entero porque la
-- cédula puede empezar por cero ("0104..." es una cédula válida del Azuay) y un
-- tipo numérico se comería ese cero inicial.
--
-- UNIQUE para impedir dos cuentas con la misma cédula. Admite NULL porque los
-- 22 usuarios del seed son anteriores a este campo; en MySQL y MariaDB un
-- índice UNIQUE permite varios NULL, así que no chocan entre sí.
-- ----------------------------------------------------------------------------
ALTER TABLE `usuario`
  ADD COLUMN `cedula` VARCHAR(10) DEFAULT NULL AFTER `apellido`,
  ADD UNIQUE KEY `uq_usuario_cedula` (`cedula`);

-- ----------------------------------------------------------------------------
-- Baneo
--
-- Se distingue de INACTIVO a propósito:
--
--   INACTIVO  la cuenta se dio de baja administrativamente y puede reactivarse
--             sin más. No implica ninguna falta.
--   BANEADO   el usuario hizo mal uso del sistema. Queda registro de por qué,
--             cuándo y quién lo decidió, y el inicio de sesión se lo explica.
--
-- Mezclar ambos casos en un solo estado haría imposible distinguir a quien se
-- dio de baja por rotación normal de quien fue sancionado.
-- ----------------------------------------------------------------------------
ALTER TABLE `usuario`
  MODIFY COLUMN `estado` ENUM('ACTIVO','INACTIVO','BANEADO') NOT NULL DEFAULT 'ACTIVO',
  ADD COLUMN `motivo_baneo` VARCHAR(255) DEFAULT NULL,
  ADD COLUMN `fecha_baneo` DATETIME DEFAULT NULL,
  ADD COLUMN `baneado_por` INT DEFAULT NULL,
  ADD CONSTRAINT `usuario_fk_baneado_por`
      FOREIGN KEY (`baneado_por`) REFERENCES `usuario` (`id_usuario`);

-- ----------------------------------------------------------------------------
-- Notificaciones para el administrador
--
-- Cada reporte o alerta SOS genera una notificación. Se guarda en tabla propia
-- en lugar de derivarla de `reporte` al vuelo porque hay que registrar algo que
-- el reporte no sabe: si el administrador ya la leyó.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `notificacion_admin` (
  `id_notificacion` INT NOT NULL AUTO_INCREMENT,
  `tipo`            ENUM('REPORTE_NUEVO','SOS_ACTIVADO','USUARIO_NUEVO') NOT NULL,
  `titulo`          VARCHAR(150) NOT NULL,
  `detalle`         VARCHAR(255) DEFAULT NULL,
  `id_reporte`      INT DEFAULT NULL,
  `id_usuario`      INT DEFAULT NULL,
  `leida`           TINYINT(1) NOT NULL DEFAULT 0,
  `fecha`           DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_notificacion`),
  KEY `idx_notif_leida` (`leida`, `fecha`),
  KEY `idx_notif_reporte` (`id_reporte`),
  CONSTRAINT `notif_fk_reporte` FOREIGN KEY (`id_reporte`)
      REFERENCES `reporte` (`id_reporte`) ON DELETE CASCADE,
  CONSTRAINT `notif_fk_usuario` FOREIGN KEY (`id_usuario`)
      REFERENCES `usuario` (`id_usuario`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
