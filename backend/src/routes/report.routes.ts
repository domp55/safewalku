import { Router } from "express";
import reportController from "../controllers/report.controller";
import incidenteController from "../controllers/reporteIncidente.controller";
import moderacionController from "../controllers/moderacion.controller";

import auth from "../middleware/auth";
import authorize from "../middleware/authorize";
import validate from "../middleware/validate";

import {

    createReportSchema,

    updateReportSchema

} from "../schemas/report.schema";

import { crearReporteSchema } from "../schemas/reporteIncidente.schema";

const router = Router();

/**
 * @swagger
 * /api/reports/incidente:
 *   post:
 *     summary: Registra un incidente en la ubicación que elige el usuario
 *     description: >
 *       Crea la ubicación y su coordenada en una transacción y les asocia el
 *       reporte. El nivel de riesgo lo deriva el servidor a partir de la
 *       categoría, no se acepta desde el cliente.
 *     tags: [Reportes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [categoria, descripcion, latitud, longitud]
 *             properties:
 *               categoria:
 *                 type: string
 *                 enum: [ROBO, VIOLENCIA, ACOSO, ACTIVIDAD_SOSPECHOSA, ACCIDENTE, ILUMINACION, OTRO]
 *               descripcion: { type: string, minLength: 10 }
 *               latitud: { type: number, example: -3.9962 }
 *               longitud: { type: number, example: -79.2036 }
 *               nombre_lugar: { type: string }
 *               direccion: { type: string }
 *               es_anonimo: { type: boolean }
 *     responses:
 *       201: { description: Reporte registrado }
 *       422: { description: Datos inválidos }
 */
router.post(
    "/incidente",
    auth,
    authorize("ESTUDIANTE", "ADMINISTRADOR"),
    validate(crearReporteSchema),
    incidenteController.crear
);

/**
 * @swagger
 * /api/reports/mis-reportes:
 *   get:
 *     summary: Reportes enviados por el usuario autenticado
 *     tags: [Reportes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Listado de reportes propios }
 */
router.get(
    "/mis-reportes",
    auth,
    incidenteController.misReportes
);

// ---------------------------------------------------------------------------
// Moderación (solo administrador)
//
// Van antes de las rutas con /:id para que "admin" no se interprete como un
// identificador de reporte.
// ---------------------------------------------------------------------------

/**
 * @swagger
 * /api/reports/admin/listado:
 *   get:
 *     summary: Reportes con filtros y paginación, para el panel administrativo
 *     description: Los pendientes aparecen primero porque son los que requieren decisión.
 *     tags: [Reportes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: estado
 *         schema: { type: string, enum: [PENDIENTE, VALIDADO, RECHAZADO, DUPLICADO] }
 *       - in: query
 *         name: categoria
 *         schema: { type: string }
 *       - in: query
 *         name: tipo
 *         schema: { type: string, enum: [INCIDENTE, SOS_PANICO] }
 *       - in: query
 *         name: busqueda
 *         schema: { type: string }
 *       - in: query
 *         name: pagina
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Listado paginado }
 */
router.get(
    "/admin/listado",
    auth,
    authorize("ADMINISTRADOR"),
    moderacionController.listar
);

router.get(
    "/admin/resumen",
    auth,
    authorize("ADMINISTRADOR"),
    moderacionController.resumen
);

router.get(
    "/admin/exportar",
    auth,
    authorize("ADMINISTRADOR"),
    moderacionController.exportar
);

/**
 * @swagger
 * /api/reports/{id}/moderar:
 *   patch:
 *     summary: Validar, rechazar o marcar como duplicado un reporte
 *     description: >
 *       Solo los reportes VALIDADOS pesan en el cálculo de rutas. Rechazar o
 *       marcar duplicado exige indicar el motivo.
 *     tags: [Reportes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Estado actualizado }
 *       422: { description: Estado inválido o falta el motivo }
 */
router.patch(
    "/:id/moderar",
    auth,
    authorize("ADMINISTRADOR"),
    moderacionController.moderar
);

router.get(
    "/:id/evidencias",
    auth,
    authorize("ADMINISTRADOR"),
    moderacionController.evidencias
);

/**
 * @swagger
 * tags:
 *   name: Reportes
 *   description: Gestión de reportes de incidentes
 */

/**
 * @swagger
 * /api/reports:
 *   get:
 *     summary: Obtener todos los reportes
 *     tags: [Reportes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de reportes
 */
router.get(
    "/",
    auth,
    reportController.getAll
);

/**
 * @swagger
 * /api/reports/{id}:
 *   get:
 *     summary: Obtener un reporte por ID
 *     tags: [Reportes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Reporte encontrado
 *       404:
 *         description: Reporte no encontrado
 */
router.get(
    "/:id",
    auth,
    reportController.getById
);

/**
 * @swagger
 * /api/reports:
 *   post:
 *     summary: Crear un reporte
 *     tags: [Reportes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               descripcion:
 *                 type: string
 *               nivel_riesgo:
 *                 type: string
 *                 enum:
 *                   - BAJO
 *                   - MEDIO
 *                   - ALTO
 *               id_usuario:
 *                 type: integer
 *               id_ubicacion:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Reporte creado correctamente
 */
router.post(
    "/",
    auth,
    authorize("ESTUDIANTE", "ADMINISTRADOR"),
    reportController.create
);

/**
 * @swagger
 * /api/reports/{id}:
 *   put:
 *     summary: Actualizar un reporte
 *     tags: [Reportes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               descripcion:
 *                 type: string
 *               nivel_riesgo:
 *                 type: string
 *               estado:
 *                 type: string
 *                 enum:
 *                   - PENDIENTE
 *                   - VALIDADO
 *                   - RECHAZADO
 *                   - DUPLICADO
 *     responses:
 *       200:
 *         description: Reporte actualizado correctamente
 */
router.put(
    "/:id",
    auth,
    authorize("ADMINISTRADOR"),
    reportController.update
);

/**
 * @swagger
 * /api/reports/{id}:
 *   delete:
 *     summary: Desactivar un reporte
 *     tags: [Reportes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Reporte desactivado correctamente
 */
router.delete(
    "/:id",
    auth,
    authorize("ADMINISTRADOR"),
    reportController.delete
);

router.get(
    "/zonas/riesgo",
    auth,
    reportController.getRiskZones
);

router.post(
    "/sos",
    auth,
    authorize("ESTUDIANTE", "ADMINISTRADOR"),
    reportController.createSOS
);

router.put(
    "/sos/:id/cancelar",
    auth,
    authorize("ESTUDIANTE", "ADMINISTRADOR"),
    reportController.cancelSOS
);

export default router;