import { Request, Response } from "express";
import pool from "../config/database";

import reporteIncidenteService from "../services/reporteIncidente.service";
import ubicacionService from "../services/ubicacion.service";

class ReporteIncidenteController {

    /** POST /api/reports/incidente */
    async crear(req: Request, res: Response) {

        try {

            const idUsuario = req.user?.id_usuario;

            if (!idUsuario) {
                return res.status(401).json({ success: false, message: "No autenticado." });
            }

            const reporte = await reporteIncidenteService.crear(req.body, idUsuario);

            return res.status(201).json({
                success: true,
                message: "Reporte registrado correctamente.",
                data: reporte
            });

        } catch (error: any) {
            console.error("Error creando reporte de incidente:", error);
            return res.status(400).json({
                success: false,
                message: error?.message || "No fue posible registrar el reporte."
            });
        }

    }

    /** GET /api/reports/mis-reportes */
    async misReportes(req: Request, res: Response) {

        try {

            const idUsuario = req.user?.id_usuario;

            if (!idUsuario) {
                return res.status(401).json({ success: false, message: "No autenticado." });
            }

            const reportes = await reporteIncidenteService.listarDelUsuario(idUsuario);

            return res.json({ success: true, data: reportes });

        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message });
        }

    }

    /** POST /api/ubicaciones */
    async crearUbicacion(req: Request, res: Response) {

        try {

            const id = await ubicacionService.crear(req.body);

            return res.status(201).json({
                success: true,
                message: "Ubicación registrada",
                data: { id_ubicacion: id }
            });

        } catch (error: any) {
            return res.status(400).json({ success: false, message: error.message });
        }

    }

    /**
     * POST /api/evidencias/subir
     * Recibe el archivo ya procesado por Multer y lo asocia a un reporte.
     */
    async subirEvidencia(req: Request, res: Response) {

        try {

            const archivo = req.file;
            const idReporte = Number(req.body.id_reporte);

            if (!archivo) {
                return res.status(400).json({
                    success: false,
                    message: "No se recibió ningún archivo."
                });
            }

            if (!Number.isInteger(idReporte)) {
                return res.status(400).json({
                    success: false,
                    message: "Falta el identificador del reporte."
                });
            }

            // Comprobamos que el reporte sea del usuario que sube el archivo:
            // sin esto, cualquiera podría adjuntar evidencia a reportes ajenos.
            const [filas]: any = await pool.query(
                `SELECT id_usuario FROM reporte WHERE id_reporte = ?`,
                [idReporte]
            );

            if (!filas.length) {
                return res.status(404).json({ success: false, message: "Reporte no encontrado." });
            }

            if (filas[0].id_usuario !== req.user?.id_usuario) {
                return res.status(403).json({
                    success: false,
                    message: "No puedes adjuntar evidencia a un reporte que no es tuyo."
                });
            }

            const url = `/uploads/${archivo.filename}`;

            const [resultado]: any = await pool.query(
                `INSERT INTO evidencia (url_archivo, tipo_archivo, id_reporte) VALUES (?, 'IMAGEN', ?)`,
                [url, idReporte]
            );

            return res.status(201).json({
                success: true,
                message: "Evidencia adjuntada",
                data: { id_evidencia: resultado.insertId, url_archivo: url }
            });

        } catch (error: any) {
            console.error("Error subiendo evidencia:", error);
            return res.status(400).json({ success: false, message: error.message });
        }

    }

}

export default new ReporteIncidenteController();
