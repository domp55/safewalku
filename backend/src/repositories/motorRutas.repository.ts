import pool from "../config/database";
import { RowDataPacket } from "mysql2";

export interface ReporteRiesgoRow extends RowDataPacket {
    id_reporte: number;
    nivel_riesgo: "BAJO" | "MEDIO" | "ALTO";
    categoria: string;
    dias_transcurridos: number;
    latitud: string;
    longitud: string;
}

/** Ventana de tiempo en la que un reporte sigue influyendo en las rutas. */
export const DIAS_VIGENCIA_REPORTE = 90;

/** Horas que se conserva un cálculo antes de rehacerlo. */
export const HORAS_VIGENCIA_CACHE = 6;

class MotorRutasRepository {

    /**
     * Reportes que deben pesar en el cálculo de riesgo.
     *
     * Solo entran los VALIDADOS: si contaran los pendientes, cualquiera podría
     * alterar las rutas de todos los usuarios enviando reportes falsos. La
     * moderación del administrador es lo que sostiene la confianza del sistema.
     */
    async reportesVigentes(): Promise<ReporteRiesgoRow[]> {

        const [rows] = await pool.query<ReporteRiesgoRow[]>(
            `
            SELECT
                r.id_reporte,
                r.nivel_riesgo,
                r.categoria,
                DATEDIFF(NOW(), r.fecha_reporte) AS dias_transcurridos,
                c.latitud,
                c.longitud
            FROM reporte r
            INNER JOIN coordenada c ON c.id_ubicacion = r.id_ubicacion
            WHERE r.estado = 'VALIDADO'
              AND r.estado_registro = 'ACTIVO'
              AND r.fecha_reporte >= DATE_SUB(NOW(), INTERVAL ? DAY)
            `,
            [DIAS_VIGENCIA_REPORTE]
        );

        return rows;

    }

    async leerCache(hash: string): Promise<any | null> {

        const [rows] = await pool.query<RowDataPacket[]>(
            `
            SELECT respuesta_json
            FROM ruta_calculada
            WHERE hash_consulta = ?
              AND fecha_calculo >= DATE_SUB(NOW(), INTERVAL ? HOUR)
            `,
            [hash, HORAS_VIGENCIA_CACHE]
        );

        if (!rows.length) return null;

        try {
            const bruto = rows[0].respuesta_json;
            return typeof bruto === "string" ? JSON.parse(bruto) : bruto;
        } catch {
            // Una entrada corrupta no debe tumbar la petición: se recalcula.
            return null;
        }

    }

    async guardarCache(hash: string, respuesta: any): Promise<void> {

        await pool.query(
            `
            INSERT INTO ruta_calculada (hash_consulta, respuesta_json)
            VALUES (?, ?)
            ON DUPLICATE KEY UPDATE
                respuesta_json = VALUES(respuesta_json),
                fecha_calculo = CURRENT_TIMESTAMP
            `,
            [hash, JSON.stringify(respuesta)]
        );

    }

    async guardarHistorial(datos: {
        id_usuario: number;
        origen_lat: number;
        origen_lng: number;
        destino_lat: number;
        destino_lng: number;
        clasificacion_elegida: string;
        indice_riesgo: number;
    }): Promise<number> {

        const [result]: any = await pool.query(
            `
            INSERT INTO ruta_historial
                (id_usuario, origen_lat, origen_lng, destino_lat, destino_lng,
                 clasificacion_elegida, indice_riesgo)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            `,
            [
                datos.id_usuario,
                datos.origen_lat,
                datos.origen_lng,
                datos.destino_lat,
                datos.destino_lng,
                datos.clasificacion_elegida,
                datos.indice_riesgo
            ]
        );

        return result.insertId;

    }

}

export default new MotorRutasRepository();
