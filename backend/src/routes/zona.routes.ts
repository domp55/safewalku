import { Router } from "express";

import controller from "../controllers/zona.controller";

import auth from "../middleware/auth";
import authorize from "../middleware/authorize";
import validate from "../middleware/validate";

import { createZonaSchema, updateZonaSchema } from "../schemas/zona.schema";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Zonas
 *   description: Zonas de seguridad que alimentan el cálculo de rutas
 */

/**
 * @swagger
 * /api/zonas/cercanas:
 *   get:
 *     summary: Zonas próximas a un punto, con su peso vigente según la hora
 *     tags: [Zonas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: lat
 *         required: true
 *         schema: { type: number }
 *       - in: query
 *         name: lng
 *         required: true
 *         schema: { type: number }
 *       - in: query
 *         name: radio
 *         description: Radio de búsqueda en metros (por defecto 500)
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Listado de zonas cercanas }
 *       400: { description: Coordenadas inválidas }
 */
router.get("/cercanas", auth, controller.getCercanas);

/**
 * @swagger
 * /api/zonas/evaluar:
 *   get:
 *     summary: Nivel de riesgo vigente en un punto concreto
 *     tags: [Zonas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: lat
 *         required: true
 *         schema: { type: number }
 *       - in: query
 *         name: lng
 *         required: true
 *         schema: { type: number }
 *     responses:
 *       200: { description: Nivel, peso efectivo y zonas que contienen el punto }
 */
router.get("/evaluar", auth, controller.evaluarPunto);

/**
 * @swagger
 * /api/zonas/impacto:
 *   get:
 *     summary: Zonas con el número de reportes validados que contienen
 *     tags: [Zonas]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Listado de zonas con su conteo de reportes }
 */
router.get("/impacto", auth, authorize("ADMINISTRADOR"), controller.getImpacto);

/**
 * @swagger
 * /api/zonas:
 *   get:
 *     summary: Listar zonas de seguridad
 *     tags: [Zonas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: nivel
 *         schema: { type: string, enum: [SEGURA, REGULAR, INSEGURA] }
 *       - in: query
 *         name: ciudad
 *         schema: { type: string }
 *       - in: query
 *         name: incluir_inactivas
 *         schema: { type: boolean }
 *     responses:
 *       200: { description: Listado de zonas }
 */
router.get("/", auth, controller.getAll);

// Va después de las rutas literales para que /cercanas, /evaluar e /impacto
// no queden capturadas por el parámetro :id
router.get("/:id", auth, controller.getById);

/**
 * @swagger
 * /api/zonas:
 *   post:
 *     summary: Crear una zona de seguridad
 *     tags: [Zonas]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201: { description: Zona creada }
 *       403: { description: Requiere rol administrador }
 */
router.post(
    "/",
    auth,
    authorize("ADMINISTRADOR"),
    validate(createZonaSchema),
    controller.create
);

router.put(
    "/:id",
    auth,
    authorize("ADMINISTRADOR"),
    validate(updateZonaSchema),
    controller.update
);

router.delete(
    "/:id",
    auth,
    authorize("ADMINISTRADOR"),
    controller.delete
);

export default router;
