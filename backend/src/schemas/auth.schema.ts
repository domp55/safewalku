import { z } from "zod";

import {
    esCedulaEcuatorianaValida,
    esCelularEcuatorianoValido,
    esNombreValido,
    esCorreoUide,
    esCarreraValida,
    validarContrasena,
    normalizarCelular,
    CARRERAS
} from "../utils/validadores";

/**
 * Registro de estudiantes.
 *
 * El rol NO aparece aquí a propósito. La aplicación no permite crear cuentas de
 * administrador por ningún camino: los administradores son los tres que vienen
 * cargados en la base. Cualquier `rol` que llegue en el cuerpo se ignora.
 *
 * Todos los campos llevan tope de longitud además del formato, para que no
 * entren cadenas desmedidas aunque pasen el patrón.
 */
export const registerSchema = z.object({

    nombre: z
        .string()
        .trim()
        .max(100)
        .refine(esNombreValido, {
            message: "El nombre solo puede contener letras, espacios, apóstrofos o guiones."
        }),

    apellido: z
        .string()
        .trim()
        .max(100)
        .refine(esNombreValido, {
            message: "El apellido solo puede contener letras, espacios, apóstrofos o guiones."
        }),

    cedula: z
        .string()
        .trim()
        .refine(esCedulaEcuatorianaValida, {
            message: "La cédula no es válida. Deben ser 10 dígitos de una cédula ecuatoriana real."
        }),

    correo: z
        .string()
        .trim()
        .toLowerCase()
        .max(100)
        .refine(esCorreoUide, {
            message: "Solo se admiten correos institucionales @uide.edu.ec"
        }),

    telefono: z
        .string()
        .trim()
        .max(20)
        .refine(esCelularEcuatorianoValido, {
            message: "El celular debe tener 10 dígitos y empezar por 09."
        })
        .transform(normalizarCelular),

    carrera: z
        .string()
        .trim()
        .max(100)
        .refine(esCarreraValida, {
            message: `La carrera debe ser una de: ${CARRERAS.join(", ")}`
        }),

    contrasena: z
        .string()
        .max(72)
        .superRefine((valor, ctx) => {
            const { errores } = validarContrasena(valor);
            errores.forEach((mensaje) =>
                ctx.addIssue({ code: z.ZodIssueCode.custom, message: mensaje })
            );
        })

    // Sin campo `rol`: ver comentario de cabecera.
});

export const loginSchema = z.object({

    correo: z.string().trim().toLowerCase().email().max(100),

    // En el inicio de sesión no se aplican los requisitos de complejidad: las
    // cuentas creadas antes de esta regla seguirían teniendo contraseñas
    // antiguas y quedarían fuera de su propia cuenta.
    contrasena: z.string().min(1).max(72)

});
