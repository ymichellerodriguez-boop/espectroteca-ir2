# Informe de extracción de ESPECTROS.docx

Archivo: `ESPECTROS.docx` (SHA-256 `1f4bf49fa4f5daad…`)

- Imágenes en el documento: **141**
- Imágenes catalogadas: **140**
- Entradas con nombre pero sin imagen: **39**
- Listas de nombres sin espectros (categorías pendientes): **9**

## Validación de la tabla de picos (OCR + curva digitalizada)

| Estado | Picos |
|---|---|
| verificado | 3066 |
| coherente | 224 |
| dudoso | 232 |
| sin-curva | 4 |

## Incidencias de correspondencia nombre ↔ imagen

- Entrada 9 «3-Methyl-1-butanol» (1. Alcohols): **discrepancia-nombre**. El Word la titula «3-Methyl-1-butanol», pero la impresión SDBS corresponde a «3-METHYL-1-PENTANOL». Se cataloga con el nombre impreso en la imagen.
- Entrada 81 «Ethyl formate» (5 Esters): **imagen-duplicada**. La imagen es idéntica a la de la entrada 80 (Methyl formate); en la imagen se lee «METHYL FORMATE».
- Entrada 86 «Butyl acetate» (5 Esters): **no-verificable**. Formato SDBS moderno sin nombre ni tabla de picos impresos: no se puede verificar que la imagen corresponda al compuesto.

## Entradas con nombre y sin imagen

- Isoamyl acetate (5 Esters)
- Ethyl propionate (5 Esters)
- Ethylbenzene (7 Aromatics)
- Styrene (7 Aromatics)
- Cumene (7 Aromatics)
- Mesitylene (7 Aromatics)
- 1,2,4-Trimethylbenzene (7 Aromatics)
- Propylbenzene (7 Aromatics)
- Butylbenzene (7 Aromatics)
- tert-Butylbenzene (7 Aromatics)
- Naphthalene (7 Aromatics)
- 1-Methylnaphthalene (7 Aromatics)
- Biphenyl (7 Aromatics)
- Anthracene (7 Aromatics)
- Chlorobenzene (7 Aromatics)
- Nitrobenzene (7 Aromatics)
- Bromobenzene (7 Aromatics)
- 2,2,4-Trimethylpentane (8 Alkanes)
- Nonane (8 Alkanes)
- Decane (8 Alkanes)
- Undecane (8 Alkanes)
- Dodecane (8 Alkanes)
- Hexadecane (8 Alkanes)
- Cyclopentane (8 Alkanes)
- Cyclohexane (8 Alkanes)
- Methylcyclohexane (8 Alkanes)
- Methyl tert-butyl ether (9. Ethers)
- 2-Methyltetrahydrofuran (9. Ethers)
- Anisole (9. Ethers)
- Phenetole (9. Ethers)
- Diphenyl ether (9. Ethers)
- 1,2-Dimethoxyethane (9. Ethers)
- Diethylene glycol dimethyl ether (9. Ethers)
- Propylene oxide (9. Ethers)
- Ethyl vinyl ether (9. Ethers)
- Butyl methyl ether (9. Ethers)
- Benzyl methyl ether (9. Ethers)
- 4-Methylanisole (9. Ethers)
- Dibenzyl ether (9. Ethers)

## Calibración del eje (marcas 3000/2000/1500/1000/500 cm-1 encontradas)

- butyl-acetate: {'3000': False, '2000': False, '1500': False, '1000': False, '500': False} (formato distinto; ejes verificados visualmente)
