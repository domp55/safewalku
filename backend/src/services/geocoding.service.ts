/**
 * Geocodificación contra Nominatim (OpenStreetMap).
 *
 * Se accede siempre desde el backend y nunca desde el navegador, por tres
 * razones: la política de uso de Nominatim exige un User-Agent identificable,
 * limita a una petición por segundo, y pide cachear los resultados. Desde el
 * frontend cada tecleo de cada usuario sería una petición y nos bloquearían.
 */

const NOMINATIM_BASE = process.env.NOMINATIM_URL || "https://nominatim.openstreetmap.org";

const USER_AGENT = "SafeWalkU/1.0 (proyecto academico UIDE Loja)";

const TIMEOUT_MS = 8000;

/**
 * Recuadro que cubre el área urbana de Loja y sus alrededores.
 * Formato Nominatim: lng_min, lat_max, lng_max, lat_min.
 */
const VIEWBOX_LOJA = "-79.30,-3.90,-79.10,-4.10";

/** Nominatim admite una petición por segundo. */
const INTERVALO_MINIMO_MS = 1100;

/** Duración de la caché en memoria. */
const TTL_CACHE_MS = 30 * 60 * 1000;

export interface ResultadoGeocodificacion {
    nombre: string;
    direccion: string;
    lat: number;
    lng: number;
    origen: "osm";
}

interface EntradaCache {
    valor: any;
    expira: number;
}

const cache = new Map<string, EntradaCache>();

let ultimaPeticion = 0;

/**
 * Espera lo necesario para no superar el límite de Nominatim.
 *
 * Es una cola simple en memoria. Basta para un despliegue de una sola
 * instancia; con varias habría que mover el control a la base o a Redis.
 */
async function respetarLimite(): Promise<void> {

    const ahora = Date.now();
    const transcurrido = ahora - ultimaPeticion;

    if (transcurrido < INTERVALO_MINIMO_MS) {
        await new Promise((r) => setTimeout(r, INTERVALO_MINIMO_MS - transcurrido));
    }

    ultimaPeticion = Date.now();

}

function leerCache(clave: string): any | null {

    const entrada = cache.get(clave);

    if (!entrada) return null;

    if (Date.now() > entrada.expira) {
        cache.delete(clave);
        return null;
    }

    return entrada.valor;

}

function guardarCache(clave: string, valor: any): void {

    // Poda perezosa: sin esto el mapa crecería sin límite mientras el proceso
    // siga vivo, que en un servidor de larga duración termina siendo una fuga.
    if (cache.size > 500) {
        const ahora = Date.now();
        for (const [k, v] of cache) {
            if (ahora > v.expira) cache.delete(k);
        }
    }

    cache.set(clave, { valor, expira: Date.now() + TTL_CACHE_MS });

}

async function pedirNominatim(url: string): Promise<any | null> {

    try {

        await respetarLimite();

        const res = await fetch(url, {
            signal: AbortSignal.timeout(TIMEOUT_MS),
            headers: {
                "User-Agent": USER_AGENT,
                "Accept-Language": "es"
            }
        });

        if (!res.ok) return null;

        return await res.json();

    } catch {
        return null;
    }

}

/** Arma un nombre corto legible a partir de la respuesta de Nominatim. */
function nombreCorto(item: any): string {

    const a = item.address ?? {};

    return (
        item.name ||
        a.amenity ||
        a.building ||
        a.road ||
        a.neighbourhood ||
        a.suburb ||
        (item.display_name ?? "").split(",")[0] ||
        "Ubicación sin nombre"
    );

}

class GeocodingService {

    /**
     * Busca direcciones y lugares dentro de Loja.
     */
    async buscar(consulta: string, limite = 6): Promise<ResultadoGeocodificacion[]> {

        const texto = consulta.trim();

        if (texto.length < 3) return [];

        const clave = `buscar:${texto.toLowerCase()}:${limite}`;
        const guardado = leerCache(clave);

        if (guardado) return guardado;

        const url =
            `${NOMINATIM_BASE}/search` +
            `?q=${encodeURIComponent(texto)}` +
            `&format=jsonv2&addressdetails=1&limit=${limite}` +
            `&countrycodes=ec&viewbox=${VIEWBOX_LOJA}&bounded=1`;

        const datos = await pedirNominatim(url);

        if (!Array.isArray(datos)) return [];

        const resultados: ResultadoGeocodificacion[] = datos.map((item: any) => ({
            nombre: nombreCorto(item),
            direccion: item.display_name ?? "",
            lat: Number(item.lat),
            lng: Number(item.lon),
            origen: "osm" as const
        }));

        guardarCache(clave, resultados);

        return resultados;

    }

    /**
     * Dirección legible a partir de un punto del mapa.
     *
     * Es lo que permite que, al tocar el mapa para marcar un incidente o un
     * destino, el usuario vea "Av. Salvador Bustamante Celi" en lugar de un par
     * de números que no le dicen nada.
     */
    async reversa(lat: number, lng: number): Promise<ResultadoGeocodificacion | null> {

        // Redondeamos a 5 decimales (~1 m) para que arrastrar el pin unos
        // centímetros no dispare una petición nueva cada vez.
        const clave = `reversa:${lat.toFixed(5)},${lng.toFixed(5)}`;
        const guardado = leerCache(clave);

        if (guardado !== null) return guardado;

        const url =
            `${NOMINATIM_BASE}/reverse` +
            `?lat=${lat}&lon=${lng}&format=jsonv2&addressdetails=1&zoom=18`;

        const item = await pedirNominatim(url);

        if (!item || item.error) {
            return null;
        }

        const resultado: ResultadoGeocodificacion = {
            nombre: nombreCorto(item),
            direccion: item.display_name ?? "",
            lat: Number(item.lat),
            lng: Number(item.lon),
            origen: "osm"
        };

        guardarCache(clave, resultado);

        return resultado;

    }

}

export default new GeocodingService();
