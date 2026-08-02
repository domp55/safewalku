import { Punto, longitudPolilinea } from "../utils/geo";

/**
 * Cliente del servicio de ruteo OSRM.
 *
 * Usamos el servidor público de demostración de OSRM. Es gratuito y no requiere
 * clave, pero no ofrece garantía de disponibilidad, así que todo lo que sale de
 * aquí está preparado para fallar: hay timeout, un reintento y un trazado de
 * respaldo en línea recta para que la aplicación nunca se quede sin responder.
 */

const OSRM_BASE = process.env.OSRM_URL || "https://router.project-osrm.org";

/**
 * El servidor de demostración solo mantiene activo el perfil `driving`. Los
 * perfiles `foot` y `bike` fueron retirados, así que pedimos rutas de auto y
 * convertimos la duración a ritmo de peatón más abajo.
 */
const PERFIL = "driving";

const TIMEOUT_MS = 12000;

/** Velocidad peatonal urbana: 4.8 km/h, o 1.33 m/s. */
const VELOCIDAD_PEATON_MS = 1.33;

export interface TrazadoOsrm {
    coordenadas: Punto[];
    distancia_m: number;
    duracion_min: number;
    /** true si es el respaldo en línea recta y no un trazado real por calles. */
    es_aproximado: boolean;
}

function formatearCoords(puntos: Punto[]): string {
    // OSRM espera longitud,latitud — al revés de como se escribe habitualmente
    return puntos.map((p) => `${p.lng},${p.lat}`).join(";");
}

/** Duración a pie estimada a partir de la distancia real del trazado. */
export function duracionPeatonMin(distanciaMetros: number): number {
    return Math.max(1, Math.round(distanciaMetros / VELOCIDAD_PEATON_MS / 60));
}

/**
 * Trazado en línea recta entre dos puntos.
 *
 * Respaldo para cuando OSRM no responde. Se marca como aproximado para que la
 * interfaz pueda advertirlo: es una referencia visual, no un camino transitable.
 */
export function trazadoDirecto(origen: Punto, destino: Punto): TrazadoOsrm {

    const coordenadas = [origen, destino];
    const distancia = longitudPolilinea(coordenadas);

    return {
        coordenadas,
        distancia_m: Math.round(distancia),
        duracion_min: duracionPeatonMin(distancia),
        es_aproximado: true
    };

}

async function pedirOsrm(url: string): Promise<any | null> {

    try {

        const res = await fetch(url, {
            signal: AbortSignal.timeout(TIMEOUT_MS),
            headers: { "User-Agent": "SafeWalkU/1.0 (proyecto academico UIDE Loja)" }
        });

        if (!res.ok) return null;

        const data: any = await res.json();

        return data?.code === "Ok" ? data : null;

    } catch {
        // Timeout, DNS caído, servicio saturado. El llamador decide qué hacer.
        return null;
    }

}

class OsrmService {

    /**
     * Pide a OSRM los trazados entre dos puntos, incluyendo alternativas.
     *
     * `alternatives` es una sugerencia, no una garantía: OSRM devuelve rutas
     * alternativas solo cuando existen caminos razonablemente distintos. En
     * trayectos cortos suele devolver una sola.
     */
    async obtenerRutas(
        origen: Punto,
        destino: Punto,
        alternativas = 3
    ): Promise<TrazadoOsrm[]> {

        const coords = formatearCoords([origen, destino]);
        const url =
            `${OSRM_BASE}/route/v1/${PERFIL}/${coords}` +
            `?alternatives=${alternativas}&overview=full&geometries=geojson`;

        let data = await pedirOsrm(url);

        // Un reintento: el servidor público falla de forma intermitente y con
        // frecuencia responde bien al segundo intento.
        if (!data) {
            await new Promise((r) => setTimeout(r, 600));
            data = await pedirOsrm(url);
        }

        if (!data?.routes?.length) {
            return [];
        }

        return data.routes.map((r: any) => this.mapearRuta(r));

    }

    /**
     * Trazado que pasa obligatoriamente por un punto intermedio.
     *
     * Es la forma de forzar rutas distintas cuando OSRM no ofrece alternativas
     * propias: se le pide que desvíe por el centro de una zona concreta.
     */
    async obtenerRutaConEscala(
        origen: Punto,
        escala: Punto,
        destino: Punto
    ): Promise<TrazadoOsrm | null> {

        const coords = formatearCoords([origen, escala, destino]);
        const url =
            `${OSRM_BASE}/route/v1/${PERFIL}/${coords}` +
            `?overview=full&geometries=geojson`;

        const data = await pedirOsrm(url);

        if (!data?.routes?.length) return null;

        return this.mapearRuta(data.routes[0]);

    }

    private mapearRuta(r: any): TrazadoOsrm {

        const coordenadas: Punto[] = (r.geometry?.coordinates ?? []).map(
            (c: number[]) => ({ lat: c[1], lng: c[0] })
        );

        const distancia = Math.round(r.distance ?? 0);

        return {
            coordenadas,
            distancia_m: distancia,
            // Ignoramos r.duration a propósito: viene calculada a velocidad de
            // auto y aquí el usuario va caminando.
            duracion_min: duracionPeatonMin(distancia),
            es_aproximado: false
        };

    }

}

export default new OsrmService();
