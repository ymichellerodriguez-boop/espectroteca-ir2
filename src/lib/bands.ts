/**
 * Base de referencia de bandas IR (intervalos ORIENTATIVOS, no valores universales).
 * Los límites concretos varían con el estado físico, la conjugación, los puentes de hidrógeno,
 * los efectos electrónicos y la tensión de anillo.
 *
 * Fuentes:
 *  [SWK]  Silverstein, R. M.; Webster, F. X.; Kiemle, D. J.; Bryce, D. L. Spectrometric
 *         Identification of Organic Compounds, 8.ª ed. Wiley, 2014, cap. 2.
 *  [PLKV] Pavia, D. L.; Lampman, G. M.; Kriz, G. S.; Vyvyan, J. R. Introduction to
 *         Spectroscopy, 5.ª ed. Cengage, 2015, cap. 2.
 *  [SOC]  Socrates, G. Infrared and Raman Characteristic Group Frequencies, 3.ª ed. Wiley, 2001.
 */

export const BAND_SOURCES: Record<string, string> = {
  SWK: 'Silverstein, Webster, Kiemle y Bryce, Spectrometric Identification of Organic Compounds, 8.ª ed. (Wiley, 2014), cap. 2',
  PLKV: 'Pavia, Lampman, Kriz y Vyvyan, Introduction to Spectroscopy, 5.ª ed. (Cengage, 2015), cap. 2',
  SOC: 'Socrates, Infrared and Raman Characteristic Group Frequencies, 3.ª ed. (Wiley, 2001)',
};

export interface ReferenceBand {
  id: string;
  bond: string;
  /** familia de enlace para filtros: O–H, N–H, C–H sp3, ... */
  bondFamily: string;
  group: string;
  /** códigos de grupo funcional para el que es diagnóstica */
  groups: string[];
  /** límite superior (cm⁻¹) */
  hi: number;
  /** límite inferior (cm⁻¹) */
  lo: number;
  vibration: string;
  intensity: string;
  shape: string;
  explanation: string;
  factors?: string;
  sources: string[];
}

