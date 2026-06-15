# Nueva estructura modular propuesta

## Objetivo

Este documento redefine la estructura de `CalculadoraSolar` con un objetivo mas estricto:

- separar claramente frontend, backend e integraciones externas
- aislar cada modulo funcional para que su mantenimiento no afecte al resto
- permitir agregar nuevos modulos principales sin reestructurar toda la app
- dejar una base lista para migrar logica sensible o pesada hacia backend propio
- preparar el proyecto para desplegarse en un servidor Linux usando Nginx
- dejar el backend listo para administrarse con PM2 y archivo `ecosystem`

La referencia funcional actual son los modulos visibles en la navegacion principal:

- Calculadora Solar
- Cotizar sin calculadora
- Consultar cotizacion
- Solo Mersh PDF

La meta es que cada uno pueda evolucionar casi como una mini-aplicacion dentro del mismo proyecto.

---

## Supuesto de despliegue

Esta reestructuracion debe pensarse desde ahora para un servidor Linux con Nginx como punto de entrada.

Eso implica:

- el frontend compilado se servira como archivos estaticos
- Nginx actuara como reverse proxy hacia el backend de la aplicacion
- PM2 administrara el proceso del backend en Linux
- los endpoints internos deben quedar listos para ser expuestos bajo una ruta controlada como `/api/`
- los secretos no deben depender de variables embebidas en el bundle del frontend
- las rutas del frontend deben contemplar fallback de SPA configurado en Nginx

Este supuesto si cambia la logica de backend recomendada:

- ya no conviene depender de proxies temporales pensados solo para Vite
- el backend debe poder correr como proceso Node en Linux, idealmente detras de Nginx
- el backend debe poder levantarse de forma estable mediante `pm2 start ecosystem.config.js`
- las integraciones con InterFuerza, Gemini y cualquier secreto deben salir desde backend
- la app debe evitar acoplarse a features especificas de entornos serverless si el destino principal sera Linux

---

## 1. Principio rector

Cada modulo de negocio debe ser autonomo en 3 niveles:

1. UI propia
2. casos de uso propios
3. acceso a datos a traves de contratos estables

Eso significa que un modulo no debe depender de detalles internos de otro modulo, ni de payloads crudos del proveedor, ni de llamadas HTTP directas.

La aplicacion completa debe componerse asi:

```text
App shell -> registro de modulos -> modulo activo -> caso de uso -> repositorio -> backend/integraciones
```

---

## 2. Problema que queremos resolver

Hoy la app ya tiene una base modular, pero todavia hay acoplamientos que vuelven costoso el mantenimiento:

- el frontend aun conoce estructuras crudas del proveedor
- la logica API esta repartida entre modulos e integraciones
- no hay una frontera explicita entre backend de la app y proveedores externos
- hay funcionalidades transversales mezcladas con logica especifica del dominio

Resultado:

- tocar cotizaciones puede impactar catalogo o PDF
- cambiar proveedor API obliga a revisar componentes React
- agregar un nuevo modulo principal implica tocar mas carpetas de las necesarias

---

## 3. Criterio de modularidad deseado

Cuando se agregue o mantenga un modulo principal, el cambio deberia concentrarse en su propia carpeta y en su registro.

Ejemplo:

- si se crea un modulo nuevo llamado `historial`
- o si se da mantenimiento solo a `consulta-cotizacion`

los cambios deberian vivir principalmente en:

- `src/modulos/historial/` o `src/modulos/consulta-cotizacion/`
- `src/aplicacion/modulos/registroModulos.js`
- algun contrato o repositorio comun si realmente cambia el acceso a datos

No deberia ser necesario tocar:

- componentes de otros modulos
- rutas internas de otros dominios
- UI global fuera del shell
- payloads de proveedores ajenos

---

## 4. Propuesta de arquitectura

La propuesta separa el proyecto en 5 zonas:

### `src/aplicacion/`

Responsable del shell de la app:

- arranque
- router
- layout base
- registro de modulos
- composicion de navegacion principal

### `src/modulos/`

