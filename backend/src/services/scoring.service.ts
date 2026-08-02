import {
    Punto,
    haversineMetros,
    muestrearPolilinea,
    longitudPolilinea
} from "../utils/geo";

import { pesoEfectivo, nivelPorPeso, esHorarioNocturno } from "../utils/riesgo";
import { Zona } from "./zona.service";
import { ReporteRiesgoRow, DIAS_VIGENCIA_REPORTE } from "../repositories/motorRutas.repository";

/**
 * Motor de puntuación de rutas.
 *
 * Traduce un trazado a un número de 0 a 100 combinando tres fuentes:
 *   1. las zonas de seguridad registradas,
 *   2. los reportes validados de los estudiantes, y
 *   3. la hora a la que se va a caminar.
 *
 * Todo el cálculo es determinista y sin estado, de modo que la misma consulta
 * produce siempre el mismo resultado y se puede cachear sin riesgo.
 */

/** Distancia entre muestras a lo largo del trazado. */
const PASO_MUESTREO_M = 30;

/** Radio en el que un reporte influye sobre el trazado. */
const RADIO_INFLUENCIA_REPORTE_M = 150;

/** Peso base que aporta un reporte según su gravedad. */
const PESO_POR_NIVEL: Record<string, number> = {
    ALTO: 6,
    MEDIO: 3,
    BAJO: 1
};

/**
 * Un reporte pierde influencia con el tiempo. A los 30 días conserva ~37 %,
 * a los 60 ~14 %. Un robo de anoche debe pesar mucho más que uno de hace
 * dos meses, aunque ambos sean ciertos.
 */
const VIDA_MEDIA_DIAS = 30;

/** Peso asignado a un tramo sobre el que no hay ninguna zona registrada. */
const PESO_SIN_DATOS = 2;

/**
 * Extremos para llevar el peso promedio a una escala de 0 a 100.
 * PESO_MAX no es el máximo teórico sino la referencia de "ruta muy peligrosa":
 * por encima de eso, el índice satura en 100 y ya no aporta distinguir más.
 */
const PESO_MIN = 1;
const PESO_MAX = 15;

export interface ZonaAtravesada {
    id_zona: number;
    nombre: string;
    nivel: string;
    nivel_declarado: string;
    metros: number;
}

export interface ResultadoScoring {
    indice_riesgo: number;
    peso_promedio: number;
    zonas_atravesadas: ZonaAtravesada[];
    incidentes_cercanos: number;
    metros_sin_datos: number;
    es_nocturno: boolean;
}

class ScoringService {

    /**
     * Puntúa un trazado contra las zonas y los reportes vigentes.
     */
    evaluarTrazado(
        coordenadas: Punto[],
        zonas: Zona[],
        reportes: ReporteRiesgoRow[],
        fecha: Date = new Date()
    ): ResultadoScoring {

        const muestras = muestrearPolilinea(coordenadas, PASO_MUESTREO_M);
        const longitudTotal = longitudPolilinea(coordenadas);

        if (muestras.length === 0 || longitudTotal === 0) {
            return {
                indice_riesgo: 0,
                peso_promedio: PESO_MIN,
                zonas_atravesadas: [],
                incidentes_cercanos: 0,
                metros_sin_datos: 0,
                es_nocturno: esHorarioNocturno(fecha)
            };
        }

        // Precalculamos el peso vigente de cada zona una sola vez, en lugar de
        // repetirlo por cada una de las cientos de muestras del trazado.
        const zonasConPeso = zonas.map((z) => ({
            zona: z,
            centro: { lat: z.centro_lat, lng: z.centro_lng },
            peso: pesoEfectivo(z, fecha)
        }));

        const metrosPorZona = new Map<number, ZonaAtravesada>();
        const reportesTocados = new Set<number>();

        let sumaPonderada = 0;
        let metrosSinDatos = 0;

        for (const muestra of muestras) {

            // --- Riesgo estático: la peor zona que contiene este punto ---
            let pesoZona = 0;
            let zonaDominante: (typeof zonasConPeso)[number] | null = null;

            for (const candidata of zonasConPeso) {
                const dentro =
                    haversineMetros(muestra, candidata.centro) <= candidata.zona.radio_metros;

                if (!dentro) continue;

                // Con zonas solapadas manda la más severa: ante criterios en
                // conflicto se toma siempre el más prudente.
                if (candidata.peso > pesoZona) {
                    pesoZona = candidata.peso;
                    zonaDominante = candidata;
                }
            }

            if (zonaDominante) {
                const previo = metrosPorZona.get(zonaDominante.zona.id_zona);
                if (previo) {
                    previo.metros += muestra.tramo_m;
                } else {
                    metrosPorZona.set(zonaDominante.zona.id_zona, {
                        id_zona: zonaDominante.zona.id_zona,
                        nombre: zonaDominante.zona.nombre,
                        nivel: nivelPorPeso(zonaDominante.peso),
                        nivel_declarado: zonaDominante.zona.nivel,
                        metros: muestra.tramo_m
                    });
                }
            } else {
                pesoZona = PESO_SIN_DATOS;
                metrosSinDatos += muestra.tramo_m;
            }

            // --- Riesgo dinámico: reportes validados cerca de este punto ---
            let pesoReportes = 0;

            for (const reporte of reportes) {

                const distancia = haversineMetros(muestra, {
                    lat: Number(reporte.latitud),
                    lng: Number(reporte.longitud)
                });

                if (distancia > RADIO_INFLUENCIA_REPORTE_M) continue;

                reportesTocados.add(reporte.id_reporte);

                const base = PESO_POR_NIVEL[reporte.nivel_riesgo] ?? 1;
                const decaimiento = Math.exp(
                    -Number(reporte.dias_transcurridos) / VIDA_MEDIA_DIAS
                );

                // El incidente pesa menos conforme uno se aleja de donde ocurrió
                const cercania = 1 - distancia / RADIO_INFLUENCIA_REPORTE_M;

                pesoReportes += base * decaimiento * cercania;

            }

            sumaPonderada += (pesoZona + pesoReportes) * muestra.tramo_m;

        }

        const metrosMuestreados = muestras.reduce((a, m) => a + m.tramo_m, 0) || 1;
        const pesoPromedio = sumaPonderada / metrosMuestreados;

        const indice = Math.round(
            Math.min(
                100,
                Math.max(0, ((pesoPromedio - PESO_MIN) / (PESO_MAX - PESO_MIN)) * 100)
            )
        );

        const zonasAtravesadas = Array.from(metrosPorZona.values())
            .map((z) => ({ ...z, metros: Math.round(z.metros) }))
            .sort((a, b) => b.metros - a.metros);

        return {
            indice_riesgo: indice,
            peso_promedio: Number(pesoPromedio.toFixed(2)),
            zonas_atravesadas: zonasAtravesadas,
            incidentes_cercanos: reportesTocados.size,
            metros_sin_datos: Math.round(metrosSinDatos),
            es_nocturno: esHorarioNocturno(fecha)
        };

    }

