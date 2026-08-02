# Brief para infografía — SafeWalk U

> Copia todo lo que hay debajo de la línea y pégalo en ChatGPT.
> Está escrito como instrucción directa para que genere la infografía.

---

Necesito que diseñes una **infografía vertical** que explique un sistema llamado
**SafeWalk U**. Te doy toda la información abajo. Usa solo estos datos; no
inventes cifras ni funciones que no aparezcan aquí.

## Qué es

SafeWalk U es una **aplicación web de movilidad segura** para estudiantes de la
Universidad Internacional del Ecuador, extensión Loja.

Frase de una línea:

> Como Google Maps, pero en lugar de la ruta más rápida te muestra la más segura.

## El problema que resuelve

Un estudiante que sale del campus de noche no tiene forma de saber qué calles
evitar. Los mapas convencionales optimizan tiempo y distancia; ninguno considera
el riesgo. SafeWalk U añade esa capa que falta.

## Lo que hace — 6 funciones principales

1. **Tres rutas por trayecto, clasificadas por seguridad**
   Elige de dónde sales y a dónde vas, y la app calcula tres caminos reales por
   las calles de Loja: 🟢 segura, 🟡 regular y 🔴 insegura. Cada una muestra
   distancia, tiempo caminando e índice de riesgo de 0 a 100.

2. **Elegir el punto tocando el mapa**
   Se puede usar el GPS, escribir una dirección o simplemente tocar el mapa y
   elegir si ese punto es la salida o la llegada. Los marcadores se arrastran.
   Funciona sin GPS.

3. **Reportar incidentes geolocalizados**
   El estudiante marca en el mapa dónde ocurrió el hecho, elige la categoría
   (robo, violencia, acoso, actividad sospechosa, accidente, iluminación
   deficiente, otro), describe, adjunta una foto y puede enviarlo de forma
   anónima.

4. **Botón SOS de pánico**
   Envía una alerta con la ubicación real del dispositivo al panel del
   administrador, y permite llamar con un toque a los contactos de confianza.

5. **Llamadas de emergencia desde el celular**
   Los botones abren el marcador telefónico: ECU 911, Policía Nacional (101),
   Bomberos (102) y Cruz Roja (131).

6. **Panel de administración**
   Moderar reportes, gestionar usuarios, suspender cuentas por mal uso,
   administrar las zonas de seguridad y ver estadísticas reales.

## El diferenciador: cómo se calcula el riesgo

Esta es la parte que conviene destacar visualmente, quizá como un diagrama de
flujo con tres entradas que convergen en un resultado:

```
    ZONAS DE SEGURIDAD          REPORTES DE ESTUDIANTES         HORA DEL DÍA
    24 zonas de Loja            validados por el admin          día / noche
    segura · regular            pierden peso con el
    · insegura                  tiempo
            │                            │                            │
            └────────────────────────────┼────────────────────────────┘
                                         ▼
                            MOTOR DE CÁLCULO DE RIESGO
                    muestrea cada ruta cada 30 metros y la puntúa
                                         ▼
                        🟢 SEGURA    🟡 REGULAR    🔴 INSEGURA
```

Dos ideas clave para resaltar:

- **El sistema aprende de la comunidad.** Cada reporte que un administrador
  valida modifica las rutas que ve todo el mundo. Mientras más estudiantes
  reporten, mejores son las sugerencias.
- **La misma ruta cambia según la hora.** Hay zonas tranquilas de día y
  peligrosas de noche, y el cálculo lo tiene en cuenta.

## Cifras reales del sistema

Úsalas como datos destacados:

| Dato | Valor |
|---|---|
| Rutas alternativas por trayecto | 3 |
| Zonas de seguridad mapeadas en Loja | 24 |
| Reparto de zonas | 8 seguras · 9 regulares · 7 inseguras |
| Escala del índice de riesgo | 0 a 100 |
| Categorías de incidente | 7 |
| Servicios de emergencia integrados | 9 |
| Precisión del análisis de ruta | un punto cada 30 metros |
| Vigencia de un reporte | 90 días |
| Franja nocturna | 18:00 a 06:00 |
| Perfiles de usuario | 2 (estudiante y administrador) |

### Ejemplo real medido: campus UIDE → Centro Histórico

| Ruta | De día | De noche |
|---|:--:|:--:|
| 🟢 Segura | 10 | 19 |
| 🟡 Regular | 13 | 27 |
| 🔴 Insegura | 19 | 39 |

*Índice de riesgo sobre 100. Los valores casi se duplican de noche.*

## Identidad visual

- **Logo:** escudo en negro que contiene un marcador de ubicación y un camino
  sinuoso, con la palabra "SafeWalk" debajo. Composición vertical.
- **Color principal:** morado oscuro `#4A208C`
- **Colores de los niveles de seguridad:**
  - Segura: verde `#16A34A`
  - Regular: ámbar `#F59E0B`
  - Insegura: rojo `#DC2626`
- **Fondos:** blanco y grises muy claros
- **Estilo:** limpio, moderno, esquinas redondeadas, mucho aire. Nada recargado.

## Estructura sugerida para la infografía

1. **Encabezado** — logo, nombre y la frase de una línea
2. **El problema** — una ilustración simple: estudiante de noche, calles sin información
3. **Las 3 rutas** — el elemento central, con los tres colores y sus índices
4. **Cómo se calcula** — el diagrama de las tres entradas
5. **Las 6 funciones** — íconos con texto corto
6. **Las cifras** — bloque de datos destacados
7. **Día vs noche** — la comparativa del ejemplo real
8. **Pie** — nota sobre los datos simulados (ver abajo)

## Nota obligatoria en el pie

Incluye este texto en letra pequeña al final:

> Las clasificaciones de zonas seguras, regulares e inseguras son datos
> simulados con fines académicos y de demostración. No provienen de la Policía
> Nacional del Ecuador ni del ECU 911.

Esto no es opcional: la infografía menciona barrios reales de Loja y no puede
dar a entender que las clasificaciones son oficiales.

## Tono

Profesional y claro, dirigido a un público universitario. Español de Ecuador.
Evita el lenguaje publicitario exagerado: es un proyecto académico, no una
campaña comercial.
