import { Request, Response } from "express";
import ubicacionService from "../services/ubicacion.service";
import geocodingService from "../services/geocoding.service";
import { coordenadaValida } from "../utils/geo";

class UbicacionController {

    /** Busca solo en las ubicaciones registradas en la base. */
    async search(req: Request, res: Response) {
        try {
            const query = req.query.q as string;
            const ubicaciones = await ubicacionService.searchUbicaciones(query);
            res.json(ubicaciones);
        } catch (error) {
            res.status(500).json({ error: "Error al buscar ubicaciones" });
        }
    }

    /**
     * Búsqueda combinada: primero los lugares registrados, después el resto
     * de direcciones de Loja vía OpenStreetMap.
     *
     * El orden importa. Los lugares propios (campus, garita, UPC) son los que
     * el estudiante busca a diario y deben aparecer arriba, aunque OSM tenga
     * coincidencias con nombres más parecidos.
     */
    async buscarTodo(req: Request, res: Response) {

        try {

            const consulta = (req.query.q as string) ?? "";

            if (consulta.trim().length < 3) {
                return res.json({ success: true, data: [] });
            }

            const [propias, externas] = await Promise.all([
                ubicacionService.searchUbicaciones(consulta),
                geocodingService.buscar(consulta)
            ]);

            const resultados = [
                ...propias.map((u) => ({
                    nombre: u.nombre,
                    direccion: u.direccion,
                    lat: u.latitud,
                    lng: u.longitud,
                    origen: "safewalk" as const,
                    id_ubicacion: u.id_ubicacion,
                    tipo_zona: u.tipo_zona
                })),
                ...externas
            ];

            return res.json({ success: true, data: resultados });

        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message });
        }

    }

    /** Dirección legible a partir de un punto del mapa. */
    async reversa(req: Request, res: Response) {

        try {

            const lat = Number(req.query.lat);
            const lng = Number(req.query.lng);

            if (!coordenadaValida(lat, lng)) {
                return res.status(400).json({
                    success: false,
                    message: "Coordenadas inválidas"
                });
            }

            const resultado = await geocodingService.reversa(lat, lng);

            if (!resultado) {
                // Sin dirección conocida seguimos respondiendo con éxito: el
                // punto es válido aunque OSM no sepa cómo se llama, y la
                // interfaz debe poder usarlo igual.
                return res.json({
                    success: true,
                    data: {
                        nombre: "Punto seleccionado",
                        direccion: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
                        lat,
                        lng,
                        origen: "manual"
                    }
                });
            }

            return res.json({ success: true, data: resultado });

        } catch (error: any) {
            return res.status(500).json({ success: false, message: error.message });
        }

    }

}

export default new UbicacionController();
