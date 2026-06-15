# Calculadora Solar Modular

Aplicación web para dimensionamiento solar, selección de productos, lectura de cotizaciones PDF y fusión con fichas técnicas.

## Tecnologías

- React + Vite
- React Router
- pdf-lib
- pdfjs-dist
- tesseract.js

## Cómo correr el proyecto

1. Instala dependencias:

```bash
npm install
```

2. Crea el archivo `.env.local` con las variables necesarias. Puedes tomar como guía la sección "Variables de Entorno".

3. Levanta el entorno local:

```bash
npm run dev
```

4. Abre la URL que entrega Vite. Normalmente será:

```text
http://localhost:5173
```

## Estructura Modular

```text
src/
  principal.jsx
  aplicacion/
    Aplicacion.jsx
  core/
    auth/
      ProveedorAutenticacion.jsx
      RutaProtegida.jsx
      contextoAutenticacion.js
      servicioAutenticacion.js
      usarAutenticacion.js
    contenedor/
      contenedorModulos.js
    eventBus/
      eventBus.js
    navegacion/
      BarraNavegacion.jsx
    router/
      EnrutadorModular.jsx
  compartido/
    componentes/
      Boton.jsx
      CampoEntrada.jsx
    estilos/
      comunes.css
  estilos/
    global.css
  integraciones/
    cache/
    http/
    mapeadores/
    proveedores/
      supabase/
        auth.adapter.js
        storage.adapter.js
    tipos/
  modulos/
    autenticacion/
      componentes/
      configuracion/
      estilos/
      paginas/
    catalogo/
      api/
      configuracion/
    cotizacion/
      componentes/
      configuracion/
      esquemas/
      paginas/
      servicios/
    consultaCotizacion/
      configuracion/
      estilos/
      paginas/
    pdf/
      componentes/
      configuracion/
      estilos/
      paginas/
      servicios/
    sistema/
      componentes/
      estilos/
      paginas/

public/
  favicon.svg
```

## Arquitectura General

La aplicación está organizada por módulos de negocio dentro de `src/modulos/`. La carpeta `src/core/` contiene el contenedor modular, navegación, auth compartida, router modular y event bus. La carpeta `src/integraciones/` concentra la comunicación con APIs y servicios externos.

- `src/principal.jsx`: punto de entrada. Registra módulos base en el contenedor, monta React en `#root`, importa estilos globales y renderiza `Aplicacion`.
- `src/aplicacion/Aplicacion.jsx`: configura `BrowserRouter`, proveedor de autenticación y renderiza las rutas expuestas por el contenedor.
- `src/core/contenedor/contenedorModulos.js`: registra módulos y expone rutas e items de navegación.
- `src/core/auth/`: proveedor, hook, ruta protegida y servicio de sesión local.
- `src/core/router/EnrutadorModular.jsx`: transforma registros de ruta en `<Route />`, aplicando `RutaProtegida` cuando corresponde.
- `src/core/navegacion/BarraNavegacion.jsx`: construye el menú desde `itemsNavegacion` registrados por módulos.
- `src/integraciones/http/`: cliente HTTP y configuración base.
- `src/integraciones/proveedores/`: adapters concretos por proveedor externo.
- `src/integraciones/mapeadores/`: normalización de respuestas externas al modelo interno.
- `src/compartido/componentes/`: componentes base reutilizables. Actualmente `Boton` y `CampoEntrada`.
- `src/estilos/global.css`: estilos globales de la aplicación.

## Rutas de la Aplicación

Las rutas están definidas por cada módulo en `configuracion/registroModulo.js` y se registran desde `src/modulos/registrarModulos.js`.

- `/iniciar-sesion`: pantalla de login.
- `/registro`: pantalla de registro.
- `/login`: redirige a `/iniciar-sesion`.
- `/register`: redirige a `/registro`.
- `/propuesta`: flujo principal de la calculadora y fusión de PDFs. Está protegida por autenticación.
- `/proposal`: redirige a `/propuesta`.
- `/consultar-cotizacion`: consulta una cotización por número y permite previsualizarla o descargarla con fichas técnicas. Está protegida por autenticación.
- `/mersh-pdf`: módulo de fusión PDF. Está protegida por autenticación.
- `/`: redirige a `/propuesta`.
- `*`: muestra página 404.

## Corte de Migración Modular

La reestructura principal ya consolidó las carpetas históricas en módulos autocontenidos:

