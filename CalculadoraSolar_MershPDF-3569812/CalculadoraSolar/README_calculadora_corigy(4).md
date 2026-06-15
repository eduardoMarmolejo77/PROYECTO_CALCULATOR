# README - Super Calculadora Corigy

> Documento escrito en pseudocódigo para implementar la lógica de la hoja **Calculadora Corigy** en un sistema.
>
> El objetivo es que el sistema pueda recibir la cantidad de paneles, el layout, el tipo de instalación y la distancia promedio de cable, y devolver los materiales necesarios sin depender directamente del Excel.

---

## 1. Objetivo de la calculadora

```pseudo
OBJETIVO:
    Calcular materiales de estructura para instalación de paneles solares.

LA CALCULADORA DEBE PODER CALCULAR:
    - Total de paneles.
    - Cantidad de rieles por medida.
    - Splice o conectores de riel.
    - End clamp.
    - Mid clamp.
    - Feet / Feet L.
    - WD.
    - Grounding lug.
    - Materiales para losa.
    - Materiales para S-5.
    - Materiales para piso.
    - Materiales para TPO horizontal.
    - Materiales para TPO vertical.
    - Cable en rollos de 200 metros.
```

---

## 2. Variables principales de entrada

```pseudo
ENTRADAS PRINCIPALES:

    layoutGrupos = lista de grupos de paneles

    CADA grupo DEBE TENER:
        filasDireccionRiel
        columnas

    EJEMPLO:
        grupo1.filasDireccionRiel = 5
        grupo1.columnas = 1

    distanciaPromedioCableMetros

    tipoInstalacion:
        "RIELES"
        "LOSA"
        "S5"
        "PISO"
        "TPO"

    tipoTPO:
        "HORIZONTAL"
        "VERTICAL"

    configuracionPiso:
        "MIRANDO_AL_SUR"
        "ESTE_OESTE"

    riel5850Activo = verdadero/falso
    riel4700Activo = verdadero/falso
    riel3700Activo = verdadero/falso
    riel2400Activo = verdadero/falso
```

---

## 3. Funciones auxiliares obligatorias

```pseudo
FUNCION REDONDEAR_ABAJO(numero):
    retornar parte_entera_hacia_abajo(numero)
FIN FUNCION
```

```pseudo
FUNCION REDONDEAR_ARRIBA(numero):
    SI numero tiene decimales ENTONCES
        retornar entero_siguiente(numero)
    SINO
        retornar numero
    FIN SI
FIN FUNCION
```

```pseudo
FUNCION MAXIMO(valor1, valor2):
    SI valor1 > valor2 ENTONCES
        retornar valor1
    SINO
        retornar valor2
    FIN SI
FIN FUNCION
```

```pseudo
FUNCION SUMAR(listaValores):
    total = 0

    PARA CADA valor EN listaValores HACER
        total = total + valor
    FIN PARA

    retornar total
FIN FUNCION
```

```pseudo
FUNCION VALIDAR_NUMERO_ENTERO_POSITIVO(valor, nombreCampo):
    SI valor es nulo ENTONCES
        error nombreCampo + " es obligatorio"
    FIN SI

    SI valor no es numerico ENTONCES
        error nombreCampo + " debe ser numerico"
    FIN SI

    SI valor < 0 ENTONCES
        error nombreCampo + " no puede ser negativo"
    FIN SI

    SI valor tiene decimales ENTONCES
        error nombreCampo + " debe ser entero"
    FIN SI
FIN FUNCION
```

---

## 4. Validaciones generales antes de calcular

```pseudo
PROCESO VALIDAR_ENTRADAS:

    SI layoutGrupos esta vacio ENTONCES
        error "Debe ingresar por lo menos un grupo de paneles"
    FIN SI

    PARA CADA grupo EN layoutGrupos HACER

        VALIDAR_NUMERO_ENTERO_POSITIVO(grupo.filasDireccionRiel, "Filas direccion riel")
        VALIDAR_NUMERO_ENTERO_POSITIVO(grupo.columnas, "Columnas")

        SI grupo.filasDireccionRiel = 0 Y grupo.columnas > 0 ENTONCES
            error "No puede haber columnas si las filas son 0"
        FIN SI

        SI grupo.filasDireccionRiel > 0 Y grupo.columnas = 0 ENTONCES
            error "No puede haber filas si las columnas son 0"
        FIN SI

    FIN PARA

    SI distanciaPromedioCableMetros es nula ENTONCES
        distanciaPromedioCableMetros = 0
    FIN SI

    SI distanciaPromedioCableMetros < 0 ENTONCES
        error "La distancia promedio del cable no puede ser negativa"
    FIN SI

    SI tipoInstalacion = "TPO" Y tipoTPO esta vacio ENTONCES
        error "Debe indicar si el TPO es horizontal o vertical"
    FIN SI

FIN PROCESO
```

