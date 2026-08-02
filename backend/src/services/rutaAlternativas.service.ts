import crypto from "crypto";

import osrmService, { TrazadoOsrm, trazadoDirecto } from "./osrm.service";
import scoringService from "./scoring.service";
import zonaService, { Zona } from "./zona.service";
import motorRutasRepository from "../repositories/motorRutas.repository";

import {
    Punto,
    haversineMetros,
    puntoMedioRuta,
    coordenadaValida
} from "../utils/geo";

import { esHorarioNocturno } from "../utils/riesgo";

/**
 * Genera las tres alternativas de ruta clasificadas por seguridad.
 *
 * El flujo es: pedir trazados reales a OSRM, completar hasta tres si hacen
 * falta, puntuar cada uno contra las zonas y los reportes, y ordenarlos.
 */

/** Clasificaciones relativas, de menor a mayor riesgo. */
const CLASIFICACIONES = ["SEGURA", "REGULAR", "INSEGURA"] as const;
export type Clasificacion = (typeof CLASIFICACIONES)[number];

const COLORES: Record<Clasificacion, string> = {
    SEGURA: "#16a34a",
    REGULAR: "#f59e0b",
    INSEGURA: "#dc2626"
};

/** Umbrales para la lectura absoluta del índice, independiente del ranking. */
const INDICE_SEGURA = 25;
const INDICE_INSEGURA = 55;

/**
 * Diferencia mínima de índice para considerar que dos rutas son realmente
 * distintas en riesgo. Por debajo de esto, rotularlas segura/insegura sugeriría
 * una diferencia que los datos no sostienen.
 */
const DIFERENCIA_SIGNIFICATIVA = 8;

/** Dos trazados se consideran el mismo si coinciden en largo y en punto medio. */
const TOLERANCIA_DISTANCIA = 0.05;
const TOLERANCIA_PUNTO_MEDIO_M = 120;

export interface RutaAlternativa {
    clasificacion: Clasificacion;
    nivel_absoluto: Clasificacion;
    indice_riesgo: number;
    distancia_m: number;
    duracion_min: number;
    color: string;
    coordenadas: [number, number][];
    zonas_atravesadas: any[];
    incidentes_cercanos: number;
    recomendacion: string;
    advertencias: string[];
    es_aproximado: boolean;
}

function nivelAbsoluto(indice: number): Clasificacion {
    if (indice >= INDICE_INSEGURA) return "INSEGURA";
    if (indice >= INDICE_SEGURA) return "REGULAR";
    return "SEGURA";
}

class RutaAlternativasService {

    /**
     * Clave de caché.
     *
     * Redondeamos a 4 decimales (unos 11 m) para que dos consultas hechas desde
     * prácticamente el mismo sitio reutilicen el resultado. La franja horaria
     * entra en la clave porque el riesgo cambia entre día y noche: sin ella, una
     * ruta calculada a las 17:00 se serviría igual a las 21:00.
     */
    private construirHash(origen: Punto, destino: Punto, fecha: Date): string {

        const r = (n: number) => n.toFixed(4);
        const franja = esHorarioNocturno(fecha) ? "N" : "D";

        return crypto
            .createHash("sha256")
            .update(`${r(origen.lat)},${r(origen.lng)}|${r(destino.lat)},${r(destino.lng)}|walk|${franja}`)
            .digest("hex");

    }

    private esDuplicada(a: TrazadoOsrm, b: TrazadoOsrm): boolean {

        const mayor = Math.max(a.distancia_m, b.distancia_m) || 1;
        const difRelativa = Math.abs(a.distancia_m - b.distancia_m) / mayor;

        if (difRelativa > TOLERANCIA_DISTANCIA) return false;

        const medioA = puntoMedioRuta(a.coordenadas);
        const medioB = puntoMedioRuta(b.coordenadas);

        return haversineMetros(medioA, medioB) < TOLERANCIA_PUNTO_MEDIO_M;

    }

    /**
     * Zona del nivel pedido más conveniente para desviar la ruta.
     *
     * Se busca la más cercana al punto medio del trayecto y se descartan las que
     * obligarían a un rodeo desproporcionado: desviar 3 km para evitar 200 m de
     * riesgo no es una alternativa que nadie vaya a caminar.
     */
    private zonaParaDesvio(
        zonas: Zona[],
        nivel: string,
        origen: Punto,
        destino: Punto
    ): Punto | null {

        const medio = {
            lat: (origen.lat + destino.lat) / 2,
            lng: (origen.lng + destino.lng) / 2
        };

        const distanciaDirecta = haversineMetros(origen, destino);
        const desvioMaximo = Math.max(distanciaDirecta, 800);

        const candidatas = zonas
            .filter((z) => z.nivel === nivel)
            .map((z) => ({
                punto: { lat: z.centro_lat, lng: z.centro_lng },
                distancia: haversineMetros(medio, { lat: z.centro_lat, lng: z.centro_lng })
            }))
            .filter((z) => z.distancia <= desvioMaximo)
            .sort((a, b) => a.distancia - b.distancia);

        return candidatas.length ? candidatas[0].punto : null;

    }

    /**
     * Completa la lista hasta tres trazados distintos.
     *
     * OSRM devuelve alternativas propias solo cuando la malla vial las ofrece;
     * en trayectos cortos suele dar una sola. Cuando falta variedad, se fuerzan
     * desvíos por el centro de una zona segura y de una zona de riesgo, que es
     * precisamente lo que hace que las tres opciones se diferencien.
     */
    private async completarAlternativas(
        trazados: TrazadoOsrm[],
        origen: Punto,
        destino: Punto,
        zonas: Zona[]
    ): Promise<TrazadoOsrm[]> {

        const resultado = [...trazados];

        const escalas = [
            this.zonaParaDesvio(zonas, "SEGURA", origen, destino),
            this.zonaParaDesvio(zonas, "INSEGURA", origen, destino),
            this.zonaParaDesvio(zonas, "REGULAR", origen, destino)
        ].filter((p): p is Punto => p !== null);

        for (const escala of escalas) {

            if (resultado.length >= 3) break;

            const variante = await osrmService.obtenerRutaConEscala(origen, escala, destino);

            if (!variante || variante.coordenadas.length < 2) continue;
            if (resultado.some((r) => this.esDuplicada(r, variante))) continue;

            resultado.push(variante);

        }

        return resultado;

    }