Responsable de los modulos funcionales aislados.

Cada modulo contiene:

- paginas
- componentes
- hooks del modulo
- casos de uso del modulo
- contratos internos del modulo
- adaptadores de presentacion
- estilos del modulo
- definicion de rutas y menu del modulo

### `src/compartido/`

Responsable de piezas reutilizables y neutrales:

- botones
- inputs
- tablas
- helpers
- validaciones genericas
- utilidades visuales

Nada aqui debe depender de un modulo especifico.

### `src/plataforma/`

Responsable de infraestructura transversal del frontend:

- auth de sesion
- storage local/session
- event bus
- configuracion global
- cliente HTTP hacia backend propio
- manejo de errores compartido

Esta carpeta reemplaza conceptualmente la mezcla actual entre `core/` e `integraciones/` como capa de soporte del frontend.

### `backend/`

Responsable de toda la logica de servidor o frontera con externos.

Aqui debe vivir:

- proxy seguro
- integracion con InterFuerza
- integracion con Supabase cuando aplique del lado servidor
- integracion con Gemini u otros proveedores
- normalizacion de respuestas externas
- construccion de payloads de proveedores
- repositorios server-side
- compatibilidad de despliegue como servicio Node detras de Nginx en Linux
- compatibilidad de ejecucion y reinicio administrado por PM2

La regla es simple:

- si habla con un servicio externo o maneja secretos, debe vivir en `backend/`

---

## 5. Estructura objetivo

```text
CalculadoraSolar/
├── backend/
│   ├── app/
│   │   ├── server.js
│   │   ├── router.js
│   │   └── middlewares/
│   │
│   ├── modulos/
│   │   ├── catalogo/
│   │   │   ├── endpoints/
│   │   │   ├── casosDeUso/
│   │   │   ├── repositorios/
│   │   │   └── mapeadores/
│   │   │
│   │   ├── cotizaciones/
│   │   ├── consultaCotizacion/
│   │   ├── pdf/
│   │   └── autenticacion/
│   │
│   ├── proveedores/
│   │   ├── interfuerza/
│   │   │   ├── cliente.js
│   │   │   ├── payloads.js
│   │   │   ├── endpoints.js
│   │   │   └── mapeadores.js
│   │   │
│   │   ├── supabase/
│   │   └── gemini/
│   │
│   ├── compartido/
│   │   ├── http/
│   │   ├── errores/
│   │   ├── logging/
│   │   └── config/
│   │
│   ├── ecosystem.config.js
│   ├── .env.production
│   ├── package.json
│   └── index.js
│
├── src/
│   ├── aplicacion/
│   │   ├── Aplicacion.jsx
│   │   ├── principal.jsx
│   │   ├── router/
│   │   ├── layout/
│   │   └── modulos/
│   │       ├── registroModulos.js
│   │       └── contenedorModulos.js
│   │
│   ├── plataforma/
│   │   ├── auth/
│   │   ├── sesion/
│   │   ├── eventos/
│   │   ├── http/
│   │   ├── storage/
│   │   └── config/
│   │
│   ├── compartido/
│   │   ├── componentes/
│   │   ├── hooks/
│   │   ├── utils/
│   │   ├── validaciones/
│   │   └── estilos/
│   │
│   ├── modulos/
│   │   ├── calculadora-solar/
│   │   │   ├── paginas/
│   │   │   ├── componentes/
│   │   │   ├── hooks/
│   │   │   ├── casosDeUso/
│   │   │   ├── servicios/
│   │   │   ├── modelos/
│   │   │   ├── adaptadores/
│   │   │   ├── configuracion/
│   │   │   ├── estilos/
│   │   │   └── index.js
│   │   │
│   │   ├── cotizar-directo/
│   │   ├── consultar-cotizacion/
│   │   ├── mersh-pdf/
│   │   └── autenticacion/
│   │
│   └── estilos/
│
├── public/
└── package.json
```

---

## 6. Como debe pensarse cada modulo principal

Los cuatro modulos principales deben tratarse como bounded contexts funcionales del frontend:

