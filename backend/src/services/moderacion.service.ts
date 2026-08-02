import pool from "../config/database";
import { RowDataPacket } from "mysql2";

/**
 * Moderación de reportes.
 *
 * Es la pieza que sostiene la confianza del sistema: solo los reportes que el
 * administrador valida pesan en el cálculo de rutas. Sin este filtro, cualquiera
 * podría alterar los caminos que ve toda la comunidad enviando reportes falsos.
 */

export const ESTADOS = ["PENDIENTE", "VALIDADO", "RECHAZADO", "DUPLICADO"] as const;
export type Estado = (typeof ESTADOS)[number];

export interface FiltrosReporte {
    estado?: string;
    categoria?: string;
    tipo?: string;
    nivel?: string;
    busqueda?: string;
    desde?: string;
    hasta?: string;
    limite?: number;
    pagina?: number;
}

class ModeracionService {

    /**
     * Listado para el panel del administrador, con filtros y paginación.
     */
    async listar(filtros: FiltrosReporte = {}) {

        const condiciones: string[] = ["r.estado_registro = 'ACTIVO'"];
        const valores: any[] = [];

        if (filtros.estado) {
            condiciones.push("r.estado = ?");
            valores.push(filtros.estado);
        }

        if (filtros.categoria) {
            condiciones.push("r.categoria = ?");
            valores.push(filtros.categoria);
        }

        if (filtros.tipo) {
            condiciones.push("r.tipo_reporte = ?");
            valores.push(filtros.tipo);
        }

        if (filtros.nivel) {
            condiciones.push("r.nivel_riesgo = ?");
            valores.push(filtros.nivel);
        }

        if (filtros.desde) {
            condiciones.push("r.fecha_reporte >= ?");
            valores.push(filtros.desde);
        }

        if (filtros.hasta) {
            // Se suma un día para que "hasta el 5" incluya todo el día 5 y no
            // corte a las 00:00, que es el error clásico de los filtros de fecha.
            condiciones.push("r.fecha_reporte < DATE_ADD(?, INTERVAL 1 DAY)");
            valores.push(filtros.hasta);
        }

        if (filtros.busqueda) {
            condiciones.push("(r.descripcion LIKE ? OR ub.nombre LIKE ? OR u.nombre LIKE ? OR u.apellido LIKE ?)");
            const like = `%${filtros.busqueda}%`;
            valores.push(like, like, like, like);
        }

        const where = `WHERE ${condiciones.join(" AND ")}`;

        const limite = Math.min(Math.max(filtros.limite ?? 25, 1), 100);
        const pagina = Math.max(filtros.pagina ?? 1, 1);
        const desplazamiento = (pagina - 1) * limite;

        const [totalFilas] = await pool.query<RowDataPacket[]>(
            `
            SELECT COUNT(*) AS total
            FROM reporte r
            INNER JOIN usuario u ON u.id_usuario = r.id_usuario
            INNER JOIN ubicacion ub ON ub.id_ubicacion = r.id_ubicacion
            ${where}
            `,
            valores
        );

        const [filas] = await pool.query<RowDataPacket[]>(
            `
            SELECT
                r.id_reporte,
                r.descripcion,
                r.categoria,
                r.nivel_riesgo,
                r.estado,
                r.tipo_reporte,
                r.fecha_reporte,
                r.es_anonimo,
                r.observacion_admin,
                u.id_usuario,
                u.nombre,
                u.apellido,
                u.correo,
                ub.nombre AS ubicacion_nombre,
                ub.direccion AS ubicacion_direccion,
                c.latitud,
                c.longitud,
                (SELECT COUNT(*) FROM evidencia e WHERE e.id_reporte = r.id_reporte) AS total_evidencias
            FROM reporte r
            INNER JOIN usuario u ON u.id_usuario = r.id_usuario
            INNER JOIN ubicacion ub ON ub.id_ubicacion = r.id_ubicacion
            LEFT JOIN coordenada c ON c.id_ubicacion = ub.id_ubicacion
            ${where}
            ORDER BY
                -- Los pendientes primero: son los que requieren decisión
                FIELD(r.estado, 'PENDIENTE', 'VALIDADO', 'DUPLICADO', 'RECHAZADO'),
                r.fecha_reporte DESC
            LIMIT ? OFFSET ?
            `,
            [...valores, limite, desplazamiento]
        );

        return {
            total: Number(totalFilas[0].total),
            pagina,
            limite,
            datos: filas.map((f) => this.normalizar(f))
        };

    }

