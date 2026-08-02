import { z } from "zod";

/**
 * Los números de emergencia de Ecuador son cortos (911, 101, 102, 131) y los
 * celulares llevan 10 dígitos, a veces escritos con espacios o guiones. La
 * validación admite ambos formatos y deja fuera cualquier cosa que no se pueda
 * marcar desde un teléfono.
 */
const telefono = z
    .string()
    .trim()
    .min(3)
    .max(20)
    .regex(/^[0-9+\-\s()]+$/, "El teléfono solo puede contener números, espacios, guiones o +");

export const contactoSchema = z.object({
    nombre: z.string().trim().min(2).max(100),
    telefono,
    parentesco: z.enum(["PADRE", "MADRE", "HERMANO", "HERMANA", "AMIGO", "PAREJA", "OTRO"])
});

export const servicioSchema = z.object({
    nombre: z.string().trim().min(3).max(100),
    tipo: z.enum(["POLICIA", "UPC", "BOMBEROS", "HOSPITAL"]),
    telefono,
    id_ubicacion: z.number().int().positive()
});
