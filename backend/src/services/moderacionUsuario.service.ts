import pool from "../config/database";
import { RowDataPacket } from "mysql2";

/**
 * Sanciones sobre cuentas de usuario.
 *
 * Se separa de user.service, que hace el CRUD corriente, porque banear no es
 * "editar un usuario": lleva motivo, autor y fecha, y tiene reglas propias
 * sobre a quién se puede aplicar.
 */

class ModeracionUsuarioService {

    /**
     * Suspende una cuenta por mal uso del sistema.
     */
    async banear(idUsuario: number, motivo: string, idAdmin: number) {

        if (idUsuario === idAdmin) {
            throw new Error("No puedes banear tu propia cuenta.");
        }

        const [filas] = await pool.query<RowDataPacket[]>(
            "SELECT id_usuario, rol, estado FROM usuario WHERE id_usuario = ?",
            [idUsuario]
        );

        const usuario = filas[0];

        if (!usuario) {
            throw new Error("Usuario no encontrado");
        }

        // Un administrador no puede banear a otro. Si un administrador comete
        // un abuso, la respuesta es retirarle el cargo en la base, no dejar que
        // se sancionen entre ellos y acaben todos bloqueados.
        if (usuario.rol === "ADMINISTRADOR") {
            throw new Error("No se puede banear a un administrador.");
        }

        if (usuario.estado === "BANEADO") {
            throw new Error("Esa cuenta ya está suspendida.");
        }

        await pool.query(
            `
            UPDATE usuario
            SET estado = 'BANEADO',
                motivo_baneo = ?,
                fecha_baneo = NOW(),
                baneado_por = ?
            WHERE id_usuario = ?
            `,
            [motivo, idAdmin, idUsuario]
        );

        return await this.obtener(idUsuario);

    }

    /** Levanta la suspensión y borra el rastro del motivo. */
    async desbanear(idUsuario: number) {

        const [resultado]: any = await pool.query(
            `
            UPDATE usuario
            SET estado = 'ACTIVO',
                motivo_baneo = NULL,
                fecha_baneo = NULL,
                baneado_por = NULL
            WHERE id_usuario = ? AND estado = 'BANEADO'
            `,
            [idUsuario]
        );

        if (resultado.affectedRows === 0) {
            throw new Error("Esa cuenta no está suspendida.");
        }

        return await this.obtener(idUsuario);

    }

    async obtener(idUsuario: number) {

        const [filas] = await pool.query<RowDataPacket[]>(
            `
            SELECT
                u.id_usuario, u.nombre, u.apellido, u.correo, u.rol, u.estado,
                u.motivo_baneo, u.fecha_baneo,
                a.nombre AS baneado_por_nombre
            FROM usuario u
            LEFT JOIN usuario a ON a.id_usuario = u.baneado_por
            WHERE u.id_usuario = ?
            `,
            [idUsuario]
        );

        if (!filas.length) {
            throw new Error("Usuario no encontrado");
        }

        return filas[0];

    }

}

export default new ModeracionUsuarioService();
