import katex from 'katex'
import 'katex/dist/katex.min.css'
import { BackButton, PageHeader } from '@/components/ui'
import { IRIS_SPECIES } from '@/ai/data/iris'
import { ConvSlide, ForwardBackward, Gaussian2D, IrisPca, Legend, LinearMap, OptimizerRace, XorSurface } from '@/ai/three/scenes'

const IRIS_LEGEND: [string, 'ink' | 'info' | 'accent'][] = IRIS_SPECIES.map((s, i) => [s, (['ink', 'info', 'accent'] as const)[i]])
import { OPTIMIZERS } from '@/ai/engine/optim'

function Tex({ src }: { src: string }) {
  // Wide formulas scroll sideways on phones, so the block can take focus for keyboard scrolling.
  return <span className="block overflow-x-auto py-1 text-text-primary" tabIndex={0} role="group" aria-label="Formula" dangerouslySetInnerHTML={{ __html: katex.renderToString(src, { displayMode: true, throwOnError: false, strict: false }) }} />
}

const SECTIONS = [
  {
    id: 'optimisers',
    topic: 'Math for AI · Optimisation',
    title: 'Three optimisers on one loss surface',
    text: 'The same start, the same surface, three update rules. Plain gradient descent zig-zags across a narrow valley; momentum builds speed along it; Adam rescales each direction. Pick a surface, press Play, then drag to look from the side.',
    tex: OPTIMIZERS.map((o) => `\\text{${o.name}:}\\;${o.tex}`).join(' \\\\[4pt] '),
    Scene: OptimizerRace,
  },
  {
    id: 'linear-map',
    topic: 'Math for AI · Eigenvalues and eigenvectors',
    title: 'A matrix bending space',
    text: 'A matrix moves every point of space. Play it from the identity to the matrix: the lattice shears and stretches, the unit sphere becomes an ellipsoid, and the eigenvectors (dashed lines) are the only directions that stay on their own line.',
    tex: 'A\\mathbf v = \\lambda\\mathbf v',
    Scene: LinearMap,
  },
  {
    id: 'xor',
    topic: 'Deep Learning · The multilayer perceptron',
    title: 'A network learning XOR',
    text: 'One straight boundary cannot separate XOR. A small network bends its output surface instead. Play the training: every surface is the real network after that many epochs, trained here in your browser.',
    tex: '\\hat y = \\sigma\\!\\left(\\mathbf w_2^{\\top}\\tanh(W_1\\mathbf x + \\mathbf b_1) + b_2\\right)',
    Scene: XorSurface,
  },
  {
    id: 'backprop',
    topic: 'Deep Learning · Backpropagation',
    title: 'One example, forward then backward',
    text: 'Step through one example: values flow forward to a prediction and a loss, then gradients flow back to every weight. The numbers under each step are the real ones for this network.',
    tex: '\\frac{\\partial L}{\\partial W_1} = \\Big(\\big(\\mathbf w_2\\,(\\hat y - y)\\big) \\odot (1 - \\mathbf a_1^{2})\\Big)\\,\\mathbf x^{\\top}',
    Scene: ForwardBackward,
  },
  {
    id: 'convolution',
    topic: 'Deep Learning · Convolution',
    title: 'Filters sliding over an image',
    text: 'A 3 × 3 window slides over a drawn 7. At each position, each filter multiplies the window cell by cell and adds it up; that one number becomes one cell of its feature map. Vertical strokes light up one map, horizontal strokes the other.',
    tex: '(I * K)_{ij} = \\sum_{a=0}^{2}\\sum_{b=0}^{2} I_{i+a,\\,j+b}\\,K_{ab}',
    Scene: ConvSlide,
  },
  {
    id: 'pca',
    topic: 'Machine Learning · Principal component analysis',
    title: 'Real data in its best three directions',
    text: 'Four measurements of 150 real flowers can’t be drawn directly. PCA finds the three directions with the most spread. Watch the view turn from three raw measurements to those directions, then drag it around to see how the species separate.',
    tex: '\\mathbf z = V_3^{\\top}(\\mathbf x - \\boldsymbol\\mu), \\quad \\Sigma = V\\Lambda V^{\\top}',
    Scene: IrisPca,
    legend: IRIS_LEGEND,
  },
  {
    id: 'gaussian',
    topic: 'Math for AI · The multivariate Gaussian',
    title: 'A Gaussian and its covariance',
    text: 'The covariance matrix decides the shape of the bell. As the correlation grows, the bell narrows and tilts; its eigenvectors turn to point along the axes of the contour ellipses, and the square roots of its eigenvalues set their lengths.',
    tex: 'p(\\mathbf x) = \\frac{1}{2\\pi\\sqrt{\\det\\Sigma}}\\exp\\!\\Big(-\\tfrac12\\,\\mathbf x^{\\top}\\Sigma^{-1}\\mathbf x\\Big)',
    Scene: Gaussian2D,
  },
]

/**
 * 3D lab: the first scenes of the AI courses' animation engine, each one a
 * real computation you can turn, zoom and step through. A preview for the
 * team; the courses will use the same scenes inside their lessons.
 */
export default function AiLabPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      <BackButton />
      <PageHeader eyebrow="AI courses · engine preview" title="3D lab" subtitle="Every scene is computed live in your browser. Drag to turn, scroll or pinch to zoom, and step through it." />
      <nav aria-label="Scenes on this page" className="flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
        {SECTIONS.map((s) => (
          <a key={s.id} href={`#${s.id}`} className="text-text-secondary underline-offset-[3px] hover:text-text-primary hover:underline">
            {s.title}
          </a>
        ))}
      </nav>
      {SECTIONS.map((s) => (
        <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`} className="space-y-3 border-t border-border pt-6">
          <p className="m-0 text-[11px] font-semibold tracking-wider text-text-muted uppercase">{s.topic}</p>
          <h2 id={`${s.id}-h`} className="m-0 text-xl font-semibold text-text-primary">
            {s.title}
          </h2>
          <p className="m-0 max-w-3xl text-[15px] leading-relaxed text-text-secondary">{s.text}</p>
          <Tex src={s.tex} />
          <s.Scene />
          {s.legend && <Legend items={s.legend} />}
        </section>
      ))}
    </div>
  )
}
