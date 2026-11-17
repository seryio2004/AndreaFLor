// Fondo del campo de claveles: las dos capas suben a distinta velocidad al hacer scroll,
// de modo que el campo «crece» y gana profundidad al bajar por la página.
// Entre ambas capas trepan enredaderas (vines.js) que crecen y florecen según se avanza.
// Sin movimiento si el sistema pide reducirlo: las enredaderas quedan quietas en un punto intermedio.
import { createVines } from './vines.js';

const root = document.documentElement;
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
const field = document.querySelector('.field');
const vines = field ? createVines(field) : null;
let pending = false;

function update() {
  pending = false;
  const max = Math.max(1, root.scrollHeight - window.innerHeight);
  const progress = Math.min(1, window.scrollY / max);
  root.style.setProperty('--field-progress', reduce.matches ? '1' : progress.toFixed(4));
  vines?.update(reduce.matches ? 0.3 : progress);
  // En la zona de contacto el campo gana presencia: de 0 a 1 según cuánto de la sección se ve.
  const contact = document.getElementById('contacto');
  if (contact) {
    const box = contact.getBoundingClientRect();
    const visible = Math.min(window.innerHeight, box.bottom) - Math.max(0, box.top);
    const boost = Math.max(0, Math.min(1, visible / (window.innerHeight * 0.6)));
    root.style.setProperty('--field-boost', boost.toFixed(3));
  }
}

function schedule() {
  if (!pending) { pending = true; requestAnimationFrame(update); }
}

window.addEventListener('scroll', schedule, { passive: true });
window.addEventListener('resize', schedule);
reduce.addEventListener?.('change', schedule);
update();
