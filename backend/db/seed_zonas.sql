-- ============================================================================
-- Seed — Zonas de seguridad de Loja
--
-- ⚠️  DATOS SIMULADOS. Las clasificaciones de esta tabla NO provienen de la
--     Policía Nacional, del ECU 911 ni de ningún estudio de campo. Fueron
--     construidas para que el motor de rutas tenga criterio con qué trabajar
--     y la aplicación sea demostrable.
--
--     Antes de cualquier uso real deben reemplazarse por datos oficiales.
--     El módulo de gestión de zonas del panel administrativo permite hacerlo
--     sin tocar código.
--
-- Pesos: SEGURA = 1.00 · REGULAR = 4.00 · INSEGURA = 10.00
--
-- Semántica de los campos horarios, que el motor de scoring debe respetar:
--
--   franja_horaria   Documenta en qué momento del día la etiqueta `nivel`
--                    describe mejor a la zona.
--   factor_nocturno  Multiplica `peso_riesgo` entre las 18:00 y las 06:00.
--                    Se aplica siempre, sea cual sea la franja.
--
-- Por eso las zonas SEGURAS de franja DIURNO llevan un factor alto (3.5–4.5):
-- un parque tranquilo a mediodía queda con peso 1.0, pero de madrugada sube a
-- ~4.0 y el motor lo trata como zona regular, que es lo correcto. Sin ese
-- factor, el sistema recomendaría cruzar un parque vacío a las 2 de la mañana.
--
-- Ejecutar:  mysql -u root safewalku < seed_zonas.sql
-- ============================================================================

USE `safewalku`;

DELETE FROM `zona_seguridad`;
ALTER TABLE `zona_seguridad` AUTO_INCREMENT = 1;

SET @F = 'DATO SIMULADO - DEMO ACADEMICA';

INSERT INTO `zona_seguridad`
  (`nombre`, `descripcion`, `sector`, `nivel`, `peso_riesgo`,
   `centro_lat`, `centro_lng`, `radio_metros`, `franja_horaria`, `factor_nocturno`, `fuente`)
VALUES

-- ─────────────────────────────────────────────────────────────────────────────
-- 🟢 ZONAS SEGURAS (8) — peso 1.00
-- ─────────────────────────────────────────────────────────────────────────────
('Campus UIDE Loja',
 'Recinto universitario con guardianía permanente y circuito cerrado de cámaras.',
 'Jipiro', 'SEGURA', 1.00, -3.97245000, -79.19933000, 400, 'AMBOS', 1.00, @F),

('Corredor Av. Salvador Bustamante Celi',
 'Avenida principal de acceso al campus. Iluminación continua y tránsito constante.',
 'Jipiro', 'SEGURA', 1.00, -3.97800000, -79.20250000, 500, 'AMBOS', 1.20, @F),

('Parque Jipiro',
 'Parque recreacional con afluencia familiar y vigilancia municipal durante el dia. Queda desierto de noche.',
 'Jipiro', 'SEGURA', 1.00, -3.97080000, -79.20150000, 450, 'DIURNO', 4.00, @F),

('Parque Recreacional Jipiro Norte',
 'Area deportiva y de esparcimiento, concurrida en horario diurno. Sin vigilancia nocturna.',
 'Jipiro Norte', 'SEGURA', 1.00, -3.96700000, -79.20050000, 350, 'DIURNO', 4.50, @F),

('Puerta de la Ciudad',
 'Hito turístico con presencia policial y comercio formal en el entorno.',
 'Centro Norte', 'SEGURA', 1.00, -3.98660000, -79.19960000, 250, 'AMBOS', 1.10, @F),

('Entorno UPC Jipiro',
 'Radio inmediato a la Unidad de Policia Comunitaria. Respuesta inferior a 5 minutos.',
 'Jipiro', 'SEGURA', 1.00, -3.97090000, -79.20220000, 300, 'AMBOS', 1.00, @F),

('Sauces Norte residencial',
 'Barrio residencial consolidado, con alumbrado publico completo.',
 'Sauces Norte', 'SEGURA', 1.00, -3.96010000, -79.21400000, 400, 'AMBOS', 1.20, @F),

('Av. Universitaria y centro comercial',
 'Corredor comercial con vigilancia privada y flujo peatonal alto mientras los locales estan abiertos.',
 'Centro', 'SEGURA', 1.00, -3.99450000, -79.20480000, 300, 'DIURNO', 3.50, @F),