### `calculadora-solar`

Responsable de:

- calculo solar
- recomendacion de materiales
- propuesta base
- experiencia guiada con calculadora

### `cotizar-directo`

Responsable de:

- crear cotizacion sin pasar por calculadora
- seleccion manual de productos
- armado directo de lineas

### `consultar-cotizacion`

Responsable de:

- buscar cotizacion existente
- mostrar detalle
- descargar o continuar flujo desde una cotizacion existente

### `mersh-pdf`

Responsable de:

- carga de PDF
- analisis del PDF
- deteccion de referencias
- fusion con fichas tecnicas
- consulta de fichas tecnicas publicas en Supabase Storage

Cada modulo debe tener:

- una entrada publica `index.js`
- su `registroModulo.js`
- sus pantallas
- sus servicios y casos de uso internos
- sus pruebas futuras dentro del mismo scope

---

## 7. Reglas obligatorias de aislamiento

Para que un modulo no afecte al resto, se deben imponer estas reglas:

1. Un modulo no importa componentes internos de otro modulo.

Permitido:

- importar desde `compartido/`
- importar desde `plataforma/`
- importar contratos estables

No permitido:

- `modulos/a/...` importando archivos internos de `modulos/b/...`

2. Un modulo no conoce payloads de proveedor.

La UI no debe leer:

- `Item_Number`
- `Category_L1`
- `Quote`
- `Customer_ID`
- `raw.Producto`

La UI debe consumir solo modelos internos ya normalizados.

3. Un modulo no hace `fetch` directo a proveedores.

El flujo permitido debe ser:

```text
Modulo -> casoDeUso -> repositorio frontend -> backend propio
```

4. Los secretos no viven en `src/`.

Tokens, headers sensibles y logica de autenticacion con proveedores deben vivir en `backend/`.

5. El menu principal sale del registro modular.

No se debe hardcodear la navegacion principal en un componente visual.
Cada modulo expone su metadata y el shell la compone.

---

## 8. Registro modular recomendado

La app ya tiene una buena base con `contenedorModulos` y `registrarModulos`.
La idea es reforzar ese patron.

Cada modulo deberia exponer algo parecido a esto:

```js
export const registroModulo = {
  id: 'consultar-cotizacion',
  etiqueta: 'Consultar cotizacion',
  orden: 30,
  habilitado: true,
  rutas: [...],
  itemNavegacion: {
    ruta: '/consultar-cotizacion',
    etiqueta: 'Consultar cotizacion',
    orden: 30,
  },
};
```

Y el shell debe registrar modulos asi:

```text
src/aplicacion/modulos/registroModulos.js
```

Con eso, agregar un nuevo modulo principal deberia implicar:

1. crear carpeta del modulo
2. crear su `registroModulo.js`
3. registrarlo en un solo archivo central

---

## 9. Que debe ir al backend

Toda logica que hoy mezcla frontend con proveedor debe migrarse a `backend/`.

### Debe vivir en backend

- proxy API
- token y header de InterFuerza
- validacion de IP o manejo de errores del proveedor
- control de rate limit de InterFuerza para evitar bloqueo de IP
- construccion de payloads para cotizaciones
- normalizacion de respuestas de productos, clientes y quotes
- llamadas a Supabase que requieran control o secreto
- integraciones con IA o servicios externos
- cliente e integracion de Gemini para recomendaciones o parsing asistido
- adaptadores server-side para proveedores como InterFuerza, Supabase y Gemini
- rutas HTTP internas pensadas para reverse proxy con Nginx
- configuracion apta para correr como proceso persistente en Linux
- configuracion de arranque y reinicio bajo PM2
- definicion de variables de entorno server-side para ser cargadas por `ecosystem.config.js`

### Puede quedarse en frontend

- estado visual
- formularios
- navegacion
- render de tablas, cards y flujos
- validaciones de UX
- transformaciones menores solo de presentacion
- lectura de assets publicos de Supabase solo cuando no exponga secretos ni reglas sensibles

Esto reduce el acoplamiento y evita que el frontend se vuelva rehén del proveedor.