- `src/modulos/cotizacion/` contiene el flujo de propuesta/cotización, calculadora, pre-cotización, servicios de cálculo, validación y estilos.
- `src/modulos/consultaCotizacion/` contiene la consulta de cotización, previsualización PDF y descarga opcional con fichas técnicas.
- `src/modulos/pdf/` contiene Mersh PDF, carga/fusión de cotizaciones PDF, servicios de fichas técnicas y storage.
- `src/modulos/catalogo/` expone API de catálogo a través del adapter activo.
- `src/integraciones/` centraliza HTTP, adapters, mapeadores, payloads y cache técnica.
- Los módulos se registran en `src/modulos/registrarModulos.js`; comentar un registro retira sus rutas y navegación.

## Módulo de Autenticación

Ubicación: `src/modulos/autenticacion/`

Este módulo contiene las pantallas y formularios de registro e inicio de sesión. La lógica compartida de autenticación vive en `src/core/auth/`, porque es infraestructura transversal usada por rutas, navegación y formularios.

Archivos principales:

- `componentes/FormularioInicioSesion.jsx`: formulario de login local y botón `Continuar con Microsoft`. Si el usuario ya está autenticado, redirige a `/propuesta`. Mientras el usuario está en el login, dispara una precarga del catálogo para reducir el tiempo de espera al entrar al flujo.
- `componentes/FormularioRegistro.jsx`: formulario de registro. Valida nombre, usuario, contraseña y confirmación.
- `paginas/PaginaInicioSesion.jsx` y `paginas/PaginaRegistro.jsx`: páginas contenedoras de los formularios.

Archivos compartidos en `src/core/auth/`:

- `ProveedorAutenticacion.jsx`: proveedor React que expone `usuario`, `autenticado`, `iniciarSesion`, `iniciarSesionMicrosoft`, `registrarUsuario` y `cerrarSesion`.
- `contextoAutenticacion.js`: crea el contexto de autenticación.
- `usarAutenticacion.js`: hook para consumir el contexto.
- `RutaProtegida.jsx`: redirige a `/iniciar-sesion` si no hay sesión activa.
- `servicioAutenticacion.js`: lógica de registro, login, logout, lectura de sesión desde `localStorage` y cierre limpio de datos temporales.
- `src/integraciones/proveedores/supabase/auth.adapter.js`: adapter OAuth de Supabase para iniciar sesión con Microsoft usando el proveedor `azure`.

Claves usadas en `localStorage`:

- `propuestas_app_users`: lista de usuarios registrados.
- `propuestas_app_session`: sesión activa.

Nota: la contraseña local se codifica con `btoa`. No es cifrado seguro y no debe usarse como autenticación definitiva en producción. El inicio con Microsoft redirige a Supabase Auth y guarda una sesión mínima local para la navegación del frontend.

## Módulo de Cotización

Ubicación: `src/modulos/cotizacion/`

Este es el módulo principal del negocio. Carga el catálogo, calcula una recomendación solar, permite revisar productos y fusiona una cotización PDF con fichas técnicas.

### Página principal

- `paginas/PaginaCotizacion.jsx`: carga el catálogo llamando `obtenerCatalogo()` desde `configuracion/catalogoProductos.js`. Si existe catálogo precargado en memoria, lo usa de inmediato para evitar una segunda espera. Maneja estados de carga y error, luego entrega productos y categorías a `FlujoPropuesta`.

### Flujo de propuesta

- `componentes/FlujoPropuesta.jsx`: orquesta tres pantallas internas:
  1. `calculadora`: muestra `CalculadoraInteligente` y búsqueda de productos en modo lectura.
  2. `recomendaciones`: muestra la recomendación calculada en tarjetas separadas: resumen IA, observación técnica fija (congelada al calcular), tipo de estructura, materiales y artículos recomendados. Incluye la opción `¿Deseas personalizar?` para habilitar edición de cantidades.
  3. `fusion`: carga una cotización PDF y genera el PDF fusionado con fichas técnicas.

Estados importantes del flujo:

