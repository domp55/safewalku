import { Request, Response } from "express";
import zonaService from "../services/zona.service";

class ZonaController {

    async getAll(req: Request, res: Response) {

        try {

            const zonas = await zonaService.findAll({
                nivel: req.query.nivel as string | undefined,
                ciudad: req.query.ciudad as string | undefined,
                incluirInactivas: req.query.incluir_inactivas === "true"
            });

            return res.status(200).json({ success: true, data: zonas });

        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message });
        }

    }

    async getCercanas(req: Request, res: Response) {

        try {

            const lat = Number(req.query.lat);
            const lng = Number(req.query.lng);
            const radio = req.query.radio ? Number(req.query.radio) : 500;

            if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
                return res.status(400).json({
                    success: false,
                    message: "Parámetros lat y lng requeridos"
                });
            }

            const zonas = await zonaService.findCercanas(lat, lng, radio);

            return res.status(200).json({ success: true, data: zonas });

        } catch (error: any) {
            return res.status(400).json({ success: false, message: error.message });
        }

    }

    async evaluarPunto(req: Request, res: Response) {

        try {

            const lat = Number(req.query.lat);
            const lng = Number(req.query.lng);

            if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
                return res.status(400).json({
                    success: false,
                    message: "Parámetros lat y lng requeridos"
                });
            }

            const resultado = await zonaService.evaluarPunto(lat, lng);

            return res.status(200).json({ success: true, data: resultado });

        } catch (error: any) {
            return res.status(400).json({ success: false, message: error.message });
        }

    }

    async getImpacto(req: Request, res: Response) {

        try {
            const zonas = await zonaService.findAllConImpacto();
            return res.status(200).json({ success: true, data: zonas });
        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message });
        }

    }

    async getById(req: Request, res: Response) {

        try {
            const zona = await zonaService.findById(Number(req.params.id));
            return res.status(200).json({ success: true, data: zona });
        } catch (error: any) {
            return res.status(404).json({ success: false, message: error.message });
        }

    }

    async create(req: Request, res: Response) {

        try {

            const zona = await zonaService.create(req.body, req.user?.id_usuario ?? null);

            return res.status(201).json({
                success: true,
                message: "Zona creada correctamente",
                data: zona
            });

        } catch (error: any) {
            return res.status(400).json({ success: false, message: error.message });
        }

    }

    async update(req: Request, res: Response) {

        try {

            const zona = await zonaService.update(Number(req.params.id), req.body);

            return res.status(200).json({
                success: true,
                message: "Zona actualizada correctamente",
                data: zona
            });

        } catch (error: any) {
            return res.status(400).json({ success: false, message: error.message });
        }

    }

    async delete(req: Request, res: Response) {

        try {
            const resultado = await zonaService.delete(Number(req.params.id));
            return res.status(200).json(resultado);
        } catch (error: any) {
            return res.status(404).json({ success: false, message: error.message });
        }

    }

}

export default new ZonaController();
