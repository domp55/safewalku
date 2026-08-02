import { z } from "zod";

/**
 * Rango de coordenadas admitido. Coincide con el de zona.schema para que un
 * mismo punto sea válido al crear una zona y al pedir una ruta.
 */
const punto = z.object({
    lat: z.number().min(-5).max(-3),
    lng: z.number().min(-80).max(-78)
});

export const calcularRutasSchema = z.object({

    origen: punto,

    destino: punto,

    /**
     * Momento para el que se calcula. Permite consultar "¿cómo estaría esta
     * ruta a las 22:00?" sin esperar a esa hora, que es lo que hace demostrable
     * el efecto del factor nocturno.
     */
    hora: z.string().datetime({ offset: true }).optional(),

    /** Fuerza el recálculo ignorando la caché. Útil para probar y depurar. */
    refrescar: z.boolean().optional()

});

export const registrarEleccionSchema = z.object({

    origen: punto,

    destino: punto,

    clasificacion_elegida: z.enum(["SEGURA", "REGULAR", "INSEGURA"]),

    indice_riesgo: z.number().min(0).max(100)

});
