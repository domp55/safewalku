import pool from "../config/database";
import { RowDataPacket } from "mysql2";

export interface UbicacionRow extends RowDataPacket {
    id_ubicacion: number;
    nombre: string;
    direccion: string;
    ciudad: string;
    radio_metros: number;
    tipo_zona: string;
    latitud: string;
    longitud: string;
}

class UbicacionRepository {

    async findByQuery(query: string): Promise<UbicacionRow[]> {

        const like = `%${query}%`;

        // Usamos INNER JOIN a propósito: una ubicación sin coordenada no sirve como
        // destino porque no se le puede trazar una ruta, así que mejor no ofrecerla.
        const [rows] = await pool.query<UbicacionRow[]>(
            `
            SELECT
                u.id_ubicacion,
                u.nombre,
                u.direccion,
                u.ciudad,
                u.radio_metros,
                u.tipo_zona,
                c.latitud,
                c.longitud
            FROM ubicacion u
            INNER JOIN coordenada c ON c.id_ubicacion = u.id_ubicacion
            WHERE u.nombre LIKE ? OR u.direccion LIKE ?
            ORDER BY u.nombre
            LIMIT 10
            `,
            [like, like]
        );

        return rows;

    }

    /**
     * Inserta ubicación y coordenada usando una conexión ya abierta.
     *
     * Existe para que quien crea un reporte pueda meter la ubicación dentro de
     * su propia transacción. Sin esto, si el INSERT del reporte falla queda una
     * ubicación huérfana que nadie va a usar ni detectar; comprobado en
     * pruebas, no es hipotético.
     */
    async insertarConCoordenada(
        conexion: any,
        datos: {
            nombre: string;
            direccion: string;
            ciudad?: string;
            tipo_zona?: string;
            radio_metros?: number;
            latitud: number;
            longitud: number;
        }
    ): Promise<number> {

        const [resUbicacion]: any = await conexion.query(
            `
            INSERT INTO ubicacion (nombre, direccion, ciudad, radio_metros, tipo_zona)
            VALUES (?, ?, ?, ?, ?)
            `,
            [
                datos.nombre,
                datos.direccion,
                datos.ciudad ?? "Loja",
                datos.radio_metros ?? 50,
                datos.tipo_zona ?? "CALLE"
            ]
        );

        const idUbicacion = resUbicacion.insertId;

        await conexion.query(
            `INSERT INTO coordenada (latitud, longitud, id_ubicacion) VALUES (?, ?, ?)`,
            [datos.latitud, datos.longitud, idUbicacion]
        );

        return idUbicacion;

    }

    /** Igual que el anterior, pero abriendo su propia transacción. */
    async crearConCoordenada(datos: {
        nombre: string;
        direccion: string;
        ciudad?: string;
        tipo_zona?: string;
        radio_metros?: number;
        latitud: number;
        longitud: number;
    }): Promise<number> {

        const conexion = await pool.getConnection();

        try {

            await conexion.beginTransaction();

            const [resUbicacion]: any = await conexion.query(
                `
                INSERT INTO ubicacion (nombre, direccion, ciudad, radio_metros, tipo_zona)
                VALUES (?, ?, ?, ?, ?)
                `,
                [
                    datos.nombre,
                    datos.direccion,
                    datos.ciudad ?? "Loja",
                    datos.radio_metros ?? 50,
                    datos.tipo_zona ?? "CALLE"
                ]
            );

            const idUbicacion = resUbicacion.insertId;

            await conexion.query(
                `INSERT INTO coordenada (latitud, longitud, id_ubicacion) VALUES (?, ?, ?)`,
                [datos.latitud, datos.longitud, idUbicacion]
            );

            await conexion.commit();

            return idUbicacion;

        } catch (error) {

            await conexion.rollback();
            throw error;

        } finally {

            conexion.release();

        }

    }

}

export default new UbicacionRepository();
