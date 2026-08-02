import { Router } from "express";
import ubicacionController from "../controllers/ubicacion.controller";
import incidenteController from "../controllers/reporteIncidente.controller";
import auth from "../middleware/auth";
import validate from "../middleware/validate";
import { crearUbicacionSchema } from "../schemas/reporteIncidente.schema";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Ubicaciones
 *   description: Búsqueda de lugares y geocodificación
 */

/**
 * @swagger
 * /api/ubicaciones/buscar:
 *   get:
 *     summary: Busca solo entre las ubicaciones registradas en la base
 *     tags: [Ubicaciones]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Ubicaciones coincidentes }
 */
router.get("/buscar", auth, ubicacionController.search);

/**
 * @swagger
 * /api/ubicaciones/geocodificar:
 *   get:
 *     summary: Busca lugares propios y direcciones de Loja en OpenStreetMap
 *     tags: [Ubicaciones]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Resultados combinados, los propios primero }
 */
router.get("/geocodificar", auth, ubicacionController.buscarTodo);

/**
 * @swagger
 * /api/ubicaciones/reversa:
 *   get:
 *     summary: Dirección legible a partir de unas coordenadas
 *     tags: [Ubicaciones]
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
 *       200: { description: Dirección encontrada o punto sin nombre }
 *       400: { description: Coordenadas inválidas }
 */
router.get("/reversa", auth, ubicacionController.reversa);

/**
 * @swagger
 * /api/ubicaciones:
 *   post:
 *     summary: Registra un punto elegido por el usuario
 *     description: Crea la ubicación y su coordenada en una transacción.
 *     tags: [Ubicaciones]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [latitud, longitud]
 *             properties:
 *               nombre: { type: string }
 *               direccion: { type: string }
 *               tipo_zona: { type: string }
 *               latitud: { type: number }
 *               longitud: { type: number }
 *     responses:
 *       201: { description: Ubicación registrada }
 *       422: { description: Coordenadas inválidas }
 */
router.post("/", auth, validate(crearUbicacionSchema), incidenteController.crearUbicacion);

export default router;
