const form = document.getElementById('login-form');
const feedback = document.getElementById('feedback');
const button = form.querySelector('button[type="submit"]');

form.addEventListener('submit', async event => {
  event.preventDefault();
  const username = form.elements.username.value.trim();
  const password = form.elements.password.value;
  if (!username || !password) {
    feedback.textContent = 'Indica usuario y contraseña.';
    (username ? form.elements.password : form.elements.username).focus();
    return;
  }
  button.disabled = true;
  button.textContent = 'Comprobando…';
  feedback.textContent = '';
  try {
    const res = await fetch('/api/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
    if (res.ok) { window.location.assign('/admin/'); return; }
    const data = await res.json().catch(() => ({}));
    feedback.textContent = data.error || 'No se ha podido iniciar sesión.';
    form.elements.password.value = '';
    form.elements.password.focus();
  } catch {
    feedback.textContent = 'No hay conexión con el servidor. Inténtalo de nuevo.';
  } finally {
    button.disabled = false;
    button.textContent = 'Entrar';
  }
});
