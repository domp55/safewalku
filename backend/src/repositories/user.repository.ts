import pool from "../config/database";

export interface Usuario {

    id_usuario?: number;

    nombre: string;

    apellido: string;

    correo: string;

    contrasena: string;

    rol: "ESTUDIANTE" | "ADMINISTRADOR";

    estado?: "ACTIVO" | "INACTIVO" | "BANEADO";

    cedula?: string | null;

    telefono?: string | null;

    carrera?: string | null;

    foto_perfil?: string | null;

}

class UserRepository {

    async findAll() {

    const [rows]: any = await pool.query(

        `

        SELECT

            id_usuario,

            nombre,

            apellido,

            correo,

            rol,

            estado,

            fecha_registro

        FROM usuario

        -- Sin filtro de estado a propósito: el panel del administrador necesita
        -- ver las cuentas desactivadas para poder volver a habilitarlas. Antes
        -- desaparecían del listado y no había forma de recuperarlas.

        ORDER BY FIELD(estado, 'ACTIVO', 'INACTIVO'), id_usuario

        `

    );

    return rows;

}

    async findById(id:number){

    const [rows]:any=await pool.query(

        `

        SELECT

            id_usuario,

            nombre,

            apellido,

            correo,

            rol,

            estado,

            fecha_registro,

            foto_perfil

        FROM usuario

        -- Sin filtro por estado: el panel del administrador debe poder abrir
        -- una cuenta desactivada para reactivarla. Con el filtro, update()
        -- lanzaba "Usuario no encontrado" y la reactivación era imposible.
        WHERE id_usuario=?

        `,

        [id]

    );

    return rows[0];

}

    async findByEmail(correo: string) {

        const [rows]: any = await pool.query(

            "SELECT * FROM usuario WHERE correo=?",

            [correo]

        );

        return rows[0];

    }

    async findByCedula(cedula: string) {

        const [rows]: any = await pool.query(

            "SELECT id_usuario, correo FROM usuario WHERE cedula=?",

            [cedula]

        );

        return rows[0];

    }

    async create(usuario: Usuario) {

        const [result]: any = await pool.query(

            `INSERT INTO usuario
            (
                nombre,
                apellido,
                cedula,
                correo,
                telefono,
                carrera,
                contrasena,
                rol
            )
            VALUES (?,?,?,?,?,?,?,?)`,

            [

                usuario.nombre,

                usuario.apellido,

                usuario.cedula ?? null,

                usuario.correo,

                usuario.telefono ?? null,

                usuario.carrera ?? null,

                usuario.contrasena,

                usuario.rol

            ]

        );

        return result.insertId;

    }

    async update(id: number, usuario: Partial<Usuario>) {

    // Buscar el usuario actual
    const actual = await this.findById(id);

    if (!actual) {
        throw new Error("Usuario no encontrado");
    }

    await pool.query(

        `
        UPDATE usuario
        SET
            nombre = ?,
            apellido = ?,
            correo = ?,
            rol = ?,
            estado = ?
        WHERE
            id_usuario = ?
        `,

        // La condición estado='ACTIVO' se retiró del WHERE: impedía tocar una
        // cuenta desactivada, que es justo lo que hay que hacer para
        // reactivarla. El campo estado ahora sí se actualiza.

        [

            usuario.nombre ?? actual.nombre,

            usuario.apellido ?? actual.apellido,

            usuario.correo ?? actual.correo,

            usuario.rol ?? actual.rol,

            usuario.estado ?? actual.estado,

            id

        ]

    );

    return this.findById(id);

}

    async delete(id:number){

    await pool.query(

        `

        UPDATE usuario

        SET estado='INACTIVO'

        WHERE id_usuario=?

        `,

        [id]

    );

}

    async updateFotoPerfil(id: number, foto_perfil: string) {

        await pool.query(

            `UPDATE usuario SET foto_perfil = ? WHERE id_usuario = ?`,

            [foto_perfil, id]

        );

        return this.findById(id);

    }

}

export default new UserRepository();