import pool from "../config/database";

class RouteRepository {

    async findAll() {

        const [rows]: any = await pool.query(

            `
            SELECT *

            FROM ruta

            ORDER BY id_ruta DESC
            `
        );

        return rows;

    }

    async findById(id: number) {

        const [rows]: any = await pool.query(

            `
            SELECT *

            FROM ruta

            WHERE id_ruta = ?
            `,

            [id]

        );

        return rows[0];

    }

    async create(route: any) {

        const [result]: any = await pool.query(

            `
            INSERT INTO ruta

            (

                nombre_ruta,

                descripcion,

                nivel_seguridad,

                tiempo_estimado

            )

            VALUES

            (

                ?,

                ?,

                ?,

                ?

            )
            `,

            [

                route.nombre_ruta,

                route.descripcion,

                route.nivel_seguridad,

                route.tiempo_estimado

            ]

        );

        return result.insertId;

    }

    async update(id: number, route: any) {

        await pool.query(

            `
            UPDATE ruta

            SET

            nombre_ruta=?,

            descripcion=?,

            nivel_seguridad=?,

            tiempo_estimado=?

            WHERE

            id_ruta=?
            `,

            [

                route.nombre_ruta,

                route.descripcion,

                route.nivel_seguridad,

                route.tiempo_estimado,

                id

            ]

        );

    }

    async delete(id: number) {

        await pool.query(

            `

            DELETE FROM ruta

            WHERE id_ruta=?

            `,

            [id]

        );

    }

    async findAllWithCoords() {

        const [rows]: any = await pool.query(
            `
            SELECT r.id_ruta, r.nombre_ruta, r.nivel_seguridad, ru.orden_punto, c.latitud, c.longitud
            FROM ruta r
            JOIN ruta_ubicacion ru ON ru.id_ruta = r.id_ruta
            JOIN coordenada c ON c.id_ubicacion = ru.id_ubicacion
            ORDER BY r.id_ruta, ru.orden_punto
            `
        );

        const routesMap = new Map();

        for (const row of rows) {
            if (!routesMap.has(row.id_ruta)) {
                routesMap.set(row.id_ruta, {
                    id_ruta: row.id_ruta,
                    nombre_ruta: row.nombre_ruta,
                    nivel_seguridad: row.nivel_seguridad,
                    coordenadas: []
                });
            }
            routesMap.get(row.id_ruta).coordenadas.push([Number(row.latitud), Number(row.longitud)]);
        }

        const rutas = Array.from(routesMap.values()).filter((r: any) => r.coordenadas.length >= 2);

        // Para cada ruta, pedimos a OSRM el trazado real por calles entre el primer y el último punto.
        // Las pedimos una por una (no todas a la vez) para no saturar el servicio gratuito,
        // y con más tiempo de espera para rutas largas.
        const rutasConCalles = [];
        for (const ruta of rutas) {
            try {
                const origen = ruta.coordenadas[0];
                const destino = ruta.coordenadas[ruta.coordenadas.length - 1];
                const url = `https://router.project-osrm.org/route/v1/driving/${origen[1]},${origen[0]};${destino[1]},${destino[0]}?overview=full&geometries=geojson`;

                const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
                const data: any = await res.json();

                if (data.code === "Ok" && data.routes?.[0]?.geometry?.coordinates) {
                    const puntosCalle = data.routes[0].geometry.coordinates.map(
                        (c: number[]) => [c[1], c[0]]
                    );
                    rutasConCalles.push({ ...ruta, coordenadas: puntosCalle });
                } else {
                    rutasConCalles.push(ruta);
                }
            } catch (e) {
                // Si OSRM falla o tarda demasiado, usamos la línea recta original como respaldo
                rutasConCalles.push(ruta);
            }
        }

        return rutasConCalles;

    }

    async poblarCalles() {

        // Obtenemos las zonas (destinos) con su nivel de seguridad, sin incluir el punto de partida (UIDE)
        const [zonas]: any = await pool.query(
            `
            SELECT DISTINCT c.id_ubicacion, c.latitud, c.longitud, r.nivel_seguridad
            FROM ruta_ubicacion ru
            JOIN coordenada c ON c.id_ubicacion = ru.id_ubicacion
            JOIN ruta r ON r.id_ruta = ru.id_ruta
            WHERE ru.orden_punto = 2
            `
        );

        for (const zona of zonas) {
            try {
                const query = `[out:json][timeout:25];way(around:350,${zona.latitud},${zona.longitud})[highway];out geom;`;
                const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;

                const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
                const data: any = await res.json();

                if (Array.isArray(data.elements)) {
                    for (const way of data.elements) {
                        if (way.geometry && way.geometry.length >= 2) {
                            const coords = way.geometry.map((p: any) => [p.lat, p.lon]);
                            await pool.query(
                                `INSERT INTO calle_segmento (id_ubicacion, nivel_seguridad, coordenadas) VALUES (?, ?, ?)`,
                                [zona.id_ubicacion, zona.nivel_seguridad, JSON.stringify(coords)]
                            );
                        }
                    }
                }

                // Pausa breve entre zonas para no saturar el servicio gratuito de OpenStreetMap
                await new Promise((r) => setTimeout(r, 1200));
            } catch (e) {
                console.error(`Error poblando calles para zona ${zona.id_ubicacion}:`, e);
            }
        }

        console.log("Población de calles completa.");

    }

    async getCalles() {

        const [rows]: any = await pool.query(
            `SELECT id_segmento, nivel_seguridad, coordenadas FROM calle_segmento`
        );

        return rows.map((r: any) => ({
            id_segmento: r.id_segmento,
            nivel_seguridad: r.nivel_seguridad,
            coordenadas: typeof r.coordenadas === "string" ? JSON.parse(r.coordenadas) : r.coordenadas
        }));

    }

    async trazarRuta(origen_lat: number, origen_lng: number, destino_id: number) {
        const [rows]: any = await pool.query(
            `SELECT latitud, longitud FROM coordenada WHERE id_ubicacion = ?`,
            [destino_id]
        );
        if (rows.length === 0) throw new Error("Destino no encontrado");
        const dest = rows[0];
        
        const points = [
            [origen_lat, origen_lng],
            [(origen_lat + Number(dest.latitud)) / 2 + 0.0005, (origen_lng + Number(dest.longitud)) / 2 + 0.0005],
            [Number(dest.latitud), Number(dest.longitud)]
        ];
        
        return {
            tiempo_estimado: 5,
            distancia_m: 500,
            ruta_segura: true,
            coordenadas: points
        };
    }

}

export default new RouteRepository();