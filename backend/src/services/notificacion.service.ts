import pool from "../config/database";
import { RowDataPacket } from "mysql2";

/**
 * Notificaciones para el administrador.
 *
 * Se generan al crear reportes y alertas SOS. La escritura nunca debe tumbar la
 * operación que la origina: si falla al registrar la notificación de un SOS, el
 * SOS ya se guardó y eso es lo que importa.
 */

export type TipoNotificacion = "REPORTE_NUEVO" | "SOS_ACTIVADO" | "USUARIO_NUEVO";

class NotificacionService {

    /**
     * Registra una notificación sin propagar errores.
     *
     * Devuelve el id o null. Quien la llama no necesita comprobar nada: es
     * deliberadamente "dispara y olvida".
     */
    async crear(datos: {
        tipo: TipoNotificacion;
        titulo: string;
        detalle?: string | null;
        id_reporte?: number | null;
        id_usuario?: number | null;
    }): Promise<number | null> {

        try {

            const [resultado]: any = await pool.query(
                `
                INSERT INTO notificacion_admin (tipo, titulo, detalle, id_reporte, id_usuario)
                VALUES (?, ?, ?, ?, ?)
                `,
                [
                    datos.tipo,
                    datos.titulo.slice(0, 150),
                    datos.detalle?.slice(0, 255) ?? null,
                    datos.id_reporte ?? null,
                    datos.id_usuario ?? null
                ]
            );

            return resultado.insertId;

        } catch (error) {
            console.error("No se pudo registrar la notificación:", error);
            return null;
        }

    }

    async listar(soloNoLeidas = false, limite = 30) {

        const tope = Math.min(Math.max(limite, 1), 100);

        const [filas] = await pool.query<RowDataPacket[]>(
            `
            SELECT
                n.id_notificacion, n.tipo, n.titulo, n.detalle,
                n.id_reporte, n.leida, n.fecha,
                r.estado AS estado_reporte,
                r.nivel_riesgo
            FROM notificacion_admin n
            LEFT JOIN reporte r ON r.id_reporte = n.id_reporte
            ${soloNoLeidas ? "WHERE n.leida = 0" : ""}
            -- Las no leídas primero y, dentro de ellas, las alertas SOS por
            -- delante: una llamada de auxilio no puede quedar debajo de un
            -- aviso de iluminación deficiente solo porque llegó un segundo
            -- antes. A igualdad de urgencia manda la fecha.
            ORDER BY
                n.leida ASC,
                FIELD(n.tipo, 'SOS_ACTIVADO', 'REPORTE_NUEVO', 'USUARIO_NUEVO'),
                n.fecha DESC
            LIMIT ?
            `,
            [tope]
        );

        return filas.map((f) => ({ ...f, leida: Boolean(f.leida) }));

    }

    async contarNoLeidas(): Promise<number> {

        const [filas] = await pool.query<RowDataPacket[]>(
            "SELECT COUNT(*) AS total FROM notificacion_admin WHERE leida = 0"
        );

        return Number(filas[0].total);

    }

    async marcarLeida(id: number) {

        const [resultado]: any = await pool.query(
            "UPDATE notificacion_admin SET leida = 1 WHERE id_notificacion = ?",
            [id]
        );

        if (resultado.affectedRows === 0) {
            throw new Error("Notificación no encontrada");
        }

        return { success: true };

    }

    async marcarTodasLeidas() {

        const [resultado]: any = await pool.query(
            "UPDATE notificacion_admin SET leida = 1 WHERE leida = 0"
        );

        return { success: true, actualizadas: resultado.affectedRows };

    }

}

export default new NotificacionService();