    /**
     * Texto explicativo de por qué una ruta recibió su puntuación.
     * Es lo que la interfaz muestra bajo cada tarjeta.
     */
    redactarRecomendacion(
        resultado: ResultadoScoring,
        clasificacion: string,
        esUnica = false
    ): { recomendacion: string; advertencias: string[] } {

        const advertencias: string[] = [];

        const peores = resultado.zonas_atravesadas.filter(
            (z) => z.nivel === "INSEGURA"
        );

        const regulares = resultado.zonas_atravesadas.filter(
            (z) => z.nivel === "REGULAR"
        );

        if (peores.length > 0) {
            const metros = peores.reduce((a, z) => a + z.metros, 0);
            advertencias.push(
                `Cruza ${metros} m de zona de riesgo alto: ${peores.map((z) => z.nombre).join(", ")}.`
            );
        }

        if (resultado.incidentes_cercanos > 0) {
            advertencias.push(
                `Hay ${resultado.incidentes_cercanos} incidente(s) reportado(s) y validado(s) cerca de este trayecto en los últimos ${DIAS_VIGENCIA_REPORTE} días.`
            );
        }

        if (resultado.es_nocturno) {
            advertencias.push(
                "El cálculo aplica la penalización nocturna vigente entre las 18:00 y las 06:00."
            );
        }

        if (resultado.metros_sin_datos > resultado.zonas_atravesadas.reduce((a, z) => a + z.metros, 0)) {
            advertencias.push(
                "Buena parte del trayecto transcurre por zonas sin clasificación registrada."
            );
        }

        let recomendacion: string;

        // Sin alternativas con qué comparar, el texto describe la ruta en sí
        // en lugar de situarla frente a las otras.
        if (esUnica) {
            recomendacion =
                peores.length === 0
                    ? "Único trayecto disponible. Transita por zonas clasificadas como seguras o regulares."
                    : "Único trayecto disponible, y atraviesa tramos señalados como peligrosos. Considera ir acompañado o esperar a que haya luz.";
        } else if (clasificacion === "SEGURA") {
            recomendacion =
                peores.length === 0
                    ? "Es la opción de menor riesgo entre las disponibles. Transita por zonas clasificadas como seguras o regulares."
                    : "Es la de menor riesgo entre las tres, aunque igual atraviesa tramos señalados como peligrosos.";
        } else if (clasificacion === "REGULAR") {
            recomendacion =
                "Equilibrio entre distancia y seguridad. Aceptable de día; de noche conviene la ruta segura.";
        } else {
            recomendacion =
                "Suele ser la más corta, pero es la de mayor exposición. Evítala de noche o si vas solo.";
        }

        if (regulares.length > 0 && peores.length === 0 && clasificacion !== "SEGURA") {
            recomendacion += ` Atraviesa ${regulares.length} zona(s) de riesgo intermedio.`;
        }

        return { recomendacion, advertencias };

    }

}

export default new ScoringService();