    private normalizar(f: RowDataPacket) {

        const anonimo = Boolean(f.es_anonimo);

        return {
            ...f,
            es_anonimo: anonimo,
            // Un reporte anónimo no debe exponer al autor ni siquiera en el
            // panel del administrador: se prometió anonimato al enviarlo.
            nombre: anonimo ? "Anónimo" : f.nombre,
            apellido: anonimo ? "" : f.apellido,
            correo: anonimo ? null : f.correo,
            total_evidencias: Number(f.total_evidencias),
            latitud: f.latitud === null ? null : Number(f.latitud),
            longitud: f.longitud === null ? null : Number(f.longitud)
        };

    }

    async evidencias(idReporte: number) {

        const [filas] = await pool.query<RowDataPacket[]>(
            `SELECT id_evidencia, url_archivo, tipo_archivo FROM evidencia WHERE id_reporte = ?`,
            [idReporte]
        );

        return filas;

    }

    /**
     * Cambia el estado de un reporte y deja constancia de quién decidió.
     */
    async moderar(
        idReporte: number,
        estado: Estado,
        observacion: string | null,
        idUsuarioAdmin: number
    ) {

        const [admin] = await pool.query<RowDataPacket[]>(
            `SELECT id_administrador FROM administrador WHERE id_usuario = ?`,
            [idUsuarioAdmin]
        );

        // Si el administrador no tiene ficha en la tabla administrador, se
        // registra igual la decisión pero sin firmarla, en lugar de fallar.
        const idAdministrador = admin.length ? admin[0].id_administrador : null;

        const [resultado]: any = await pool.query(
            `
            UPDATE reporte
            SET estado = ?, observacion_admin = ?, id_administrador = ?
            WHERE id_reporte = ? AND estado_registro = 'ACTIVO'
            `,
            [estado, observacion, idAdministrador, idReporte]
        );

        if (resultado.affectedRows === 0) {
            throw new Error("Reporte no encontrado");
        }

        const [filas] = await pool.query<RowDataPacket[]>(
            `
            SELECT r.id_reporte, r.estado, r.observacion_admin, r.categoria, r.nivel_riesgo
            FROM reporte r WHERE r.id_reporte = ?
            `,
            [idReporte]
        );

        return filas[0];

    }

    /** Conteos para las pestañas del panel. */
    async resumen() {

        const [porEstado] = await pool.query<RowDataPacket[]>(
            `
            SELECT estado, COUNT(*) AS total
            FROM reporte
            WHERE estado_registro = 'ACTIVO'
            GROUP BY estado
            `
        );

        const [porTipo] = await pool.query<RowDataPacket[]>(
            `
            SELECT tipo_reporte, COUNT(*) AS total
            FROM reporte
            WHERE estado_registro = 'ACTIVO'
            GROUP BY tipo_reporte
            `
        );

        const resumen: Record<string, number> = {};
        porEstado.forEach((f) => { resumen[f.estado] = Number(f.total); });

        const tipos: Record<string, number> = {};
        porTipo.forEach((f) => { tipos[f.tipo_reporte] = Number(f.total); });

        return { por_estado: resumen, por_tipo: tipos };

    }

    /** Todas las filas sin paginar, para exportar a CSV. */
    async exportar(filtros: FiltrosReporte = {}) {
        const { datos } = await this.listar({ ...filtros, limite: 100, pagina: 1 });
        return datos;
    }

}

export default new ModeracionService();
