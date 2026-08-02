/**
 * Utilidades geográficas.
 *
 * Trabajamos con matemática esférica simple en lugar de PostGIS o de las
 * funciones espaciales de MySQL: las distancias que maneja SafeWalk son de
 * pocos kilómetros dentro de Loja, donde el error de la fórmula haversine
 * está muy por debajo del margen del propio GPS del celular (±10 a 50 m).
 */

/** Radio medio de la Tierra en metros. */
const RADIO_TIERRA_M = 6371008.8;

/** Metros que mide un grado de latitud. Es constante en toda la Tierra. */
const METROS_POR_GRADO_LAT = 111320;

const gradosARadianes = (grados: number) => (grados * Math.PI) / 180;

export interface Punto {
    lat: number;
    lng: number;
}

/**
 * Distancia en metros entre dos puntos, por la fórmula haversine.
 */
export function haversineMetros(a: Punto, b: Punto): number {

    const dLat = gradosARadianes(b.lat - a.lat);
    const dLng = gradosARadianes(b.lng - a.lng);

    const lat1 = gradosARadianes(a.lat);
    const lat2 = gradosARadianes(b.lat);

    const h =
        Math.sin(dLat / 2) ** 2 +
        Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

    return 2 * RADIO_TIERRA_M * Math.asin(Math.sqrt(h));

}

/**
 * Caja envolvente alrededor de un punto.
 *
 * Sirve para prefiltrar en SQL con el índice (centro_lat, centro_lng) antes de
 * calcular la distancia exacta en memoria. Devuelve de más, nunca de menos: la
 * caja siempre contiene al círculo, así que ninguna zona válida se pierde.
 */
export function cajaEnvolvente(centro: Punto, radioMetros: number) {

    const deltaLat = radioMetros / METROS_POR_GRADO_LAT;

    // Un grado de longitud se acorta conforme nos alejamos del ecuador.
    // Acotamos el coseno para no dividir por cero cerca de los polos.
    const cosLat = Math.max(Math.cos(gradosARadianes(centro.lat)), 0.000001);
    const deltaLng = radioMetros / (METROS_POR_GRADO_LAT * cosLat);

    return {
        latMin: centro.lat - deltaLat,
        latMax: centro.lat + deltaLat,
        lngMin: centro.lng - deltaLng,
        lngMax: centro.lng + deltaLng
    };

}

/**
 * ¿El punto cae dentro del círculo de la zona?
 */
export function puntoEnCirculo(punto: Punto, centro: Punto, radioMetros: number): boolean {
    return haversineMetros(punto, centro) <= radioMetros;
}

/** Un punto del trazado junto con los metros de ruta que representa. */
export interface MuestraRuta extends Punto {
    tramo_m: number;
}

/** Longitud total de una polilínea, en metros. */
export function longitudPolilinea(puntos: Punto[]): number {

    let total = 0;

    for (let i = 1; i < puntos.length; i++) {
        total += haversineMetros(puntos[i - 1], puntos[i]);
    }

    return total;

}

/**
 * Reparte una polilínea en muestras equiespaciadas a lo largo del recorrido.
 *
 * Hace falta porque OSRM devuelve los vértices donde la calle gira, no a
 * intervalos regulares: una avenida recta de 800 m puede venir con dos puntos y
 * una rotonda con treinta. Puntuar los vértices tal cual daría un peso enorme a
 * las curvas y casi ninguno a los tramos largos, que es justo al revés de lo
 * que interesa.
 *
 * Cada muestra carga los metros de ruta que representa, de modo que el promedio
 * posterior quede ponderado por distancia recorrida y no por número de puntos.
 */
export function muestrearPolilinea(puntos: Punto[], pasoMetros = 30): MuestraRuta[] {

    if (puntos.length === 0) return [];
    if (puntos.length === 1) return [{ ...puntos[0], tramo_m: 0 }];

    const muestras: MuestraRuta[] = [];
    let restante = 0;

    for (let i = 1; i < puntos.length; i++) {

        const a = puntos[i - 1];
        const b = puntos[i];
        const largo = haversineMetros(a, b);

        if (largo === 0) continue;

        // Avanzamos sobre el segmento colocando una muestra cada `pasoMetros`,
        // arrastrando el sobrante del segmento anterior para no acumular sesgo.
        let recorrido = restante;

        while (recorrido < largo) {
            const t = recorrido / largo;
            muestras.push({
                lat: a.lat + (b.lat - a.lat) * t,
                lng: a.lng + (b.lng - a.lng) * t,
                tramo_m: pasoMetros
            });
            recorrido += pasoMetros;
        }

        restante = recorrido - largo;

    }

    // El último punto siempre entra: cierra el recorrido y evita que un tramo
    // final corto quede sin puntuar.
    const fin = puntos[puntos.length - 1];
    muestras.push({ ...fin, tramo_m: Math.max(pasoMetros - restante, 0) });

    return muestras;

}

/**
 * Punto medio geométrico de una polilínea, medido sobre el recorrido.
 * Sirve para centrar el mapa y para comparar si dos trazados son el mismo.
 */
export function puntoMedioRuta(puntos: Punto[]): Punto {

    if (puntos.length === 0) return { lat: 0, lng: 0 };

    const mitad = longitudPolilinea(puntos) / 2;
    let acumulado = 0;

    for (let i = 1; i < puntos.length; i++) {
        acumulado += haversineMetros(puntos[i - 1], puntos[i]);
        if (acumulado >= mitad) return puntos[i];
    }

    return puntos[Math.floor(puntos.length / 2)];

}

/**
 * Valida que un par de coordenadas sea utilizable.
 *
 * Rechaza NaN, valores fuera de rango y el punto (0,0), que casi siempre
 * significa "coordenada sin inicializar" y no un lugar real del golfo de Guinea.
 */
export function coordenadaValida(lat: unknown, lng: unknown): boolean {

    const la = Number(lat);
    const ln = Number(lng);

    if (!Number.isFinite(la) || !Number.isFinite(ln)) return false;
    if (la < -90 || la > 90) return false;
    if (ln < -180 || ln > 180) return false;
    if (la === 0 && ln === 0) return false;

    return true;

}
