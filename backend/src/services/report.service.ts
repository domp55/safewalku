import pool from "../config/database";
import reportRepository from "../repositories/report.repository";
import ubicacionRepository from "../repositories/ubicacion.repository";
import notificacionService from "./notificacion.service";
import { coordenadaValida } from "../utils/geo";

class ReportService {

    async findAll() {

        return await reportRepository.findAll();

    }

    async findById(id: number) {

        const reporte = await reportRepository.findById(id);

        if (!reporte) {

            throw new Error("Reporte no encontrado");

        }

        return reporte;

    }

    async create(data: any) {

        return await reportRepository.create(data);

    }

    async update(id: number, data: any) {

        const reporte = await reportRepository.findById(id);

        if (!reporte) {

            throw new Error("Reporte no encontrado");

        }

        await reportRepository.update(id, data);

        return await reportRepository.findById(id);

    }

    async delete(id: number) {

        const reporte = await reportRepository.findById(id);

        if (!reporte) {

            throw new Error("Reporte no encontrado");

        }

        await reportRepository.delete(id);

        return {

            message: "Reporte eliminado correctamente"

        };

    }

    async findRiskZonesByCity(ciudad: string) {
        return await reportRepository.findRiskZonesByCity(ciudad);
    }

    /**
     * Activa una alerta SOS.
     *
     * Si llegan coordenadas, se crea la ubicación real del usuario en lugar de
     * usar un id fijo. Antes el frontend enviaba siempre id_ubicacion: 1, de
     * modo que todas las alertas de pánico aparecían en el mismo punto del
     * mapa: inservible para que seguridad supiera a dónde acudir.
     */
    async createSOS(data: any) {

        // Con id_ubicacion ya conocido no hace falta transacción: no se crea nada
        if (!coordenadaValida(data.latitud, data.longitud)) {

            if (!data.id_ubicacion) {
                throw new Error("Se requiere la ubicación para activar el SOS");
            }

            return await reportRepository.createSOS(data);

        }

        // Ubicación y alerta van juntas: si el INSERT del reporte falla, la
        // ubicación no debe quedar huérfana en la base.
        const conexion = await pool.getConnection();

        try {

            await conexion.beginTransaction();

            const idUbicacion = await ubicacionRepository.insertarConCoordenada(conexion, {
                nombre: `SOS ${new Date().toISOString()}`,
                direccion: data.direccion || "Ubicación reportada por GPS",
                ciudad: "Loja",
                tipo_zona: "CALLE",
                radio_metros: 50,
                latitud: Number(data.latitud),
                longitud: Number(data.longitud)
            });

            const [resultado]: any = await conexion.query(
                `
                INSERT INTO reporte
                    (descripcion, nivel_riesgo, estado, tipo_reporte, id_usuario, id_ubicacion)
                VALUES (?, 'ALTO', 'PENDIENTE', 'SOS_PANICO', ?, ?)
                `,
                [data.descripcion, data.id_usuario, idUbicacion]
            );

            await conexion.commit();

            // Una alerta de pánico es lo más urgente que puede llegarle al
            // administrador, así que también genera notificación.
            notificacionService.crear({
                tipo: "SOS_ACTIVADO",
                titulo: "Alerta SOS activada",
                detalle: `Coordenadas ${Number(data.latitud).toFixed(5)}, ${Number(data.longitud).toFixed(5)}`,
                id_reporte: resultado.insertId,
                id_usuario: data.id_usuario
            });

            return resultado.insertId;

        } catch (error) {

            await conexion.rollback();
            throw error;

        } finally {

            conexion.release();

        }

    }

    async cancelSOS(id: number) {
        const reporte = await reportRepository.findById(id);
        if (!reporte) throw new Error("Reporte no encontrado");
        await reportRepository.cancelSOS(id);
        return { message: "Alarma SOS cancelada" };
    }

}

export default new ReportService();