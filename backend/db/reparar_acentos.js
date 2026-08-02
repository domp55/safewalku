/**
 * Repara los acentos corrompidos en la base.
 *
 * El seed.sql está correctamente codificado en UTF-8, pero se importó con un
 * charset de cliente equivocado, así que las tildes y eñes quedaron guardadas
 * como "?" — "Túnel" se convirtió en "T??nel". La corrupción está en la base,
 * no en la lectura: la conexión ya usa utf8mb4.
 *
 * Este script relee los valores correctos del propio seed.sql y actualiza fila
 * por fila usando la clave primaria. Se prefiere esto a reimportar el seed
 * completo porque el TRUNCATE borraría los datos que se hayan creado usando la
 * aplicación (reportes, contactos, ubicaciones nuevas).
 *
 * Es idempotente: correrlo dos veces no hace daño.
 *
 * Uso:  node db/reparar_acentos.js
 */

require("dotenv").config();

const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

const seed = fs.readFileSync(path.join(__dirname, "seed.sql"), "utf8");

/** Extrae las tuplas VALUES de un INSERT concreto. */
function extraerTuplas(nombreTabla) {
    const inicio = seed.indexOf(`INSERT INTO ${nombreTabla} (`);
    if (inicio === -1) return [];

    const fin = seed.indexOf(";", inicio);
    const bloque = seed.slice(inicio, fin);

    // Cada tupla ocupa su propia línea y empieza por "(", lo que hace
    // innecesario un analizador de SQL completo para este caso.
    return bloque
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.startsWith("("))
        .map((l) => l.replace(/,$/, ""));
}

/** Separa los campos de una tupla respetando las comillas simples. */
function separarCampos(tupla) {
    const cuerpo = tupla.slice(1, tupla.lastIndexOf(")"));
    const campos = [];
    let actual = "";
    let dentroDeComillas = false;

    for (let i = 0; i < cuerpo.length; i++) {
        const ch = cuerpo[i];

        if (ch === "'" && cuerpo[i - 1] !== "\\") {
            dentroDeComillas = !dentroDeComillas;
            continue;
        }

        if (ch === "," && !dentroDeComillas) {
            campos.push(actual.trim());
            actual = "";
            continue;
        }

        actual += ch;
    }

    campos.push(actual.trim());
    return campos;
}

const TABLAS = [
    { tabla: "usuario", pk: "id_usuario", columnas: { 1: "nombre", 2: "apellido" } },
    { tabla: "ubicacion", pk: "id_ubicacion", columnas: { 1: "nombre", 2: "direccion" } },
    { tabla: "ruta", pk: "id_ruta", columnas: { 1: "nombre_ruta", 2: "descripcion" } },
    { tabla: "reporte", pk: "id_reporte", columnas: { 1: "descripcion" } },
];

(async () => {

    const conexion = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        charset: "utf8mb4",
    });

    let totalCorregidas = 0;

    for (const { tabla, pk, columnas } of TABLAS) {

        const tuplas = extraerTuplas(tabla);
        let corregidasTabla = 0;

        for (const tupla of tuplas) {

            const campos = separarCampos(tupla);
            const id = Number(campos[0]);

            if (!Number.isInteger(id)) continue;

            for (const [indice, columna] of Object.entries(columnas)) {

                const valorCorrecto = campos[Number(indice)];
                if (valorCorrecto === undefined) continue;

                // Solo tocamos las filas que están efectivamente corrompidas,
                // para no pisar cambios hechos desde la aplicación.
                //
                // El patrón del LIKE va como parámetro y no incrustado en la
                // cadena: mysql2 sustituye cualquier "?" que encuentre, incluso
                // dentro de comillas, así que un literal '%?%' se comería un
                // argumento y desplazaría todos los demás.
                const [resultado] = await conexion.query(
                    `UPDATE ${tabla} SET ${columna} = ? WHERE ${pk} = ? AND ${columna} LIKE ? AND ${columna} <> ?`,
                    [valorCorrecto, id, "%?%", valorCorrecto]
                );

                if (resultado.affectedRows > 0) corregidasTabla++;

            }

        }

        if (corregidasTabla > 0) {
            console.log(`  ${tabla}: ${corregidasTabla} campo(s) corregido(s)`);
        }

        totalCorregidas += corregidasTabla;

    }

    console.log(`\nTotal de campos reparados: ${totalCorregidas}`);

    // Comprobación final
    const pendientes = [];
    for (const { tabla, columnas } of TABLAS) {
        for (const columna of Object.values(columnas)) {
            const [r] = await conexion.query(
                `SELECT COUNT(*) AS t FROM ${tabla} WHERE ${columna} LIKE '%??%'`
            );
            if (r[0].t > 0) pendientes.push(`${tabla}.${columna}: ${r[0].t}`);
        }
    }

    console.log(
        pendientes.length === 0
            ? "Sin acentos corrompidos restantes."
            : `Quedan corrompidos -> ${pendientes.join(", ")}`
    );

    await conexion.end();

})().catch((e) => {
    console.error("Error reparando acentos:", e.message);
    process.exit(1);
});
