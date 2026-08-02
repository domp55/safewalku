/**
 * Validadores de entrada compartidos.
 *
 * Viven aquí y no dentro de los esquemas Zod para poder probarlos por separado
 * y reutilizarlos desde cualquier capa. Los esquemas los envuelven.
 *
 * Nota sobre inyección SQL: la protección real del proyecto es que todas las
 * consultas usan parámetros (`?`), nunca concatenación de texto. Estas
 * validaciones no sustituyen a eso; sirven para que no entren datos absurdos y
 * para reducir la superficie de lo que llega a la base.
 */

/** Provincias del Ecuador (1-24) más 30, que identifica a extranjeros. */
const PROVINCIAS_VALIDAS = new Set([
    ...Array.from({ length: 24 }, (_, i) => i + 1),
    30
]);

/**
 * Valida una cédula ecuatoriana con su dígito verificador.
 *
 * No basta con comprobar que sean 10 dígitos: la cédula lleva un dígito de
 * control calculado con el algoritmo de módulo 10, así que un número inventado
 * al azar se detecta casi siempre. Esto evita registros con cédulas falsas
 * escritas a la ligera.
 */
export function esCedulaEcuatorianaValida(valor: string): boolean {

    const cedula = (valor ?? "").toString().trim();

    if (!/^\d{10}$/.test(cedula)) return false;

    const provincia = Number(cedula.slice(0, 2));
    if (!PROVINCIAS_VALIDAS.has(provincia)) return false;

    // El tercer dígito distingue el tipo de persona. Para personas naturales,
    // que es el caso de un estudiante, va de 0 a 5.
    const tercerDigito = Number(cedula[2]);
    if (tercerDigito > 5) return false;

    // Módulo 10: se multiplican los 9 primeros dígitos por 2 y 1 alternados;
    // a cada producto mayor que 9 se le resta 9, y se suman todos.
    let suma = 0;

    for (let i = 0; i < 9; i++) {
        const coeficiente = i % 2 === 0 ? 2 : 1;
        let producto = Number(cedula[i]) * coeficiente;
        if (producto > 9) producto -= 9;
        suma += producto;
    }

    const verificadorEsperado = (10 - (suma % 10)) % 10;

    return verificadorEsperado === Number(cedula[9]);

}

/**
 * Celular ecuatoriano: 10 dígitos que empiezan por 09.
 * Se admite escribirlo con espacios o guiones; se normaliza antes de validar.
 */
export function normalizarCelular(valor: string): string {
    return (valor ?? "").toString().replace(/[\s\-()]/g, "");
}

export function esCelularEcuatorianoValido(valor: string): boolean {
    return /^09\d{8}$/.test(normalizarCelular(valor));
}

/**
 * Nombres y apellidos: solo letras, incluidas tildes y ñ, más espacios,
 * apóstrofos y guiones. Deja fuera dígitos y signos que no pintan nada en un
 * nombre y que suelen ser señal de datos basura.
 */
const PATRON_NOMBRE = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?:[ '\-][A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$/;

export function esNombreValido(valor: string): boolean {
    const nombre = (valor ?? "").toString().trim();
    return nombre.length >= 2 && nombre.length <= 100 && PATRON_NOMBRE.test(nombre);
}

/** Correo institucional de la UIDE. Es el único dominio admitido. */
export function esCorreoUide(valor: string): boolean {
    const correo = (valor ?? "").toString().trim().toLowerCase();
    return /^[a-z0-9._%+-]+@uide\.edu\.ec$/.test(correo) && correo.length <= 100;
}

export interface ResultadoContrasena {
    valida: boolean;
    errores: string[];
}

/**
 * Requisitos de contraseña.
 *
 * El mínimo de 8 y la exigencia de variedad son el consenso habitual. El máximo
 * de 72 no es arbitrario: bcrypt ignora todo lo que pase de 72 bytes, así que
 * aceptar más daría una falsa sensación de seguridad al usuario.
 */
export function validarContrasena(valor: string): ResultadoContrasena {

    const contrasena = (valor ?? "").toString();
    const errores: string[] = [];

    if (contrasena.length < 8) errores.push("Debe tener al menos 8 caracteres.");
    if (contrasena.length > 72) errores.push("No puede superar los 72 caracteres.");
    if (!/[a-z]/.test(contrasena)) errores.push("Debe incluir una letra minúscula.");
    if (!/[A-Z]/.test(contrasena)) errores.push("Debe incluir una letra mayúscula.");
    if (!/\d/.test(contrasena)) errores.push("Debe incluir un número.");
    if (!/[^A-Za-z0-9]/.test(contrasena)) errores.push("Debe incluir un símbolo.");

    // Las secuencias más usadas se rechazan aunque cumplan el resto
    if (/^(12345678|password|contrasena|qwertyui)/i.test(contrasena)) {
        errores.push("Es una contraseña demasiado común.");
    }

    return { valida: errores.length === 0, errores };

}

/**
 * Carreras de la UIDE Loja.
 *
 * Lista cerrada en lugar de texto libre para que el dato sirva para agrupar
 * estadísticas en el panel. Si la universidad abre una carrera nueva, se añade
 * aquí y en el desplegable del registro.
 */
export const CARRERAS = [
    "Ingeniería en Software",
    "Ingeniería Industrial",
    "Ingeniería Automotriz",
    "Administración de Empresas",
    "Comercio Exterior",
    "Contabilidad y Auditoría",
    "Derecho",
    "Psicología",
    "Enfermería",
    "Odontología",
    "Medicina",
    "Gastronomía",
    "Diseño Gráfico",
    "Otra"
] as const;

export type Carrera = (typeof CARRERAS)[number];

export function esCarreraValida(valor: string): boolean {
    return (CARRERAS as readonly string[]).includes((valor ?? "").toString().trim());
}
