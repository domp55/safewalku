import { Router } from "express";

import controller from "../controllers/emergencia.controller";

import auth from "../middleware/auth";
import authorize from "../middleware/authorize";
import validate from "../middleware/validate";

import { contactoSchema, servicioSchema } from "../schemas/emergencia.schema";

/**
 * Dos routers porque son recursos distintos aunque compartan pantalla:
 * los contactos son privados de cada estudiante, los servicios son públicos
 * y los mantiene el administrador.
 */

export const contactoRouter = Router();

/**
 * @swagger
 * tags:
 *   name: Emergencia
 *   description: Contactos personales y servicios de auxilio
 */

/**
 * @swagger
 * /api/contactos/me:
 *   get:
 *     summary: Contactos de emergencia del usuario autenticado
 *     tags: [Emergencia]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Listado de contactos propios }
 */
contactoRouter.get("/me", auth, controller.misContactos);

/**
 * @swagger
 * /api/contactos:
 *   post:
 *     summary: Agrega un contacto de emergencia
 *     tags: [Emergencia]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201: { description: Contacto agregado }
 */
contactoRouter.post("/", auth, validate(contactoSchema), controller.crearContacto);

contactoRouter.put("/:id", auth, validate(contactoSchema), controller.actualizarContacto);

contactoRouter.delete("/:id", auth, controller.eliminarContacto);

export const servicioRouter = Router();

/**
 * @swagger
 * /api/servicios:
 *   get:
 *     summary: Servicios de emergencia disponibles
 *     tags: [Emergencia]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Listado de servicios con teléfono y ubicación }
 */
servicioRouter.get("/", auth, controller.listarServicios);

servicioRouter.post(
    "/",
    auth,
    authorize("ADMINISTRADOR"),
    validate(servicioSchema),
    controller.crearServicio
);

servicioRouter.put(
    "/:id",
    auth,
    authorize("ADMINISTRADOR"),
    validate(servicioSchema),
    controller.actualizarServicio
);

servicioRouter.delete(
    "/:id",
    auth,
    authorize("ADMINISTRADOR"),
    controller.eliminarServicio
);