---

## 5. Cálculo del total de paneles

```pseudo
PROCESO CALCULAR_TOTAL_PANELES:

    totalPaneles = 0

    PARA CADA grupo EN layoutGrupos HACER

        grupo.totalPaneles = grupo.filasDireccionRiel * grupo.columnas

        totalPaneles = totalPaneles + grupo.totalPaneles

    FIN PARA

    retornar totalPaneles

FIN PROCESO
```

```pseudo
EJEMPLO:

    filasDireccionRiel = 5
    columnas = 1

    totalPaneles = 5 * 1
    totalPaneles = 5
```

---

## 6. Cálculo de rieles por grupo

La calculadora reparte la cantidad de paneles entre rieles de diferentes medidas.

Medidas usadas:

```pseudo
RIELES DISPONIBLES:
    riel5850
    riel4700
    riel3700
    riel2400
    riel1250
```

---

### 6.1 Cálculo de riel 5850

```pseudo
FUNCION CALCULAR_RIEL_5850(filas, columnas, riel5850Activo):

    SI riel5850Activo = verdadero ENTONCES
        cantidad = REDONDEAR_ABAJO(filas / 5) * 2 * columnas
    SINO
        cantidad = 0
    FIN SI

    retornar cantidad

FIN FUNCION
```

---

### 6.2 Cálculo de riel 4700

```pseudo
FUNCION CALCULAR_RIEL_4700(filas, columnas, riel5850, riel4700Activo):

    SI riel4700Activo = verdadero ENTONCES

        panelesCubiertosPor5850 = riel5850 * 5 / (2 * columnas)

        restante = filas - panelesCubiertosPor5850

        cantidad = REDONDEAR_ABAJO(restante / 4) * 2 * columnas

    SINO
        cantidad = 0
    FIN SI

    retornar cantidad

FIN FUNCION
```

---

### 6.3 Cálculo de riel 3700

```pseudo
FUNCION CALCULAR_RIEL_3700(filas, columnas, riel5850, riel4700, riel3700Activo):

    SI riel3700Activo = verdadero ENTONCES

        panelesCubiertosPor5850 = riel5850 * 5 / (2 * columnas)
        panelesCubiertosPor4700 = riel4700 * 4 / (2 * columnas)

        restante = filas - panelesCubiertosPor5850 - panelesCubiertosPor4700

        cantidad = REDONDEAR_ABAJO(restante / 3) * 2 * columnas

    SINO
        cantidad = 0
    FIN SI

    retornar cantidad

FIN FUNCION
```

---

### 6.4 Cálculo de riel 2400

```pseudo
FUNCION CALCULAR_RIEL_2400(filas, columnas, riel5850, riel4700, riel3700, riel2400Activo):

    SI riel2400Activo = verdadero ENTONCES

        panelesCubiertosPor5850 = riel5850 * 5 / (2 * columnas)
        panelesCubiertosPor4700 = riel4700 * 4 / (2 * columnas)
        panelesCubiertosPor3700 = riel3700 * 3 / (2 * columnas)

        restante = filas - panelesCubiertosPor5850 - panelesCubiertosPor4700 - panelesCubiertosPor3700

        cantidad = REDONDEAR_ABAJO(restante / 2) * 2 * columnas

    SINO
        cantidad = 0
    FIN SI

    retornar cantidad

FIN FUNCION
```

---

### 6.5 Cálculo de riel 1250

```pseudo
FUNCION CALCULAR_RIEL_1250(filas, columnas, riel5850, riel4700, riel3700, riel2400):

    panelesCubiertosPor5850 = riel5850 * 5 / (2 * columnas)
    panelesCubiertosPor4700 = riel4700 * 4 / (2 * columnas)
    panelesCubiertosPor3700 = riel3700 * 3 / (2 * columnas)
    panelesCubiertosPor2400 = riel2400 * 2 / (2 * columnas)

    restante = filas - panelesCubiertosPor5850 - panelesCubiertosPor4700 - panelesCubiertosPor3700 - panelesCubiertosPor2400

    cantidad = REDONDEAR_ABAJO(restante) * 2 * columnas

    SI cantidad < 0 ENTONCES
        cantidad = 0
    FIN SI

    retornar cantidad

FIN FUNCION
```

---

### 6.6 Proceso completo de rieles por grupo