-- ─────────────────────────────────────────────────────────────────────────────
-- 🟡 ZONAS REGULARES (9) — peso 4.00
-- ─────────────────────────────────────────────────────────────────────────────
('Centro Historico de Loja',
 'Alta concurrencia diurna. Se reportan hurtos menores y carterismo en horas pico.',
 'Centro', 'REGULAR', 4.00, -3.99620000, -79.20360000, 500, 'AMBOS', 1.40, @F),

('Terminal Terrestre',
 'Zona de transito intenso. Riesgo de hurto de equipaje y descuido.',
 'Terminal', 'REGULAR', 4.00, -3.98750000, -79.20900000, 350, 'DIURNO', 1.60, @F),

('Barrio Daniel Alvarez',
 'Sector residencial con iluminacion irregular en calles interiores.',
 'Daniel Alvarez', 'REGULAR', 4.00, -3.97900000, -79.21300000, 450, 'AMBOS', 1.50, @F),

('Barrio Belen',
 'Zona mixta residencial y comercial. Trafico vehicular denso sin veredas continuas.',
 'Belen', 'REGULAR', 4.00, -3.99300000, -79.21100000, 400, 'AMBOS', 1.40, @F),

('La Tebaida Baja',
 'Sector amplio con tramos de escasa iluminacion entre manzanas.',
 'La Tebaida', 'REGULAR', 4.00, -4.02300000, -79.20850000, 500, 'AMBOS', 1.50, @F),

('Barrio Epoca',
 'Zona residencial periferica con baja presencia policial.',
 'Epoca', 'REGULAR', 4.00, -4.00100000, -79.21600000, 400, 'AMBOS', 1.50, @F),

('Barrio Motupe',
 'Sector norte extenso. Distancias largas entre puntos iluminados.',
 'Motupe', 'REGULAR', 4.00, -3.95000000, -79.22000000, 600, 'AMBOS', 1.50, @F),

('Clodoveo Jaramillo',
 'Barrio residencial con calles estrechas y visibilidad reducida.',
 'Clodoveo Jaramillo', 'REGULAR', 4.00, -4.00900000, -79.21400000, 450, 'AMBOS', 1.40, @F),

('Estadio Reina del Cisne',
 'Entorno tranquilo salvo en dias de evento, cuando se congestiona.',
 'Centro Norte', 'REGULAR', 4.00, -3.98950000, -79.20650000, 300, 'AMBOS', 1.30, @F),

-- ─────────────────────────────────────────────────────────────────────────────
-- 🔴 ZONAS INSEGURAS (7) — peso 10.00
-- ─────────────────────────────────────────────────────────────────────────────
('Riberas del Rio Malacatos',
 'Sendero junto al rio sin iluminacion ni vigilancia. Evitar despues del anochecer.',
 'Centro', 'INSEGURA', 10.00, -3.99900000, -79.20150000, 350, 'NOCTURNO', 2.50, @F),

('Zona Rosa Bolivar y 24 de Mayo',
 'Concentracion de bares y discotecas. Incidentes asociados al consumo de alcohol.',
 'Centro', 'INSEGURA', 10.00, -3.99550000, -79.20240000, 250, 'NOCTURNO', 2.30, @F),

('Via a Zamora y Tunel de los Ahorcados',
 'Tramo interprovincial sin veredas ni alumbrado. Sin cobertura celular en el tunel.',
 'Via Oriental', 'INSEGURA', 10.00, -3.98500000, -79.18800000, 600, 'AMBOS', 1.80, @F),

('Punzara Alto',
 'Sector periferico de topografia irregular, con accesos poco transitados.',
 'Punzara', 'INSEGURA', 10.00, -4.01800000, -79.21700000, 500, 'AMBOS', 1.50, @F),

('Periferia Las Pitas',
 'Limite urbano con lotes baldios y alumbrado publico intermitente.',
 'Las Pitas', 'INSEGURA', 10.00, -3.96500000, -79.21000000, 450, 'NOCTURNO', 2.00, @F),

('Chontacruz via antigua',
 'Camino de salida sur con trafico escaso y sin puntos de auxilio cercanos.',
 'Chontacruz', 'INSEGURA', 10.00, -4.03000000, -79.20000000, 550, 'AMBOS', 1.60, @F),

('Entorno del Terminal en madrugada',
 'Perimetro exterior de la terminal entre las 00:00 y las 05:00, con baja afluencia.',
 'Terminal', 'INSEGURA', 10.00, -3.98800000, -79.21000000, 300, 'NOCTURNO', 2.40, @F);