export const REFERENCE_BANDS: ReferenceBand[] = [
  // ---------- O–H ----------
  { id: 'oh-free', bond: 'O–H libre', bondFamily: 'O–H', group: 'Alcohol o fenol (O–H no asociado)', groups: ['alcohol', 'fenol'], hi: 3650, lo: 3580, vibration: 'tensión O–H', intensity: 'media', shape: 'aguda',
    explanation: 'Sólo aparece cuando las moléculas no forman puentes de hidrógeno: disoluciones diluidas (p. ej. en CCl₄) o fase gas.', factors: 'Dilución, impedimento estérico.', sources: ['SWK', 'PLKV'] },
  { id: 'oh-hb', bond: 'O–H asociado', bondFamily: 'O–H', group: 'Alcohol o fenol (O–H con puentes de hidrógeno)', groups: ['alcohol', 'fenol'], hi: 3550, lo: 3200, vibration: 'tensión O–H', intensity: 'fuerte', shape: 'ancha',
    explanation: 'Los puentes de hidrógeno debilitan el enlace O–H y generan una distribución de entornos: la banda se desplaza a menor número de onda y se ensancha.', factors: 'Concentración, estado físico (líquido puro, sólido).', sources: ['SWK', 'PLKV'] },
  { id: 'oh-acid', bond: 'O–H de ácido', bondFamily: 'O–H', group: 'Ácido carboxílico (dímero)', groups: ['acido'], hi: 3300, lo: 2500, vibration: 'tensión O–H', intensity: 'fuerte', shape: 'muy ancha',
    explanation: 'Los ácidos forman dímeros cíclicos con puentes de hidrógeno muy fuertes: la banda O–H es extremadamente ancha y suele solaparse con las de C–H.', sources: ['SWK', 'PLKV'] },
  { id: 'oh-acid-oop', bond: 'O–H (flexión fuera del plano)', bondFamily: 'O–H', group: 'Ácido carboxílico (dímero)', groups: ['acido'], hi: 960, lo: 875, vibration: 'flexión O–H fuera del plano', intensity: 'media', shape: 'ancha',
    explanation: 'Banda ancha típica del dímero de ácido; apoya, pero no basta para asignar el grupo.', sources: ['SWK'] },
  // ---------- N–H ----------
  { id: 'nh-amine1', bond: 'N–H (amina primaria)', bondFamily: 'N–H', group: 'Amina primaria (dos bandas)', groups: ['amina'], hi: 3500, lo: 3300, vibration: 'tensión N–H asimétrica y simétrica', intensity: 'media', shape: 'media',
    explanation: 'El grupo NH₂ da dos bandas (asimétrica y simétrica); son menos intensas y más estrechas que la O–H asociada.', sources: ['SWK', 'PLKV'] },
  { id: 'nh-amide', bond: 'N–H (amida)', bondFamily: 'N–H', group: 'Amida primaria o secundaria', groups: ['amida-primaria', 'amida-secundaria', 'urea', 'lactama'], hi: 3500, lo: 3100, vibration: 'tensión N–H', intensity: 'media a fuerte', shape: 'media',
    explanation: 'Las amidas primarias muestran dos bandas (≈3350 y ≈3180 cm⁻¹ en sólido); las secundarias, una (≈3300 cm⁻¹). Los puentes de hidrógeno las desplazan hacia valores bajos.', sources: ['SWK', 'PLKV'] },
  { id: 'nh-bend', bond: 'N–H (flexión)', bondFamily: 'N–H', group: 'Amida primaria (banda amida II) o amina primaria', groups: ['amida-primaria', 'amina', 'urea'], hi: 1650, lo: 1580, vibration: 'flexión N–H (tijera)', intensity: 'media', shape: 'media',
    explanation: 'En amidas primarias aparece cerca de la banda C=O (amida I) y puede solaparse con ella.', sources: ['SWK'] },
  { id: 'amide-ii', bond: 'N–H + C–N (amida II)', bondFamily: 'N–H', group: 'Amida secundaria (banda amida II)', groups: ['amida-secundaria', 'lactama'], hi: 1570, lo: 1515, vibration: 'flexión N–H acoplada a tensión C–N', intensity: 'fuerte', shape: 'media',
    explanation: 'Característica de amidas secundarias de cadena abierta; en lactamas pequeñas puede faltar o desplazarse.', sources: ['SWK', 'PLKV'] },
  // ---------- C–H ----------
  { id: 'ch-sp', bond: 'C–H sp', bondFamily: 'C–H sp', group: 'Alquino terminal (≡C–H)', groups: ['alquino'], hi: 3340, lo: 3250, vibration: 'tensión ≡C–H', intensity: 'fuerte', shape: 'aguda',
    explanation: 'El carbono sp tiene más carácter s: el enlace C–H es más fuerte y vibra a mayor número de onda que en sp² y sp³.', sources: ['SWK', 'PLKV'] },
  { id: 'ch-sp2-arom', bond: 'C–H sp² (aromático)', bondFamily: 'C–H sp²', group: 'Anillo aromático', groups: ['aromatico'], hi: 3100, lo: 3000, vibration: 'tensión =C–H', intensity: 'débil a media', shape: 'aguda',
    explanation: 'Las bandas por encima de 3000 cm⁻¹ indican C–H unidos a carbonos sp² (aromáticos o alquénicos).', sources: ['SWK', 'PLKV'] },
  { id: 'ch-sp2-alk', bond: 'C–H sp² (alqueno)', bondFamily: 'C–H sp²', group: 'Alqueno', groups: ['alqueno'], hi: 3100, lo: 3010, vibration: 'tensión =C–H', intensity: 'media', shape: 'aguda',
    explanation: 'Igual que en aromáticos, aparece por encima de 3000 cm⁻¹; se distingue por las demás señales del grupo.', sources: ['SWK', 'PLKV'] },
  { id: 'ch-sp3', bond: 'C–H sp³', bondFamily: 'C–H sp³', group: 'Grupos alquilo (CH₃, CH₂, CH)', groups: ['alcano', 'alquilo'], hi: 3000, lo: 2840, vibration: 'tensión C–H asimétrica y simétrica', intensity: 'fuerte', shape: 'aguda',
    explanation: 'Bandas por debajo de 3000 cm⁻¹: CH₃ ≈2960 y ≈2870, CH₂ ≈2925 y ≈2850 cm⁻¹. Presentes en casi todas las moléculas orgánicas, por lo que por sí solas identifican poco.', sources: ['SWK', 'PLKV'] },
  { id: 'ch-ald', bond: 'C–H de aldehído', bondFamily: 'C–H aldehído', group: 'Aldehído (doblete de Fermi)', groups: ['aldehido'], hi: 2830, lo: 2695, vibration: 'tensión C–H del CHO (resonancia de Fermi)', intensity: 'débil a media', shape: 'aguda',
    explanation: 'Dos bandas (≈2820 y ≈2720 cm⁻¹) por resonancia de Fermi con un sobretono de la flexión C–H; la de ≈2720 es muy útil porque pocas señales caen ahí.', sources: ['SWK', 'PLKV'] },
  { id: 'ch-ome', bond: 'C–H de O–CH₃ / N–CH₃', bondFamily: 'C–H sp³', group: 'Metoxilo o N-metilo', groups: ['eter-aromatico', 'ester', 'amida-terciaria'], hi: 2850, lo: 2815, vibration: 'tensión C–H simétrica', intensity: 'media', shape: 'aguda',
    explanation: 'El heteroátomo vecino desplaza la tensión simétrica del CH₃ hacia valores algo menores.', sources: ['SOC'] },
  { id: 'ch2-bend', bond: 'C–H (flexión CH₂/CH₃)', bondFamily: 'C–H sp³', group: 'Grupos alquilo', groups: ['alcano', 'alquilo'], hi: 1475, lo: 1440, vibration: 'flexión CH₂ (tijera) y CH₃ asimétrica', intensity: 'media', shape: 'media',
    explanation: 'Señal habitual en cualquier cadena alquílica.', sources: ['SWK', 'PLKV'] },
  { id: 'ch3-umb', bond: 'C–H (flexión CH₃ simétrica)', bondFamily: 'C–H sp³', group: 'Grupo metilo', groups: ['alcano', 'alquilo'], hi: 1390, lo: 1365, vibration: 'flexión CH₃ simétrica («paraguas»)', intensity: 'media', shape: 'aguda',
    explanation: 'Un desdoblamiento (≈1385 y ≈1365 cm⁻¹) sugiere grupos isopropilo o gem-dimetilo; el terc-butilo da ≈1395 y ≈1365 cm⁻¹.', sources: ['SWK', 'PLKV'] },
  { id: 'ch2-rock', bond: 'CH₂ (balanceo)', bondFamily: 'C–H sp³', group: 'Cadena de cuatro o más CH₂', groups: ['alcano', 'alquilo'], hi: 735, lo: 715, vibration: 'balanceo de (CH₂)ₙ, n ≥ 4', intensity: 'débil a media', shape: 'aguda',
    explanation: 'Indica una secuencia de al menos cuatro metilenos consecutivos.', sources: ['SWK', 'PLKV'] },
  // ---------- triples ----------
  { id: 'cn-triple', bond: 'C≡N', bondFamily: 'C≡N', group: 'Nitrilo', groups: ['nitrilo'], hi: 2260, lo: 2210, vibration: 'tensión C≡N', intensity: 'media', shape: 'aguda',
    explanation: 'Banda aguda en una región casi vacía; la conjugación la lleva hacia ≈2230–2220 cm⁻¹.', sources: ['SWK', 'PLKV'] },
  { id: 'cc-triple', bond: 'C≡C', bondFamily: 'C≡C', group: 'Alquino', groups: ['alquino'], hi: 2260, lo: 2100, vibration: 'tensión C≡C', intensity: 'débil', shape: 'aguda',
    explanation: 'Débil en alquinos internos y ausente si la molécula es simétrica (no cambia el momento dipolar).', sources: ['SWK', 'PLKV'] },
  // ---------- C=O ----------
  { id: 'co-acylhal', bond: 'C=O', bondFamily: 'C=O', group: 'Halogenuro de acilo', groups: ['haluro-acilo'], hi: 1815, lo: 1770, vibration: 'tensión C=O', intensity: 'muy fuerte', shape: 'aguda',
    explanation: 'El halógeno retira densidad electrónica por efecto inductivo y eleva la frecuencia del carbonilo.', sources: ['SWK', 'PLKV'] },
  { id: 'co-ester', bond: 'C=O', bondFamily: 'C=O', group: 'Éster saturado', groups: ['ester'], hi: 1750, lo: 1730, vibration: 'tensión C=O', intensity: 'muy fuerte', shape: 'aguda',
    explanation: 'El oxígeno del alcoxilo retira densidad por efecto inductivo: el C=O de un éster aparece por encima del de una cetona.', factors: 'La conjugación con C=C o anillo aromático lo baja a ≈1730–1715 cm⁻¹; en ésteres vinílicos o de fenilo sube (≈1770–1760 cm⁻¹).', sources: ['SWK', 'PLKV'] },
  { id: 'co-ester-conj', bond: 'C=O', bondFamily: 'C=O', group: 'Éster α,β-insaturado o aromático', groups: ['ester'], hi: 1730, lo: 1715, vibration: 'tensión C=O', intensity: 'muy fuerte', shape: 'aguda',
    explanation: 'La conjugación deslocaliza los electrones π, reduce el orden de enlace C=O y baja el número de onda.', sources: ['SWK', 'PLKV'] },
  { id: 'co-ester-vinyl', bond: 'C=O', bondFamily: 'C=O', group: 'Éster vinílico (o de fenilo)', groups: ['ester'], hi: 1780, lo: 1755, vibration: 'tensión C=O', intensity: 'muy fuerte', shape: 'aguda',
    explanation: 'Cuando el oxígeno del éster está unido a un C=C, su par libre se deslocaliza hacia el alqueno y no hacia el carbonilo: el C=O se fortalece.', sources: ['SWK'] },
  { id: 'co-ald', bond: 'C=O', bondFamily: 'C=O', group: 'Aldehído', groups: ['aldehido'], hi: 1740, lo: 1685, vibration: 'tensión C=O', intensity: 'muy fuerte', shape: 'aguda',
    explanation: 'Alifáticos ≈1730 cm⁻¹; conjugados o aromáticos ≈1705–1685 cm⁻¹. Debe confirmarse con el doblete C–H ≈2820/2720 cm⁻¹.', sources: ['SWK', 'PLKV'] },
  { id: 'co-ketone', bond: 'C=O', bondFamily: 'C=O', group: 'Cetona saturada', groups: ['cetona'], hi: 1725, lo: 1705, vibration: 'tensión C=O', intensity: 'muy fuerte', shape: 'aguda',
    explanation: 'Valor de referencia ≈1715 cm⁻¹ para cetonas alifáticas de cadena abierta.', factors: 'Conjugación: ≈1700–1665 cm⁻¹. Tensión de anillo: ciclopentanona ≈1745 cm⁻¹; ciclohexanona ≈1715 cm⁻¹.', sources: ['SWK', 'PLKV'] },
  { id: 'co-ketone-conj', bond: 'C=O', bondFamily: 'C=O', group: 'Cetona conjugada (arílica o α,β-insaturada)', groups: ['cetona'], hi: 1700, lo: 1660, vibration: 'tensión C=O', intensity: 'muy fuerte', shape: 'aguda',
    explanation: 'La conjugación con un anillo aromático o un C=C reduce el carácter de doble enlace del carbonilo.', sources: ['SWK', 'PLKV'] },
  { id: 'co-ketone-c5', bond: 'C=O', bondFamily: 'C=O', group: 'Cetona en anillo de cinco miembros', groups: ['cetona'], hi: 1760, lo: 1735, vibration: 'tensión C=O', intensity: 'muy fuerte', shape: 'aguda',
    explanation: 'La tensión del anillo aumenta el carácter s del enlace σ C–C=O exocíclico y eleva la frecuencia del C=O.', sources: ['SWK', 'PLKV'] },
  { id: 'co-diketone-enol', bond: 'C=O / C=C (enol)', bondFamily: 'C=O', group: 'β-dicetona en forma enólica', groups: ['cetona'], hi: 1640, lo: 1580, vibration: 'tensión C=O conjugada con C=C y quelada', intensity: 'muy fuerte', shape: 'ancha',
    explanation: 'El tautómero enólico forma un puente de hidrógeno intramolecular y un sistema conjugado: la banda carbonílica cae muy por debajo de 1700 cm⁻¹.', sources: ['SWK'] },
  { id: 'co-acid', bond: 'C=O', bondFamily: 'C=O', group: 'Ácido carboxílico (dímero)', groups: ['acido'], hi: 1725, lo: 1680, vibration: 'tensión C=O', intensity: 'muy fuerte', shape: 'aguda a media',
    explanation: 'En el dímero el C=O participa en puentes de hidrógeno; aparece ≈1710 cm⁻¹ (alifáticos) y ≈1690 cm⁻¹ (conjugados).', factors: 'El monómero (fase gas o muy diluido) absorbe ≈1760 cm⁻¹. Los sustituyentes α-halogenados elevan la frecuencia.', sources: ['SWK', 'PLKV'] },
  { id: 'co-amide', bond: 'C=O (amida I)', bondFamily: 'C=O', group: 'Amida', groups: ['amida-primaria', 'amida-secundaria', 'amida-terciaria', 'lactama', 'urea'], hi: 1700, lo: 1630, vibration: 'tensión C=O (banda amida I)', intensity: 'muy fuerte', shape: 'media',
    explanation: 'La resonancia del par libre del nitrógeno con el carbonilo reduce el orden de enlace C=O: las amidas absorben por debajo de cetonas y ésteres.', factors: 'Estado sólido y puentes de hidrógeno la desplazan a valores bajos; γ-lactamas ≈1700 cm⁻¹.', sources: ['SWK', 'PLKV'] },
  // ---------- C=C y aromáticos ----------
  { id: 'cc-alkene', bond: 'C=C', bondFamily: 'C=C', group: 'Alqueno', groups: ['alqueno'], hi: 1680, lo: 1620, vibration: 'tensión C=C', intensity: 'variable (débil a media)', shape: 'aguda',
    explanation: 'Débil en alquenos casi simétricos; se intensifica cuando el C=C está conjugado con C=O (≈1640–1620 cm⁻¹).', sources: ['SWK', 'PLKV'] },
  { id: 'arom-ring1', bond: 'C=C aromático', bondFamily: 'C=C', group: 'Anillo aromático', groups: ['aromatico'], hi: 1620, lo: 1575, vibration: 'tensión del anillo (C=C)', intensity: 'variable', shape: 'aguda',
    explanation: 'Las vibraciones del esqueleto aromático dan bandas cerca de 1600 y 1580 cm⁻¹ (esta última más intensa si hay conjugación).', sources: ['SWK', 'PLKV'] },
  { id: 'arom-ring2', bond: 'C=C aromático', bondFamily: 'C=C', group: 'Anillo aromático', groups: ['aromatico'], hi: 1525, lo: 1450, vibration: 'tensión del anillo (C=C)', intensity: 'variable', shape: 'aguda',
    explanation: 'Segundo par de bandas del anillo (≈1500 y ≈1450 cm⁻¹); la de ≈1450 se solapa con la flexión de CH₂.', sources: ['SWK', 'PLKV'] },
  { id: 'arom-overtone', bond: 'Sobretonos aromáticos', bondFamily: 'C–H sp²', group: 'Anillo aromático (patrón de sustitución)', groups: ['aromatico'], hi: 2000, lo: 1665, vibration: 'sobretonos y combinaciones de flexiones C–H', intensity: 'débil', shape: 'aguda',
    explanation: 'Grupo de bandas débiles cuyo dibujo depende del patrón de sustitución del anillo.', sources: ['SWK', 'PLKV'] },
  { id: 'arom-oop', bond: 'C–H aromático (fuera del plano)', bondFamily: 'C–H sp²', group: 'Anillo aromático (sustitución)', groups: ['aromatico'], hi: 900, lo: 675, vibration: 'flexión C–H fuera del plano', intensity: 'fuerte', shape: 'aguda',
    explanation: 'Monosustituido ≈770–730 y ≈710–690; orto ≈770–735; meta ≈810–750 y ≈725–680; para ≈860–800 cm⁻¹ (orientativo).', sources: ['SWK', 'PLKV'] },
  { id: 'alkene-oop', bond: '=C–H (fuera del plano)', bondFamily: 'C–H sp²', group: 'Alqueno (sustitución)', groups: ['alqueno'], hi: 1000, lo: 650, vibration: 'flexión =C–H fuera del plano', intensity: 'fuerte', shape: 'aguda',
    explanation: 'Vinilo ≈990 y ≈910; vinilideno ≈890; trans ≈970; cis ≈730–665 cm⁻¹.', sources: ['SWK', 'PLKV'] },
  // ---------- C–O ----------
  { id: 'co-alcohol', bond: 'C–O', bondFamily: 'C–O', group: 'Alcohol', groups: ['alcohol'], hi: 1260, lo: 1000, vibration: 'tensión C–O', intensity: 'fuerte', shape: 'media',
    explanation: 'Orientativo: primario ≈1050, secundario ≈1100, terciario ≈1150 cm⁻¹. El acoplamiento con C–C hace que estas posiciones sean aproximadas.', sources: ['SWK', 'PLKV'] },
  { id: 'co-phenol', bond: 'C–O', bondFamily: 'C–O', group: 'Fenol', groups: ['fenol'], hi: 1260, lo: 1180, vibration: 'tensión C–O (arilo)', intensity: 'fuerte', shape: 'media',
    explanation: 'El carácter parcial de doble enlace C(arilo)–O sube la frecuencia respecto a los alcoholes alifáticos.', sources: ['SWK', 'PLKV'] },
  { id: 'co-ether', bond: 'C–O–C', bondFamily: 'C–O', group: 'Éter alifático', groups: ['eter'], hi: 1150, lo: 1070, vibration: 'tensión asimétrica C–O–C', intensity: 'fuerte', shape: 'media',
    explanation: 'En ausencia de O–H y C=O, una banda intensa ≈1120 cm⁻¹ es la principal pista de un éter.', sources: ['SWK', 'PLKV'] },
  { id: 'co-arylether', bond: 'C(arilo)–O–C', bondFamily: 'C–O', group: 'Éter aril-alquílico', groups: ['eter-aromatico'], hi: 1275, lo: 1200, vibration: 'tensión asimétrica C–O–C', intensity: 'fuerte', shape: 'media',
    explanation: 'Se acompaña de la tensión simétrica ≈1075–1020 cm⁻¹.', sources: ['SWK', 'PLKV'] },
  { id: 'co-ester-co', bond: 'C(=O)–O', bondFamily: 'C–O', group: 'Éster', groups: ['ester'], hi: 1300, lo: 1150, vibration: 'tensión C–C(=O)–O', intensity: 'muy fuerte', shape: 'media',
    explanation: 'Junto con el C=O forma el patrón de «tres bandas» de los ésteres; en acetatos aparece ≈1240 cm⁻¹ y en benzoatos ≈1280 cm⁻¹.', sources: ['SWK', 'PLKV'] },
  { id: 'co-ester-oc', bond: 'O–C(alquilo)', bondFamily: 'C–O', group: 'Éster', groups: ['ester'], hi: 1150, lo: 1000, vibration: 'tensión O–C–C', intensity: 'fuerte', shape: 'media',
    explanation: 'Segunda banda C–O del éster.', sources: ['SWK', 'PLKV'] },
  { id: 'co-acid-co', bond: 'C–O', bondFamily: 'C–O', group: 'Ácido carboxílico', groups: ['acido'], hi: 1320, lo: 1210, vibration: 'tensión C–O acoplada a flexión O–H', intensity: 'fuerte', shape: 'media',
    explanation: 'Apoya la asignación del ácido junto con la O–H ancha y el C=O.', sources: ['SWK', 'PLKV'] },
  // ---------- C–N, N–O ----------
  { id: 'cn-aliph', bond: 'C–N', bondFamily: 'C–N', group: 'Amina o amida alifática', groups: ['amina', 'amida-terciaria', 'amida-secundaria', 'amida-primaria'], hi: 1250, lo: 1020, vibration: 'tensión C–N', intensity: 'media', shape: 'media',
    explanation: 'Banda poco específica en la huella dactilar; sólo apoya otras evidencias.', sources: ['SWK', 'PLKV'] },
  { id: 'cn-arom', bond: 'C(arilo)–N', bondFamily: 'C–N', group: 'Amina o amida aromática', groups: ['amina', 'amida-secundaria'], hi: 1342, lo: 1250, vibration: 'tensión C–N', intensity: 'fuerte', shape: 'media',
    explanation: 'La conjugación con el anillo fortalece el enlace C–N.', sources: ['SWK'] },
  { id: 'no2-asym', bond: 'N–O (NO₂)', bondFamily: 'N–O', group: 'Nitrocompuesto', groups: ['nitro'], hi: 1560, lo: 1490, vibration: 'tensión N–O asimétrica', intensity: 'muy fuerte', shape: 'media',
    explanation: 'El grupo NO₂ da dos bandas intensas; ambas deben estar presentes para proponer un nitrocompuesto.', sources: ['SWK', 'PLKV'] },
  { id: 'no2-sym', bond: 'N–O (NO₂)', bondFamily: 'N–O', group: 'Nitrocompuesto', groups: ['nitro'], hi: 1385, lo: 1315, vibration: 'tensión N–O simétrica', intensity: 'fuerte', shape: 'media',
    explanation: 'Segunda banda del grupo nitro; en nitroarenos ≈1355–1315 cm⁻¹.', sources: ['SWK', 'PLKV'] },
  // ---------- C–X, S–H ----------
  { id: 'c-cl', bond: 'C–Cl', bondFamily: 'C–X', group: 'Cloruro orgánico', groups: ['halogenuro-cl'], hi: 850, lo: 550, vibration: 'tensión C–Cl', intensity: 'fuerte', shape: 'media',
    explanation: 'Región de baja energía, a menudo con varias bandas por confórmeros; poco diagnóstica por sí sola.', sources: ['SWK', 'PLKV'] },
  { id: 'c-br', bond: 'C–Br', bondFamily: 'C–X', group: 'Bromuro orgánico', groups: ['halogenuro-br'], hi: 690, lo: 515, vibration: 'tensión C–Br', intensity: 'fuerte', shape: 'media',
    explanation: 'El átomo pesado reduce la frecuencia de vibración (mayor masa reducida).', sources: ['SWK', 'PLKV'] },
  { id: 'c-f', bond: 'C–F', bondFamily: 'C–X', group: 'Fluoruro orgánico', groups: ['halogenuro-f'], hi: 1400, lo: 1000, vibration: 'tensión C–F', intensity: 'muy fuerte', shape: 'media',
    explanation: 'Bandas muy intensas que pueden dominar la región 1400–1000 cm⁻¹.', sources: ['SWK'] },
  { id: 's-h', bond: 'S–H', bondFamily: 'S–H', group: 'Tiol', groups: ['tiol'], hi: 2600, lo: 2550, vibration: 'tensión S–H', intensity: 'débil', shape: 'aguda',
    explanation: 'Débil pero en una región casi libre de otras absorciones.', sources: ['SWK', 'PLKV'] },
  // ---------- otras señales ----------
  { id: 'co2-atm', bond: 'CO₂ atmosférico', bondFamily: 'Otras', group: 'Artefacto instrumental (no pertenece a la muestra)', groups: [], hi: 2390, lo: 2290, vibration: 'tensión asimétrica O=C=O', intensity: 'variable', shape: 'doblete',
    explanation: 'Compensación imperfecta del CO₂ del aire; no debe asignarse a la muestra.', sources: ['SOC'] },
  { id: 'nujol', bond: 'C–H del Nujol', bondFamily: 'Otras', group: 'Aceite mineral de la suspensión (Nujol)', groups: [], hi: 2960, lo: 2850, vibration: 'tensión C–H', intensity: 'fuerte', shape: 'aguda',
    explanation: 'En suspensiones en Nujol, las bandas C–H (≈2950–2850, ≈1460 y ≈1377 cm⁻¹) proceden en gran parte del aceite y no informan sobre la muestra.', sources: ['SWK'] },
];

export const BOND_FAMILIES = ['O–H', 'N–H', 'C–H sp³', 'C–H sp²', 'C–H sp', 'C–H aldehído', 'C=O', 'C=C', 'C≡C', 'C≡N', 'C–O', 'C–N', 'N–O', 'C–X', 'S–H', 'Otras'];

/** Bandas cuyo intervalo contiene el número de onda dado. */
export function bandsAt(wn: number, margin = 0): ReferenceBand[] {
  return REFERENCE_BANDS.filter((b) => wn <= b.hi + margin && wn >= b.lo - margin);
}

export function sourceText(ids: string[]): string {
  return ids.map((i) => `[${i}] ${BAND_SOURCES[i] ?? i}`).join('; ');
}
