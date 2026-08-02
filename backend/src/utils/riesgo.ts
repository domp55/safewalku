/**
 * Reglas de riesgo compartidas entre el módulo de zonas y el motor de rutas.
 *
 * Viven aquí y no dentro de un servicio para que ambos apliquen exactamente el
 * mismo criterio. Si el peso nocturno se calculara de dos maneras distintas, el
 * mapa de zonas y las rutas sugeridas se contradirían entre sí.
 */

/** Zona horaria de Ecuador continental. No aplica horario de verano. */
export const ZONA_HORARIA_EC = "America/Guayaquil";

/** Desde esta hora se considera noche. */
export const HORA_INICIO_NOCHE = 18;

/** Hasta esta hora se considera noche. */
export const HORA_FIN_NOCHE = 6;

/**
 * Hora del día (0-23) en Ecuador, sin importar la zona horaria del servidor.
 *
 * Es deliberado no usar getHours(): en AWS el servidor corre en UTC, así que
 * las 20:00 de Loja serían la 01:00 del servidor y el factor nocturno se
 * aplicaría en el momento equivocado.
 */
export function horaEnEcuador(fecha: Date = new Date()): number {

    const partes = new Intl.DateTimeFormat("en-US", {
        timeZone: ZONA_HORARIA_EC,
        hour: "numeric",
        hour12: false
    }).formatToParts(fecha);

    const hora = partes.find((p) => p.type === "hour")?.value;

    // El formateador devuelve "24" a la medianoche en algunos entornos
    return Number(hora) % 24;

}

/**
 * ¿Estamos en franja nocturna en Loja?
 */
export function esHorarioNocturno(fecha: Date = new Date()): boolean {
    const hora = horaEnEcuador(fecha);
    return hora >= HORA_INICIO_NOCHE || hora < HORA_FIN_NOCHE;
}

export type NivelRiesgo = "SEGURA" | "REGULAR" | "INSEGURA";

/**
 * Umbrales para traducir un peso numérico de vuelta a una etiqueta.
 *
 * Se apoyan en los pesos base del seed (SEGURA 1, REGULAR 4, INSEGURA 10) y
 * se sitúan en los puntos medios entre ellos.
 */
export const UMBRAL_REGULAR = 2.5;
export const UMBRAL_INSEGURA = 7;

/**
 * Etiqueta que corresponde a un peso ya ponderado por la hora.
 *
 * Hace falta porque el campo `nivel` de la tabla es un rótulo fijo que describe
 * a la zona de día. De noche una zona SEGURA puede llegar a pesar 4, y mostrarla
 * en verde contradiría al motor de rutas, que ya la está penalizando.
 */
export function nivelPorPeso(peso: number): NivelRiesgo {
    if (peso >= UMBRAL_INSEGURA) return "INSEGURA";
    if (peso >= UMBRAL_REGULAR) return "REGULAR";
    return "SEGURA";
}

export interface ZonaPonderable {
    peso_riesgo: number;
    factor_nocturno: number;
}

/**
 * Peso que aporta una zona en un momento dado.
 *
 * De día es el peso base. De noche se multiplica por el factor nocturno, que es
 * lo que hace que una misma ruta cambie de clasificación según la hora: el
 * Parque Jipiro pesa 1.0 al mediodía y 4.0 a las 2 de la mañana.
 */
export function pesoEfectivo(zona: ZonaPonderable, fecha: Date = new Date()): number {

    const base = Number(zona.peso_riesgo);

    if (!esHorarioNocturno(fecha)) {
        return base;
    }

    return base * Number(zona.factor_nocturno);

}
