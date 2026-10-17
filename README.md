# Espectroteca IR

Biblioteca interactiva de espectros infrarrojos de compuestos orgánicos para estudiantes universitarios de química: consulta por grupo funcional, gráficas interactivas con bandas asignadas, análisis de archivos propios (JCAMP-DX, CSV, TXT, JSON, imágenes, PDF, DOCX), comparador, lecciones y actividades.

- **Aplicación**: React 18 + TypeScript + Vite, gráficas con Plotly.js. Sitio 100 % estático, publicable en GitHub Pages.
- **Datos**: JSON estáticos en `public/data/`, generados con scripts de Node.js durante la preparación de la biblioteca (no en cada visita).
- **JCAMP-DX**: lector propio en TypeScript (`src/lib/jcamp/`), compartido por los scripts de Node.js y por el navegador, validado punto a punto contra la biblioteca de referencia `jcampconverter` en 67 archivos reales y contra el lector Python `jcamp` en un archivo compuesto.

## Contenido actual (verificado)

| | |
|---|---|
| Espectros en la biblioteca | **140** (todos procedentes de las impresiones SDBS de `ESPECTROS.docx`) |
| Asociaciones espectro–categoría | **196** (una molécula puede estar en varias categorías) |
| Categorías definidas | 18 (las 12 obligatorias + alcanos, alquenos, alquinos, halogenuros, halogenuros de acilo y tioles) |
| Categorías con espectros | 12 |
| Picos de tablas SDBS leídos | 3526 (87 % confirmados por la curva; los dudosos se marcan) |

Categorías obligatorias **sin espectros todavía**: aldehídos, aminas y nitrilos (el Word sólo contiene listas de nombres). Por debajo del objetivo de 20: ésteres (17), éteres (9) y nitrocompuestos (2). El detalle está en `docs/INVENTARIO.md` y en la página *Inventario* de la aplicación. **Ningún espectro se ha inventado para completar categorías.**

## Requisitos

- Node.js 20 o superior (probado con Node 22.22) y npm.
- Sólo para repetir la extracción del Word: Python 3.10+ con `numpy` y `Pillow`.

## Ejecución local

```bash
npm install
npm run dev          # http://localhost:5173
```

Otras órdenes:

```bash
npm test             # pruebas unitarias e integridad de la biblioteca (vitest)
npm run test:real    # descarga archivos JCAMP-DX reales de prueba y los compara con jcampconverter
npm run build        # comprueba tipos y genera dist/
npm run preview      # sirve dist/ localmente
npm run library:validate
npm run check:secrets
```

## Publicación en GitHub Pages

1. Cree un repositorio en GitHub (por ejemplo `espectroteca-ir`) y suba el proyecto a la rama `main`:
   ```bash
   git init && git add . && git commit -m "Espectroteca IR"
   git branch -M main
   git remote add origin https://github.com/USUARIO/espectroteca-ir.git
   git push -u origin main
   ```
2. En el repositorio: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. El flujo `.github/workflows/deploy.yml` se ejecuta en cada push: instala dependencias, busca claves privadas, valida la biblioteca, ejecuta las pruebas, compila y publica `dist/`.
4. La web queda en `https://USUARIO.github.io/NOMBRE-DEL-REPOSITORIO/`.

La propiedad `base` de Vite se toma de la variable `VITE_BASE`, que el workflow fija como `/${nombre del repositorio}/`. Para compilar a mano con la misma ruta: `VITE_BASE=/espectroteca-ir/ npm run build`. Si publica en `USUARIO.github.io` o en un dominio propio, use `VITE_BASE=/`.

La navegación usa rutas con `#` (`/#/biblioteca`) porque GitHub Pages no reescribe rutas: así se puede recargar cualquier página o compartir su enlace sin error 404.

## Estructura

```
public/data/              biblioteca publicada (library.json, categories.json, inventory.json, spectra/<id>.json)
public/spectra/sdbs/      imágenes originales extraídas del Word (bytes sin modificar)
public/spectra/jcamp/     archivos JCAMP-DX originales cuya redistribución esté permitida (vacío por ahora)
src/lib/                  lógica compartida Node/navegador: jcamp/, peaks, bands, assign, validate, tabular
src/components/           componentes reutilizables (gráfica Plotly, editor de asignaciones, navegación)
src/pages/                páginas (Inicio, Biblioteca, Ficha, Analizar, Comparar, Aprender, Actividades, Inventario)
src/features/             lógica de cada sección (filtros, calibrador de imágenes, comparación, lecciones)
src/services/             carga de datos, archivos del usuario, digitalización, exportación
scripts/                  herramientas de Node.js (conversión, importación por lotes, construcción, validación)
scripts/docx/             extracción reproducible del Word (Python)
data/source/              transcripción revisada de las cabeceras SDBS; aquí se coloca ESPECTROS.docx
data/extracted/           salida de la extracción del Word e informe
data/imported/            espectros importados con el importador por lotes
tests/                    pruebas (vitest) y archivos de prueba controlados
docs/                     inventario, informe de pruebas y manifiesto de ejemplo
```