---

## 10. Estrategia de carpetas por modulo

Dentro de cada modulo principal, la estructura recomendada es:

```text
modulos/nombre-modulo/
├── paginas/
├── componentes/
├── hooks/
├── casosDeUso/
├── servicios/
├── modelos/
├── adaptadores/
├── configuracion/
├── estilos/
└── index.js
```

### Responsabilidad de cada subcarpeta

- `paginas/`: entry points visuales del modulo
- `componentes/`: UI propia del modulo
- `hooks/`: estado y comportamiento de UI del modulo
- `casosDeUso/`: orquestacion funcional del modulo
- `servicios/`: logica de negocio local del modulo que no toca proveedor
- `modelos/`: shape interna del modulo
- `adaptadores/`: traduccion entre datos del backend y modelos del modulo
- `configuracion/`: rutas, menu, constantes del modulo
- `estilos/`: CSS del modulo

---

## 11. Beneficios esperados

Con esta estructura:

- mantener `mersh-pdf` no deberia afectar `calculadora-solar`
- agregar `historial` o `reportes` seria un cambio contenido
- cambiar InterFuerza por otro proveedor afectaria principalmente `backend/proveedores/`
- el frontend quedaria mas simple, mas testeable y menos expuesto a secretos

Tambien mejora la forma de trabajar en equipo:

- cada modulo puede atenderse en commits o ramas separadas
- el riesgo de regresiones cruzadas baja
- el code review se vuelve mas localizable
- la operacion en servidor se vuelve mas estable con PM2 para reinicios, logs y arranque automatico

---

## 12. Mejoras adicionales recomendadas

Ademas de la reestructuracion por modulos, conviene dejar previstas estas mejoras para que el proyecto sea mas mantenible y operable.

### 1. Estrategia de pruebas

El proyecto deberia tener pruebas separadas por nivel:

- pruebas unitarias para servicios, adaptadores y casos de uso
- pruebas de integracion para contratos entre frontend, backend y proveedores
- pruebas funcionales para los modulos principales mas sensibles

Prioridad minima:

- cubrir la calculadora inteligente sin cambiar su comportamiento
- cubrir la resolucion de nombres de fichas PDF en Supabase
- cubrir creacion y consulta de cotizaciones

La idea es que cualquier futura refactorizacion tenga red de seguridad antes de tocar logica sensible.

### 2. Healthcheck y readiness del backend

Como el backend correra con PM2 y estara detras de Nginx, conviene definir endpoints internos como:

- `/api/health`
- `/api/ready`

Esto sirve para:

- verificar que el proceso esta vivo
- validar que el backend arranco correctamente
- detectar antes si fallan variables de entorno o integraciones base

### 3. Estrategia de variables de entorno

Conviene separar claramente variables por contexto:

- frontend local
- backend local
- backend produccion
- variables publicas
- variables privadas

Regla recomendada:

- todo lo sensible debe vivir solo en backend
- el frontend solo debe recibir variables publicas estrictamente necesarias

Tambien conviene documentar desde el inicio:

- que variables son obligatorias
- cuales son opcionales
- quien las consume
- en que entorno se usan

### 4. Observabilidad y logs

El backend deberia emitir logs estructurados y centralizados.

Minimo recomendado:

- logs de arranque
- logs de error por modulo
- logs de integracion con proveedores
- logs de requests criticos

PM2 ayuda a gestionar salida y archivos de log, pero el proyecto debe definir un criterio claro de logging para no depender solo de `console.log`.

### 5. Contratos de respuesta estables

Antes de mover mas logica al backend, conviene definir respuestas consistentes para cada dominio:

- catalogo
- cotizaciones
- consulta de cotizacion
- PDF
- IA

Esto reduce el riesgo de romper la UI cuando cambie el proveedor o cambie la implementacion interna.

### 6. Limites y timeouts por proveedor

InterFuerza, Gemini y otras integraciones externas deberian tener reglas explicitas de:

- timeout
- retries controlados
- manejo de errores esperados
- mensajes amigables para frontend

