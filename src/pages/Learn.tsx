import { Link, useParams } from 'react-router-dom';
import { DecisionTree, HookeCalculator, RegionMap, TAConverter, VibrationDemo, WavelengthConverter } from '../features/learn/widgets';

interface Lesson {
  id: string;
  title: string;
  minutes: number;
  body: React.ReactNode;
}

const LESSONS: Lesson[] = [
  {
    id: 'numero-de-onda',
    title: 'Número de onda',
    minutes: 3,
    body: (
      <>
        <p>
          En espectroscopía IR la posición de una banda se expresa como número de onda, ṽ, en cm⁻¹: el número de ondas que caben en un centímetro. Es el inverso de la longitud de onda y es proporcional a la energía y a la frecuencia de la vibración.
        </p>
        <p>
          El IR medio que se usa para identificar grupos funcionales va de unos 4000 a 400 cm⁻¹. Por convención los espectros se dibujan con el número de onda <em>decreciente</em> de izquierda a derecha.
        </p>
        <WavelengthConverter />
        <p>
          Cada enlace se comporta, en primera aproximación, como un muelle: su número de onda depende de la fuerza del enlace y de las masas de los átomos. Por eso los enlaces con H aparecen a la izquierda (átomo muy ligero) y los triples a mayor número de onda que los dobles y simples.
        </p>
        <HookeCalculator />
      </>
    ),
  },
  {
    id: 'transmitancia',
    title: 'Transmitancia y absorbancia',
    minutes: 3,
    body: (
      <>
        <p>
          La transmitancia, T, es la fracción de radiación que atraviesa la muestra. Cuando una vibración absorbe, T baja: en un espectro de transmitancia las bandas son <strong>descensos</strong> de la curva. La absorbancia, A = −log₁₀ T, crece con la absorción: en un espectro de absorbancia las bandas son <strong>picos hacia arriba</strong>.
        </p>
        <TAConverter />
        <p>
          La biblioteca muestra los datos tal como están en la fuente. Si un archivo está en absorbancia, la aplicación no lo convierte a transmitancia sin decírselo: compruebe siempre la etiqueta del eje vertical.
        </p>
      </>
    ),
  },
  {
    id: 'vibraciones',
    title: 'Vibraciones de tensión y de flexión',
    minutes: 4,
    body: (
      <>
        <p>
          En una <strong>tensión</strong> (estiramiento) cambia la longitud del enlace; en una <strong>flexión</strong> cambia un ángulo. Las tensiones necesitan más energía, así que aparecen a mayor número de onda que las flexiones del mismo grupo.
        </p>
        <VibrationDemo />
        <p>
          Una vibración sólo absorbe en el IR si cambia el momento dipolar de la molécula. Por eso el C≡C de un alquino simétrico apenas se ve, y el C=O, muy polar, da una de las bandas más intensas del espectro. En el benceno, por su simetría, la banda del anillo cercana a 1600 cm⁻¹ prácticamente no aparece.
        </p>
      </>
    ),
  },
  {
    id: 'grupos-funcionales',
    title: 'Región de grupos funcionales',
    minutes: 4,
    body: (
      <>
        <p>
          Entre 4000 y 1500 cm⁻¹ las bandas suelen corresponder a enlaces concretos y se pueden asignar con bastante seguridad. Empiece siempre por aquí y hágase tres preguntas: ¿hay O–H o N–H? ¿Hay C–H por encima o sólo por debajo de 3000 cm⁻¹? ¿Hay un C=O?
        </p>
        <RegionMap />
        <p>
          Recuerde que los intervalos son orientativos. La conjugación baja la frecuencia del C=O (acetofenona ≈1685 cm⁻¹ frente a acetona ≈1715 cm⁻¹), la tensión de anillo la sube (ciclopentanona ≈1745 cm⁻¹) y los puentes de hidrógeno ensanchan y desplazan las bandas O–H.
        </p>
        <p>
          Compárelo usted mismo: <Link to="/comparar?ids=acetone,acetophenone,cyclopentanone">acetona, acetofenona y ciclopentanona</Link>.
        </p>
      </>
    ),
  },
  {
    id: 'huella',
    title: 'Región de huella dactilar',
    minutes: 3,
    body: (
      <>
        <p>
          Por debajo de unos 1500 cm⁻¹ aparecen muchas bandas debidas a flexiones y a vibraciones del esqueleto que se acoplan entre sí. Es difícil atribuir cada una a un enlace aislado, pero el conjunto es característico de cada molécula, como una huella dactilar.
        </p>
        <p>
          Es muy útil para <strong>comparar</strong>: dos compuestos con los mismos grupos funcionales tienen regiones de grupos parecidas y huellas distintas. Algunas bandas sí son informativas, como la C–O intensa de alcoholes, éteres y ésteres (1300–1000 cm⁻¹) o las flexiones C–H fuera del plano de los aromáticos (900–675 cm⁻¹), que dependen del patrón de sustitución.
        </p>
        <p>
          Pruébelo con <Link to="/comparar?ids=1-butanol,2-butanol,2-methyl-2-propanol">tres isómeros del butanol</Link> o con <Link to="/comparar?ids=o-xylene,m-xylene,p-xylene">los tres xilenos</Link>.
        </p>
      </>
    ),
  },
  {
    id: 'reconocer',
    title: 'Reconocimiento de grupos funcionales',
    minutes: 5,
    body: (
      <>
        <p>Un procedimiento sencillo, empezando por el carbonilo porque es la banda más fácil de ver:</p>
        <DecisionTree />
      </>
    ),
  },
  {
    id: 'conjunto',
    title: 'Interpretación conjunta de señales',
    minutes: 4,
    body: (
      <>
        <p>
          Una banda aislada rara vez basta. Un C=O a 1710 cm⁻¹ puede ser una cetona o un ácido; lo decide la presencia de la O–H muy ancha de 3300–2500 cm⁻¹. Un C=O a 1740 cm⁻¹ apunta a un éster sólo si además hay dos C–O intensas entre 1300 y 1000 cm⁻¹.
        </p>
        <ul>
          <li>
            <strong>Ácido carboxílico:</strong> O–H muy ancha + C=O ≈1710 + C–O ≈1300–1210 cm⁻¹. <Link to="/espectro/hexanoic-acid">Ácido hexanoico</Link>
          </li>
          <li>
            <strong>Éster:</strong> C=O ≈1740 + C(=O)–O ≈1240 + O–C ≈1050 cm⁻¹. <Link to="/espectro/ethyl-acetate">Acetato de etilo</Link>
          </li>
          <li>
            <strong>Amida primaria:</strong> dos N–H + C=O ≈1680 + N–H flexión ≈1620 cm⁻¹. <Link to="/espectro/acetamide">Acetamida</Link>
          </li>
          <li>
            <strong>Fenol:</strong> O–H ancha + anillo ≈1600/1500 + C–O ≈1230 cm⁻¹. <Link to="/espectro/phenol">Fenol</Link>
          </li>
        </ul>
        <p>
          También cuentan las <strong>ausencias</strong>: un espectro sin O–H, sin N–H y sin C=O descarta alcoholes, aminas, amidas, ácidos, ésteres y cetonas a la vez. Y tenga en cuenta la técnica de muestreo: en suspensión de Nujol las bandas C–H pertenecen en gran parte al aceite.
        </p>
      </>
    ),
  },
  {
    id: 'comparar',
    title: 'Comparación de espectros similares',
    minutes: 3,
    body: (
      <>
        <p>
          Para distinguir compuestos parecidos, compare primero la posición del C=O u O–H, después la intensidad relativa y, por último, la huella dactilar. Antes de sacar conclusiones compruebe que ambos espectros se registraron con la misma técnica (película líquida, disolución, pastilla de KBr) y en las mismas unidades.
        </p>
        <ul>
          <li>
            <Link to="/comparar?ids=1-butanol,butyric-acid">1-Butanol frente a ácido butírico</Link>: misma cadena, O–H muy distinta.
          </li>
          <li>
            <Link to="/comparar?ids=acetamide,n-methylacetamide,n-n-dimethylacetamide">Acetamida, N-metilacetamida y N,N-dimetilacetamida</Link>: dos, una y ninguna banda N–H.
          </li>
          <li>
            <Link to="/comparar?ids=methyl-acetate,vinyl-acetate">Acetato de metilo frente a acetato de vinilo</Link>: el C=O sube cuando el oxígeno del éster está unido a un C=C.
          </li>
        </ul>
      </>
    ),
  },
];