## Modelo de datos

Cada ficha (`public/data/spectra/<id>.json`) contiene: `id`, `name`, `nameEs`, `synonyms`, `formula`, `primaryCategory`, `categories`, `functionalGroups`, `bonds`, `spectrumType`, `xUnits`, `yUnits`, `data` (curva y su origen), `originalImage`, `originalFile`, `source`, `sourceIdentifier`, `acquisitionDate`, `peakTable`, `assignments`, `verificationStatus`, `notes`, `limitations`, `distinctive`, `howToRead` y `provenance` (calibración de ejes, picos detectados, comprobación del nombre, huella SHA-256 de la imagen…).

Las fórmulas son las impresas en cada imagen SDBS (contrastadas con la estructura); los identificadores `SDBS No.` e `IR-NIDA` se transcribieron de cada cabecera y se revisaron uno por uno (`data/source/headers-verificados.tsv`).

## Fuente inicial: `ESPECTROS.docx`

```bash
pip install numpy pillow
python3 -I scripts/docx/extract_docx.py data/source/ESPECTROS.docx
npm run library:build
```

Procedimiento (`scripts/docx/`):

1. Lee `word/document.xml` en orden y relaciona cada imagen con el párrafo de texto que la precede; las listas de nombres sin imagen se registran como pendientes.
2. Compara el nombre del Word con el impreso en la imagen y detecta imágenes repetidas (SHA-256).
3. Detecta el marco del gráfico y calibra el eje X de SDBS, que es **a tramos** (4000–2000 y 2000–400 cm⁻¹, la segunda región con el doble de píxeles por cm⁻¹); la calibración se comprueba localizando las marcas de 3000, 2000, 1500, 1000 y 500 cm⁻¹.
4. Digitaliza la curva (≈1 punto por columna de píxeles; los huecos de la ventana del disolvente se conservan como huecos).
5. Lee la tabla de picos impresa con un OCR por plantillas (`glyph-templates.json`, construido con tres tablas transcritas a mano mediante `build_templates.py`) y valida cada valor: se considera *verificado* si existe un mínimo local de la curva a ±2,5 px y ±5 %T; las lecturas ambiguas (5/6/8 en la fuente reescalada) se resuelven con la curva y con el orden decreciente de la tabla, y se conservan las alternativas.

Incidencias encontradas en el documento:

- «3-Methyl-1-butanol»: la imagen corresponde a **3-methyl-1-pentanol** (impreso en la cabecera). Se cataloga con el nombre de la imagen y 3-metil-1-butanol queda pendiente.
- «Ethyl formate»: reutiliza la imagen de «Methyl formate». No se incorpora.
- «Butyl acetate»: impresión SDBS moderna sin nombre ni tabla de picos. Se incorpora con estado *requiere revisión*.

### Qué son (y qué no son) los datos numéricos

- La **tabla de picos** contiene los valores impresos por SDBS (número de onda, %T).
- La **curva interactiva** es una digitalización de la imagen: resolución ≈7–8 cm⁻¹ por encima de 2000 cm⁻¹ y ≈4 cm⁻¹ por debajo; ≈1 %T de incertidumbre. Se identifica siempre como «digitalizado de imagen» y no se presenta como dato experimental exacto.

## Obtención de espectros de SDBS y otras fuentes

