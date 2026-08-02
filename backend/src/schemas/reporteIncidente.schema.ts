import { z } from "zod";

/**
 * Categorías de incidente y el riesgo que implica cada una.
 *
 * El mapeo vive aquí y no en el frontend a propósito: es lo que determina
 * cuánto pesa el reporte sobre las rutas de todos los usuarios, así que no
 * puede depender de lo que envíe el cliente.
 */
export const RIESGO_POR_CATEGORIA = {
    ROBO: "ALTO",
    VIOLENCIA: "ALTO",
    ACOSO: "MEDIO",
    ACTIVIDAD_SOSPECHOSA: "MEDIO",
    ACCIDENTE: "MEDIO",
    ILUMINACION: "BAJO",
    OTRO: "BAJO"
} as const;

export type Categoria = keyof typeof RIESGO_POR_CATEGORIA;

export const CATEGORIAS = Object.keys(RIESGO_POR_CATEGORIA) as [Categoria, ...Categoria[]];

const latitud = z.number().min(-5).max(-3);
const longitud = z.number().min(-80).max(-78);

export const crearReporteSchema = z.object({

    categoria: z.enum(CATEGORIAS),

    descripcion: z.string().trim().min(10).max(1000),

    /** Punto exacto donde ocurrió el hecho, elegido por el usuario. */
    latitud,
    longitud,

    /** Nombre y dirección resueltos por geocodificación inversa. */
    nombre_lugar: z.string().max(100).optional(),
    direccion: z.string().max(255).optional(),

    es_anonimo: z.boolean().optional().default(false)

});

export const crearUbicacionSchema = z.object({
    nombre: z.string().max(100).optional(),
    direccion: z.string().max(255).optional(),
    ciudad: z.string().max(100).optional(),
    tipo_zona: z
        .enum([
            "UNIVERSIDAD",
            "CALLE",
            "PARQUE",
            "BARRIO",
            "PARADERO",
            "LUGAR_SEGURO",
            "SERVICIO_EMERGENCIA"
        ])
        .optional(),
    radio_metros: z.number().int().min(10).max(1000).optional(),
    latitud,
    longitud
});
