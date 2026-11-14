import { Check as Tick } from 'lucide-react'
import { Badge, Menu, Popover, Roll, Stage, Window, type Act } from '../../../vendor/stageshow/kit'
import './seguimiento.css'

// DEMOSTRACIÓN SIMULADA. Basada en el ejemplo «table-edit» de Stageshow
// (Benji Taylor, MIT): mismo escenario, recorte, filas y edición en sitio.
// Nada de esta escena lee ni escribe contactos reales: los datos son
// ficticios y los clics son dibujos del guion (`a.click()` dibuja el cursor,
// `a.set()` cambia la escena).
//
// Historia: en la lista de posibles clientes, la persona abre el estado de una
// floristería, elige «Interesado» y el contador de interesados sube un instante
// después; luego escribe la fecha de seguimiento en su celda y la confirma.
//
// Lo que se conserva del ejemplo de partida:
// - La celda editada no se mueve al convertirse en campo: el anillo se dibuja
//   dentro y el texto queda en su sitio.
// - El efecto llega después de la causa: el contador rueda con `delay`.
// - Un único destello en la celda confirmada, sin aviso flotante: la tabla
//   es la confirmación.
//
// Textos reales: título, la fila protagonista, los estados y el contador.

type S = {
  menu: boolean
  hover: number | undefined
  status: string
  wash: 'status' | 'date' | null
  edit: boolean
  date: string
  committed: string
}

const STATES = ['Nuevo', 'Contactado', 'Interesado', 'Cliente', 'Descartado']
const TONES: Record<string, 'neutral' | 'accent' | 'success' | 'danger' | 'warning'> = {
  Nuevo: 'neutral', Contactado: 'neutral', Interesado: 'accent', Cliente: 'success', Descartado: 'neutral',
}
const FOCUS = 1
const ROWS = [
  { who: 'Flores de muestra', town: 'Vigo', status: 'Contactado', due: '12/11/2026' },
  { who: 'Flor Ejemplo', town: 'Redondela', status: 'Nuevo', due: '' },
  { who: 'Jardín de prueba', town: 'Ourense', status: 'Interesado', due: '20/11/2026' },
  { who: 'Ramos ficticios', town: 'Cangas', status: 'Cliente', due: '' },
  { who: 'Verde de ejemplo', town: 'O Carballiño', status: 'Interesado', due: '25/11/2026' },
  { who: 'Taller floral ficticio', town: 'Ponteareas', status: 'Contactado', due: '' },
  { who: 'Flor de prueba', town: 'Verín', status: 'Nuevo', due: '' },
]
const DATE = '18/11/2026'

const initial: S = { menu: false, hover: undefined, status: 'Nuevo', wash: null, edit: false, date: '', committed: '' }
// El fotograma fijo (movimiento reducido, miniatura) es el resultado: interesado y con fecha.
const poster: S = { ...initial, status: 'Interesado', committed: DATE }

async function script(a: Act<S>) {
  await a.wait(900)

  // 1. Abre el selector de estado de la fila protagonista
  a.mark('open')
  await a.click({ at: 'status', x: 0.5, y: 0.5 })
  await a.set({ menu: true })
  await a.wait(500)

  // 2. Elige «Interesado»; el menú se cierra y el contador sube después
  a.mark('choose')
  await a.move({ at: 'state-2', x: 0.4, y: 0.5 })
  await a.wait(250)
  await a.click({ at: 'state-2', x: 0.4, y: 0.5 })
  a.put({ status: 'Interesado' })
  await a.wait(160)
  a.put({ menu: false, wash: 'status' })
  await a.wait(900)
  a.put({ wash: null })
  await a.wait(500)

  // 3. Programa el seguimiento escribiendo la fecha en su celda
  a.mark('date')
  await a.move({ at: 'due', x: 0.6, y: 0.5 })
  await a.wait(150)
  await a.click({ at: 'due', x: 0.6, y: 0.5 })
  a.put({ edit: true })
  await a.move({ at: 'due', x: 1.12, y: 0.95 }, { duration: 450 })
  await a.type('date', DATE, { interval: 75 })
  await a.wait(350)

  // 4. Intro confirma: la celda destella una vez y el resultado se queda en pantalla
  a.mark('commit')
  a.put({ edit: false, committed: DATE, wash: 'date' })
  // La mano se retira al margen para no tapar ninguna fecha del resultado
  await a.move(a.layout === 'wide' ? { x: 638, y: 330 } : { x: 349, y: 290 }, { duration: 600 })
  await a.wait(300)
  a.put({ wash: null })
  await a.wait(1800)
}

