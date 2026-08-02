import { z } from "zod";

export const updateUserSchema = z.object({

    nombre: z.string().optional(),

    apellido: z.string().optional(),

    correo: z.string().email().optional(),

    rol: z.enum([
        "ESTUDIANTE",
        "ADMINISTRADOR"
    ]).optional(),

    // Necesario para reactivar una cuenta: el DELETE solo la desactiva, así que
    // sin este campo no había forma de volver a habilitarla desde el panel.
    estado: z.enum([
        "ACTIVO",
        "INACTIVO"
    ]).optional()

});