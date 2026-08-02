import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import repository from "../repositories/user.repository";
import { isValidUideEmail } from "../middleware/validateDomain";

class AuthService {

    /**
     * Alta de un estudiante.
     *
     * El rol es siempre ESTUDIANTE, sin excepción y sin parámetro que lo
     * cambie. La aplicación no crea cuentas de administrador por ningún camino:
     * los administradores son los que vienen cargados en la base. Es la única
     * forma de garantizar que nadie se conceda privilegios a sí mismo, y evita
     * tener que confiar en que cada endpoint compruebe bien los permisos.
     */
    async register(data: any) {

        const correo = (data.correo ?? data.email ?? "").toString().trim().toLowerCase();

        if (!isValidUideEmail(correo)) {
            throw new Error("Solo se permiten correos institucionales @uide.edu.ec");
        }

        const existe = await repository.findByEmail(correo);

        if (existe) {
            throw new Error("Ese correo ya está registrado.");
        }

        const cedula = (data.cedula ?? "").toString().trim() || null;

        if (cedula) {
            const conCedula = await repository.findByCedula(cedula);
            if (conCedula) {
                throw new Error("Ya existe una cuenta registrada con esa cédula.");
            }
        }

        const password = await bcrypt.hash(data.contrasena ?? data.password, 10);

        const id = await repository.create({
            nombre: data.nombre,
            apellido: data.apellido,
            cedula,
            correo,
            telefono: data.telefono ?? null,
            carrera: data.carrera ?? null,
            contrasena: password,
            rol: "ESTUDIANTE"
        });

        return { id, correo };

    }

    async login(correo: string, contrasena: string) {

        const normalizedCorreo = correo?.toString().trim().toLowerCase() ?? "";

        if (!isValidUideEmail(normalizedCorreo)) {
            throw new Error("Solo se permiten correos institucionales @uide.edu.ec");
        }

        const usuario = await repository.findByEmail(normalizedCorreo);

        // Mismo mensaje para usuario inexistente y contraseña incorrecta: si
        // fueran distintos, cualquiera podría averiguar qué correos están
        // registrados probando de uno en uno.
        const generico = "Correo o contraseña incorrectos.";

        if (!usuario) {
            throw new Error(generico);
        }

        const ok = await bcrypt.compare(contrasena, usuario.contrasena);

        if (!ok) {
            throw new Error(generico);
        }

        // El estado sí se explica, porque aquí las credenciales ya son válidas
        // y el usuario tiene derecho a saber por qué no puede entrar.
        if (usuario.estado === "BANEADO") {
            throw new Error(
                usuario.motivo_baneo
                    ? `Tu cuenta fue suspendida por mal uso del sistema. Motivo: ${usuario.motivo_baneo}`
                    : "Tu cuenta fue suspendida por mal uso del sistema."
            );
        }

        if (usuario.estado === "INACTIVO") {
            throw new Error("Tu cuenta está desactivada. Contacta al administrador.");
        }

        const jwtSecret = process.env.JWT_SECRET;

        if (!jwtSecret) {
            throw new Error("Configuración de JWT incompleta");
        }

        const signOptions: jwt.SignOptions = {
            expiresIn: "30d"
        };

        const token = jwt.sign(
            {
                id_usuario: usuario.id_usuario,
                correo: usuario.correo,
                rol: usuario.rol
            },
            jwtSecret,
            signOptions
        );

        const { contrasena: _, motivo_baneo: __, ...usuarioSeguro } = usuario;

        return {
            token,
            usuario: usuarioSeguro
        };

    }

}

export default new AuthService();