```pseudo
PROCESO CALCULAR_RIELES_POR_GRUPO(grupo):

    filas = grupo.filasDireccionRiel
    columnas = grupo.columnas

    SI filas = 0 O columnas = 0 ENTONCES
        grupo.riel5850 = 0
        grupo.riel4700 = 0
        grupo.riel3700 = 0
        grupo.riel2400 = 0
        grupo.riel1250 = 0
        retornar grupo
    FIN SI

    grupo.riel5850 = CALCULAR_RIEL_5850(filas, columnas, riel5850Activo)

    grupo.riel4700 = CALCULAR_RIEL_4700(
        filas,
        columnas,
        grupo.riel5850,
        riel4700Activo
    )

    grupo.riel3700 = CALCULAR_RIEL_3700(
        filas,
        columnas,
        grupo.riel5850,
        grupo.riel4700,
        riel3700Activo
    )

    grupo.riel2400 = CALCULAR_RIEL_2400(
        filas,
        columnas,
        grupo.riel5850,
        grupo.riel4700,
        grupo.riel3700,
        riel2400Activo
    )

    grupo.riel1250 = CALCULAR_RIEL_1250(
        filas,
        columnas,
        grupo.riel5850,
        grupo.riel4700,
        grupo.riel3700,
        grupo.riel2400
    )

    retornar grupo

FIN PROCESO
```

---

## 7. Cálculo de materiales base por grupo

Estos materiales salen del cálculo normal de estructura por rieles.

---

### 7.1 Splice / conector de riel

```pseudo
FUNCION CALCULAR_SPLICE_GRUPO(grupo):

    totalRielesGrupo = grupo.riel5850 + grupo.riel4700 + grupo.riel3700 + grupo.riel2400 + grupo.riel1250

    splice = totalRielesGrupo - (2 * grupo.columnas)

    splice = MAXIMO(splice, 0)

    retornar splice

FIN FUNCION
```

---

### 7.2 End clamp base

```pseudo
FUNCION CALCULAR_END_CLAMP_BASE_GRUPO(grupo):

    totalRielesGrupo = grupo.riel5850 + grupo.riel4700 + grupo.riel3700 + grupo.riel2400 + grupo.riel1250

    SI grupo.columnas = 0 ENTONCES
        retornar 0
    FIN SI

    endClamp = (
        (
            (totalRielesGrupo / (2 * grupo.columnas)) * 2
        )
        -
        (grupo.splice / grupo.columnas)
    )
    * grupo.columnas
    * 2

    retornar endClamp

FIN FUNCION
```

---

### 7.3 Mid clamp base

```pseudo
FUNCION CALCULAR_MID_CLAMP_BASE_GRUPO(grupo):

    midClamp =
        (grupo.riel5850 * 4) +
        (grupo.riel4700 * 3) +
        (grupo.riel3700 * 2) +
        (grupo.riel2400 * 1) +
        grupo.splice

    retornar midClamp

FIN FUNCION
```

---

### 7.4 Feet L

```pseudo
FUNCION CALCULAR_FEET_L_GRUPO(grupo):

    feetL =
        (grupo.riel5850 * 5) +
        (grupo.riel4700 * 4) +
        (grupo.riel3700 * 3) +
        (grupo.riel2400 * 2) +
        (grupo.riel1250 * 2)

    retornar feetL

FIN FUNCION
```

---

### 7.5 WD

```pseudo
FUNCION CALCULAR_WD_GRUPO(grupo):

    wd = (
        (grupo.riel5850 * 5) +
        (grupo.riel4700 * 4) +
        (grupo.riel3700 * 3) +
        (grupo.riel2400 * 2) +
        grupo.riel1250
    ) / 2

    retornar wd

FIN FUNCION
```

---

### 7.6 Grounding lug base

```pseudo
FUNCION CALCULAR_GROUNDING_LUG_BASE_GRUPO(grupo):

    SI grupo.filasDireccionRiel = 0 ENTONCES
        groundingLug = 0
    SINO
        groundingLug = REDONDEAR_ARRIBA(grupo.columnas * 1.2)
    FIN SI

    retornar groundingLug

FIN FUNCION
```

> Nota técnica: en el Excel hay una variación en una columna donde se usa `columnas * 1`. Para implementación robusta se recomienda usar una regla única configurable: `factorGroundingLugBase = 1.2`.

---

## 8. Proceso base completo por grupo

