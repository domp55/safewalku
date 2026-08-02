import zonaRepository, { ZonaRow, FiltrosZona } from "../repositories/zona.repository";
import { haversineMetros, coordenadaValida } from "../utils/geo";
import { pesoEfectivo, esHorarioNocturno, nivelPorPeso } from "../utils/riesgo";

export interface Zona {
    id_zona: number;
    nombre: string;
    descripcion: string | null;
    sector: string | null;
    ciudad: string;
    nivel: "SEGURA" | "REGULAR" | "INSEGURA";
    peso_riesgo: number;
    centro_lat: number;
    centro_lng: number;
    radio_metros: number;
    franja_horaria: "DIURNO" | "NOCTURNO" | "AMBOS";
    factor_nocturno: number;
    fuente: string | null;
    estado: "ACTIVO" | "INACTIVO";
}

export interface ZonaCercana extends Zona {
    distancia_m: number;
    contiene_punto: boolean;
    peso_efectivo: number;
    /** Etiqueta vigente a esta hora. De día coincide con `nivel`; de noche puede ser peor. */
    nivel_efectivo: "SEGURA" | "REGULAR" | "INSEGURA";
}

/**
 * Convierte una fila de la base a un objeto usable.
 * MySQL y MariaDB devuelven las columnas DECIMAL como texto.
 */
function mapear(row: ZonaRow): Zona {
    return {
        id_zona: row.id_zona,
        nombre: row.nombre,
        descripcion: row.descripcion,
        sector: row.sector,
        ciudad: row.ciudad,
        nivel: row.nivel,
        peso_riesgo: Number(row.peso_riesgo),
        centro_lat: Number(row.centro_lat),
        centro_lng: Number(row.centro_lng),
        radio_metros: Number(row.radio_metros),
        franja_horaria: row.franja_horaria,
        factor_nocturno: Number(row.factor_nocturno),
        fuente: row.fuente,
        estado: row.estado
    };
}

class ZonaService {

    async findAll(filtros: FiltrosZona = {}): Promise<Zona[]> {
        const rows = await zonaRepository.findAll(filtros);
        return rows.map(mapear);
    }

    async findById(id: number): Promise<Zona> {

        const row = await zonaRepository.findById(id);

        if (!row) {
            throw new Error("Zona no encontrada");
        }

        return mapear(row);

    }

    /**
     * Zonas cuyo círculo queda a `radio` metros o menos del punto dado.
     *
     * El repositorio prefiltra con una caja envolvente usando el índice; aquí
     * se aplica la distancia exacta, se marca cuáles contienen realmente al
     * punto y se calcula el peso vigente según la hora.
     */
    async findCercanas(
        lat: number,
        lng: number,
        radioMetros = 500,
        fecha: Date = new Date()
    ): Promise<ZonaCercana[]> {

        if (!coordenadaValida(lat, lng)) {
            throw new Error("Coordenadas inválidas");
        }

        const rows = await zonaRepository.findEnCaja(lat, lng, radioMetros);
        const punto = { lat, lng };

        return rows
            .map(mapear)
            .map((zona) => {
                const distancia = haversineMetros(punto, {
                    lat: zona.centro_lat,
                    lng: zona.centro_lng
                });

                const peso = Number(pesoEfectivo(zona, fecha).toFixed(2));

                return {
                    ...zona,
                    // Distancia al centro, redondeada para no arrastrar
                    // decimales que el GPS del celular no puede sostener.
                    distancia_m: Math.round(distancia),
                    contiene_punto: distancia <= zona.radio_metros,
                    peso_efectivo: peso,
                    nivel_efectivo: nivelPorPeso(peso)
                };
            })
            // La caja envolvente devuelve de más: descartamos lo que quedó fuera
            .filter((z) => z.distancia_m <= radioMetros + z.radio_metros)
            .sort((a, b) => a.distancia_m - b.distancia_m);

    }

    /**
     * Nivel de riesgo vigente en un punto concreto.
     *
     * Si varias zonas se solapan, manda la de mayor peso efectivo: ante
     * criterios en conflicto, se toma siempre el más prudente.
     */
    async evaluarPunto(lat: number, lng: number, fecha: Date = new Date()) {

        const cercanas = await this.findCercanas(lat, lng, 0, fecha);
        const contenedoras = cercanas.filter((z) => z.contiene_punto);

        if (contenedoras.length === 0) {
            return {
                nivel: "DESCONOCIDO" as const,
                nivel_declarado: "DESCONOCIDO" as const,
                // Peso intermedio entre SEGURA (1) y REGULAR (4): sin datos no
                // se premia ni se castiga de más a la ruta que pasa por aquí.
                peso_efectivo: 2,
                es_nocturno: esHorarioNocturno(fecha),
                zonas: []
            };
        }

        const dominante = contenedoras.reduce((a, b) =>
            b.peso_efectivo > a.peso_efectivo ? b : a
        );

        return {
            // `nivel` es la etiqueta vigente a esta hora, que es la que debe
            // pintar la interfaz. `nivel_declarado` conserva el rótulo fijo de
            // la zona, útil para el panel del administrador.
            nivel: dominante.nivel_efectivo,
            nivel_declarado: dominante.nivel,
            peso_efectivo: dominante.peso_efectivo,
            es_nocturno: esHorarioNocturno(fecha),
            zonas: contenedoras.map((z) => ({
                id_zona: z.id_zona,
                nombre: z.nombre,
                nivel: z.nivel_efectivo,
                nivel_declarado: z.nivel,
                peso_efectivo: z.peso_efectivo
            }))
        };

    }

    async create(data: any, creadoPor: number | null): Promise<Zona> {
        const id = await zonaRepository.create(data, creadoPor);
        return await this.findById(id);
    }

    async update(id: number, data: any): Promise<Zona> {

        const existente = await zonaRepository.findById(id);

        if (!existente) {
            throw new Error("Zona no encontrada");
        }

        await zonaRepository.update(id, data);
        return await this.findById(id);

    }

    async delete(id: number) {

        const existente = await zonaRepository.findById(id);

        if (!existente) {
            throw new Error("Zona no encontrada");
        }

        await zonaRepository.softDelete(id);

        return {
            success: true,
            message: "Zona desactivada correctamente"
        };

    }

    /** Zonas con el número de reportes validados que caen dentro de cada una. */
    async findAllConImpacto(): Promise<(Zona & { total_reportes: number })[]> {

        const [zonas, conteos] = await Promise.all([
            this.findAll(),
            zonaRepository.contarReportesPorZona()
        ]);

        const porZona = new Map<number, number>(
            conteos.map((c: any) => [c.id_zona, Number(c.total_reportes)])
        );

        return zonas.map((z) => ({
            ...z,
            total_reportes: porZona.get(z.id_zona) ?? 0
        }));

    }

}

export default new ZonaService();
