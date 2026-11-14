import { business } from './config.js';

if (business.name) {
  document.querySelectorAll('[data-business-name]').forEach(element => { element.firstChild.textContent = business.name; });
  document.title = `${business.name} · Flores para floristerías`;
}
function contact(id, value, prefix, valid) {
  if (!value || !valid.test(value)) return false;
  const link = document.createElement('a');
  link.textContent = value;
  link.href = prefix + value;
  document.getElementById(id).replaceChildren(link);
  return true;
}
const phoneReady = contact('phone', business.phone, 'tel:', /^\+[\d\s()-]{9,22}$/);
const emailReady = contact('email', business.email, 'mailto:', /^[^\s@]+@[^\s@]+\.[^\s@]+$/);
document.getElementById('contact-pending').hidden = phoneReady && emailReady;