- `resultadosInteligentes`: resultado calculado por la calculadora.
- `productosSeleccionados`: mapa `{ idProducto: cantidad }`.
- `personalizarRecomendacion`: controla si las cantidades recomendadas pueden editarse manualmente.
- `cantidadPanelesPersonalizada`: cantidad de paneles activa cuando el usuario decide personalizar.
- `observacionTecnicaFija`: conserva la observación IA original calculada para que no cambie durante personalización.
- `cotizacionPdf`: metadata del PDF cargado y referencias detectadas.
- `pdfFusionado`: bloquea volver al paso anterior después de completar la fusión.
- `numeroCotizacion`: fallback local con formato `FT-#####` cuando no se detecta número desde API.

### Calculadora inteligente

Archivo: `componentes/CalculadoraInteligente.jsx`

La calculadora recibe `productos` desde el catálogo y devuelve resultados mediante `alCambiarResultados`.

Datos que captura:

- Consumo mensual de los últimos 12 meses.
- Tipo de instalación: Residencial, Comercial o Industrial.
- Tipo de estructura: Losa, Piso, S-5, TPO o Teja.
- Distancia al inversor.
- Cobertura objetivo, horas sol pico, performance ratio y margen de seguridad.
- Perfil de recomendación: Balanceado, Disponible o Premium.

Carga rápida de consumos:

- La calculadora incluye un campo de pegado para bloques de texto de archivos `.txt`.
- Al pegar texto, se aplican automáticamente los valores detectados.
- También incluye botón `Añadir` para aplicar manualmente el texto escrito en el campo de carga rápida.
- También se puede pegar el bloque directamente sobre cualquier campo mensual.
- El botón `Borrar` limpia los 12 consumos mensuales, el texto pegado y el estado de carga rápida.
- Soporta nombres completos y abreviados de meses, por ejemplo:

```text
enero = 3456
febrero = 2034
marzo = 2870
```

- Si no encuentra nombres de meses, acepta una lista de 12 números en orden enero-diciembre.
- Soporta separadores numéricos comunes como `3,456`, `3.456` o valores decimales.

Cómo dimensiona:

- Calcula consumo anual y promedio mensual.
- Calcula potencia requerida con cobertura, horas sol pico, performance ratio y margen de seguridad.
- Aplica factor del perfil:
  - `balanced`: factor `1`.
  - `stock`: factor `0.95`, prioriza disponibilidad.
  - `premium`: factor `1.15`, prioriza mayor potencia y componentes premium.
- Busca paneles dentro del catálogo usando texto de nombre, descripción e identificadores.
- Intenta extraer la potencia del panel desde textos como `435W`, `550Wp`, etc.
- Recomienda panel según el perfil seleccionado.
- Genera piezas estructurales usando `servicios/servicioCalculoPiezas.js`, según montaje:
  - `Losa`: base para lastre, clamps, soportes, rieles, deflector y grounding lug.
  - `Piso`: clamps, soportes frontales y rieles.
  - `S-5`: clamps S-5, end clamps y mid clamps.
  - `TPO`: bases TPO, clamps y rieles.
  - `Teja`: ganchos, clamps y rieles.
- Calcula rollos de cable solar con base en la distancia al inversor.
- Calcula producción anual estimada.
- Genera una observación técnica con el criterio de selección, detalle del panel recomendado, potencia requerida, potencia instalada, cobertura, HSP, performance ratio, montaje, distancia al inversor y producción anual estimada.

El resultado incluye datos en español y algunos alias en inglés para compatibilidad, por ejemplo `cantidadPaneles`, `idPanel`, `potenciaTotalWp`, `consumoAnual`, `tipoMontaje`, `panelId`, `panelName`, `totalWp`, `observacionTecnica`, etc.

### Personalización de artículos recomendados

En la pantalla `recomendaciones`, `FlujoPropuesta` arma la selección inicial a partir del panel recomendado y las piezas calculadas.

Comportamiento:

- Por defecto, las cantidades quedan bloqueadas y representan la recomendación automática.
- Al activar `¿Deseas personalizar?`, el usuario puede cambiar cantidades.
- Si cambia la cantidad del panel principal, se recalculan automáticamente:
  - cantidad de paneles mostrada;
  - potencia total;
  - materiales calculados;
  - accesorios seleccionados que existan en catálogo con los IDs calculados.
- La observación técnica de IA se mantiene fija y no cambia durante la personalización.
- Las secciones de observación, tipo de estructura y materiales se muestran en tarjetas separadas, al mismo nivel que `Artículos recomendados`.
- La tarjeta `Tipo de estructura` permite cambiar montaje en el menú de recomendaciones; al cambiarlo se recalculan materiales y accesorios sin modificar la observación técnica fija.
- El panel principal no se puede eliminar desde la lista recomendada.
- Al desactivar la personalización, la selección vuelve a la recomendación original.

