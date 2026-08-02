import pool from "../config/database";
import { RowDataPacket } from "mysql2";
import repository from "../repositories/user.repository";

class UserService {

    async getAll() {

        return await repository.findAll();

    }

    async getById(id: number) {

        return await repository.findById(id);

    }

    async update(id: number, data: any) {

        return await repository.update(id, data);

    }

    async delete(id: number) {

        return await repository.delete(id);

    }

    /**
     * Perfil propio con sus estadisticas.
     *
     * Las cifras salen de contar en la base, no de valores fijos: antes la
     * pantalla mostraba "24 caminatas, 1 SOS, 3 reportes" a todo el mundo.
     */
    async getPerfil(idUsuario: number) {

        const [filas] = await pool.query<RowDataPacket[]>(
            `
            SELECT
                u.id_usuario, u.nombre, u.apellido, u.cedula, u.correo,
                u.telefono, u.carrera, u.matricula, u.rol, u.estado,
                u.fecha_registro, u.foto_perfil,

                (SELECT COUNT(*) FROM reporte r
                  WHERE r.id_usuario = u.id_usuario
                    AND r.tipo_reporte = 'INCIDENTE'
                    AND r.estado_registro = 'ACTIVO') AS total_reportes,

                (SELECT COUNT(*) FROM reporte r
                  WHERE r.id_usuario = u.id_usuario
                    AND r.tipo_reporte = 'SOS_PANICO'
                    AND r.estado_registro = 'ACTIVO') AS total_sos,

                (SELECT COUNT(*) FROM reporte r
                  WHERE r.id_usuario = u.id_usuario
                    AND r.estado = 'VALIDADO'
                    AND r.estado_registro = 'ACTIVO') AS reportes_validados,

                (SELECT COUNT(*) FROM ruta_historial h
                  WHERE h.id_usuario = u.id_usuario) AS total_rutas,

                (SELECT COUNT(*) FROM contactoemergencia c
                  WHERE c.id_usuario = u.id_usuario) AS total_contactos
            FROM usuario u
            WHERE u.id_usuario = ?
            `,
            [idUsuario]
        );

        const f = filas[0];

        if (!f) {
            throw new Error("Usuario no encontrado");
        }

        return {
            id_usuario: f.id_usuario,
            nombre: f.nombre,
            apellido: f.apellido,
            cedula: f.cedula,
            correo: f.correo,
            telefono: f.telefono,
            carrera: f.carrera,
            matricula: f.matricula,
            rol: f.rol,
            estado: f.estado,
            fecha_registro: f.fecha_registro,
            foto_perfil: f.foto_perfil,
            estadisticas: {
                reportes: Number(f.total_reportes),
                sos: Number(f.total_sos),
                validados: Number(f.reportes_validados),
                rutas: Number(f.total_rutas),
                contactos: Number(f.total_contactos)
            }
        };

    }

    async updateFotoPerfil(id: number, foto_perfil: string) {

        return await repository.updateFotoPerfil(id, foto_perfil);

    }

}

export default new UserService();