```pseudo
PROCESO CALCULAR_MATERIALES_BASE_POR_GRUPO(grupo):

    grupo = CALCULAR_RIELES_POR_GRUPO(grupo)

    grupo.splice = CALCULAR_SPLICE_GRUPO(grupo)

    grupo.endClampBase = CALCULAR_END_CLAMP_BASE_GRUPO(grupo)

    grupo.midClampBase = CALCULAR_MID_CLAMP_BASE_GRUPO(grupo)

    grupo.feetL = CALCULAR_FEET_L_GRUPO(grupo)

    grupo.wd = CALCULAR_WD_GRUPO(grupo)

    grupo.groundingLugBase = CALCULAR_GROUNDING_LUG_BASE_GRUPO(grupo)

    retornar grupo

FIN PROCESO
```

---

## 9. Totales generales de estructura base

```pseudo
PROCESO CALCULAR_TOTALES_BASE(layoutGrupos):

    totales.riel5850 = 0
    totales.riel4700 = 0
    totales.riel3700 = 0
    totales.riel2400 = 0
    totales.riel1250 = 0
    totales.splice = 0
    totales.endClampBase = 0
    totales.midClampBase = 0
    totales.feetL = 0
    totales.wd = 0
    totales.groundingLugBase = 0
    totales.paneles = 0

    PARA CADA grupo EN layoutGrupos HACER

        grupoCalculado = CALCULAR_MATERIALES_BASE_POR_GRUPO(grupo)

        totales.riel5850 = totales.riel5850 + grupoCalculado.riel5850
        totales.riel4700 = totales.riel4700 + grupoCalculado.riel4700
        totales.riel3700 = totales.riel3700 + grupoCalculado.riel3700
        totales.riel2400 = totales.riel2400 + grupoCalculado.riel2400
        totales.riel1250 = totales.riel1250 + grupoCalculado.riel1250

        totales.splice = totales.splice + grupoCalculado.splice
        totales.endClampBase = totales.endClampBase + grupoCalculado.endClampBase
        totales.midClampBase = totales.midClampBase + grupoCalculado.midClampBase
        totales.feetL = totales.feetL + grupoCalculado.feetL
        totales.wd = totales.wd + grupoCalculado.wd
        totales.groundingLugBase = totales.groundingLugBase + grupoCalculado.groundingLugBase
        totales.paneles = totales.paneles + grupoCalculado.totalPaneles

    FIN PARA

    retornar totales

FIN PROCESO
```

---

## 10. Cálculo de cable

La calculadora usa rollos sellados de 200 metros y 500 metros.

```pseudo
CONSTANTE METROS_POR_ROLLO_CABLE_200 = 200
CONSTANTE METROS_POR_ROLLO_CABLE_500 = 500
```

### 10.1 Fórmula exacta del Excel

```pseudo
FUNCION CALCULAR_CABLE_EXCEL(distanciaPromedioCableMetros, totalPaneles):

    rollos = REDONDEAR_NORMAL(distanciaPromedioCableMetros * totalPaneles / 200)

    rollos = MAXIMO(1, rollos)

    retornar rollos

FIN FUNCION
```

### 10.2 Fórmula aplicada en la calculadora

```pseudo
FUNCION CALCULAR_CABLE_RECOMENDADO(distanciaPromedioCableMetros, totalPaneles):

    metrosCableRequeridos = distanciaPromedioCableMetros

    evaluar todas las combinaciones posibles de rollosDe500m y rollosDe200m
    donde metrosDisponibles >= metrosCableRequeridos

    elegir la combinación con:
        1. menor sobranteEstimado
        2. menor totalRollos
        3. mayor cantidad de rollosDe500m si todavía hay empate

    resultado.rollosDe500m = combinacion.rollosDe500m
    resultado.rollosDe200m = combinacion.rollosDe200m
    resultado.totalRollos = combinacion.totalRollos
    resultado.metrosRequeridos = metrosCableRequeridos
    resultado.metrosDisponibles = combinacion.metrosDisponibles
    resultado.sobranteEstimado = resultado.metrosDisponibles - resultado.metrosRequeridos

    retornar resultado

FIN FUNCION
```

```pseudo
EJEMPLO:

    distanciaPromedioCableMetros = 150

    metrosCableRequeridos = 150

    mejor combinacion = 1 rollo de 200m
    rollosDe500m = 0
    rollosDe200m = 1

    metrosDisponibles = 1 * 200
    metrosDisponibles = 200

    sobranteEstimado = 200 - 150
    sobranteEstimado = 50
```

---

## 11. Materiales para losa

La sección de losa usa totales de referencia calculados desde la cantidad total de paneles.
Los campos `sideWindshield`, `rearWindshield` y `groundingLug` se mantienen temporalmente desde el layout hasta que negocio defina su valor fijo final.

