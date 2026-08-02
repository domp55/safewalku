import pool from "../config/database";
import { RowDataPacket } from "mysql2";
import { cajaEnvolvente } from "../utils/geo";

export interface ZonaRow extends RowDataPacket {
    id_zona: number;
    nombre: string;
    descripcion: string | null;
    sector: string | null;
    ciudad: string;
    nivel: "SEGURA" | "REGULAR" | "INSEGURA";
    peso_riesgo: string;
    centro_lat: string;
    centro_lng: string;
    radio_metros: number;
    franja_horaria: "DIURNO" | "NOCTURNO" | "AMBOS";
    factor_nocturno: string;
    fuente: string | null;
    estado: "ACTIVO" | "INACTIVO";
}

export interface FiltrosZona {
    nivel?: string;
    ciudad?: string;
    incluirInactivas?: boolean;
}

const COLUMNAS = `
    id_zona, nombre, descripcion, sector, ciudad, nivel, peso_riesgo,
    centro_lat, centro_lng, radio_metros, franja_horaria, factor_nocturno,
    fuente, estado, fecha_creacion, fecha_actualizacion
`;

class ZonaRepository {

    async findAll(filtros: FiltrosZona = {}): Promise<ZonaRow[]> {

        const condiciones: string[] = [];
        const valores: any[] = [];

        if (!filtros.incluirInactivas) {
            condiciones.push("estado = 'ACTIVO'");
        }

        if (filtros.nivel) {
            condiciones.push("nivel = ?");
            valores.push(filtros.nivel);
        }

        if (filtros.ciudad) {
            condiciones.push("ciudad = ?");
            valores.push(filtros.ciudad);
        }

        const where = condiciones.length ? `WHERE ${condiciones.join(" AND ")}` : "";

        const [rows] = await pool.query<ZonaRow[]>(
            `
            SELECT ${COLUMNAS}
            FROM zona_seguridad
            ${where}
            ORDER BY FIELD(nivel, 'INSEGURA', 'REGULAR', 'SEGURA'), nombre
            `,
            valores
        );

        return rows;

    }

    async findById(id: number): Promise<ZonaRow | undefined> {

        const [rows] = await pool.query<ZonaRow[]>(
            `SELECT ${COLUMNAS} FROM zona_seguridad WHERE id_zona = ?`,
            [id]
        );

        return rows[0];

    }

    /**
     * Zonas candidatas a contener un punto o a quedar dentro de un radio.
     *
     * Prefiltra con una caja envolvente para aprovechar el índice
     * (centro_lat, centro_lng). Devuelve de más a propósito: el filtro exacto
     * por distancia lo hace el servicio, porque una caja rectangular siempre
     * contiene a su círculo pero no al revés.
     */
    async findEnCaja(
        lat: number,
        lng: number,
        radioBusquedaMetros: number
    ): Promise<ZonaRow[]> {

        // Sumamos el radio máximo de zona para no descartar una zona cuyo centro
        // queda fuera de la caja pero cuyo borde sí alcanza al punto buscado.
        const [maxRadio] = await pool.query<RowDataPacket[]>(
            `SELECT COALESCE(MAX(radio_metros), 0) AS max_radio FROM zona_seguridad WHERE estado = 'ACTIVO'`
        );

        const margen = radioBusquedaMetros + Number(maxRadio[0].max_radio);
        const caja = cajaEnvolvente({ lat, lng }, margen);

        const [rows] = await pool.query<ZonaRow[]>(
            `
            SELECT ${COLUMNAS}
            FROM zona_seguridad
            WHERE estado = 'ACTIVO'
              AND centro_lat BETWEEN ? AND ?
              AND centro_lng BETWEEN ? AND ?
            `,
            [caja.latMin, caja.latMax, caja.lngMin, caja.lngMax]
        );

        return rows;

    }

    async create(zona: any, creadoPor: number | null): Promise<number> {

        const [result]: any = await pool.query(
            `
            INSERT INTO zona_seguridad
                (nombre, descripcion, sector, ciudad, nivel, peso_riesgo,
                 centro_lat, centro_lng, radio_metros, franja_horaria,
                 factor_nocturno, fuente, creado_por)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                zona.nombre,
                zona.descripcion ?? null,
                zona.sector ?? null,
                zona.ciudad ?? "Loja",
                zona.nivel,
                zona.peso_riesgo,
                zona.centro_lat,
                zona.centro_lng,
                zona.radio_metros,
                zona.franja_horaria ?? "AMBOS",
                zona.factor_nocturno ?? 1.0,
                zona.fuente ?? null,
                creadoPor
            ]
        );

        return result.insertId;

    }

    async update(id: number, zona: any): Promise<void> {

        await pool.query(
            `
            UPDATE zona_seguridad SET
                nombre = ?,
                descripcion = ?,
                sector = ?,
                ciudad = ?,
                nivel = ?,
                peso_riesgo = ?,
                centro_lat = ?,
                centro_lng = ?,
                radio_metros = ?,
                franja_horaria = ?,
                factor_nocturno = ?,
                fuente = ?,
                estado = ?
            WHERE id_zona = ?
            `,
            [
                zona.nombre,
                zona.descripcion ?? null,
                zona.sector ?? null,
                zona.ciudad ?? "Loja",
                zona.nivel,
                zona.peso_riesgo,
                zona.centro_lat,
                zona.centro_lng,
                zona.radio_metros,
                zona.franja_horaria ?? "AMBOS",
                zona.factor_nocturno ?? 1.0,
                zona.fuente ?? null,
                zona.estado ?? "ACTIVO",
                id
            ]
        );

    }

    /**
     * Baja lógica. No se borra la fila porque las rutas ya calculadas y el
     * historial se explican con las zonas que existían al momento del cálculo.
     */
    async softDelete(id: number): Promise<void> {

        await pool.query(
            `UPDATE zona_seguridad SET estado = 'INACTIVO' WHERE id_zona = ?`,
            [id]
        );

    }

    /**
     * Cuántos reportes validados caen dentro de cada zona.
     * Alimenta la vista de impacto del panel administrativo.
     */
    async contarReportesPorZona(): Promise<RowDataPacket[]> {

        // Haversine escrito a mano en vez de ST_Distance_Sphere: esa función
        // existe en MySQL 8 pero no en MariaDB, que es el motor que trae XAMPP.
        const [rows] = await pool.query<RowDataPacket[]>(
            `
            SELECT z.id_zona, COUNT(r.id_reporte) AS total_reportes
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
            `
        );

        return rows;

    }

}

export default new ZonaRepository();