La fórmula compartida de accesorios vive en:

- `servicios/servicioCalculoPiezas.js`: exporta `calcularPiezasSistema({ cantidadPaneles, tipoMontaje, distanciaInversor })`.

### Selector de productos

Archivo: `componentes/SelectorProductos.jsx`

Permite buscar productos por marca, modelo, código, descripción, categoría, ubicación y campos anidados del objeto original de InterFuerza. Construye un índice de búsqueda normalizado y calcula un puntaje para ordenar coincidencias.

Comportamiento principal:

- Filtra por categoría.
- Busca ignorando acentos, signos y diferencias de espacios.
- Limita el render a `20` resultados visibles para mantener fluidez.
- Muestra stock disponible, reservado y ubicación.
- En modo editable permite sumar, restar, escribir cantidad y quitar productos.
- En modo `soloLectura` funciona como buscador de catálogo sin seleccionar.

### Carga de cotización PDF

Archivo: `componentes/CargadorPdfCotizacion.jsx`

Recibe un PDF de cotización y extrae información útil antes de la fusión.

Proceso:

1. Valida que el archivo sea PDF.
2. Usa `pdf-lib` para leer cantidad de páginas.
3. Intenta detectar el número de cotización por el camino más liviano:
   - primero desde el nombre del archivo;
   - si hace falta, leyendo texto de pocas páginas con `pdfjs-dist`.
4. Si encuentra número de cotización, consulta InterFuerza con `obtenerCotizacionPorId`.
5. Extrae referencias de fichas técnicas desde las líneas de la cotización API.
6. Solo si la API no entrega referencias suficientes, usa el análisis completo del PDF como respaldo:
   - nombres explícitos `.pdf`;
   - campos tipo `Código: ...`;
   - códigos de producto por patrón.
7. Si el PDF no tiene texto útil, puede usar OCR de respaldo con `tesseract.js` en hasta 4 páginas.
8. Valida cuáles fichas existen en Supabase.
9. Guarda metadata en `cotizacionPdf`, incluyendo los bytes del PDF para evitar leer el archivo otra vez durante la fusión.

Metadata importante generada:

- `file`, `bytes`, `name`, `size`, `pages`, `loadedAt`.
- `foundDatasheetNames`.
- `missingDatasheetNames`.
- `pdfDetectedDatasheetReferences`.
- `apiDatasheetReferences`.
- `detectedQuoteIds`.
- `quoteApiData`.
- `apiLookupError`.

### Fusión de PDF

Archivo: `componentes/GeneradorPdfFusionado.jsx`

Cuando hay una cotización cargada, llama `generarPdfFusionadoConFichas()` y descarga automáticamente un archivo con nombre:

```text
[nombre_cotizacion]_fusion_con_fichas.pdf
```

Optimizaciones actuales:

- Reutiliza `cotizacionPdf.bytes` para no volver a leer el archivo.
- Reutiliza `foundDatasheetNames` cuando ya fueron resueltas en la carga.
- Si las fichas ya están resueltas, evita repetir el escaneo del PDF y la resolución de variantes.
- Conserva las fichas faltantes detectadas en la carga para mostrarlas también al terminar la fusión.

También guarda historial local en:

```text
propuestas_app_history
```

La entrada del historial incluye número de cotización, nombre del PDF, fecha, cantidad de fichas, fichas descargadas, fichas faltantes y referencias detectadas por API.

### Catálogo de productos e Integraciones

Archivo: `configuracion/catalogoProductos.js`

Orquesta la lectura del catálogo y sigue siendo la puerta de entrada del módulo de cotización hacia el modelo normalizado de productos y categorías. La comunicación HTTP y los adapters ahora viven en `src/integraciones/`.

Funciones principales:

- `obtenerCatalogo({ forceRefresh })`: carga todos los productos y categorías, reutiliza cache en memoria cuando está fresca y comparte la misma promesa si hay una carga en curso.
- `precargarCatalogo()`: inicia la carga del catálogo en segundo plano, usada desde el login.
- `obtenerCatalogoEnCache()`: devuelve el catálogo en memoria cuando todavía está vigente.
- `obtenerTodosLosProductos()`: pagina productos hasta `DEFAULT_MAX_PRODUCT_PAGES` o hasta alcanzar el total informado por la API. Cuando la API informa `count`, descarga las páginas restantes en lotes paralelos.
- `obtenerCategorias()`: carga categorías desde InterFuerza y agrega `Todos`.
- `obtenerProductos({ page })`: carga una página de productos.
- `obtenerCotizacionPorId(id)`: consulta una cotización y normaliza encabezado/líneas.
- `normalizarProducto(item)`: transforma el payload de InterFuerza en un objeto usado por UI.
- `normalizarCategoria(category)`: crea categorías con `id` tipo slug y nombre visible.

Modelo normalizado de producto:

```js
{
  id,
  name,
  price,
  icon,
  category,
  description,
  stock,
  stockTotal,
  stockReserved,
  stockInTransit,
  stockDisplay,
  stockWarehouses,
  stockWarehousesWithAvailable,
  stockLocations,
  stockWarehouseNames,
  raw
}
```

Notas de rendimiento:

- El catálogo se cachea en memoria con TTL.
- La pantalla de login llama `precargarCatalogo()` para adelantar la carga de stock antes de entrar a `/propuesta`.
- La carga de productos usa concurrencia por lotes para reducir el tiempo total cuando hay muchas páginas.

### Servicio de fichas técnicas

Archivo: `servicios/servicioFichasPdf.js`

Agrupa toda la lógica de detección, resolución, descarga y fusión de fichas técnicas.

Funciones principales:

- `extraerIdsCotizacionDesdePdfCotizacion(pdfFile, opciones)`: detecta candidatos de número de cotización priorizando nombre de archivo y lectura de pocas páginas.
- `extraerIdsCotizacionDesdeNombreArchivo(filename)`: obtiene candidatos directamente del nombre del archivo.
- `extraerNombresFichasDesdePdfCotizacion(pdfFile)`: extrae referencias desde PDF.
- `extraerReferenciasFichasDesdeLineasCotizacion(quoteLines)`: extrae referencias desde líneas devueltas por InterFuerza.
- `resolverReferenciasFichas(datasheetReferences)`: prueba variantes de nombres hasta encontrar archivos en Supabase.
- `verificarFichasDisponibles(datasheetReferences)`: devuelve fichas encontradas y faltantes.
- `descargarTodasLasFichas(datasheetReferences)`: descarga fichas disponibles.
- `fusionarCotizacionConFichas(quotePdfBytes, datasheetsPdfs)`: une cotización y fichas con `pdf-lib`.
- `generarPdfFusionadoConFichas(archivoPdfCotizacion, opciones)`: flujo completo usado por la UI.

La resolución de fichas genera variantes de nombres:

- nombre original;
- nombre sin `.pdf`;
- espacios convertidos a guiones;
- variantes en mayúsculas/minúsculas;
- limpieza de caracteres no seguros para rutas.

Optimizaciones:

- La detección de número de cotización puede limitar la lectura a pocas páginas.
- El análisis completo del PDF y OCR quedan como respaldo, no como camino principal cuando la API de InterFuerza entrega las líneas de cotización.
- La resolución de fichas contra Supabase se ejecuta con concurrencia limitada.
- `generarPdfFusionadoConFichas()` acepta referencias ya resueltas y bytes del PDF para evitar trabajo duplicado.

### Servicio de Supabase Storage

Archivo: `src/integraciones/proveedores/supabase/storage.adapter.js`

No usa cliente Supabase. Trabaja con URLs públicas directas de Storage.

Funciones principales:

- `descargarFichaPdf(filename)`: descarga una ficha como `ArrayBuffer`.
- `descargarMultiplesFichas(filenames)`: descarga varias fichas en paralelo con concurrencia limitada y separa errores.
- `existeFicha(filename)`: valida existencia con `HEAD`.
- `obtenerUrlPublicaFicha(filename)`: construye la URL pública.

La variable `VITE_SUPABASE_STORAGE_URL` debe apuntar a la carpeta pública donde viven las fichas. El servicio agrega el nombre del archivo y asegura extensión `.pdf` cuando falta.

El servicio mantiene cache en memoria para:

- verificaciones `HEAD` de existencia;
- descargas de fichas ya solicitadas.

## Módulo de Consulta

Ubicación: `src/modulos/consultaCotizacion/`