---

### 11.1 Totales de referencia para losa

```pseudo
FUNCION CALCULAR_TOTAL_LOSA(totalPaneles, layoutGrupos):

    baseParaLastre = REDONDEAR_ARRIBA(totalPaneles * 2.8)

    endClamp = REDONDEAR_ARRIBA(totalPaneles * 4)

    frontLeg = REDONDEAR_ARRIBA(totalPaneles * 1.4)

    rearLeg = REDONDEAR_ARRIBA(totalPaneles * 1.4)

    rielLastre = REDONDEAR_ARRIBA(totalPaneles * 0.7)

    rielTransversal = REDONDEAR_ARRIBA(totalPaneles * 2)

    splice = REDONDEAR_ARRIBA(totalPaneles * 2.0167)

    sideWindshield = REFERENCIA_DESDE_LAYOUT(layoutGrupos)

    rearWindshield = REFERENCIA_DESDE_LAYOUT(layoutGrupos)

    groundingLug = REFERENCIA_DESDE_LAYOUT(layoutGrupos)

    resultado.baseParaLastre = baseParaLastre
    resultado.endClamp = endClamp
    resultado.frontLeg = frontLeg
    resultado.rearLeg = rearLeg
    resultado.rielLastre = rielLastre
    resultado.rielTransversal = rielTransversal
    resultado.sideWindshield = sideWindshield
    resultado.rearWindshield = rearWindshield
    resultado.splice = splice
    resultado.groundingLug = groundingLug

    retornar resultado

FIN FUNCION
```

### 11.2 Referencias temporales desde layout

```pseudo
FUNCION REFERENCIA_DESDE_LAYOUT(layoutGrupos):

    sideWindshield = 0
    rearWindshield = 0
    groundingLug = 0

    PARA CADA grupo EN layoutGrupos HACER

        sideWindshield = sideWindshield + (grupo.filasDireccionRiel * 2)
        rearWindshield = rearWindshield + (grupo.filasDireccionRiel * grupo.columnas)
        groundingLug = groundingLug + REDONDEAR_ARRIBA(grupo.filasDireccionRiel * grupo.columnas / 60)

    FIN PARA

    retornar { sideWindshield, rearWindshield, groundingLug }

FIN FUNCION
```

## 12. Materiales para S-5

S-5 usa parte de la lógica base de end clamp y mid clamp.

```pseudo
PROCESO CALCULAR_S5(totalesBase, layoutGrupos):

    resultado.edge = totalesBase.endClampBase

    resultado.mid = totalesBase.midClampBase

    resultado.base = totalesBase.endClampBase + totalesBase.midClampBase

    resultado.bondingClip = CALCULAR_BONDING_CLIP_S5(layoutGrupos)

    resultado.groundingLug = CALCULAR_GROUNDING_LUG_S5(layoutGrupos)

    resultado.cableClip = REDONDEAR_ARRIBA(totalesBase.paneles)

    retornar resultado

FIN PROCESO
```

```pseudo
FUNCION CALCULAR_BONDING_CLIP_S5(layoutGrupos):

    bondingClip = 0

    PARA CADA grupo EN layoutGrupos HACER

        SI grupo.filasDireccionRiel > 0 ENTONCES
            bondingClip = bondingClip + (2 * (grupo.columnas - 1))
        FIN SI

    FIN PARA

    SI bondingClip < 0 ENTONCES
        bondingClip = 0
    FIN SI

    retornar bondingClip

FIN FUNCION
```

```pseudo
FUNCION CALCULAR_GROUNDING_LUG_S5(layoutGrupos):

    groundingLug = 0

    PARA CADA grupo EN layoutGrupos HACER
        groundingLug = groundingLug + REDONDEAR_ARRIBA(grupo.totalPaneles / 60)
    FIN PARA

    retornar groundingLug

FIN FUNCION
```

---

## 13. Materiales para piso

La calculadora tiene una configuración para piso que cambia una de las fijaciones.

```pseudo
PROCESO CALCULAR_PISO(totalPaneles, configuracionPiso):

    resultado.endClamp = totalPaneles * 4

    resultado.fijacionPiso = totalPaneles * 2

    SI configuracionPiso = "ESTE_OESTE" ENTONCES
        resultado.fijacionPiso2 = totalPaneles
    SINO
        resultado.fijacionPiso2 = totalPaneles * 2
    FIN SI

    resultado.soportePiso = resultado.fijacionPiso

    resultado.rielPiso = resultado.fijacionPiso

    retornar resultado

FIN PROCESO
```

