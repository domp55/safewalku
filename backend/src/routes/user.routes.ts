import { Router } from "express";

import controller from "../controllers/user.controller";

import auth from "../middleware/auth";

import authorize from "../middleware/authorize";

import validate from "../middleware/validate";

import { updateUserSchema } from "../schemas/user.schema";

import upload from "../config/multer";
import { baneoController } from "../controllers/notificacion.controller";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Usuarios
 *   description: Gestión de usuarios
 */

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Obtener todos los usuarios
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 */
router.get(
    "/",
    auth,
    authorize("ADMINISTRADOR"),
    controller.getAll
);

/**
 * @swagger
 * /users/me:
 *   get:
 *     summary: Perfil propio con estadisticas reales
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 */
// Va antes de /:id para que "me" no se interprete como un identificador
router.get("/me", auth, controller.getMe);

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Obtener usuario por ID
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 */
router.get(
    "/:id",
    auth,
    authorize("ADMINISTRADOR"),
    controller.getById
);

/**
 * @swagger
 * /users/me:
 *   put:
 *     summary: Actualizar mi propio perfil
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 */
router.put(
    "/me",
    auth,
    controller.updateMe
);

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Actualizar usuario
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 */
router.put(
    "/:id",
    auth,
    authorize("ADMINISTRADOR"),
    validate(updateUserSchema),
    controller.update
);

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Desactivar usuario (Borrado lógico)
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 */
router.delete(
    "/:id",
    auth,
    authorize("ADMINISTRADOR"),
    controller.delete
);

/**
 * @swagger
 * /users/{id}/foto:
 *   put:
 *     summary: Subir foto de perfil del usuario
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 */
router.put(
    "/:id/foto",
    auth,
    upload.single("imagen"),
    controller.uploadFoto
);

/**
 * @swagger
 * /users/{id}/banear:
 *   patch:
 *     summary: Suspende una cuenta por mal uso del sistema
 *     description: Exige un motivo. No se puede banear a un administrador ni a uno mismo.
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Cuenta suspendida }
 *       422: { description: Falta el motivo }
 */
router.patch(
    "/:id/banear",
    auth,
    authorize("ADMINISTRADOR"),
    baneoController.banear
);

router.patch(
    "/:id/desbanear",
    auth,
    authorize("ADMINISTRADOR"),
    baneoController.desbanear
);

export default router;