- `paginas/PaginaConsultaCotizacion.jsx`: consulta una cotización por número, guarda la consulta en sesión, muestra una previsualización PDF y permite descargarla con o sin fichas técnicas.
- `configuracion/registroModulo.js`: registra la ruta `/consultar-cotizacion` y la entrada de navegación.
- `estilos/consultaCotizacion.css`: estilos propios de la consulta y la tabla de referencias con ficha.

## Módulo de Sistema

Ubicación: `src/modulos/sistema/`

- `componentes/BarraNavegacion.jsx`: barra superior de la zona autenticada. Muestra nombre de usuario y botón para cerrar sesión.
- `paginas/PaginaNoEncontrada.jsx`: página 404 con retorno a `/propuesta`.
- `estilos/sistema.css`: estilos propios de navegación y páginas del sistema.

## Componentes Compartidos

Ubicación: `src/compartido/`

- `componentes/Boton.jsx`: botón reutilizable con variantes `primary`, `success`, `danger`, `ghost`, soporte de `fullWidth`, `disabled`, `icon` y `className`.
- `componentes/CampoEntrada.jsx`: input con etiqueta, requerido y mensaje de error.
- `estilos/comunes.css`: estilos de componentes compartidos.

## Proxy de InterFuerza

La integración con InterFuerza ya no vive en un proxy serverless aparte dentro del árbol principal. Ahora la capa HTTP y el adapter están centralizados en `src/integraciones/`, lo que facilita extraer esta lógica hacia un backend dedicado cuando toque.

## Flujo Completo de Uso

1. El usuario entra a `/propuesta`.
2. `RutaProtegida` valida si existe sesión local.
3. Si no hay sesión, redirige a `/iniciar-sesion`.
4. En el login, `FormularioInicioSesion` precarga el catálogo en segundo plano.
5. Al iniciar sesión, `PaginaCotizacion` usa el catálogo en cache si ya está listo; si no, espera la misma carga en curso.
6. En la calculadora se ingresan consumos, instalación, montaje, distancia y perfil.
7. Los consumos pueden llenarse manualmente o pegando un bloque `.txt`; la carga rápida aplica los valores automáticamente.
8. `CalculadoraInteligente` recomienda paneles y piezas usando `calcularPiezasSistema()`.
9. `FlujoPropuesta` muestra la recomendación IA, congela la observación técnica y arma la selección inicial de productos recomendados.
10. El usuario puede activar `¿Deseas personalizar?` para cambiar cantidad de paneles; al hacerlo se recalculan potencia, materiales y accesorios sin alterar la observación técnica fija.
11. El usuario puede cambiar `Tipo de estructura` desde una tarjeta adicional en recomendaciones; esto actualiza materiales y accesorios según montaje.
12. El usuario carga un PDF de cotización.
13. `CargadorPdfCotizacion` detecta el número de cotización priorizando nombre de archivo y lectura ligera del PDF.
14. Si puede, consulta la cotización en InterFuerza y extrae referencias desde sus líneas.
15. Si la API no entrega referencias suficientes, usa extracción completa del PDF y OCR como respaldo.
16. El sistema valida en Supabase cuáles fichas existen.
17. `GeneradorPdfFusionado` reutiliza referencias resueltas y bytes del PDF cuando están disponibles.
18. `GeneradorPdfFusionado` descarga las fichas disponibles.
19. `pdf-lib` fusiona cotización + fichas.
20. El navegador descarga el PDF final y se guarda historial local.

## Scripts

- `npm run dev`: entorno local
- `npm run lint`: validación de código
- `npm run build`: compilación de producción
- `npm run preview`: vista previa del build

## Variables de Entorno

Opcionalmente define en `.env.local`:

- `VITE_INTERFUERZA_API_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SUPABASE_REDIRECT_URL`
- `VITE_SUPABASE_STORAGE_URL`
- `INTERFUERZA_TOKEN` (sin prefijo `VITE_`)

Ejemplo de `.env.local`:

```bash
VITE_INTERFUERZA_API_URL=https://[tu-api-interfuerza-o-backend]/interfuerza
VITE_SUPABASE_URL=https://[project_id].supabase.co
VITE_SUPABASE_ANON_KEY=tu_supabase_anon_key
VITE_SUPABASE_REDIRECT_URL=http://localhost:5173/propuesta
VITE_SUPABASE_STORAGE_URL=https://[project_id].supabase.co/storage/v1/object/public/[bucket]/[folder]/
INTERFUERZA_TOKEN=tu_token_de_interfuerza
```

