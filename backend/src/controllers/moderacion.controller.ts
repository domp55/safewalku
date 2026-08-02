import { Request, Response } from "express";
import moderacionService, { ESTADOS, Estado } from "../services/moderacion.service";

class ModeracionController {

    /** GET /api/reports/admin/listado */
    async listar(req: Request, res: Response) {

        try {

            const resultado = await moderacionService.listar({
                estado: req.query.estado as string | undefined,
                categoria: req.query.categoria as string | undefined,
                tipo: req.query.tipo as string | undefined,
                nivel: req.query.nivel as string | undefined,
                busqueda: req.query.busqueda as string | undefined,
                desde: req.query.desde as string | undefined,
                hasta: req.query.hasta as string | undefined,
                limite: req.query.limite ? Number(req.query.limite) : undefined,
                pagina: req.query.pagina ? Number(req.query.pagina) : undefined
            });

            return res.json({ success: true, ...resultado });

        } catch (error: any) {
            console.error("Error listando reportes:", error);
            return res.status(500).json({ success: false, message: error.message });
        }

    }

    /** GET /api/reports/admin/resumen */
    async resumen(_req: Request, res: Response) {
        try {
            const datos = await moderacionService.resumen();
            return res.json({ success: true, data: datos });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    /** GET /api/reports/:id/evidencias */
    async evidencias(req: Request, res: Response) {
        try {
            const datos = await moderacionService.evidencias(Number(req.params.id));
            return res.json({ success: true, data: datos });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    /** PATCH /api/reports/:id/moderar */
    async moderar(req: Request, res: Response) {

        try {

            const estado = req.body?.estado as Estado;

            if (!ESTADOS.includes(estado)) {
                return res.status(422).json({
                    success: false,
                    message: `Estado inválido. Debe ser uno de: ${ESTADOS.join(", ")}`
                });
            }

            const observacion = (req.body?.observacion ?? "").toString().trim().slice(0, 255) || null;

            // Rechazar o marcar duplicado sin explicar por qué deja al estudiante
            // sin saber qué pasó con su reporte.
            if ((estado === "RECHAZADO" || estado === "DUPLICADO") && !observacion) {
                return res.status(422).json({
                    success: false,
                    message: "Indica el motivo al rechazar o marcar como duplicado."
                });
            }

            const reporte = await moderacionService.moderar(
                Number(req.params.id),
                estado,
                observacion,
                req.user!.id_usuario
            );

            return res.json({
                success: true,
                message: `Reporte marcado como ${estado}`,
                data: reporte
            });

        } catch (error: any) {
            return res.status(404).json({ success: false, message: error.message });
        }

    }

    /** GET /api/reports/admin/exportar */
    async exportar(req: Request, res: Response) {

        try {

            const datos = await moderacionService.exportar({
                estado: req.query.estado as string | undefined,
                categoria: req.query.categoria as string | undefined,
                tipo: req.query.tipo as string | undefined
            });

            const columnas = [
                "id_reporte", "fecha_reporte", "tipo_reporte", "categoria",
                "nivel_riesgo", "estado", "ubicacion_nombre", "latitud",
                "longitud", "nombre", "apellido", "descripcion", "observacion_admin"
            ];

            // Las fechas de MySQL llegan como objeto Date y su toString() da
            // "Sat Aug 01 2026 20:53:07 GMT-0500 (hora de Ecuador)", que Excel
            // no reconoce como fecha. Se emiten en formato ordenable.
            const formatearFecha = (d: Date) => {
                const p = (n: number) => String(n).padStart(2, "0");
                return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ` +
                       `${p(d.getHours())}:${p(d.getMinutes())}`;
            };

            // Las comillas internas se duplican y todo el valor se entrecomilla:
            // sin eso, una descripción con una coma parte la fila en dos.
            const escapar = (v: any) => {
                if (v === null || v === undefined) return "";
                if (v instanceof Date) return `"${formatearFecha(v)}"`;
                return `"${String(v).replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
            };

            const lineas = [
                columnas.join(","),
                ...datos.map((d: any) => columnas.map((c) => escapar(d[c])).join(","))
            ];

            // BOM para que Excel en Windows reconozca el UTF-8 y no rompa las tildes
            const csv = "﻿" + lineas.join("\r\n");

            res.setHeader("Content-Type", "text/csv; charset=utf-8");
            res.setHeader(
                "Content-Disposition",
                `attachment; filename="reportes-safewalk-${new Date().toISOString().slice(0, 10)}.csv"`
            );

            return res.send(csv);

        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message });
        }

    }

}

export default new ModeracionController();