```pseudo
EJEMPLO CON 5 PANELES MIRANDO AL SUR:

    endClamp = 5 * 4 = 20
    fijacionPiso = 5 * 2 = 10
    fijacionPiso2 = 5 * 2 = 10
    soportePiso = 10
    rielPiso = 10
```

---

## 14. Materiales para TPO

TPO tiene dos variantes:

```pseudo
TIPOS DE TPO:
    TPO_HORIZONTAL
    TPO_VERTICAL
```

La celda del Excel cambia el nombre del riel según la orientación:

```pseudo
SI tipoTPO = "VERTICAL" ENTONCES
    nombreRielTPO = "B Rail 1800"
SINO
    nombreRielTPO = "B Rail 1370"
FIN SI
```

---

### 14.1 TPO horizontal

Para TPO horizontal la calculadora usa la lógica de piso para end clamp, front leg, rear leg y B Rail 1370.

```pseudo
PROCESO CALCULAR_TPO_HORIZONTAL(totalPaneles):

    resultado.tipoTPO = "TPO Horizontal"

    resultado.endClamp = totalPaneles * 4

    resultado.midClamp = 0

    resultado.frontLeg = totalPaneles * 2

    resultado.rearLeg = resultado.frontLeg

    resultado.nombreRiel = "B Rail 1370"

    resultado.cantidadRiel = resultado.frontLeg

    retornar resultado

FIN PROCESO
```

```pseudo
EJEMPLO CON 5 PANELES TPO HORIZONTAL:

    endClamp = 5 * 4 = 20
    midClamp = 0
    frontLeg = 5 * 2 = 10
    rearLeg = 10
    B Rail 1370 = 10
```

---

### 14.2 TPO vertical

Para TPO vertical, la calculadora usa el end clamp base y mid clamp base.

```pseudo
PROCESO CALCULAR_TPO_VERTICAL(totalesBase):

    resultado.tipoTPO = "TPO Vertical"

    resultado.endClamp = totalesBase.endClampBase

    resultado.midClamp = totalesBase.midClampBase

    resultado.frontLeg = (resultado.endClamp + resultado.midClamp) / 2

    resultado.rearLeg = resultado.frontLeg

    resultado.nombreRiel = "B Rail 1800"

    resultado.cantidadRiel = resultado.frontLeg

    retornar resultado

FIN PROCESO
```

```pseudo
EJEMPLO CON 5 PANELES TPO VERTICAL, UNA COLUMNA:

    endClamp = 4
    midClamp = 8

    frontLeg = (4 + 8) / 2
    frontLeg = 6

    rearLeg = 6

    B Rail 1800 = 6
```

---

### 14.3 Proceso selector de TPO

```pseudo
PROCESO CALCULAR_TPO(totalPaneles, tipoTPO, totalesBase):

    SI tipoTPO = "HORIZONTAL" ENTONCES
        resultado = CALCULAR_TPO_HORIZONTAL(totalPaneles)
    FIN SI

    SI tipoTPO = "VERTICAL" ENTONCES
        resultado = CALCULAR_TPO_VERTICAL(totalesBase)
    FIN SI

    retornar resultado

FIN PROCESO
```

---

## 15. Proceso principal de la super calculadora

