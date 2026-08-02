-- ============================================================================
-- Seed — Servicios de emergencia
--
-- SOBRE LOS NÚMEROS:
--
--   Los números cortos (911, 101, 102, 131) son los oficiales del sistema
--   nacional de emergencias del Ecuador y funcionan desde cualquier operadora.
--   Esos sí son reales y verificables.
--
--   Los números de central telefónica de instituciones concretas NO se
--   inventan aquí: se dejan apuntando al 911, que es la vía correcta de
--   contacto en una emergencia real. El administrador puede reemplazarlos por
--   las centrales directas desde el panel cuando las tenga confirmadas.
--
--   Marcar un número inventado en una emergencia real es peor que no tener
--   número, así que no se rellena con datos plausibles pero falsos.
--
-- Ejecutar:  mysql -u root safewalku < seed_servicios.sql
-- ============================================================================

USE `safewalku`;

DELETE FROM `servicioemergencia`;
ALTER TABLE `servicioemergencia` AUTO_INCREMENT = 1;

INSERT INTO `servicioemergencia` (`nombre`, `tipo`, `telefono`, `id_ubicacion`)
SELECT * FROM (
    SELECT 'ECU 911 - Emergencias'          AS n, 'POLICIA'  AS t, '911' AS f, 8  AS u UNION ALL
    SELECT 'Policía Nacional',                    'POLICIA',       '101',       8  UNION ALL
    SELECT 'UPC Jipiro',                          'UPC',           '911',       8  UNION ALL
    SELECT 'Cuerpo de Bomberos de Loja',          'BOMBEROS',      '102',       10 UNION ALL
    SELECT 'Bomberos Norte Loja',                 'BOMBEROS',      '102',       10 UNION ALL
    SELECT 'Cruz Roja Ecuatoriana',               'HOSPITAL',      '131',       9  UNION ALL
    SELECT 'Hospital General Isidro Ayora',       'HOSPITAL',      '911',       9  UNION ALL
    SELECT 'Hospital del Día',                    'HOSPITAL',      '911',       21 UNION ALL
    SELECT 'Centro de Salud Norte',               'HOSPITAL',      '911',       22
) AS datos
-- Solo insertamos los que tengan una ubicación existente, para no romper la
-- clave foránea si el seed de ubicaciones cambió.
WHERE datos.u IN (SELECT id_ubicacion FROM ubicacion);