Eso evita que el comportamiento quede disperso o dependa de defaults no controlados.

### 7. Proteccion de botones y acciones repetidas en frontend

Cuando un boton dispare una solicitud a API, la interfaz debe evitar multiples envios de la misma accion por clics repetidos.

Objetivo:

- evitar solicitudes duplicadas
- reducir carga innecesaria al backend
- proteger el rate limit de proveedores como InterFuerza
- evitar que el usuario cree procesos repetidos por accidente

Comportamiento recomendado:

- al hacer clic, el boton pasa inmediatamente a estado `loading`
- mientras la solicitud siga activa, el boton queda deshabilitado
- si aplica, tambien se bloquea por una ventana corta adicional antes de poder volver a ejecutarse
- si la operacion termina con exito o error, la UI debe recuperar el control de forma clara

Reglas practicas:

- no permitir doble submit mientras exista una promesa activa asociada a esa accion
- aplicar un enfriamiento corto cuando la accion sea sensible o costosa
- mostrar feedback visible como `Cargando...`, spinner o mensaje de progreso
- si la accion depende de un identificador unico, reutilizar la misma solicitud activa en vez de disparar otra

Casos donde esto es especialmente importante:

- crear cotizacion
- consultar cotizacion
- cargar catalogo
- generar propuesta
- fusionar PDF
- invocar procesos con Gemini

Implementacion sugerida:

- estado local `isSubmitting` o equivalente por accion
- deshabilitar el boton mientras `isSubmitting === true`
- opcionalmente agregar un cooldown corto de UI, por ejemplo `800ms` a `1500ms`, segun la accion
- combinar esta defensa de frontend con deduplicacion real en backend

Regla importante:

- el bloqueo visual del boton ayuda, pero no sustituye la proteccion server-side
- si una accion es critica, backend y frontend deben protegerla en conjunto

### 8. Regla critica de RateLimit para InterFuerza

InterFuerza impone una restriccion operativa critica:

- maximo `20` peticiones por cada `10` segundos
- si se supera ese limite, la IP puede quedar bloqueada por `1 hora`

Esto obliga a que el backend implemente protecciones explicitas.

Minimo requerido:

- centralizar todas las llamadas a InterFuerza en backend
- usar un limitador interno por ventana para no exceder `20/10s`
- evitar que el frontend dispare multiples llamadas paralelas directas
- aplicar cache para catalogo, clientes y respuestas reutilizables
- serializar o controlar la concurrencia en operaciones masivas
- no hacer retries agresivos automaticos
- registrar en logs cuando se acerque el consumo al limite

Reglas operativas recomendadas:

- dejar margen de seguridad y no trabajar pegado al limite teorico
- usar un objetivo interno mas conservador, por ejemplo `12-15` peticiones cada `10` segundos
- agrupar o reutilizar respuestas siempre que sea posible
- priorizar colas internas para llamadas no urgentes
- si el backend detecta saturacion, responder error controlado al frontend antes de golpear InterFuerza

Impacto arquitectonico:

- el acceso a InterFuerza no debe quedar distribuido en varios puntos del frontend
- el backend debe tener una sola puerta de salida hacia InterFuerza
- catalogo y consultas repetitivas deben apoyarse en cache tecnica
- cualquier proceso futuro de sincronizacion o precarga debe respetar este limite desde diseño

Esta regla debe considerarse obligatoria para evitar el bloqueo de IP en produccion.

### 9. Diseño tecnico propuesto para el limitador de InterFuerza

Para no improvisar en implementacion, el limitador deberia diseñarse con estas piezas:

#### 1. Un solo punto de salida

Toda llamada a InterFuerza debe pasar por un unico cliente backend, por ejemplo:

```text
backend/proveedores/interfuerza/cliente.js
```

Ningun otro archivo deberia hacer requests directos a InterFuerza por fuera de ese cliente.

#### 2. Cola interna con ventana deslizante

El cliente debe usar un limitador con:

- ventana de `10` segundos
- limite duro configurable
- cola interna para solicitudes pendientes

