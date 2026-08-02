import pool from "../config/database";
import { RowDataPacket } from "mysql2";

/**
 * Datos agregados del panel administrativo.
 *
 * Todas las cifras salen de consultas reales. Las tendencias se calculan
 * comparando contra el periodo anterior de la misma duración, no contra un
 * valor fijo: un "+12%" escrito a mano no le sirve a nadie para decidir nada.
 */

/** Ventana por defecto para tendencias y series temporales. */
const DIAS_PERIODO = 30;

class DashboardService {

    /**
     * Tarjetas superiores, con su variación respecto al periodo anterior.
     */
    async getMetrics() {

        const [filas] = await pool.query<RowDataPacket[]>(
            `
            SELECT
                (SELECT COUNT(*) FROM reporte WHERE estado_registro='ACTIVO') AS total_reportes,

                (SELECT COUNT(*) FROM reporte
                  WHERE tipo_reporte='SOS_PANICO' AND estado='PENDIENTE'
                    AND estado_registro='ACTIVO') AS sos_activos,

                (SELECT COUNT(*) FROM usuario WHERE estado='ACTIVO') AS usuarios_activos,

                (SELECT COUNT(*) FROM zona_seguridad
                  WHERE nivel='INSEGURA' AND estado='ACTIVO') AS zonas_riesgo,

                (SELECT COUNT(*) FROM reporte
                  WHERE estado='PENDIENTE' AND estado_registro='ACTIVO') AS pendientes,

                (SELECT COUNT(*) FROM reporte
                  WHERE estado_registro='ACTIVO'
                    AND fecha_reporte >= DATE_SUB(NOW(), INTERVAL ? DAY)) AS reportes_periodo,

                (SELECT COUNT(*) FROM reporte
                  WHERE estado_registro='ACTIVO'
                    AND fecha_reporte >= DATE_SUB(NOW(), INTERVAL ? DAY)
                    AND fecha_reporte <  DATE_SUB(NOW(), INTERVAL ? DAY)) AS reportes_previo,

                (SELECT COUNT(*) FROM usuario
                  WHERE fecha_registro >= DATE_SUB(NOW(), INTERVAL ? DAY)) AS usuarios_periodo,

                (SELECT COUNT(*) FROM usuario
                  WHERE fecha_registro >= DATE_SUB(NOW(), INTERVAL ? DAY)
                    AND fecha_registro <  DATE_SUB(NOW(), INTERVAL ? DAY)) AS usuarios_previo
            `,
            [
                DIAS_PERIODO,
                DIAS_PERIODO * 2, DIAS_PERIODO,
                DIAS_PERIODO,
                DIAS_PERIODO * 2, DIAS_PERIODO
            ]
        );

        const f = filas[0];

        return {
            totalReportes: Number(f.total_reportes),
            sosActivos: Number(f.sos_activos),
            usuariosRegistrados: Number(f.usuarios_activos),
            rutasRiesgo: Number(f.zonas_riesgo),
            pendientes: Number(f.pendientes),
            tendencias: {
                reportes: this.variacion(Number(f.reportes_periodo), Number(f.reportes_previo)),
                usuarios: this.variacion(Number(f.usuarios_periodo), Number(f.usuarios_previo))
            },
            dias_periodo: DIAS_PERIODO
        };

    }

    /**
     * Variación porcentual frente al periodo anterior.
     *
     * Con el periodo previo en cero no se devuelve porcentaje: dividir entre
     * cero da infinito, y mostrar "+100%" sería igual de engañoso. En ese caso
     * se informa solo el valor absoluto y la interfaz decide qué escribir.
     */
    private variacion(actual: number, previo: number) {

        if (previo === 0) {
            return { actual, previo, porcentaje: null as number | null, sube: actual > 0 };
        }

        const porcentaje = Math.round(((actual - previo) / previo) * 100);

        return { actual, previo, porcentaje, sube: porcentaje >= 0 };

    }

    /** Reparto de reportes por estado, para el gráfico circular. */
    async porEstado() {

        const [filas] = await pool.query<RowDataPacket[]>(
            `
            SELECT estado, COUNT(*) AS total
            FROM reporte
            WHERE estado_registro='ACTIVO'
            GROUP BY estado
            ORDER BY total DESC
            `
        );

        const total = filas.reduce((a, f) => a + Number(f.total), 0);

        return {
            total,
            datos: filas.map((f) => ({
                estado: f.estado,
                total: Number(f.total),
                porcentaje: total ? Math.round((Number(f.total) / total) * 100) : 0
            }))
        };

    }

    /** Incidentes por categoría, para el gráfico de barras. */
    async porCategoria() {

        const [filas] = await pool.query<RowDataPacket[]>(
            `
            SELECT categoria, COUNT(*) AS total
            FROM reporte
            WHERE estado_registro='ACTIVO' AND tipo_reporte='INCIDENTE'
            GROUP BY categoria
            ORDER BY total DESC
            `
        );

        return filas.map((f) => ({ categoria: f.categoria, total: Number(f.total) }));

    }