```pseudo
PROCESO SUPER_CALCULADORA_CORIGY:

    VALIDAR_ENTRADAS()

    totalPaneles = CALCULAR_TOTAL_PANELES(layoutGrupos)

    totalesBase = CALCULAR_TOTALES_BASE(layoutGrupos)

    cable = CALCULAR_CABLE_RECOMENDADO(
        distanciaPromedioCableMetros,
        totalPaneles
    )

    SI tipoInstalacion = "RIELES" ENTONCES

        resultado.materiales = {
            "Riel 5850": totalesBase.riel5850,
            "Riel 4700": totalesBase.riel4700,
            "Riel 3700": totalesBase.riel3700,
            "Riel 2400": totalesBase.riel2400,
            "Riel 1250": totalesBase.riel1250,
            "Splice": totalesBase.splice,
            "End clamp": totalesBase.endClampBase,
            "Mid clamp": totalesBase.midClampBase,
            "Feet L": totalesBase.feetL,
            "WD": totalesBase.wd,
            "Grounding lug": totalesBase.groundingLugBase,
            "Cable 500m": cable.rollosDe500m,
            "Cable 200m": cable.rollosDe200m
        }

    FIN SI

    SI tipoInstalacion = "LOSA" ENTONCES

        losa = CALCULAR_TOTAL_LOSA(layoutGrupos)

        resultado.materiales = {
            "Base p lastre": losa.baseParaLastre,
            "End clamp": losa.endClamp,
            "Front Leg": losa.frontLeg,
            "Rear Leg": losa.rearLeg,
            "Riel Lastre": losa.rielLastre,
            "Riel transversal": losa.rielTransversal,
            "Side windshield": losa.sideWindshield,
            "Rear windshield": losa.rearWindshield,
            "Splice": losa.splice,
            "Grounding lug": losa.groundingLug,
            "Cable 500m": cable.rollosDe500m,
            "Cable 200m": cable.rollosDe200m
        }

    FIN SI

    SI tipoInstalacion = "S5" ENTONCES

        s5 = CALCULAR_S5(totalesBase, layoutGrupos)

        resultado.materiales = {
            "Edge": s5.edge,
            "Mid": s5.mid,
            "Base": s5.base,
            "Bonding Clip": s5.bondingClip,
            "Grounding lug": s5.groundingLug,
            "Cable Clip": s5.cableClip,
            "Cable 500m": cable.rollosDe500m,
            "Cable 200m": cable.rollosDe200m
        }

    FIN SI

    SI tipoInstalacion = "PISO" ENTONCES

        piso = CALCULAR_PISO(totalPaneles, configuracionPiso)

        resultado.materiales = {
            "End clamp": piso.endClamp,
            "Fijacion piso": piso.fijacionPiso,
            "Fijacion piso 2": piso.fijacionPiso2,
            "Soporte de piso": piso.soportePiso,
            "Riel piso": piso.rielPiso,
            "Cable 500m": cable.rollosDe500m,
            "Cable 200m": cable.rollosDe200m
        }

    FIN SI

    SI tipoInstalacion = "TPO" ENTONCES

        tpo = CALCULAR_TPO(totalPaneles, tipoTPO, totalesBase)

        resultado.materiales = {
            "Tipo TPO": tpo.tipoTPO,
            "End clamp": tpo.endClamp,
            "Mid clamp": tpo.midClamp,
            "Front leg": tpo.frontLeg,
            "Rear leg": tpo.rearLeg,
            tpo.nombreRiel: tpo.cantidadRiel,
            "Cable 500m": cable.rollosDe500m,
            "Cable 200m": cable.rollosDe200m
        }

    FIN SI

    resultado.totalPaneles = totalPaneles
    resultado.cableMetrosRequeridos = cable.metrosRequeridos
    resultado.cableMetrosDisponibles = cable.metrosDisponibles
    resultado.cableSobranteEstimado = cable.sobranteEstimado

    resultado.materiales = LIMPIAR_MATERIALES_EN_CERO(resultado.materiales)

    retornar resultado

FIN PROCESO
```

---

## 16. Limpieza de materiales en cero

```pseudo
FUNCION LIMPIAR_MATERIALES_EN_CERO(materiales):

    materialesLimpios = lista vacia

    PARA CADA material EN materiales HACER

        SI material.cantidad > 0 ENTONCES
            agregar material a materialesLimpios
        FIN SI

    FIN PARA

    retornar materialesLimpios

FIN FUNCION
```

---

## 17. Ejemplo rápido: 5 paneles TPO horizontal

```pseudo
ENTRADA:
    layoutGrupos = [
        {
            filasDireccionRiel: 5,
            columnas: 1
        }
    ]

    totalPaneles = 5
    tipoInstalacion = "TPO"
    tipoTPO = "HORIZONTAL"
    distanciaPromedioCableMetros = 150

PROCESO:
    totalesBase = CALCULAR_TOTALES_BASE(layoutGrupos)
    cable = CALCULAR_CABLE_RECOMENDADO(150, 5)
    tpo = CALCULAR_TPO_HORIZONTAL(5)

SALIDA:
    End clamp = 20
    Mid clamp = 0
    Front leg = 10
    Rear leg = 10
    B Rail 1370 = 10
    Cable 500m = 0 rollos
    Cable 200m = 4 rollos
```

---

## 18. Ejemplo rápido: 5 paneles TPO vertical

```pseudo
ENTRADA:
    layoutGrupos = [
        {
            filasDireccionRiel: 5,
            columnas: 1
        }
    ]

    totalPaneles = 5
    tipoInstalacion = "TPO"
    tipoTPO = "VERTICAL"
    distanciaPromedioCableMetros = 150

PROCESO:
    totalesBase = CALCULAR_TOTALES_BASE(layoutGrupos)
    cable = CALCULAR_CABLE_RECOMENDADO(150, 5)
    tpo = CALCULAR_TPO_VERTICAL(totalesBase)

SALIDA:
    End clamp = 4
    Mid clamp = 8
    Front leg = 6
    Rear leg = 6
    B Rail 1800 = 6
    Cable 500m = 0 rollos
    Cable 200m = 4 rollos
```