Configuracion recomendada:

- limite real del proveedor: `20` por `10s`
- limite operativo interno: `12` a `15` por `10s`
- margen reservado para operaciones criticas o picos no previstos

Comportamiento esperado:

- si la ventana actual aun permite salida, la solicitud se ejecuta
- si ya no hay cupo, la solicitud entra en cola
- la cola se libera progresivamente cuando la ventana vuelve a tener espacio

#### 3. Priorizacion de solicitudes

No todas las llamadas tienen la misma urgencia.

Se recomienda definir al menos dos niveles:

- `alta`: consultas necesarias para interaccion inmediata del usuario
- `normal`: precargas, sincronizaciones, catalogo o procesos diferibles

La cola debe despachar primero las de prioridad alta.

#### 4. Cache tecnica delante de InterFuerza

Antes de llamar al proveedor, el backend debe revisar cache para operaciones repetitivas.

Casos ideales de cache:

- catalogo de productos
- categorias
- clientes
- cotizaciones consultadas recientemente

Objetivo:

- reducir trafico innecesario
- evitar repetir llamadas iguales en ventanas cortas
- proteger la IP aun cuando varios usuarios hagan consultas similares

#### 5. Deduplcacion de solicitudes concurrentes

Si dos o mas solicitudes iguales llegan al mismo tiempo, el backend deberia reutilizar una sola promesa activa.

Ejemplo:

- dos usuarios piden el mismo catalogo al mismo tiempo
- el backend hace una sola llamada real a InterFuerza
- las demas esperan el mismo resultado

Esto es especialmente importante para catalogo y consultas por ID.

#### 6. Reintentos controlados

No se deben hacer retries agresivos automaticos.

Regla recomendada:

- `0` retries para errores por rate limit o sospecha de bloqueo
- `1` retry maximo para fallos transitorios de red
- backoff corto y controlado solo cuando tenga sentido

Si el backend detecta que reintentar empeoraria el riesgo de bloqueo, debe fallar rapido y responder error controlado.

#### 7. Timeout y cancelacion

Cada request a InterFuerza debe tener timeout explicito.

Recomendacion inicial:

- timeout corto para consultas simples
- timeout moderado para operaciones mas pesadas

Si una solicitud vence en cola o ya no tiene sentido procesarla, debe poder cancelarse antes de salir al proveedor.

#### 8. Logs y metricas minimas

El limitador deberia registrar al menos:

- cantidad de requests ejecutadas por ventana
- cantidad de requests en cola
- tiempo de espera promedio en cola
- cantidad de respuestas servidas desde cache
- cantidad de rechazos preventivos
- errores del proveedor

Esto ayuda a ajustar el limite interno sin adivinar.

#### 9. Respuesta defensiva al frontend

Si el backend detecta saturacion, debe responder antes de golpear InterFuerza.

Ejemplos de respuesta:

- `429` interno controlado cuando la cola ya no acepta mas solicitudes
- mensaje amigable tipo: `El servicio esta ocupado, intenta nuevamente en unos segundos.`

El objetivo es proteger la IP del servidor, aunque eso implique rechazar temporalmente algunas solicitudes del frontend.

#### 10. Implementacion sugerida por capas

```text
Modulo backend -> repositorio backend -> cliente InterFuerza -> limitador -> fetch HTTP
```

El orden ideal seria:

```text
solicitud
-> normalizar clave
-> revisar cache
-> revisar promesa activa equivalente
-> encolar en limitador
-> ejecutar request HTTP
-> mapear respuesta
-> guardar en cache si aplica
-> responder
```

#### 11. Parametros configurables

Conviene dejar configurables desde variables o archivo de config:

- `INTERFUERZA_RATE_LIMIT_MAX`
- `INTERFUERZA_RATE_LIMIT_WINDOW_MS`
- `INTERFUERZA_RATE_LIMIT_SAFE_MAX`
- `INTERFUERZA_QUEUE_MAX`
- `INTERFUERZA_REQUEST_TIMEOUT_MS`
- `INTERFUERZA_CACHE_TTL_MS`

