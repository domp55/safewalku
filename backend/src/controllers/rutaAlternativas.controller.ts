import { Request, Response } from "express";
import rutaAlternativasService from "../services/rutaAlternativas.service";

class RutaAlternativasController {

    /**
     * POST /api/rutas/alternativas
     * Devuelve hasta tres rutas clasificadas por nivel de seguridad.
     */
    async calcular(req: Request, res: Response) {

        try {

            const { origen, destino, hora, refrescar } = req.body;

            const fecha = hora ? new Date(hora) : new Date();

            if (Number.isNaN(fecha.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: "El parámetro hora no es una fecha válida"
                });
            }

            const resultado = await rutaAlternativasService.calcular(
                origen,
                destino,
                fecha,
                refrescar !== true
            );

            return res.status(200).json({
                success: true,
                data: resultado.rutas,
                meta: {
                    total: resultado.rutas.length,
                    desde_cache: resultado.desde_cache,
                    aviso: resultado.aviso,
                    calculado_para: fecha.toISOString()
                }
            });

        } catch (error: any) {

            // Sin esta traza, un fallo de la base o de la red se convierte en un
            // 400 con mensaje vacío y no hay forma de saber qué ocurrió.
            console.error("Error calculando alternativas:", error);

            return res.status(400).json({
                success: false,
                message: error?.message || "No fue posible calcular las rutas."
            });

        }

    }

    /**
     * POST /api/rutas/historial
     * Registra qué alternativa eligió el usuario.
     */
    async registrarEleccion(req: Request, res: Response) {

        try {

            const idUsuario = req.user?.id_usuario;

            if (!idUsuario) {
                return res.status(401).json({ success: false, message: "No autenticado." });
            }

            const id = await rutaAlternativasService.registrarEleccion({
                id_usuario: idUsuario,
                origen: req.body.origen,
                destino: req.body.destino,
                clasificacion_elegida: req.body.clasificacion_elegida,
                indice_riesgo: req.body.indice_riesgo
            });

            return res.status(201).json({
                success: true,
                message: "Elección registrada",
                id
            });

        } catch (error: any) {
            return res.status(400).json({ success: false, message: error.message });
        }

    }

}

export default new RutaAlternativasController();