export default function Learn() {
  const { lesson } = useParams();
  const idx = LESSONS.findIndex((l) => l.id === lesson);
  const cur = idx >= 0 ? LESSONS[idx] : null;
  return (
    <div className="wrap learn">
      <div className="page-head">
        <h1>Aprender</h1>
        <p>Ocho lecciones breves para leer un espectro IR con criterio.</p>
      </div>
      <div className="learn-layout">
        <nav aria-label="Lecciones" className="lesson-nav">
          <ol>
            {LESSONS.map((l) => (
              <li key={l.id}>
                <Link to={`/aprender/${l.id}`} className={cur?.id === l.id ? 'on' : ''} aria-current={cur?.id === l.id ? 'page' : undefined}>
                  {l.title}
                  <span className="small muted"> · {l.minutes} min</span>
                </Link>
              </li>
            ))}
          </ol>
        </nav>
        <article className="lesson">
          {cur ? (
            <>
              <h2>{cur.title}</h2>
              {cur.body}
              <div className="row lesson-pager">
                {idx > 0 && (
                  <Link className="btn quiet" to={`/aprender/${LESSONS[idx - 1].id}`}>
                    Anterior: {LESSONS[idx - 1].title}
                  </Link>
                )}
                <span className="spacer" />
                {idx < LESSONS.length - 1 ? (
                  <Link className="btn" to={`/aprender/${LESSONS[idx + 1].id}`}>
                    Siguiente: {LESSONS[idx + 1].title}
                  </Link>
                ) : (
                  <Link className="btn" to="/actividades">
                    Ponerse a prueba
                  </Link>
                )}
              </div>
            </>
          ) : (
            <>
              <h2>Antes de empezar</h2>
              <p>Cada lección dura unos minutos e incluye un ejemplo o un pequeño cálculo interactivo. Puede seguirlas en orden o ir directamente a la que necesite.</p>
              <Link className="btn" to={`/aprender/${LESSONS[0].id}`}>
                Empezar por «{LESSONS[0].title}»
              </Link>
            </>
          )}
        </article>
      </div>
    </div>
  );
}
