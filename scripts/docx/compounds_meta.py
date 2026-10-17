# Metadatos químicos por índice de imagen del Word (orden del documento).
# formula: leída en la casilla de fórmula de cada impresión SDBS (verificada con la estructura).
# Campos: idx | name (SDBS) | nameEs | synonyms (;) | formula | primary | categories (,) | groups (,) | flags (,)
ROWS = r"""
0|Methanol|Metanol|alcohol metílico;carbinol|CH4O|alcoholes|alcoholes|alcohol|tiene-ch-sp3
1|2-Chloroethanol|2-Cloroetanol|etilenclorhidrina;2-CLOROETANOL|C2H5ClO|alcoholes|alcoholes,halogenuros|alcohol,halogenuro-cl|tiene-ch-sp3
2|1-Propanol|1-Propanol|propan-1-ol;alcohol propílico;n-propanol|C3H8O|alcoholes|alcoholes|alcohol|tiene-ch-sp3
3|2-Propanol|2-Propanol|isopropanol;alcohol isopropílico;propan-2-ol|C3H8O|alcoholes|alcoholes|alcohol|tiene-ch-sp3
4|1-Butanol|1-Butanol|butan-1-ol;n-butanol;alcohol butílico|C4H10O|alcoholes|alcoholes|alcohol|tiene-ch-sp3
5|2-Butanol|2-Butanol|butan-2-ol;sec-butanol|C4H10O|alcoholes|alcoholes|alcohol|tiene-ch-sp3
6|2-Methyl-1-propanol|2-Metil-1-propanol|isobutanol;alcohol isobutílico;2-metil-1-propanol|C4H10O|alcoholes|alcoholes|alcohol|tiene-ch-sp3
7|2-Methyl-2-propanol|2-Metil-2-propanol|terc-butanol;tert-butanol;alcohol terc-butílico;2-metil-2-propanol|C4H10O|alcoholes|alcoholes|alcohol|tiene-ch-sp3
8|1-Pentanol|1-Pentanol|pentan-1-ol;alcohol amílico|C5H12O|alcoholes|alcoholes|alcohol|tiene-ch-sp3,cadena-larga
9|3-Methyl-1-pentanol|3-Metil-1-pentanol|3-metilpentan-1-ol|C6H14O|alcoholes|alcoholes|alcohol|tiene-ch-sp3
10|3-Methyl-1-hexanol|3-Metil-1-hexanol|3-metilhexan-1-ol;3-metil-1-hexanol|C7H16O|alcoholes|alcoholes|alcohol|tiene-ch-sp3
11|2-Methyl-1-pentanol|2-Metil-1-pentanol|2-metilpentan-1-ol;2-metil-1-pentanol|C6H14O|alcoholes|alcoholes|alcohol|tiene-ch-sp3
12|Cyclohexanol|Ciclohexanol|hexahidrofenol|C6H12O|alcoholes|alcoholes|alcohol|tiene-ch-sp3
13|1-Heptanol|1-Heptanol|heptan-1-ol;alcohol heptílico|C7H16O|alcoholes|alcoholes|alcohol|tiene-ch-sp3,cadena-larga
14|1-Octanol|1-Octanol|octan-1-ol;alcohol octílico;alcohol caprílico|C8H18O|alcoholes|alcoholes|alcohol|tiene-ch-sp3,cadena-larga
15|2-Octanol|2-Octanol|octan-2-ol;alcohol caprílico secundario|C8H18O|alcoholes|alcoholes|alcohol|tiene-ch-sp3,cadena-larga
16|1-Decanol|1-Decanol|decan-1-ol;alcohol decílico|C10H22O|alcoholes|alcoholes|alcohol|tiene-ch-sp3,cadena-larga
17|Cyclopentanol|Ciclopentanol|ciclopentil alcohol|C5H10O|alcoholes|alcoholes|alcohol|tiene-ch-sp3
18|Allyl alcohol|Alcohol alílico|prop-2-en-1-ol;2-propen-1-ol|C3H6O|alcoholes|alcoholes,alquenos|alcohol,alqueno|tiene-ch-sp3
19|1-Methylcyclopentanol|1-Metilciclopentanol|1-metilciclopentan-1-ol;1-metilciclopentanol|C6H12O|alcoholes|alcoholes|alcohol|tiene-ch-sp3
20|Phenol|Fenol|hidroxibenceno;ácido carbólico|C6H6O|fenoles|fenoles,aromaticos|fenol,aromatico|
21|o-Cresol|o-Cresol|2-metilfenol|C7H8O|fenoles|fenoles,aromaticos|fenol,aromatico|tiene-ch-sp3
22|m-Cresol|m-Cresol|3-metilfenol|C7H8O|fenoles|fenoles,aromaticos|fenol,aromatico|tiene-ch-sp3
23|p-Cresol|p-Cresol|4-metilfenol|C7H8O|fenoles|fenoles,aromaticos|fenol,aromatico|tiene-ch-sp3
24|4-Bromo-2-chlorophenol|4-Bromo-2-clorofenol|4-bromo-2-clorofenol|C6H4BrClO|fenoles|fenoles,aromaticos,halogenuros|fenol,aromatico,halogenuro-cl,halogenuro-br|
25|2-Nitro-p-cresol|2-Nitro-p-cresol|4-metil-2-nitrofenol;2-nitro-p-cresol|C7H7NO3|fenoles|fenoles,aromaticos,nitrocompuestos|fenol,aromatico,nitro|tiene-ch-sp3,puente-h-intramolecular
26|4-Chloro-2-nitrophenol|4-Cloro-2-nitrofenol|4-cloro-2-nitrofenol|C6H4ClNO3|fenoles|fenoles,aromaticos,nitrocompuestos,halogenuros|fenol,aromatico,nitro,halogenuro-cl|puente-h-intramolecular
27|2-Methyl-1-naphthol|2-Metil-1-naftol|2-metilnaftalen-1-ol;2-metil-1-naftol|C11H10O|fenoles|fenoles,aromaticos|fenol,aromatico|tiene-ch-sp3
28|Pyrocatechol|Catecol|catechol;pirocatecol;1,2-bencenodiol;1,2-dihidroxibenceno|C6H6O2|fenoles|fenoles,aromaticos|fenol,aromatico|
29|Resorcinol|Resorcinol|1,3-bencenodiol;1,3-dihidroxibenceno|C6H6O2|fenoles|fenoles,aromaticos|fenol,aromatico|
30|Hydroquinone|Hidroquinona|1,4-bencenodiol;1,4-dihidroxibenceno|C6H6O2|fenoles|fenoles,aromaticos|fenol,aromatico|
31|2,4-Xylenol|2,4-Dimetilfenol|2,4-Dimethylphenol;2,4-xilenol|C8H10O|fenoles|fenoles,aromaticos|fenol,aromatico|tiene-ch-sp3
32|2,6-Xylenol|2,6-Dimetilfenol|2,6-Dimethylphenol;2,6-xilenol|C8H10O|fenoles|fenoles,aromaticos|fenol,aromatico|tiene-ch-sp3
33|2-tert-Butyl-4-ethylphenol|2-terc-Butil-4-etilfenol|2-terc-butil-4-etilfenol|C12H18O|fenoles|fenoles,aromaticos|fenol,aromatico|tiene-ch-sp3
34|1-Naphthol|1-Naftol|α-naftol;naftalen-1-ol|C10H8O|fenoles|fenoles,aromaticos|fenol,aromatico|
35|2-Naphthol|2-Naftol|β-naftol;naftalen-2-ol|C10H8O|fenoles|fenoles,aromaticos|fenol,aromatico|
36|Thymol|Timol|2-isopropil-5-metilfenol|C10H14O|fenoles|fenoles,aromaticos|fenol,aromatico|tiene-ch-sp3
37|Eugenol|Eugenol|4-alil-2-metoxifenol|C10H12O2|fenoles|fenoles,aromaticos,eteres,alquenos|fenol,aromatico,eter-aromatico,alqueno|tiene-ch-sp3
38|Guaiacol|Guayacol|2-metoxifenol;guaiacol|C7H8O2|fenoles|fenoles,aromaticos,eteres|fenol,aromatico,eter-aromatico|tiene-ch-sp3,puente-h-intramolecular
39|4-Bromo-2,6-xylenol|4-Bromo-2,6-dimetilfenol|4-bromo-2,6-xilenol|C8H9BrO|fenoles|fenoles,aromaticos,halogenuros|fenol,aromatico,halogenuro-br|tiene-ch-sp3
40|Formic acid|Ácido fórmico|ácido metanoico|CH2O2|acidos-carboxilicos|acidos-carboxilicos|acido|
41|Acetic acid|Ácido acético|ácido etanoico|C2H4O2|acidos-carboxilicos|acidos-carboxilicos|acido|tiene-ch-sp3
42|Propionic acid|Ácido propiónico|ácido propanoico|C3H6O2|acidos-carboxilicos|acidos-carboxilicos|acido|tiene-ch-sp3
43|Butyric acid|Ácido butírico|ácido butanoico|C4H8O2|acidos-carboxilicos|acidos-carboxilicos|acido|tiene-ch-sp3
44|Isobutyric acid|Ácido isobutírico|ácido 2-metilpropanoico|C4H8O2|acidos-carboxilicos|acidos-carboxilicos|acido|tiene-ch-sp3
45|Valeric acid|Ácido valérico|ácido pentanoico|C5H10O2|acidos-carboxilicos|acidos-carboxilicos|acido|tiene-ch-sp3
46|Isovaleric acid|Ácido isovalérico|ácido 3-metilbutanoico|C5H10O2|acidos-carboxilicos|acidos-carboxilicos|acido|tiene-ch-sp3
47|Hexanoic acid|Ácido hexanoico|ácido caproico|C6H12O2|acidos-carboxilicos|acidos-carboxilicos|acido|tiene-ch-sp3,cadena-larga
48|Heptanoic acid|Ácido heptanoico|ácido enántico|C7H14O2|acidos-carboxilicos|acidos-carboxilicos|acido|tiene-ch-sp3,cadena-larga
49|2-Methylhexanoic acid|Ácido 2-metilhexanoico|ácido 2-metilhexanoico|C7H14O2|acidos-carboxilicos|acidos-carboxilicos|acido|tiene-ch-sp3
50|Octanoic acid|Ácido octanoico|ácido caprílico|C8H16O2|acidos-carboxilicos|acidos-carboxilicos|acido|tiene-ch-sp3,cadena-larga
51|Nonanoic acid|Ácido nonanoico|ácido pelargónico|C9H18O2|acidos-carboxilicos|acidos-carboxilicos|acido|tiene-ch-sp3,cadena-larga
52|Decanoic acid|Ácido decanoico|ácido cáprico|C10H20O2|acidos-carboxilicos|acidos-carboxilicos|acido|tiene-ch-sp3,cadena-larga
53|Benzoic acid|Ácido benzoico|ácido bencenocarboxílico|C7H6O2|acidos-carboxilicos|acidos-carboxilicos,aromaticos|acido,aromatico|carbonilo-conjugado
54|Acrylic acid|Ácido acrílico|ácido propenoico|C3H4O2|acidos-carboxilicos|acidos-carboxilicos,alquenos|acido,alqueno|carbonilo-conjugado
55|Methacrylic acid|Ácido metacrílico|ácido 2-metilpropenoico|C4H6O2|acidos-carboxilicos|acidos-carboxilicos,alquenos|acido,alqueno|tiene-ch-sp3,carbonilo-conjugado
56|Chloroacetic acid|Ácido cloroacético|ácido monocloroacético|C2H3ClO2|acidos-carboxilicos|acidos-carboxilicos,halogenuros|acido,halogenuro-cl|tiene-ch-sp3,alfa-halo
57|Trichloroacetic acid|Ácido tricloroacético|TCA|C2HCl3O2|acidos-carboxilicos|acidos-carboxilicos,halogenuros|acido,halogenuro-cl|alfa-halo
58|Cyclohexanecarboxylic acid|Ácido ciclohexanocarboxílico|ácido hexahidrobenzoico|C7H12O2|acidos-carboxilicos|acidos-carboxilicos|acido|tiene-ch-sp3
59|p-Toluic acid|Ácido p-toluico|ácido 4-metilbenzoico|C8H8O2|acidos-carboxilicos|acidos-carboxilicos,aromaticos|acido,aromatico|tiene-ch-sp3,carbonilo-conjugado
60|Acetone|Acetona|propanona;dimetilcetona|C3H6O|cetonas|cetonas|cetona|tiene-ch-sp3
61|2-Butanone|2-Butanona|metiletilcetona;MEK;butanona|C4H8O|cetonas|cetonas|cetona|tiene-ch-sp3
62|2-Pentanone|2-Pentanona|metilpropilcetona;pentan-2-ona|C5H10O|cetonas|cetonas|cetona|tiene-ch-sp3
63|3-Pentanone|3-Pentanona|dietilcetona;pentan-3-ona|C5H10O|cetonas|cetonas|cetona|tiene-ch-sp3
64|2-Hexanone|2-Hexanona|metilbutilcetona;hexan-2-ona|C6H12O|cetonas|cetonas|cetona|tiene-ch-sp3
65|3-Hexanone|3-Hexanona|etilpropilcetona;hexan-3-ona|C6H12O|cetonas|cetonas|cetona|tiene-ch-sp3
66|2-Heptanone|2-Heptanona|metilpentilcetona;heptan-2-ona|C7H14O|cetonas|cetonas|cetona|tiene-ch-sp3,cadena-larga
67|4-Heptanone|4-Heptanona|dipropilcetona;heptan-4-ona|C7H14O|cetonas|cetonas|cetona|tiene-ch-sp3
68|2-Octanone|2-Octanona|metilhexilcetona;octan-2-ona|C8H16O|cetonas|cetonas|cetona|tiene-ch-sp3,cadena-larga
69|Cyclopentanone|Ciclopentanona|ciclopentanona|C5H8O|cetonas|cetonas|cetona|tiene-ch-sp3,anillo-5
70|Cyclohexanone|Ciclohexanona|ciclohexanona|C6H10O|cetonas|cetonas|cetona|tiene-ch-sp3
71|Cycloheptanone|Cicloheptanona|suberona|C7H12O|cetonas|cetonas|cetona|tiene-ch-sp3
72|Acetophenone|Acetofenona|metilfenilcetona;1-feniletanona|C8H8O|cetonas|cetonas,aromaticos|cetona,aromatico|tiene-ch-sp3,carbonilo-conjugado
73|Benzophenone|Benzofenona|difenilcetona;difenilmetanona|C13H10O|cetonas|cetonas,aromaticos|cetona,aromatico|carbonilo-conjugado
74|3-Methyl-2-butanone|3-Metil-2-butanona|metilisopropilcetona|C5H10O|cetonas|cetonas|cetona|tiene-ch-sp3
75|4-Methylbenzophenone|4-Metilbenzofenona|4-metilbenzofenona|C14H12O|cetonas|cetonas,aromaticos|cetona,aromatico|tiene-ch-sp3,carbonilo-conjugado
76|2,4-Pentanedione|2,4-Pentanodiona|acetilacetona|C5H8O2|cetonas|cetonas|cetona|tiene-ch-sp3,beta-dicetona
77|3-Buten-2-one|3-Buten-2-ona|Methyl vinyl ketone;metilvinilcetona|C4H6O|cetonas|cetonas,alquenos|cetona,alqueno|tiene-ch-sp3,carbonilo-conjugado
78|Propiophenone|Propiofenona|etilfenilcetona;1-fenilpropan-1-ona|C9H10O|cetonas|cetonas,aromaticos|cetona,aromatico|tiene-ch-sp3,carbonilo-conjugado
79|3-Methyl-2-hexanone|3-Metil-2-hexanona|3-metil-2-hexanona|C7H14O|cetonas|cetonas|cetona|tiene-ch-sp3
80|Methyl formate|Formiato de metilo|metanoato de metilo|C2H4O2|esteres|esteres|ester|tiene-ch-sp3
82|Methyl acetate|Acetato de metilo|etanoato de metilo|C3H6O2|esteres|esteres|ester|tiene-ch-sp3
83|Ethyl acetate|Acetato de etilo|etanoato de etilo|C4H8O2|esteres|esteres|ester|tiene-ch-sp3
84|Propyl acetate|Acetato de propilo|etanoato de propilo|C5H10O2|esteres|esteres|ester|tiene-ch-sp3
85|Isopropyl acetate|Acetato de isopropilo|etanoato de isopropilo|C5H10O2|esteres|esteres|ester|tiene-ch-sp3
86|Butyl acetate|Acetato de butilo|etanoato de butilo|C6H12O2|esteres|esteres|ester|tiene-ch-sp3
87|Methyl propionate|Propanoato de metilo|propionato de metilo|C4H8O2|esteres|esteres|ester|tiene-ch-sp3
88|Methyl butyrate|Butanoato de metilo|butirato de metilo|C5H10O2|esteres|esteres|ester|tiene-ch-sp3
89|Ethyl butyrate|Butanoato de etilo|butirato de etilo|C6H12O2|esteres|esteres|ester|tiene-ch-sp3
90|Methyl benzoate|Benzoato de metilo|benzoato de metilo|C8H8O2|esteres|esteres,aromaticos|ester,aromatico|tiene-ch-sp3,carbonilo-conjugado
91|Ethyl benzoate|Benzoato de etilo|benzoato de etilo|C9H10O2|esteres|esteres,aromaticos|ester,aromatico|tiene-ch-sp3,carbonilo-conjugado
92|Methyl acrylate|Acrilato de metilo|propenoato de metilo|C4H6O2|esteres|esteres,alquenos|ester,alqueno|tiene-ch-sp3,carbonilo-conjugado
93|Methyl methacrylate|Metacrilato de metilo|MMA;2-metilpropenoato de metilo|C5H8O2|esteres|esteres,alquenos|ester,alqueno|tiene-ch-sp3,carbonilo-conjugado
94|Vinyl acetate|Acetato de vinilo|etanoato de etenilo|C4H6O2|esteres|esteres,alquenos|ester,alqueno|tiene-ch-sp3,ester-vinilico
95|Diethyl phthalate|Ftalato de dietilo|1,2-bencenodicarboxilato de dietilo|C12H14O4|esteres|esteres,aromaticos|ester,aromatico|tiene-ch-sp3,carbonilo-conjugado
96|Ethyl hexanoate|Hexanoato de etilo|caproato de etilo|C8H16O2|esteres|esteres|ester|tiene-ch-sp3,cadena-larga
97|Benzyl acetate|Acetato de bencilo|etanoato de bencilo|C9H10O2|esteres|esteres,aromaticos|ester,aromatico|tiene-ch-sp3
98|Formamide|Formamida|metanamida|CH3NO|amidas|amidas|amida-primaria|
99|Acetamide|Acetamida|etanamida|C2H5NO|amidas|amidas|amida-primaria|tiene-ch-sp3
100|Propionamide|Propanamida|propionamida|C3H7NO|amidas|amidas|amida-primaria|tiene-ch-sp3
101|Butyramide|Butanamida|butiramida|C4H9NO|amidas|amidas|amida-primaria|tiene-ch-sp3
102|Hexanamide|Hexanamida|caproamida|C6H13NO|amidas|amidas|amida-primaria|tiene-ch-sp3,cadena-larga
103|Benzamide|Benzamida|bencenocarboxamida|C7H7NO|amidas|amidas,aromaticos|amida-primaria,aromatico|
104|N-Methylformamide|N-Metilformamida|NMF|C2H5NO|amidas|amidas|amida-secundaria|tiene-ch-sp3
105|N,N-Dimethylformamide|N,N-Dimetilformamida|DMF;dimetilformamida|C3H7NO|amidas|amidas|amida-terciaria|tiene-ch-sp3
106|N-Methylacetamide|N-Metilacetamida|NMA|C3H7NO|amidas|amidas|amida-secundaria|tiene-ch-sp3
107|N,N-Dimethylacetamide|N,N-Dimetilacetamida|DMAc;dimetilacetamida|C4H9NO|amidas|amidas|amida-terciaria|tiene-ch-sp3
108|Acetanilide|Acetanilida|N-fenilacetamida|C8H9NO|amidas|amidas,aromaticos|amida-secundaria,aromatico|tiene-ch-sp3
109|Urea|Urea|carbamida|CH4N2O|amidas|amidas|urea|
110|2-Pyrrolidone|2-Pirrolidona|γ-butirolactama;pirrolidin-2-ona|C4H7NO|amidas|amidas|lactama|tiene-ch-sp3
111|6-Hexanelactam|ε-Caprolactama|caprolactama;6-hexanolactama;azepan-2-ona|C6H11NO|amidas|amidas|lactama|tiene-ch-sp3
112|N-Methylnicotinamide|N-Metilnicotinamida|N-Methylnicitinamide;N-metilpiridina-3-carboxamida|C7H8N2O|amidas|amidas,aromaticos|amida-secundaria,aromatico|tiene-ch-sp3
113|Nicotinamide|Nicotinamida|niacinamida;piridina-3-carboxamida|C6H6N2O|amidas|amidas,aromaticos|amida-primaria,aromatico|
114|Salicylamide|Salicilamida|2-hidroxibenzamida|C7H7NO2|amidas|amidas,aromaticos,fenoles|amida-primaria,aromatico,fenol|puente-h-intramolecular
115|4'-Hydroxyacetanilide|4'-Hidroxiacetanilida|Acetaminophen;paracetamol;acetaminofén;N-(4-hidroxifenil)acetamida|C8H9NO2|amidas|amidas,aromaticos,fenoles|amida-secundaria,aromatico,fenol|tiene-ch-sp3
116|Isobutyramide|Isobutiramida|2-metilpropanamida|C4H9NO|amidas|amidas|amida-primaria|tiene-ch-sp3
117|Valeramide|Pentanamida|valeramida|C5H11NO|amidas|amidas|amida-primaria|tiene-ch-sp3
118|Benzene|Benceno|benzol|C6H6|aromaticos|aromaticos|aromatico|
119|Toluene|Tolueno|metilbenceno|C7H8|aromaticos|aromaticos|aromatico|tiene-ch-sp3
120|o-Xylene|o-Xileno|1,2-dimetilbenceno|C8H10|aromaticos|aromaticos|aromatico|tiene-ch-sp3
121|m-Xylene|m-Xileno|1,3-dimetilbenceno|C8H10|aromaticos|aromaticos|aromatico|tiene-ch-sp3
122|p-Xylene|p-Xileno|1,4-dimetilbenceno|C8H10|aromaticos|aromaticos|aromatico|tiene-ch-sp3
123|Pentane|Pentano|n-pentano|C5H12|alcanos|alcanos|alcano|tiene-ch-sp3
124|Isopentane|Isopentano|2-metilbutano|C5H12|alcanos|alcanos|alcano|tiene-ch-sp3
125|2-Methylpentane|2-Metilpentano|isohexano|C6H14|alcanos|alcanos|alcano|tiene-ch-sp3
126|Hexane|Hexano|n-hexano|C6H14|alcanos|alcanos|alcano|tiene-ch-sp3,cadena-larga
127|3-Methylpentane|3-Metilpentano|3-metilpentano|C6H14|alcanos|alcanos|alcano|tiene-ch-sp3
128|2,2-Dimethylbutane|2,2-Dimetilbutano|neohexano|C6H14|alcanos|alcanos|alcano|tiene-ch-sp3
129|2,3-Dimethylbutane|2,3-Dimetilbutano|diisopropilo|C6H14|alcanos|alcanos|alcano|tiene-ch-sp3
130|Heptane|Heptano|n-heptano|C7H16|alcanos|alcanos|alcano|tiene-ch-sp3,cadena-larga
131|2-Methylhexane|2-Metilhexano|isoheptano|C7H16|alcanos|alcanos|alcano|tiene-ch-sp3
132|3-Methylhexane|3-Metilhexano|3-metilhexano|C7H16|alcanos|alcanos|alcano|tiene-ch-sp3
133|Octane|Octano|n-octano|C8H18|alcanos|alcanos|alcano|tiene-ch-sp3,cadena-larga
134|Diethyl ether|Éter dietílico|etoxietano;éter etílico|C4H10O|eteres|eteres|eter|tiene-ch-sp3
135|Dipropyl ether|Éter dipropílico|1-propoxipropano|C6H14O|eteres|eteres|eter|tiene-ch-sp3
136|Diisopropyl ether|Éter diisopropílico|2-isopropoxipropano|C6H14O|eteres|eteres|eter|tiene-ch-sp3
137|Butyl ether|Éter dibutílico|Dibutyl ether;1-butoxibutano|C8H18O|eteres|eteres|eter|tiene-ch-sp3
138|Tetrahydrofuran|Tetrahidrofurano|THF;oxolano|C4H8O|eteres|eteres|eter|tiene-ch-sp3
139|1,4-Dioxane|1,4-Dioxano|dioxano|C4H8O2|eteres|eteres|eter|tiene-ch-sp3
140|Tetrahydropyran|Tetrahidropirano|oxano;THP|C5H10O|eteres|eteres|eter|tiene-ch-sp3
"""


def rows():
    out = {}
    for line in ROWS.strip().splitlines():
        p = line.split('|')
        idx = int(p[0])
        out[idx] = {
            'name': p[1], 'nameEs': p[2], 'synonyms': [s for s in p[3].split(';') if s],
            'formula': p[4], 'primaryCategory': p[5], 'categories': p[6].split(','),
            'functionalGroups': p[7].split(','), 'flags': [f for f in p[8].split(',') if f],
        }
    return out