export default function Seguimiento() {
  return (
    <Stage<S>
      width={660}
      height={400}
      compact={{ below: 660, width: 358, height: 320 }}
      initial={initial}
      poster={poster}
      script={script}
      play="once"
      accent="#2f6b4f"
      tokens={{ '--ss-font': 'Arial, Helvetica, sans-serif' }}
      cursor={{ at: { wide: { x: 600, y: 360 }, compact: { x: 320, y: 290 } } }}
      className="sg"
    >
      {(s, rect, layout) => {
        const interested = ROWS.filter((r, i) => (i === FOCUS ? s.status : r.status) === 'Interesado').length
        const trigger = rect('status')
        // El menú se abre hacia arriba: bajo la fila no queda un margen completo hasta el borde del escenario.
        const stageHeight = layout === 'wide' ? 400 : 320
        const menuWidth = 136
        const pop = { left: Math.min(trigger.x - 6, (layout === 'wide' ? 660 : 358) - 16 - menuWidth), bottom: stageHeight - trigger.y + 6, width: menuWidth }
        const shownDate = s.edit ? s.date : s.committed
        return (
          <>
            <Window url="localhost/admin" className="sg-win">
              <div className="sg-body">
                <div className="sg-head">
                  <div className="sg-title">Posibles clientes</div>
                  <div className="sg-stat">
                    <span>Interesados</span>
                    <strong><Roll delay={300}>{String(interested)}</Roll></strong>
                  </div>
                </div>
                <div className="sg-row sg-row--head">
                  <span>Floristería</span>
                  <span className="sg-town">Localidad</span>
                  <span>Estado</span>
                  <span>Seguimiento</span>
                </div>
                {ROWS.map((r, i) => {
                  const focus = i === FOCUS
                  const status = focus ? s.status : r.status
                  return (
                    <div key={r.who} className="sg-row" data-focus={focus || undefined}>
                      <span className="sg-who">{r.who}</span>
                      <span className="sg-town">{r.town}</span>
                      <span className="sg-status-cell" data-wash={(focus && s.wash === 'status') || undefined}>
                        {focus ? (
                          <span className="sg-trigger" data-target="status" data-cursor="pointer" data-open={s.menu || undefined}>
                            <Badge tone={TONES[status]}><Roll variant="fade">{status}</Roll></Badge>
                          </span>
                        ) : (
                          <Badge tone={TONES[status]}>{status}</Badge>
                        )}
                      </span>
                      {focus ? (
                        <span className="sg-cell" data-target="due" data-cursor="ibeam" data-edit={s.edit || undefined} data-wash={s.wash === 'date' || undefined}>
                          <span className="sg-ring" />
                          <span className="sg-text" data-empty={(!shownDate && !s.edit) || undefined}>
                            {/* Un único nodo de texto: al confirmar, la fecha escrita es la que queda; solo se va el cursor */}
                            <span className="sg-typed" data-typing>{s.edit ? s.date : shownDate || 'Sin fecha'}</span>
                            <span className="sg-caret" data-typing data-on={s.edit || undefined} />
                          </span>
                        </span>
                      ) : (
                        <span className="sg-due" data-empty={!r.due || undefined}>{r.due || 'Sin fecha'}</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </Window>

            <Popover show={s.menu} origin="bottom left" className="sg-pop" style={pop}>
              <Menu
                value={s.hover}
                targets={STATES.map((_, i) => `state-${i}`)}
                items={STATES.map((label) => (
                  <span className="sg-item" key={label}>
                    <span className="sg-tick">{label === s.status && <Tick size={12} strokeWidth={2.5} />}</span>
                    {label}
                  </span>
                ))}
              />
            </Popover>
          </>
        )
      }}
    </Stage>
  )
}
