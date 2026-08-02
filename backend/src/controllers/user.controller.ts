import { Request, Response } from "express";

import service from "../services/user.service";

class UserController {

    // Todos los métodos capturan sus errores. Sin el try/catch, una excepción
    // dentro de un handler async se convierte en un rechazo no manejado y Node
    // termina el proceso: un usuario inexistente bastaba para tumbar la API.

    async getAll(req: Request, res: Response) {

        try {

            const usuarios = await service.getAll();

            res.json(usuarios);

        } catch (error: any) {

            res.status(500).json({ success: false, message: error.message });

        }

    }

    async getById(req: Request, res: Response) {

        try {

            const usuario = await service.getById(

                Number(req.params.id)

            );

            if (!usuario) {

                return res.status(404).json({

                    message: "Usuario no encontrado"

                });

            }

            res.json(usuario);

        } catch (error: any) {

            res.status(500).json({ success: false, message: error.message });

        }

    }

    async update(req: Request, res: Response) {

        try {

            await service.update(

                Number(req.params.id),

                req.body

            );

            res.json({

                success: true,

                message: "Usuario actualizado correctamente"

            });

        } catch (error: any) {

            res.status(404).json({ success: false, message: error.message });

        }

    }

    /** GET /api/users/me — perfil propio con estadisticas reales. */
    async getMe(req: Request, res: Response) {
        try {
            const perfil = await service.getPerfil(req.user!.id_usuario);
            res.json({ success: true, data: perfil });
        } catch (error: any) {
            res.status(404).json({ success: false, message: error.message });
        }
    }

    async updateMe(req: Request, res: Response) {
        try {
            const id = (req as any).user.id_usuario;
            const updateData: any = {};
            
            if (req.body.name) {
                const parts = req.body.name.split(' ');
                updateData.nombre = parts[0];
                updateData.apellido = parts.slice(1).join(' ');
            }
            if (req.body.email) {
                updateData.correo = req.body.email;
            }
            if (req.body.nombre) updateData.nombre = req.body.nombre;
            if (req.body.apellido) updateData.apellido = req.body.apellido;
            if (req.body.correo) updateData.correo = req.body.correo;

            await service.update(id, updateData);

            res.json({ success: true, message: "Perfil actualizado correctamente" });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async delete(req: Request, res: Response) {

        try {

            await service.delete(

                Number(req.params.id)

            );

            res.json({

                success: true,

                message: "Usuario desactivado correctamente"

            });

        } catch (error: any) {

            res.status(404).json({ success: false, message: error.message });

        }

    }

    async uploadFoto(req: Request, res: Response) {

        try {

            const id = Number(req.params.id);

            if (!req.file) {
                return res.status(400).json({ success: false, message: "No se recibió ningún archivo." });
            }
            
            // Usar ruta relativa para evitar errores de Mixed Content en HTTPS
            const foto_url = `/uploads/${req.file.filename}`;
            
            const usuario = await service.updateFotoPerfil(id, foto_url);

            res.json({ success: true, data: usuario, foto_url });

        } catch (error: any) {

            res.status(500).json({ success: false, message: error.message });

        }

    }

}

export default new UserController();