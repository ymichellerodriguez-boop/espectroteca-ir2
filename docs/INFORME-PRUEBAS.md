# Informe de pruebas

Fecha: 16 de octubre de 2026 · Node.js 22.22.0 · vitest 2.1.8 · Chromium (Playwright 1.56.1)

## Resumen

| Comprobación | Resultado |
|---|---|
| Pruebas automatizadas (`npm test`) | **130 de 130 superadas** en 8 archivos |
| Archivos JCAMP-DX reales comparados con `jcampconverter` | **67 de 67** idénticos (Δy relativo < 1·10⁻⁹, Δx < 1·10⁻⁶) |
| Archivo compuesto real comparado con el lector Python `jcamp` | coincide (2 bloques, 2074 puntos, sumas 331,472659 y 1244,169707) |
| Conversión por carpeta de los 68 archivos reales (`jcamp:convert`) | 68/68 convertidos |
| Archivos de prueba controlados (`jcamp:convert`) | 12/14 convertidos; 2 rechazados a propósito (NTUPLES y carácter inválido) |
| Importador en modo de prueba (`jcamp:import:test`) | 2 importados, 12 rechazados con motivo; la biblioteca real no se modifica |
| Comprobación de tipos y compilación (`npm run build`) | sin errores; salida en `dist/` |
| Validación de la biblioteca (`library:validate`) | válida (avisos: 2 espectros con incidencias documentadas) |
| Búsqueda de claves privadas (`check:secrets`) | ninguna encontrada |
| Navegador real, escritorio (1366×900) y móvil (390×844) | sin errores de JavaScript ni desbordamiento horizontal en las páginas probadas |

## Detalle de las pruebas automatizadas

- `tests/asdf.test.ts` (10): AFFN, PAC, exponentes, el caso ambiguo «630.7E22708282» (abscisa + valor SQZ), valores ausentes, SQZ, DIF, DUP (de valor y de diferencia), ejemplo completo y errores.
- `tests/jcamp.controlled.test.ts` (14): metadatos, reconstrucción de X, factores, PAC con XFACTOR/YFACTOR, ASDF con control de ordenada correcto e incorrecto, NPOINTS distinto, XYPOINTS, PEAK TABLE (XYW), archivo compuesto, NTUPLES, carácter inválido, texto no JCAMP, conversión µm → cm⁻¹ registrada, transmitancia/absorbancia identificadas sin transformarse.
- `tests/jcamp.real.test.ts` (70): 67 archivos reales de NIST, Coblentz Society, Sadtler y ejemplos (AFFN, PAC, ASDF con DIF/DUP/SQZ y más de 100 controles de ordenada, XYPOINTS multibloque) comparados punto a punto con `jcampconverter` 12.5.8; además, archivo compuesto frente al lector Python y validación de la conversión completa.
- `tests/peaks.test.ts` (6): posiciones de bandas sintéticas (±4 cm⁻¹), anchura y forma, absorbancia, filtrado de ruido por prominencia y suavizado, huecos y Savitzky–Golay.
- `tests/assign.test.ts` (13): cobertura de enlaces de la base de referencia, intervalos y fuentes, asignación con estructura conocida (cetona, amida primaria con dos N–H, ausencias, fiabilidad, Nujol) e hipótesis para espectros desconocidos (ácido, nitrilo, acetona frente a acetato de etilo).
- `tests/validate-tabular.test.ts` (7): validación de ejes y valores; CSV con encabezado, punto y coma con coma decimal, TXT con espacios, JSON en varias formas.
- `tests/compare.test.ts` (4): comparación 1-butanol / ácido butírico (O–H ancha reconocida, C=O ausente en el alcohol), filtros combinados, búsqueda por sinónimo, fórmula, número de onda y enlace, filtro por estado.
- `tests/library.test.ts` (6): identificadores únicos, fichas e imágenes existentes, 12 categorías obligatorias y al menos 10 con espectros, recuentos coherentes, ejes crecientes en 350–4000 cm⁻¹, %T en 0–100, fórmulas y estados de ejemplos conocidos, ausencia del espectro duplicado.

## Pruebas en el navegador

Se sirvió `dist/` (compilado con `VITE_BASE=/espectroteca-ir/`, igual que en GitHub Pages) y se recorrieron con Chromium, en escritorio y móvil: inicio, biblioteca, biblioteca filtrada (fenoles + banda a 1250 cm⁻¹), ficha del ácido acético, comparador, lección, inventario y actividades.

- Analizador con JCAMP-DX: el espectro sintético se decodifica, se detectan 4 bandas y se propone «ácido carboxílico, confianza alta».
- Analizador con imagen: la impresión SDBS de la acetona se calibra automáticamente (marco y escala a tramos), se extrae el trazo (815 de 819 columnas) y se propone «cetona». En la primera ronda se proponía «éster» por la banda C–C–C intensa a 1222 cm⁻¹; la regla se corrigió y se añadió una prueba de regresión.
- Actividades: «Encuentra la banda» registra el clic y da la explicación; «Detective IR» y «Identifica el grupo funcional» muestran la retroalimentación.
- Comparador con el espectro del usuario y dos de la biblioteca: superposición y diferencias por región.

Problemas encontrados y corregidos durante las pruebas: hipótesis éster/cetona, desbordamiento horizontal de etiquetas en móvil, clic de la actividad que sólo funcionaba sobre un punto exacto, O–H de ácido declarada «ausente» en el comparador y etiquetas solapadas en el gráfico.

## Límites de lo probado

- El lector JCAMP-DX sólo se declara compatible con las formas probadas (véase el README). No se probaron archivos con `##NTUPLES`, `(R..R)`/`(I..I)` ni de equipos comerciales concretos.
- No se probó la descarga real desde PyPI de `fetch-test-fixtures` en este entorno (la red estaba restringida); se usó el mismo paquete obtenido con `pip download` y la opción `--from`. En GitHub Actions la descarga usa la API pública de PyPI.
- La lectura de PDF y DOCX en el navegador se compiló pero no se ejercitó con archivos de usuario en esta ronda; la digitalización de imágenes, sí.
- Las fuentes de Google no se cargaron en el entorno de pruebas (red bloqueada); la página usa fuentes de respaldo del sistema en ese caso.
- La precisión de la curva digitalizada está limitada por los píxeles de la imagen (≈7–8 cm⁻¹ por encima de 2000 cm⁻¹, ≈4 cm⁻¹ por debajo).
