import pool from "../config/database";
import { RowDataPacket } from "mysql2";

import ubicacionRepository from "../repositories/ubicacion.repository";
import notificacionService from "./notificacion.service";
import { RIESGO_POR_CATEGORIA, Categoria } from "../schemas/reporteIncidente.schema";

/**
 * Creación de reportes de incidente con la ubicación que elige el usuario.
 *
 * Se separa del report.service existente, que gestiona el CRUD genérico y el
 * SOS, porque este flujo tiene una regla propia: la ubicación se crea junto con
 * el reporte y el nivel de riesgo lo decide el servidor, no el cliente.
 */

export interface DatosReporte {
    categoria: Categoria;
    descripcion: string;
    latitud: number;
    longitud: number;
    nombre_lugar?: string;
    direccion?: string;
    es_anonimo?: boolean;
}

class ReporteIncidenteService {

    async crear(datos: DatosReporte, idUsuario: number) {

        // El nivel de riesgo se deriva de la categoría en el servidor. Si
        // viniera del cliente, cualquiera podría marcar "iluminación
        // deficiente" como riesgo ALTO y distorsionar las rutas de todos.
        const nivelRiesgo = RIESGO_POR_CATEGORIA[datos.categoria];

        // Ubicación, coordenada y reporte van juntos en una sola transacción:
        // si el reporte falla, la ubicación no debe quedar suelta en la base.
        const conexion = await pool.getConnection();

        try {

            await conexion.beginTransaction();

            const idUbicacion = await ubicacionRepository.insertarConCoordenada(conexion, {
                nombre:
                    datos.nombre_lugar?.trim() ||
                    `Incidente ${datos.latitud.toFixed(5)}, ${datos.longitud.toFixed(5)}`,
                direccion: datos.direccion?.trim() || "Sin dirección registrada",
                ciudad: "Loja",
                tipo_zona: "CALLE",
                radio_metros: 50,
                latitud: datos.latitud,
                longitud: datos.longitud
            });

            const [resultado]: any = await conexion.query(
                `
                INSERT INTO reporte
                    (descripcion, categoria, nivel_riesgo, estado, tipo_reporte,
                     id_usuario, id_ubicacion, es_anonimo)
                VALUES (?, ?, ?, 'PENDIENTE', 'INCIDENTE', ?, ?, ?)
                `,
                [
                    datos.descripcion,
                    datos.categoria,
                    nivelRiesgo,
                    idUsuario,
                    idUbicacion,
                    datos.es_anonimo ? 1 : 0
                ]
            );

            await conexion.commit();

            const reporte: any = await this.obtenerPorId(resultado.insertId);

            // Fuera de la transacción y sin await bloqueante: si la
            // notificación falla, el reporte ya está guardado y eso es lo que
            // le importa al estudiante.
            notificacionService.crear({
                tipo: "REPORTE_NUEVO",
                titulo: `Nuevo reporte: ${datos.categoria.replace(/_/g, " ").toLowerCase()}`,
                detalle: `${reporte.ubicacion_nombre} · nivel ${nivelRiesgo}`,
                id_reporte: reporte.id_reporte,
                id_usuario: datos.es_anonimo ? null : idUsuario
            });

            return reporte;

        } catch (error) {

            await conexion.rollback();
            throw error;

        } finally {

            conexion.release();

        }

    }

    async obtenerPorId(id: number) {

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
                u.nombre AS ubicacion_nombre,
                u.direccion AS ubicacion_direccion,
                c.latitud,
                c.longitud
            FROM reporte r
            INNER JOIN ubicacion u ON u.id_ubicacion = r.id_ubicacion
            LEFT JOIN coordenada c ON c.id_ubicacion = u.id_ubicacion
            WHERE r.id_reporte = ?
            `,
            [id]
        );

        const fila = filas[0];

        if (!fila) {
            throw new Error("Reporte no encontrado");
        }

        return {
            ...fila,
            es_anonimo: Boolean(fila.es_anonimo),
            latitud: fila.latitud === null ? null : Number(fila.latitud),
            longitud: fila.longitud === null ? null : Number(fila.longitud)
        };

    }

    /** Reportes enviados por un usuario, para la sección "Mis reportes". */
    async listarDelUsuario(idUsuario: number) {

        const [filas] = await pool.query<RowDataPacket[]>(
            `
            SELECT
                r.id_reporte,
                r.descripcion,
                r.categoria,
                r.nivel_riesgo,
                r.estado,
                r.fecha_reporte,
                r.es_anonimo,
                u.nombre AS ubicacion_nombre,
                c.latitud,
                c.longitud
            FROM reporte r
            INNER JOIN ubicacion u ON u.id_ubicacion = r.id_ubicacion
            LEFT JOIN coordenada c ON c.id_ubicacion = u.id_ubicacion
            WHERE r.id_usuario = ?
              AND r.tipo_reporte = 'INCIDENTE'
              AND r.estado_registro = 'ACTIVO'
            ORDER BY r.fecha_reporte DESC
            `,
            [idUsuario]
        );

        return filas.map((f) => ({
            ...f,
            es_anonimo: Boolean(f.es_anonimo),
            latitud: f.latitud === null ? null : Number(f.latitud),
            longitud: f.longitud === null ? null : Number(f.longitud)
        }));

    }

}

export default new ReporteIncidenteService();
