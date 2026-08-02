import { Router } from "express";

import controller from "../controllers/evidencia.controller";
import incidenteController from "../controllers/reporteIncidente.controller";

import auth from "../middleware/auth";
import authorize from "../middleware/authorize";
import validate from "../middleware/validate";
import upload from "../config/multer";

import {
    createEvidenceSchema,
    updateEvidenceSchema
} from "../schemas/evidencia.schema";

const router = Router();

/**
 * @swagger
 * /api/evidencias/subir:
 *   post:
 *     summary: Adjunta una imagen a un reporte propio
 *     description: Máximo 5 MB. Solo JPEG, PNG, WEBP o GIF.
 *     tags: [Evidencias]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               evidencia: { type: string, format: binary }
 *               id_reporte: { type: integer }
 *     responses:
 *       201: { description: Evidencia adjuntada }
 *       403: { description: El reporte no pertenece al usuario }
 */
router.post(
    "/subir",
    auth,
    authorize("ESTUDIANTE", "ADMINISTRADOR"),
    upload.single("evidencia"),
    incidenteController.subirEvidencia
);

router.get(
    "/",
    auth,
    authorize("ADMINISTRADOR"),
    controller.getAll
);

router.get(
    "/:id",
    auth,
    authorize("ADMINISTRADOR"),
    controller.getById
);

router.post(
    "/",
    auth,
    authorize("ESTUDIANTE", "ADMINISTRADOR"),
    validate(createEvidenceSchema),
    controller.create
);

router.put(
    "/:id",
    auth,
    authorize("ADMINISTRADOR"),
    validate(updateEvidenceSchema),
    controller.update
);

router.delete(
    "/:id",
    auth,
    authorize("ADMINISTRADOR"),
    controller.delete
);

export default router;