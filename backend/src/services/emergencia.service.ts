import pool from "../config/database";
import { RowDataPacket } from "mysql2";

/**
 * Contactos de emergencia personales y servicios públicos de auxilio.
 *
 * Son dos cosas distintas aunque compartan pantalla: los servicios los gestiona
 * el administrador y los ve todo el mundo; los contactos son privados de cada
 * estudiante y nunca deben cruzarse entre usuarios.
 */

export const PARENTESCOS = [
    "PADRE",
    "MADRE",
    "HERMANO",
    "HERMANA",
    "AMIGO",
    "PAREJA",
    "OTRO"
] as const;

class EmergenciaService {

    // ------------------------------------------------- Contactos personales

    async listarContactos(idUsuario: number) {

        const [filas] = await pool.query<RowDataPacket[]>(
            `
            SELECT id_contacto, nombre, telefono, parentesco
            FROM contactoemergencia
            WHERE id_usuario = ?
            ORDER BY nombre
            `,
            [idUsuario]
        );

        return filas;

    }

    async crearContacto(idUsuario: number, datos: any) {

        const [resultado]: any = await pool.query(
            `
            INSERT INTO contactoemergencia (nombre, telefono, parentesco, id_usuario)
            VALUES (?, ?, ?, ?)
            `,
            [datos.nombre.trim(), datos.telefono.trim(), datos.parentesco, idUsuario]
        );

        return await this.obtenerContacto(resultado.insertId, idUsuario);

    }

    /**
     * Busca un contacto exigiendo que sea del usuario indicado.
     *
     * El id_usuario va en el WHERE y no en una comprobación posterior a
     * propósito: así no existe forma de leer ni tocar el contacto de otro
     * aunque se adivine el identificador.
     */
    async obtenerContacto(idContacto: number, idUsuario: number) {

        const [filas] = await pool.query<RowDataPacket[]>(
            `
            SELECT id_contacto, nombre, telefono, parentesco
            FROM contactoemergencia
            WHERE id_contacto = ? AND id_usuario = ?
            `,
            [idContacto, idUsuario]
        );

        if (!filas.length) {
            throw new Error("Contacto no encontrado");
        }

        return filas[0];

    }

    async actualizarContacto(idContacto: number, idUsuario: number, datos: any) {

        await this.obtenerContacto(idContacto, idUsuario);

        await pool.query(
            `
            UPDATE contactoemergencia
            SET nombre = ?, telefono = ?, parentesco = ?
            WHERE id_contacto = ? AND id_usuario = ?
            `,
            [datos.nombre.trim(), datos.telefono.trim(), datos.parentesco, idContacto, idUsuario]
        );

        return await this.obtenerContacto(idContacto, idUsuario);

    }

    async eliminarContacto(idContacto: number, idUsuario: number) {

        await this.obtenerContacto(idContacto, idUsuario);

        // compartirubicacion referencia al contacto, así que se limpia primero
        // para no chocar con la clave foránea.
        await pool.query(`DELETE FROM compartirubicacion WHERE id_contacto = ?`, [idContacto]);

        await pool.query(
            `DELETE FROM contactoemergencia WHERE id_contacto = ? AND id_usuario = ?`,
            [idContacto, idUsuario]
        );

        return { success: true, message: "Contacto eliminado" };

    }

    // ---------------------------------------------- Servicios de emergencia

    async listarServicios() {

        const [filas] = await pool.query<RowDataPacket[]>(
            `
            SELECT
                s.id_servicio,
                s.nombre,
                s.tipo,
                s.telefono,
                u.nombre AS ubicacion_nombre,
                u.direccion,
                c.latitud,
                c.longitud
            FROM servicioemergencia s
            LEFT JOIN ubicacion u ON u.id_ubicacion = s.id_ubicacion
            LEFT JOIN coordenada c ON c.id_ubicacion = s.id_ubicacion
            ORDER BY FIELD(s.tipo, 'POLICIA', 'UPC', 'BOMBEROS', 'HOSPITAL'), s.nombre
            `
        );

        return filas.map((f) => ({
            ...f,
            latitud: f.latitud === null ? null : Number(f.latitud),
            longitud: f.longitud === null ? null : Number(f.longitud)
        }));

    }

    async crearServicio(datos: any) {

        const [resultado]: any = await pool.query(
            `
            INSERT INTO servicioemergencia (nombre, tipo, telefono, id_ubicacion)
            VALUES (?, ?, ?, ?)
            `,
            [datos.nombre.trim(), datos.tipo, datos.telefono.trim(), datos.id_ubicacion]
        );

        return { id_servicio: resultado.insertId };

    }

    async actualizarServicio(id: number, datos: any) {

        const [resultado]: any = await pool.query(
            `
            UPDATE servicioemergencia
            SET nombre = ?, tipo = ?, telefono = ?, id_ubicacion = ?
            WHERE id_servicio = ?
            `,
            [datos.nombre.trim(), datos.tipo, datos.telefono.trim(), datos.id_ubicacion, id]
        );

        if (resultado.affectedRows === 0) {
            throw new Error("Servicio no encontrado");
        }

        return { success: true };

    }

    async eliminarServicio(id: number) {

        const [resultado]: any = await pool.query(
            `DELETE FROM servicioemergencia WHERE id_servicio = ?`,
            [id]
        );

        if (resultado.affectedRows === 0) {
            throw new Error("Servicio no encontrado");
        }

        return { success: true, message: "Servicio eliminado" };

    }

}

export default new EmergenciaService();