Asi se podra ajustar la operacion sin reescribir logica.

#### 12. Regla de seguridad final

Si existe duda entre responder mas rapido o proteger la IP, siempre debe ganar proteger la IP.

Es preferible devolver una respuesta controlada al frontend que exponer el servidor a un bloqueo de `1 hora`.

#### 13. Estrategia recomendada para aplicar esta restriccion

La recomendacion practica para este proyecto es manejar la restriccion de InterFuerza en tres capas al mismo tiempo:

##### Frontend

- deshabilitar botones mientras la solicitud este activa
- evitar doble clic y dobles submits
- reutilizar solicitudes activas cuando el usuario repita la misma accion
- aplicar cooldown corto en acciones sensibles

##### Backend

- usar una sola puerta de salida hacia InterFuerza
- aplicar limitador interno con cola
- trabajar con un limite conservador, no con el maximo teorico del proveedor
- aplicar cache a catalogo, clientes y consultas repetidas
- deduplicar solicitudes concurrentes
- rechazar preventivamente solicitudes si el backend detecta saturacion

##### Operacion

- registrar consumo por ventana
- monitorear crecimiento de cola
- exponer healthcheck
- dejar parametros configurables para ajustar sin reescribir logica

Estrategia inicial sugerida de implementacion:

1. bloqueo de botones en frontend
2. cliente unico de InterFuerza en backend
3. rate limiter interno con margen seguro de `12/10s`
4. cache de catalogo y consultas frecuentes
5. deduplicacion de solicitudes iguales

Regla final:

- no confiar solo en frontend
- no confiar solo en cache
- no confiar solo en el servidor

La proteccion correcta es:

```text
boton protegido + backend con limitador/cola + cache + deduplicacion
```

---

## 13. Restricciones funcionales que no se deben modificar

Durante la reorganizacion modular hay dos logicas sensibles que deben conservarse tal como funcionan hoy.

### 1. Calculadora inteligente

La logica actual de la calculadora inteligente no se debe modificar durante la migracion estructural.

Esto incluye:

- formulas actuales de calculo
- reglas de recomendacion
- comportamiento funcional del flujo
- resultado esperado que hoy consume el modulo principal

Si en algun momento se mueve de carpeta, se debe mover sin alterar su comportamiento.

### 2. Formato actual de nombres de fichas tecnicas en Supabase

La logica actual con la que se construyen, buscan o resuelven los nombres de archivos PDF de fichas tecnicas en Supabase tampoco se debe modificar.

Esto incluye:

- formato del nombre del archivo
- convenciones actuales de busqueda
- reglas de resolucion hacia `VITE_SUPABASE_STORAGE_URL`
- compatibilidad con los nombres de fichas ya existentes

Si esta logica se refactoriza o se encapsula en otro adapter, debe conservar exactamente el comportamiento actual.

Estas dos piezas deben tratarse como reglas de no regresion.

---

## 14. Fases recomendadas de migracion

### Fase 1. Reordenar sin romper

- crear carpeta `backend/`
- mover `api/proxy.js` y `api/interfuerza.js` a backend
- definir cliente frontend unico hacia backend
- mantener las pantallas actuales funcionando
- documentar variables actuales de `Supabase Storage` y `Gemini`
- definir desde el inicio rutas backend compatibles con despliegue Linux + Nginx
- crear desde el inicio el archivo `backend/ecosystem.config.js`
- definir tambien `/api/health` y estrategia inicial de logs

### Fase 2. Reorganizar frontend por modulos principales

- renombrar y separar modulos a:
  - `calculadora-solar`
  - `cotizar-directo`
  - `consultar-cotizacion`
  - `mersh-pdf`
- mover rutas, componentes y estilos a su modulo correcto
- dejar `autenticacion` como modulo aparte de soporte

### Fase 3. Sacar conocimiento de proveedor del frontend

