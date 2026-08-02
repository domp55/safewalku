import ubicacionRepository from "../repositories/ubicacion.repository";
import { coordenadaValida } from "../utils/geo";

export interface UbicacionResultado {
    id_ubicacion: number;
    nombre: string;
    direccion: string;
    ciudad: string;
    radio_metros: number;
    tipo_zona: string;
    latitud: number;
    longitud: number;
}

class UbicacionService {

    async searchUbicaciones(query: string): Promise<UbicacionResultado[]> {

        if (!query || query.trim().length < 3) {
            return [];
        }

        const rows = await ubicacionRepository.findByQuery(query.trim());

        // MySQL devuelve las columnas DECIMAL como texto. Las convertimos aquí para que
        // el frontend reciba números listos para usar en el mapa.
        return rows.map((row) => ({
            id_ubicacion: row.id_ubicacion,
            nombre: row.nombre,
            direccion: row.direccion,
            ciudad: row.ciudad,
            radio_metros: row.radio_metros,
            tipo_zona: row.tipo_zona,
            latitud: Number(row.latitud),
            longitud: Number(row.longitud)
        }));

    }

    /**
     * Registra un punto elegido por el usuario para poder asociarle un reporte.
     */
    async crear(datos: any): Promise<number> {

        const lat = Number(datos.latitud);
        const lng = Number(datos.longitud);

        if (!coordenadaValida(lat, lng)) {
            throw new Error("Coordenadas inválidas");
        }

        const nombre = (datos.nombre ?? "").toString().trim();

        return await ubicacionRepository.crearConCoordenada({
            // Sin nombre el registro sería ilegible en el panel del admin, así
            // que caemos a las coordenadas antes que guardar una cadena vacía.
            nombre: nombre || `Punto ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
            direccion: (datos.direccion ?? "").toString().trim() || "Sin dirección registrada",
            ciudad: datos.ciudad ?? "Loja",
            tipo_zona: datos.tipo_zona ?? "CALLE",
            radio_metros: datos.radio_metros ?? 50,
            latitud: lat,
            longitud: lng
        });

    }

}

export default new UbicacionService();
