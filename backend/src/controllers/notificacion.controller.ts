import { Request, Response } from "express";
import notificacionService from "../services/notificacion.service";
import moderacionUsuarioService from "../services/moderacionUsuario.service";

class NotificacionController {

    /** GET /api/notificaciones */
    async listar(req: Request, res: Response) {
        try {
            const soloNoLeidas = req.query.no_leidas === "true";
            const limite = req.query.limite ? Number(req.query.limite) : 30;

            const [datos, noLeidas] = await Promise.all([
                notificacionService.listar(soloNoLeidas, limite),
                notificacionService.contarNoLeidas()
            ]);

            return res.json({ success: true, data: datos, no_leidas: noLeidas });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    /** PATCH /api/notificaciones/:id/leida */
    async marcarLeida(req: Request, res: Response) {
        try {
            const resultado = await notificacionService.marcarLeida(Number(req.params.id));
            return res.json(resultado);
        } catch (error: any) {
            return res.status(404).json({ success: false, message: error.message });
        }
    }

    /** PATCH /api/notificaciones/leidas */
    async marcarTodas(_req: Request, res: Response) {
        try {
            const resultado = await notificacionService.marcarTodasLeidas();
            return res.json(resultado);
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message });
        }
    }

}

class BaneoController {

    /** PATCH /api/users/:id/banear */
    async banear(req: Request, res: Response) {

        try {

            const motivo = (req.body?.motivo ?? "").toString().trim().slice(0, 255);

            // Sin motivo el usuario nunca sabría por qué lo suspendieron, y el
            // administrador no podría justificar la decisión después.
            if (motivo.length < 10) {
                return res.status(422).json({
                    success: false,
                    message: "Indica el motivo de la suspensión (mínimo 10 caracteres)."
                });
            }

            const usuario = await moderacionUsuarioService.banear(
                Number(req.params.id),
                motivo,
                req.user!.id_usuario
            );

            return res.json({
                success: true,
                message: "Cuenta suspendida",
                data: usuario
            });

        } catch (error: any) {
            return res.status(400).json({ success: false, message: error.message });
        }

    }

    /** PATCH /api/users/:id/desbanear */
    async desbanear(req: Request, res: Response) {
        try {
            const usuario = await moderacionUsuarioService.desbanear(Number(req.params.id));
            return res.json({ success: true, message: "Suspensión levantada", data: usuario });
        } catch (error: any) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

}

export const notificacionController = new NotificacionController();
export const baneoController = new BaneoController();