Para producción, `VITE_SUPABASE_REDIRECT_URL` debe apuntar a la ruta pública `/propuesta` del dominio final y esa URL debe estar permitida en la configuración de Redirect URLs de Supabase Auth.

## Configuración de Login Microsoft

El botón `Continuar con Microsoft` usa Supabase Auth con el provider `azure`.

Checklist en Supabase:

- En `Authentication > Providers`, habilita `Azure`.
- Configura el `Client ID` y `Client Secret` de la aplicación creada en Microsoft Entra ID.
- En Microsoft Entra ID, registra como Redirect URI de tipo Web:

```text
https://[project_id].supabase.co/auth/v1/callback
```

- En Supabase Auth, agrega la URL de retorno de la app en Redirect URLs. En desarrollo debe coincidir con el puerto activo de Vite, por ejemplo:

```text
http://localhost:5174/propuesta
```

Si Vite cambia de puerto, agrega también esa URL o fija el puerto de desarrollo.

## Validación rápida de InterFuerza

1. Crea `.env.local` usando el ejemplo de la sección anterior.
2. Reinicia `npm run dev`.
3. Valida la conexión contra la URL configurada:

```bash
curl -X POST 'https://[tu-api-interfuerza-o-backend]/interfuerza' \
  -H 'Content-Type: application/json' \
  --data '{"class":"GET","action":"products","page":"1"}'
```

Si el token o la IP no están autorizados, InterFuerza responderá error de autenticación.

## Nota importante de InterFuerza

Además del token, InterFuerza exige autorizar la IP de origen en su panel de API.

## Puntos de Mantenimiento

- Regla operativa: cada cambio funcional debe incluir actualización de `README.md` en el mismo ajuste.
- Para cambiar las fórmulas de dimensionamiento solar, edita `src/modulos/cotizacion/componentes/CalculadoraInteligente.jsx`.
- Para ajustar la carga rápida de consumos desde texto pegado, edita `src/modulos/cotizacion/componentes/CalculadoraInteligente.jsx`.
- Para cambiar las fórmulas de accesorios por cantidad de paneles, montaje o distancia, edita `src/modulos/cotizacion/servicios/servicioCalculoPiezas.js`.
- Para cambiar cómo se normalizan productos, stock, precios o categorías, edita `src/modulos/cotizacion/configuracion/catalogoProductos.js` y los mapeadores de `src/integraciones/mapeadores/`.
- Para ajustar precarga/cache/concurrencia del catálogo, edita `src/modulos/cotizacion/configuracion/catalogoProductos.js` y `src/integraciones/cache/memoria.js`.
- Para cambiar el comportamiento de personalización de artículos recomendados, edita `src/modulos/cotizacion/componentes/FlujoPropuesta.jsx`.
- Para ajustar búsqueda y visualización del catálogo, edita `src/compartido/componentes/SelectorProductos.jsx`.
- Para modificar extracción de códigos desde cotizaciones PDF, edita `src/modulos/pdf/servicios/servicioFichasPdf.js`.
- Para cambiar el origen de fichas técnicas, edita `src/integraciones/proveedores/supabase/storage.adapter.js`.
- Para cambiar el login Microsoft/Supabase, edita `src/integraciones/proveedores/supabase/auth.adapter.js` y `src/core/auth/servicioAutenticacion.js`.
- Para cambiar payloads de cotización o adaptar otro proveedor, edita `src/integraciones/proveedores/interfuerza/payloads.js` y `src/integraciones/proveedores/interfuerza/adapter.js`.
- Para modificar rutas o navegación, edita el `configuracion/registroModulo.js` del módulo correspondiente y `src/modulos/registrarModulos.js`.
- Para cambiar estilos globales, edita `src/estilos/global.css`. Para estilos de módulos, usa los CSS dentro de cada módulo.

## Consideraciones Actuales

- La autenticación mantiene sesión local en `localStorage` y puede iniciar con Microsoft mediante Supabase Auth. No hay backend propio de usuarios todavía.
- El catálogo depende de InterFuerza y requiere token más autorización de IP.
- La precarga y cache del catálogo son en memoria del navegador con TTL.
- La fusión de fichas depende de PDFs públicos en Supabase Storage.
- El OCR se usa solo como respaldo y puede tardar más en PDFs escaneados.
- No hay base de datos para historial; se guarda en `localStorage`.
