import { z } from "zod";

const NIVELES = ["SEGURA", "REGULAR", "INSEGURA"] as const;
const FRANJAS = ["DIURNO", "NOCTURNO", "AMBOS"] as const;

/**
 * Loja está aproximadamente en -4.10 a -3.90 de latitud y -79.30 a -79.10 de
 * longitud. Acotamos con holgura para atajar coordenadas invertidas
 * (lat/lng al revés es el error más común) sin bloquear zonas periféricas.
 */
const latitud = z.number().min(-5).max(-3);
const longitud = z.number().min(-80).max(-78);

const zonaBase = {

    nombre: z.string().min(3).max(120),

    descripcion: z.string().max(255).optional(),

    sector: z.string().max(100).optional(),

    ciudad: z.string().max(100).default("Loja"),

    nivel: z.enum(NIVELES),

    peso_riesgo: z.number().min(0.1).max(99.99),

    centro_lat: latitud,

    centro_lng: longitud,

    // Menos de 50 m no distingue nada a escala de calle; más de 5 km cubriría
    // media ciudad y volvería inútil la clasificación.
    radio_metros: z.number().int().min(50).max(5000),

    franja_horaria: z.enum(FRANJAS).default("AMBOS"),

    // 1.0 significa que la zona no cambia de noche. El tope de 5 evita que una
    // sola zona domine por completo el cálculo de la ruta.
    factor_nocturno: z.number().min(1).max(5).default(1),

    fuente: z.string().max(120).optional()

};

export const createZonaSchema = z.object(zonaBase);

export const updateZonaSchema = z.object({
    ...zonaBase,
    estado: z.enum(["ACTIVO", "INACTIVO"]).default("ACTIVO")
});