    /**
     * Calcula las alternativas entre dos puntos.
     */
    async calcular(
        origen: Punto,
        destino: Punto,
        fecha: Date = new Date(),
        usarCache = true
    ): Promise<{ rutas: RutaAlternativa[]; desde_cache: boolean; aviso: string | null }> {

        if (!coordenadaValida(origen.lat, origen.lng)) {
            throw new Error("Coordenadas de origen inválidas");
        }

        if (!coordenadaValida(destino.lat, destino.lng)) {
            throw new Error("Coordenadas de destino inválidas");
        }

        if (haversineMetros(origen, destino) < 50) {
            throw new Error("El origen y el destino están demasiado cerca para trazar una ruta");
        }

        const hash = this.construirHash(origen, destino, fecha);

        if (usarCache) {
            const guardado = await motorRutasRepository.leerCache(hash);
            if (guardado) {
                return { rutas: guardado, desde_cache: true, aviso: null };
            }
        }

        const [zonas, reportes] = await Promise.all([
            zonaService.findAll(),
            motorRutasRepository.reportesVigentes()
        ]);

        let trazados = await osrmService.obtenerRutas(origen, destino, 3);
        let aviso: string | null = null;

        if (trazados.length === 0) {
            // OSRM no respondió. Devolvemos una referencia en línea recta para
            // que la aplicación siga siendo utilizable, pero avisando de que no
            // es un camino transitable real.
            trazados = [trazadoDirecto(origen, destino)];
            aviso =
                "El servicio de trazado por calles no está disponible. Se muestra una referencia en línea recta.";
        } else {
            trazados = await this.completarAlternativas(trazados, origen, destino, zonas);
        }

        const evaluadas = trazados.map((t) => ({
            trazado: t,
            scoring: scoringService.evaluarTrazado(t.coordenadas, zonas, reportes, fecha)
        }));

        // Menor índice primero: la primera será la segura, la última la insegura
        evaluadas.sort((a, b) => a.scoring.indice_riesgo - b.scoring.indice_riesgo);

        const conservadas = evaluadas.slice(0, 3);

        const diferencia =
            conservadas.length > 1
                ? conservadas[conservadas.length - 1].scoring.indice_riesgo -
                  conservadas[0].scoring.indice_riesgo
                : 0;

        const esUnica = conservadas.length === 1;

        const rutas: RutaAlternativa[] = conservadas.map((e, i) => {

            const absoluto = nivelAbsoluto(e.scoring.indice_riesgo);

            // Con una sola opción no hay ranking que expresar, así que la
            // etiqueta pasa a ser la lectura absoluta del índice. Llamar SEGURA
            // a la única ruta disponible contradiría a sus propias advertencias.
            const clasificacion: Clasificacion = esUnica
                ? absoluto
                : CLASIFICACIONES[i] ?? "REGULAR";

            const { recomendacion, advertencias } = scoringService.redactarRecomendacion(
                e.scoring,
                clasificacion,
                esUnica
            );

            if (esUnica) {
                advertencias.push(
                    "No se encontraron rutas alternativas para este trayecto; se muestra la única disponible."
                );
            }

            if (conservadas.length > 1 && diferencia < DIFERENCIA_SIGNIFICATIVA) {
                advertencias.push(
                    "Las alternativas disponibles tienen un riesgo muy parecido; la diferencia entre ellas es mínima."
                );
            }

            if (e.trazado.es_aproximado) {
                advertencias.push(
                    "Trazado aproximado en línea recta, no corresponde a calles transitables."
                );
            }

            return {
                clasificacion,
                nivel_absoluto: nivelAbsoluto(e.scoring.indice_riesgo),
                indice_riesgo: e.scoring.indice_riesgo,
                distancia_m: e.trazado.distancia_m,
                duracion_min: e.trazado.duracion_min,
                color: COLORES[clasificacion],
                coordenadas: e.trazado.coordenadas.map(
                    (p) => [p.lat, p.lng] as [number, number]
                ),
                zonas_atravesadas: e.scoring.zonas_atravesadas,
                incidentes_cercanos: e.scoring.incidentes_cercanos,
                recomendacion,
                advertencias,
                es_aproximado: e.trazado.es_aproximado
            };

        });

        // Solo se cachea lo que vale la pena reutilizar: un resultado degradado
        // por caída de OSRM no debe quedar servido durante seis horas.
        if (!aviso && rutas.length > 0) {
            await motorRutasRepository.guardarCache(hash, rutas);
        }

        return { rutas, desde_cache: false, aviso };

    }

    async registrarEleccion(datos: {
        id_usuario: number;
        origen: Punto;
        destino: Punto;
        clasificacion_elegida: string;
        indice_riesgo: number;
    }) {

        return await motorRutasRepository.guardarHistorial({
            id_usuario: datos.id_usuario,
            origen_lat: datos.origen.lat,
            origen_lng: datos.origen.lng,
            destino_lat: datos.destino.lat,
            destino_lng: datos.destino.lng,
            clasificacion_elegida: datos.clasificacion_elegida,
            indice_riesgo: datos.indice_riesgo
        });

    }

}

export default new RutaAlternativasService();
