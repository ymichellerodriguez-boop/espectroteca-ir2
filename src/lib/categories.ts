/** Categorías de la biblioteca. Una molécula puede pertenecer a varias. */
export interface CategoryDef {
  id: string;
  name: string;
  required: boolean;
  description: string;
  keyBands: string;
  /** grupo funcional que define la categoría */
  groups: string[];
  /** nombre de la sección o lista correspondiente en ESPECTROS.docx */
  docAliases: string[];
}

export const TARGET_PER_CATEGORY = { min: 20, max: 25 };

export const CATEGORY_DEFS: CategoryDef[] = [
  { id: 'alcoholes', name: 'Alcoholes', required: true, groups: ['alcohol'], docAliases: ['1. Alcohols'],
    description: 'Grupo hidroxilo unido a un carbono sp³.', keyBands: 'O–H ancha 3550–3200 cm⁻¹ y C–O fuerte 1260–1000 cm⁻¹' },
  { id: 'fenoles', name: 'Fenoles', required: true, groups: ['fenol'], docAliases: ['2 Phenols'],
    description: 'Grupo hidroxilo unido directamente a un anillo aromático.', keyBands: 'O–H 3550–3200 cm⁻¹, C–O 1260–1180 cm⁻¹ y bandas del anillo' },
  { id: 'acidos-carboxilicos', name: 'Ácidos carboxílicos', required: true, groups: ['acido'], docAliases: ['3 Carboxylic acids'],
    description: 'Grupo –COOH; en fase condensada forman dímeros por puentes de hidrógeno.', keyBands: 'O–H muy ancha 3300–2500 cm⁻¹ y C=O 1725–1680 cm⁻¹' },
  { id: 'aldehidos', name: 'Aldehídos', required: true, groups: ['aldehido'], docAliases: ['Aldehydes'],
    description: 'Carbonilo unido a un hidrógeno (–CHO).', keyBands: 'C=O 1740–1685 cm⁻¹ y doblete C–H ≈2820/2720 cm⁻¹' },
  { id: 'cetonas', name: 'Cetonas', required: true, groups: ['cetona'], docAliases: ['4 Ketones'],
    description: 'Carbonilo unido a dos carbonos.', keyBands: 'C=O ≈1715 cm⁻¹ (saturadas); menor si hay conjugación, mayor en anillos tensos' },
  { id: 'esteres', name: 'Ésteres', required: true, groups: ['ester'], docAliases: ['5 Esters'],
    description: 'Grupo –COO–R.', keyBands: 'C=O 1750–1735 cm⁻¹ y dos C–O fuertes 1300–1000 cm⁻¹' },
  { id: 'amidas', name: 'Amidas', required: true, groups: ['amida-primaria', 'amida-secundaria', 'amida-terciaria', 'lactama', 'urea'], docAliases: ['6 Amides'],
    description: 'Carbonilo unido a nitrógeno (incluye lactamas y urea).', keyBands: 'C=O (amida I) 1700–1630 cm⁻¹ y N–H 3500–3100 cm⁻¹ en primarias y secundarias' },
  { id: 'aminas', name: 'Aminas', required: true, groups: ['amina'], docAliases: ['Amines'],
    description: 'Nitrógeno sp³ unido a carbonos e hidrógenos.', keyBands: 'N–H 3500–3300 cm⁻¹ (dos bandas en primarias), flexión N–H 1650–1580 cm⁻¹' },
  { id: 'nitrilos', name: 'Nitrilos', required: true, groups: ['nitrilo'], docAliases: ['Nitriles'],
    description: 'Grupo –C≡N.', keyBands: 'C≡N aguda 2260–2210 cm⁻¹' },
  { id: 'nitrocompuestos', name: 'Nitrocompuestos', required: true, groups: ['nitro'], docAliases: ['Nitro compounds'],
    description: 'Grupo –NO₂ unido a carbono.', keyBands: 'N–O asimétrica 1560–1490 cm⁻¹ y simétrica 1385–1315 cm⁻¹' },
  { id: 'aromaticos', name: 'Compuestos aromáticos', required: true, groups: ['aromatico'], docAliases: ['7 Aromatics'],
    description: 'Moléculas con anillo aromático (incluye las de otras categorías que lo contienen).', keyBands: 'C–H sp² 3100–3000 cm⁻¹, anillo ≈1600/1500 cm⁻¹, C–H fuera del plano 900–675 cm⁻¹' },
  { id: 'eteres', name: 'Éteres', required: true, groups: ['eter', 'eter-aromatico'], docAliases: ['9. Ethers'],
    description: 'Oxígeno unido a dos carbonos (C–O–C).', keyBands: 'C–O–C fuerte 1150–1070 cm⁻¹ (alifáticos) o 1275–1200 cm⁻¹ (aril-alquílicos)' },
  { id: 'alcanos', name: 'Alcanos', required: false, groups: ['alcano'], docAliases: ['8 Alkanes'],
    description: 'Hidrocarburos saturados.', keyBands: 'Sólo C–H sp³ 3000–2840 cm⁻¹ y flexiones 1470–1365 cm⁻¹' },
  { id: 'alquenos', name: 'Alquenos', required: false, groups: ['alqueno'], docAliases: ['Alkenes'],
    description: 'Doble enlace C=C (incluye moléculas con otros grupos).', keyBands: '=C–H 3100–3010 cm⁻¹, C=C 1680–1620 cm⁻¹, flexiones 1000–650 cm⁻¹' },
  { id: 'alquinos', name: 'Alquinos', required: false, groups: ['alquino'], docAliases: ['Alkynes'],
    description: 'Triple enlace C≡C.', keyBands: '≡C–H 3340–3250 cm⁻¹ (terminales) y C≡C 2260–2100 cm⁻¹' },
  { id: 'halogenuros', name: 'Halogenuros orgánicos', required: false, groups: ['halogenuro-cl', 'halogenuro-br', 'halogenuro-f'], docAliases: ['Alkyl halides'],
    description: 'Moléculas con enlaces C–Cl, C–Br, C–I o C–F.', keyBands: 'C–Cl 850–550 cm⁻¹, C–Br 690–515 cm⁻¹' },
  { id: 'haluros-acilo', name: 'Halogenuros de acilo', required: false, groups: ['haluro-acilo'], docAliases: ['Acyl halides'],
    description: 'Grupo –COX.', keyBands: 'C=O 1815–1770 cm⁻¹' },
  { id: 'tioles', name: 'Compuestos con azufre (tioles)', required: false, groups: ['tiol'], docAliases: ['Thiols'],
    description: 'Grupo –SH.', keyBands: 'S–H débil 2600–2550 cm⁻¹' },
];

