import { Router } from "express";
import dashboardController from "../controllers/dashboard.controller";
import auth from "../middleware/auth";
import authorize from "../middleware/authorize";

const router = Router();

/**
 * @swagger
 * /api/dashboard/metricas:
 *   get:
 *     summary: Contadores del panel con su variacion frente al periodo anterior
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Metricas }
 */
router.get("/metricas", auth, authorize("ADMINISTRADOR"), dashboardController.getMetrics);

/**
 * @swagger
 * /api/dashboard/resumen:
 *   get:
 *     summary: Todo el panel en una sola llamada
 *     description: Metricas, reparto por estado, por categoria, serie diaria, puntos del mapa y ranking de zonas.
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Resumen completo }
 */
router.get("/resumen", auth, authorize("ADMINISTRADOR"), dashboardController.getResumen);

export default router;
