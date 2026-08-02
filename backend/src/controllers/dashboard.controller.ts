import { Request, Response } from "express";
import dashboardService from "../services/dashboard.service";

class DashboardController {
    /** GET /api/dashboard/metricas */
    async getMetrics(req: Request, res: Response) {
        try {
            const metrics = await dashboardService.getMetrics();
            res.json({ success: true, data: metrics });
        } catch (error: any) {
            console.error("Error en metricas del dashboard:", error);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * GET /api/dashboard/resumen
     *
     * Devuelve todo el panel en una sola llamada. Son seis consultas que el
     * servidor lanza en paralelo; pedirlas desde el navegador como seis
     * peticiones distintas seria mas lento y dejaria la pantalla armandose a
     * pedazos.
     */
    async getResumen(_req: Request, res: Response) {
        try {
            const datos = await dashboardService.resumenCompleto();
            res.json({ success: true, data: datos });
        } catch (error: any) {
            console.error("Error en resumen del dashboard:", error);
            res.status(500).json({ success: false, message: error.message });
        }
    }
}

export default new DashboardController();
