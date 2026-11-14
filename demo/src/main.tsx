import { StrictMode, useState, type ComponentType } from 'react'
import { createRoot } from 'react-dom/client'
import Seguimiento from './scenes/seguimiento'
import './host.css'

// ?capture=<escena> muestra solo la escena, para filmarla con las herramientas de Stageshow.
// La escena «gold» (ejemplo original del autor, en inglés) solo existe en desarrollo, como referencia.
const capture = new URLSearchParams(location.search).get('capture')
const root = createRoot(document.getElementById('root')!)

async function mount() {
  if (capture) {
    let Scene: ComponentType = Seguimiento
    if (capture === 'gold' && import.meta.env.DEV) Scene = (await import('./scenes/gold-table-edit')).default
    root.render(<StrictMode><div id="example" className="capture"><Scene /></div></StrictMode>)
    return
  }
  root.render(<StrictMode><Page /></StrictMode>)
}

function Page() {
  const [run, setRun] = useState(0)
  return (
    <main className="host">
      <p className="host-label">Demostración</p>
      <h1>Seguimiento de un posible cliente</h1>
      <p className="host-intro">
        Animación ilustrativa del panel comercial: un contacto pasa de «Nuevo» a «Interesado» y se programa su fecha de seguimiento.
        Es una simulación con datos ficticios; no accede al panel real ni modifica ningún contacto.
      </p>
      <div className="host-figure">
        <Seguimiento key={run} />
      </div>
      <div className="host-controls">
        <button type="button" onClick={() => setRun((n) => n + 1)}>Reproducir de nuevo</button>
        <span>Con «reducir movimiento» activado en el sistema se muestra solo el resultado final.</span>
      </div>
      <p className="host-credit">
        Hecha con el kit de <a href="https://github.com/benjitaylor/skills/tree/main/stageshow">Stageshow</a> (Benji Taylor, licencia MIT).
      </p>
    </main>
  )
}

mount()