Las condiciones de SDBS (<https://sdbs.db.aist.go.jp/>, AIST) permiten el acceso gratuito, **prohíben la recopilación automática con robots y las descargas masivas**, prohíben el uso comercial sin permiso y piden citar «SDBS, National Institute of Advanced Industrial Science and Technology, fecha de acceso». Versiones anteriores de la página fijaban además un máximo de 50 espectros o fichas por día. Por tanto, este proyecto **no descarga nada de SDBS de forma automática**. Además, SDBS muestra los espectros IR como imágenes, no como archivos JCAMP-DX descargables.

Procedimiento recomendado para completar categorías:

1. Busque manualmente cada compuesto pendiente (véase *Inventario*) en una fuente que publique JCAMP-DX y cuyas condiciones lo permitan (por ejemplo, el NIST Chemistry WebBook ofrece espectros IR en JCAMP-DX para muchos compuestos; revise sus condiciones de redistribución).
2. Guarde los archivos en una carpeta y descríbalos en un manifiesto (modelo en `docs/manifest.example.json`): compuesto, fórmula, categorías, grupos funcionales, fuente, identificador, fecha y si puede redistribuirse.
3. Importe y reconstruya:
   ```bash
   npm run jcamp:import -- --input carpeta --manifest manifiesto.json
   npm run library:build
   ```

Si la redistribución no está permitida (`"redistributable": false`), se publican los datos procesados necesarios para la gráfica y los metadatos, pero **no** el archivo original; la ficha indica dónde obtenerlo. Revise en cada caso si incluso los datos procesados pueden publicarse.

Las imágenes SDBS del Word se reproducen con fines educativos no comerciales y con la cita indicada. Si el proyecto fuese a tener un uso comercial, habría que solicitar permiso a AIST.

## Conversor JCAMP-DX (Node.js)

```bash
npm run jcamp:convert -- --input archivo.jdx            # o una carpeta
npm run jcamp:convert -- --input carpeta --out data/converted --force
```

Por cada archivo genera un JSON normalizado y un informe (`conversion-report.json` y `.md`) con los archivos procesados y rechazados. No sobrescribe sin `--force`.

Flujo: leer → validar estructura → decodificar → aplicar `XFACTOR`/`YFACTOR` → reconstruir X con `FIRSTX`, `LASTX`, `NPOINTS` (o `DELTAX`) → comprobar número de puntos, abscisas de línea y control de ordenada → detectar valores inválidos → normalizar unidades (µm/nm → cm⁻¹, registrando la operación) → exportar.

**Compatible y probado**: `##XYDATA=(X++(Y..Y))` en AFFN, PAC y ASDF (SQZ, DIF, DUP, con control de ordenada); `##XYPOINTS=(XY..XY)`; `##PEAK TABLE=(XY..XY)`, `(XYW..XYW)`, `(XYM..XYM)`; archivos compuestos con `##BLOCKS`; etiquetas `TITLE`, `JCAMP-DX`, `DATA TYPE`, `XUNITS`, `YUNITS`, `XFACTOR`, `YFACTOR`, `FIRSTX`, `LASTX`, `NPOINTS`, `DELTAX`, `END` y el resto se conservan en `ldrs`.

**No compatible** (se informa como error sin cerrar la aplicación): `##NTUPLES` (RMN 2D, EM, series), formas `(R..R)`/`(I..I)` y otras variantes de `XYDATA`. No se afirma compatibilidad con todos los archivos JCAMP-DX: sólo con las formas probadas.

**Biblioteca evaluada**: [`jcampconverter`](https://www.npmjs.com/package/jcampconverter) (cheminfo/Zakodium) está mantenida (12.5.11 publicada el 16-oct-2026) y documenta `convert(jcamp, options)`, pero desde la versión 11 su licencia es **CC BY-NC-SA 4.0** y depende de `openchemlib`. Por eso se usa sólo como **referencia de pruebas** (dependencia de desarrollo, versión fijada 12.5.8) y la aplicación incluye su propio lector, más pequeño y bajo licencia MIT.

## Importador por lotes

```bash
npm run jcamp:import -- --input <carpeta> --manifest <manifiesto.json> [--force]
npm run jcamp:import:test    # modo de prueba con archivos controlados; escribe en data/.import-test/
```

Procesa todos los archivos compatibles, rechaza (con motivo) los que no se decodifican, no figuran en el manifiesto, carecen de metadatos o no son infrarrojos, conserva la procedencia (fuente, URL, identificador, SHA-256 del original, fecha), nunca sobrescribe sin `--force` y genera `import-log-<fecha>.json` e `import-report-<fecha>.md`. El modo `--test` no modifica la biblioteca real.

## Análisis de bandas

- **Detección** (`src/lib/peaks.ts`): mínimos en transmitancia, máximos en absorbancia; prominencia topográfica mínima ajustable, separación mínima, suavizado Savitzky–Golay opcional (sólo para detectar; la curva mostrada son los datos originales), anchura a media prominencia y clasificación de intensidad y forma.
- **Referencia** (`src/lib/bands.ts`): 53 intervalos orientativos (O–H, N–H, C–H sp³/sp²/sp, C–H de aldehído, C=O por tipo, C=C, C≡C, C≡N, C–O, C–N, N–O, C–X, S–H, artefactos de CO₂ y Nujol) con vibración, intensidad, forma, explicación, factores (conjugación, puentes de hidrógeno, tensión de anillo) y fuentes: Silverstein *et al.* (8.ª ed.), Pavia *et al.* (5.ª ed.) y Socrates (3.ª ed.).
- **Asignación** (`src/lib/assign.ts`): para la biblioteca se buscan las bandas esperadas según la estructura conocida y se informa también de las **ausencias**; para espectros del usuario se proponen candidatos por intervalo e hipótesis de grupo funcional con evidencia a favor, lo que falta y precauciones.
- La interfaz distingue: pico detectado matemáticamente · pico de la tabla de la fuente · asignación propuesta · asignación confirmada por el usuario. La detección automática **no identifica** el compuesto.

## IA

El análisis funciona íntegramente en local y no usa ninguna API de IA. No hay claves en el código (`npm run check:secrets`).

## Licencias y créditos

- Código: MIT.
- Espectros: SDBS, National Institute of Advanced Industrial Science and Technology (AIST), Japón. Uso educativo no comercial con cita.
- Pruebas con archivos reales: paquete Python `jcamp` 1.3.2 (MIT); los espectros pertenecen a NIST, Coblentz Society y otros titulares, y no se redistribuyen en este repositorio.