    /**
     * Serie diaria de los últimos días.
     *
     * Los días sin reportes se rellenan con cero. Si se devolvieran solo los
     * días con actividad, la gráfica comprimiría el tiempo y sugeriría una
     * frecuencia de incidentes que no existe.
     */
    async porDia(dias = 14) {

        const tope = Math.min(Math.max(dias, 1), 90);

        const [filas] = await pool.query<RowDataPacket[]>(
            `
            SELECT DATE(fecha_reporte) AS dia, COUNT(*) AS total
            FROM reporte
            WHERE estado_registro='ACTIVO'
              AND fecha_reporte >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
            GROUP BY DATE(fecha_reporte)
            ORDER BY dia
            `,
            [tope]
        );

        const porFecha = new Map<string, number>();
        filas.forEach((f) => {
            const clave = new Date(f.dia).toISOString().slice(0, 10);
            porFecha.set(clave, Number(f.total));
        });

        const serie: { dia: string; total: number }[] = [];
        const hoy = new Date();

        for (let i = tope; i >= 0; i--) {
            const fecha = new Date(hoy);
            fecha.setDate(hoy.getDate() - i);
            const clave = fecha.toISOString().slice(0, 10);
            serie.push({ dia: clave, total: porFecha.get(clave) ?? 0 });
        }

        return serie;

    }

    /** Reportes situados en el mapa, para el mapa de calor. */
    async puntosMapa(limite = 200) {

        const tope = Math.min(Math.max(limite, 1), 500);

        const [filas] = await pool.query<RowDataPacket[]>(
            `
            SELECT
                r.id_reporte, r.categoria, r.nivel_riesgo, r.estado, r.tipo_reporte,
                u.nombre AS ubicacion_nombre,
                c.latitud, c.longitud
            FROM reporte r
            INNER JOIN ubicacion u ON u.id_ubicacion = r.id_ubicacion
            INNER JOIN coordenada c ON c.id_ubicacion = u.id_ubicacion
            WHERE r.estado_registro='ACTIVO'
              AND r.estado IN ('VALIDADO','PENDIENTE')
            ORDER BY r.fecha_reporte DESC
            LIMIT ?
            `,
            [tope]
        );

        return filas.map((f) => ({
            id_reporte: f.id_reporte,
            categoria: f.categoria,
            nivel_riesgo: f.nivel_riesgo,
            estado: f.estado,
            tipo_reporte: f.tipo_reporte,
            ubicacion_nombre: f.ubicacion_nombre,
            latitud: Number(f.latitud),
            longitud: Number(f.longitud)
        }));

    }

    /** Zonas con más reportes validados dentro, para el ranking. */
    async zonasMasReportadas(limite = 5) {

        const tope = Math.min(Math.max(limite, 1), 20);

        // Haversine a mano y no ST_Distance_Sphere: esa función existe en
        // MySQL 8 pero no en MariaDB, que es el motor que trae XAMPP.
        const [filas] = await pool.query<RowDataPacket[]>(
            `
            SELECT
                z.id_zona, z.nombre, z.nivel, z.sector,
                COUNT(r.id_reporte) AS total_reportes
            FROM zona_seguridad z
            LEFT JOIN coordenada c
                ON (6371008.8 * 2 * ASIN(SQRT(
                       POWER(SIN(RADIANS(c.latitud - z.centro_lat) / 2), 2) +
                       COS(RADIANS(z.centro_lat)) * COS(RADIANS(c.latitud)) *
                       POWER(SIN(RADIANS(c.longitud - z.centro_lng) / 2), 2)
                   ))) <= z.radio_metros
            LEFT JOIN reporte r
                ON r.id_ubicacion = c.id_ubicacion
               AND r.estado = 'VALIDADO'
               AND r.estado_registro = 'ACTIVO'
            WHERE z.estado = 'ACTIVO'
            GROUP BY z.id_zona
            HAVING total_reportes > 0
            ORDER BY total_reportes DESC
            LIMIT ?
            `,
            [tope]
        );

        return filas.map((f) => ({
            id_zona: f.id_zona,
            nombre: f.nombre,
            nivel: f.nivel,
            sector: f.sector,
            total_reportes: Number(f.total_reportes)
        }));

    }

    /** Todo lo que necesita el panel, en una sola llamada. */
    async resumenCompleto() {

        const [metricas, estado, categoria, serie, puntos, zonas] = await Promise.all([
            this.getMetrics(),
            this.porEstado(),
            this.porCategoria(),
            this.porDia(14),
            this.puntosMapa(),
            this.zonasMasReportadas()
        ]);

        return { metricas, estado, categoria, serie, puntos, zonas };

    }

}

export default new DashboardService();
