import { Router } from "express";

import { notificacionController } from "../controllers/notificacion.controller";

import auth from "../middleware/auth";
import authorize from "../middleware/authorize";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Notificaciones
 *   description: Avisos al administrador sobre reportes y alertas SOS
 */

/**
 * @swagger
 * /api/notificaciones:
 *   get:
 *     summary: Notificaciones del administrador
 *     tags: [Notificaciones]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: no_leidas
 *         schema: { type: boolean }
 *       - in: query
 *         name: limite
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Listado con el contador de no leídas }
 */
router.get("/", auth, authorize("ADMINISTRADOR"), notificacionController.listar);

// Antes de /:id para que "leidas" no se tome por un identificador
router.patch("/leidas", auth, authorize("ADMINISTRADOR"), notificacionController.marcarTodas);

router.patch("/:id/leida", auth, authorize("ADMINISTRADOR"), notificacionController.marcarLeida);

export default router;