---

## 19. Ejemplo rápido: 5 paneles losa

```pseudo
ENTRADA:
    layoutGrupos = [
        {
            filasDireccionRiel: 5,
            columnas: 1
        }
    ]

    totalPaneles = 5
    tipoInstalacion = "LOSA"
    distanciaPromedioCableMetros = 150

PROCESO:
    losa = CALCULAR_TOTAL_LOSA(layoutGrupos)
    cable = CALCULAR_CABLE_RECOMENDADO(150, 5)

SALIDA:
    Base p lastre = 14
    End clamp = 20
    Front Leg = 7
    Rear Leg = 7
    Riel Lastre = 4
    Riel transversal = 10
    Side windshield = 10
    Rear windshield = 5
    Splice = 11
    Grounding lug = 1
    Cable 500m = 0 rollos
    Cable 200m = 4 rollos
```

> Nota: `Side windshield`, `Rear windshield` y `Grounding lug` siguen tomándose desde el layout mientras negocio define el `valor_fijo` final para losa.

---

## 20. Reglas de seguridad para que la lógica no falle

```pseudo
REGLAS_OBLIGATORIAS:

    1. Nunca permitir cantidades negativas.

    2. Nunca dividir entre cero.

    3. Si columnas = 0, todos los materiales del grupo deben ser 0.

    4. Si filasDireccionRiel = 0, todos los materiales del grupo deben ser 0.

    5. Para cable, elegir la combinación de rollos de 200 m y 500 m con menor sobrante.

    6. Para TPO horizontal:
        - Mid clamp debe ser 0.
        - Riel debe llamarse B Rail 1370.

    7. Para TPO vertical:
        - Debe usar endClampBase.
        - Debe usar midClampBase.
        - Front leg = (endClampBase + midClampBase) / 2.
        - Rear leg = Front leg.
        - Riel debe llamarse B Rail 1800.

    8. Para materiales finales, ocultar materiales con cantidad 0 si la vista del sistema es para cotización.

    9. Para auditoría o debug, mostrar materiales en 0 puede ser útil.

    10. Toda fórmula que produzca decimal en materiales físicos debe revisarse.
        SI el material no puede venderse en decimal ENTONCES
            usar REDONDEAR_ARRIBA.
        FIN SI
```

---

## 21. Estructura sugerida de respuesta del sistema

```pseudo
RESPUESTA_SUPER_CALCULADORA = {

    totalPaneles: numero,

    tipoInstalacion: texto,

    orientacionTPO: texto opcional,

    materiales: [
        {
            nombre: texto,
            cantidad: numero,
            unidad: texto
        }
    ],

    cable: {
        distanciaPromedioMetros: numero,
        metrosRequeridos: numero,
        rollosDe500m: numero,
        rollosDe200m: numero,
        totalRollos: numero,
        metrosDisponibles: numero,
        sobranteEstimado: numero
    },

    advertencias: [
        texto
    ]
}
```

---

## 22. Pseudocódigo final resumido

```pseudo
INICIO

    recibir entradas

    VALIDAR_ENTRADAS()

    totalPaneles = CALCULAR_TOTAL_PANELES(layoutGrupos)

    totalesBase = CALCULAR_TOTALES_BASE(layoutGrupos)

    cable = CALCULAR_CABLE_RECOMENDADO(distanciaPromedioCableMetros, totalPaneles)

    SEGUN tipoInstalacion HACER

        CASO "RIELES":
            materiales = materialesBase + cable
        FIN CASO

        CASO "LOSA":
            materiales = CALCULAR_TOTAL_LOSA(layoutGrupos) + cable
        FIN CASO

        CASO "S5":
            materiales = CALCULAR_S5(totalesBase, layoutGrupos) + cable
        FIN CASO

        CASO "PISO":
            materiales = CALCULAR_PISO(totalPaneles, configuracionPiso) + cable
        FIN CASO

        CASO "TPO":
            materiales = CALCULAR_TPO(totalPaneles, tipoTPO, totalesBase) + cable
        FIN CASO

        CASO CONTRARIO:
            error "Tipo de instalacion no soportado"
        FIN CASO

    FIN SEGUN

    materiales = LIMPIAR_MATERIALES_EN_CERO(materiales)

    devolver respuesta

FIN
```
