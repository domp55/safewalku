import { Request, Response } from "express";
import emergenciaService from "../services/emergencia.service";

class EmergenciaController {

    // ------------------------------------------------- Contactos personales

    async misContactos(req: Request, res: Response) {
        try {
            const contactos = await emergenciaService.listarContactos(req.user!.id_usuario);
            return res.json({ success: true, data: contactos });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    async crearContacto(req: Request, res: Response) {
        try {
            const contacto = await emergenciaService.crearContacto(req.user!.id_usuario, req.body);
            return res.status(201).json({
                success: true,
                message: "Contacto agregado",
                data: contacto
            });
        } catch (error: any) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async actualizarContacto(req: Request, res: Response) {
        try {
            const contacto = await emergenciaService.actualizarContacto(
                Number(req.params.id),
                req.user!.id_usuario,
                req.body
            );
            return res.json({ success: true, message: "Contacto actualizado", data: contacto });
        } catch (error: any) {
            return res.status(404).json({ success: false, message: error.message });
        }
    }

    async eliminarContacto(req: Request, res: Response) {
        try {
            const resultado = await emergenciaService.eliminarContacto(
                Number(req.params.id),
                req.user!.id_usuario
            );
            return res.json(resultado);
        } catch (error: any) {
            return res.status(404).json({ success: false, message: error.message });
        }
    }

    // ---------------------------------------------- Servicios de emergencia

    async listarServicios(_req: Request, res: Response) {
        try {
            const servicios = await emergenciaService.listarServicios();
            return res.json({ success: true, data: servicios });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message });
        }
    }

    async crearServicio(req: Request, res: Response) {
        try {
            const servicio = await emergenciaService.crearServicio(req.body);
            return res.status(201).json({ success: true, message: "Servicio creado", data: servicio });
        } catch (error: any) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    async actualizarServicio(req: Request, res: Response) {
        try {
            await emergenciaService.actualizarServicio(Number(req.params.id), req.body);
            return res.json({ success: true, message: "Servicio actualizado" });
        } catch (error: any) {
            return res.status(404).json({ success: false, message: error.message });
        }
    }

    async eliminarServicio(req: Request, res: Response) {
        try {
            const resultado = await emergenciaService.eliminarServicio(Number(req.params.id));
            return res.json(resultado);
        } catch (error: any) {
            return res.status(404).json({ success: false, message: error.message });
        }
    }

}

export default new EmergenciaController();