export const GROUP_LABELS: Record<string, string> = {
  alcohol: 'Alcohol (O–H)',
  fenol: 'Fenol (Ar–OH)',
  acido: 'Ácido carboxílico',
  aldehido: 'Aldehído',
  cetona: 'Cetona',
  ester: 'Éster',
  'amida-primaria': 'Amida primaria',
  'amida-secundaria': 'Amida secundaria',
  'amida-terciaria': 'Amida terciaria',
  lactama: 'Lactama',
  urea: 'Urea',
  amina: 'Amina',
  nitrilo: 'Nitrilo',
  nitro: 'Nitro (NO₂)',
  aromatico: 'Anillo aromático',
  eter: 'Éter',
  'eter-aromatico': 'Éter aril-alquílico',
  alcano: 'Alcano',
  alquilo: 'Grupos alquilo',
  alqueno: 'Alqueno (C=C)',
  alquino: 'Alquino (C≡C)',
  'halogenuro-cl': 'C–Cl',
  'halogenuro-br': 'C–Br',
  'halogenuro-f': 'C–F',
  'haluro-acilo': 'Halogenuro de acilo',
  tiol: 'Tiol (S–H)',
};

/** Enlaces presentes, derivados de los grupos funcionales (para la búsqueda por enlace). */
export function bondsFor(groups: string[], flags: string[]): string[] {
  const b = new Set<string>();
  const add = (...xs: string[]) => xs.forEach((x) => b.add(x));
  for (const g of groups) {
    if (g === 'alcohol' || g === 'fenol') add('O–H', 'C–O');
    if (g === 'acido') add('O–H', 'C=O', 'C–O');
    if (g === 'aldehido') add('C=O', 'C–H aldehído');
    if (g === 'cetona') add('C=O');
    if (g === 'ester') add('C=O', 'C–O');
    if (g === 'amida-primaria' || g === 'amida-secundaria' || g === 'lactama' || g === 'urea') add('C=O', 'N–H', 'C–N');
    if (g === 'amida-terciaria') add('C=O', 'C–N');
    if (g === 'amina') add('N–H', 'C–N');
    if (g === 'nitrilo') add('C≡N');
    if (g === 'nitro') add('N–O', 'C–N');
    if (g === 'aromatico') add('C–H sp²', 'C=C');
    if (g === 'alqueno') add('C–H sp²', 'C=C');
    if (g === 'alquino') add('C≡C', 'C–H sp');
    if (g === 'eter' || g === 'eter-aromatico') add('C–O');
    if (g.startsWith('halogenuro')) add('C–X');
    if (g === 'tiol') add('S–H');
    if (g === 'alcano') add('C–H sp³');
  }
  if (flags.includes('tiene-ch-sp3')) add('C–H sp³');
  return [...b];
}