- eliminar uso de `raw.*` en componentes
- consumir solo modelos internos
- mover payloads y mapeadores sensibles a backend
- evaluar si Gemini debe quedarse temporalmente en frontend por rapidez o migrarse directo a backend por seguridad
- dejar Supabase Storage encapsulado en un adapter claro para el modulo `mersh-pdf`

### Fase 4. Consolidar contratos

- un repositorio frontend por dominio
- un endpoint backend por capacidad
- contratos de respuesta estables para no romper la UI
- dejar preparada la configuracion de reverse proxy y rutas base para produccion
- dejar definidos nombre de app, script, cwd, logs y variables para PM2

### Fase 5. Preparar crecimiento

- permitir habilitar o deshabilitar modulos por registro
- documentar template para futuros modulos
- agregar pruebas por modulo
- separar checklist de despliegue, observabilidad y rollback

---

## 15. Regla de decision futura

Antes de agregar cualquier archivo nuevo, hacer esta pregunta:

`esto pertenece al shell, a un modulo, a plataforma compartida o al backend?`

Si la respuesta no es clara, el archivo todavia no esta bien ubicado.

---

## 16. Conclusión

La nueva estructura no debe organizarse solo por tipo de archivo, sino por responsabilidad y aislamiento.

La decision mas importante es esta:

- frontend modular por features en `src/modulos/`
- backend e integraciones sensibles en `backend/`

Con eso, cada modulo principal puede mantenerse de forma casi independiente, y la aplicacion queda preparada para crecer sin que cada cambio arrastre al resto del sistema.

---

## 17. Resumen final de como queda el proyecto

Despues de esta configuracion conceptual, el proyecto queda planteado asi:

### Frontend

- sigue viviendo en `src/`
- se organiza por modulos funcionales aislados
- los modulos principales son:
  - `calculadora-solar`
  - `cotizar-directo`
  - `consultar-cotizacion`
  - `mersh-pdf`
- cada modulo debe poder mantenerse sin afectar al resto
- el shell de la aplicacion compone rutas y navegacion desde un registro modular central

### Backend

- vivira en una carpeta separada `backend/`
- centralizara toda la logica sensible y toda integracion externa
- manejara:
  - InterFuerza
  - Gemini
  - integraciones server-side con Supabase cuando aplique
  - payloads
  - mapeadores
  - secretos y configuracion privada
- el frontend ya no deberia depender directamente de proveedores externos
- se ejecutara en Linux administrado con PM2 usando `ecosystem.config.js`

### Despliegue

- el destino objetivo es un servidor Linux con Nginx
- Nginx servira el frontend compilado
- Nginx hara reverse proxy hacia el backend Node
- PM2 mantendra vivo el proceso del backend y facilitara reinicios, logs y arranque automatico
- las rutas internas del backend deben quedar preparadas para publicarse bajo `/api/`
- la arquitectura debe evitar depender de soluciones temporales o acopladas solo a Vite o serverless

### Operacion en servidor

- el backend debe tener un `ecosystem.config.js`
- PM2 debe encargarse de:
  - iniciar el backend
  - reiniciarlo si falla
  - administrar logs
  - permitir `startup` en Linux
- Nginx queda al frente y PM2 administra el proceso de Node por detras
- el backend deberia exponer al menos `/api/health` para monitoreo basico

### Desarrollo local

- el proyecto debe seguir pudiendo levantarse localmente con `npm run dev`
- el flujo local no desaparece por preparar la app para produccion
- la diferencia es que en produccion el frontend compilado se sirve por Nginx y el backend corre como proceso Node en Linux

### Restricciones funcionales que no se deben romper

- no se debe modificar la logica actual de la calculadora inteligente
- no se debe modificar la logica actual del formato de nombres y resolucion de fichas tecnicas PDF en Supabase

### Resultado esperado

El proyecto queda preparado para:

- crecer por modulos
- recibir mantenimiento por feature sin arrastrar todo el sistema
- migrar integraciones sensibles al backend
- desplegarse correctamente en Linux con Nginx
- operar con mas seguridad mediante PM2, healthchecks, logs y contratos claros
- conservar intactas las dos logicas funcionales mas sensibles del sistema
