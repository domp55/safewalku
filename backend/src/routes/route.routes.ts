import { Router } from "express";

import controller from "../controllers/route.controller";
import alternativasController from "../controllers/rutaAlternativas.controller";

import auth from "../middleware/auth";
import authorize from "../middleware/authorize";
import validate from "../middleware/validate";

import {

    createRouteSchema,

    updateRouteSchema

} from "../schemas/route.schema";

import {
    calcularRutasSchema,
    registrarEleccionSchema
} from "../schemas/rutaAlternativas.schema";

const router = Router();

/**
 * @swagger
 * /api/routes/alternativas:
 *   post:
 *     summary: Tres rutas entre dos puntos, clasificadas por nivel de seguridad
 *     description: >
 *       Obtiene trazados reales por calle desde OSRM y los puntúa contra las
 *       zonas de seguridad, los reportes validados de los usuarios y la hora
 *       del día. Devuelve las alternativas ordenadas de menor a mayor riesgo.
 *     tags: [Rutas]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [origen, destino]
 *             properties:
 *               origen:
 *                 type: object
 *                 properties:
 *                   lat: { type: number, example: -3.97245 }
 *                   lng: { type: number, example: -79.19933 }
 *               destino:
 *                 type: object
 *                 properties:
 *                   lat: { type: number, example: -3.9962 }
 *                   lng: { type: number, example: -79.2036 }
 *               hora:
 *                 type: string
 *                 format: date-time
 *                 description: Momento para el que se evalúa. Por defecto, ahora.
 *               refrescar:
 *                 type: boolean
 *                 description: Ignora la caché y recalcula.
 *     responses:
 *       200: { description: Alternativas calculadas }
 *       400: { description: Coordenadas inválidas o puntos demasiado cercanos }
 */
router.post(
    "/alternativas",
    auth,
    validate(calcularRutasSchema),
    alternativasController.calcular
);

/**
 * @swagger
 * /api/routes/historial:
 *   post:
 *     summary: Registra qué alternativa eligió el usuario
 *     tags: [Rutas]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201: { description: Elección registrada }
 */
router.post(
    "/historial",
    auth,
    validate(registrarEleccionSchema),
    alternativasController.registrarEleccion
);

/**
 * @swagger
 * tags:
 *   name: Rutas
 *   description: Gestión de rutas seguras
 */

router.get(
    "/trazar",
    auth,
    controller.trazarRuta
);

router.get(
    "/mapa",
    auth,
    controller.getMapaRutas
);

router.get(
    "/calles",
    auth,
    controller.getCalles
);

router.post(
    "/poblar-calles",
    auth,
    authorize("ADMINISTRADOR"),
    controller.poblarCalles
);

router.get(

    "/",

    auth,

    authorize("ESTUDIANTE", "ADMINISTRADOR"),

    controller.getAll

);

router.get(

    "/:id",

    auth,

    authorize("ESTUDIANTE", "ADMINISTRADOR"),

    controller.getById

);

router.post(

    "/",

    auth,

    authorize("ADMINISTRADOR"),

    validate(createRouteSchema),

    controller.create

);

router.put(

    "/:id",

    auth,

    authorize("ADMINISTRADOR"),

    validate(updateRouteSchema),

    controller.update

);

router.delete(

    "/:id",

    auth,

    authorize("ADMINISTRADOR"),

    controller.delete

);

export default router;