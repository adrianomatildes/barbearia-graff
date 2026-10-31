import { api, esc, brl, hm, WEEKDAYS, shortDate } from './api.js';

const app = document.getElementById('app');
const TOKEN_KEY = 'admin-token';
let token = sessionStorage.getItem(TOKEN_KEY);
let dias = [];
let dia = null;

const call = async (path, opts = {}) => {
  try { return await api(`/admin${path}`, { ...opts, token }); }
  catch (e) { if (e.status === 401 && token) logout(); throw e; }
};
function logout() { sessionStorage.removeItem(TOKEN_KEY); token = null; renderLogin(); }

function renderLogin(err = '') {
  app.innerHTML = `<section><h2>Entrar</h2>
    <div class="f"><label for="u">Usuário</label><input id="u" autocomplete="username"></div>
    <div class="f"><label for="p">Senha</label><input id="p" type="password" autocomplete="current-password"></div>
    <button class="cta" id="go">Entrar</button><p class="msg er" role="alert">${esc(err)}</p></section>`;
  const go = async () => {
    try {
      const r = await api('/admin/login', { method: 'POST', body: { username: document.getElementById('u').value, password: document.getElementById('p').value } });
      token = r.token; sessionStorage.setItem(TOKEN_KEY, token);
      start();
    } catch (e) { renderLogin(e.message); }
  };
  document.getElementById('go').onclick = go;
  document.getElementById('p').onkeydown = (e) => { if (e.key === 'Enter') go(); };
}

async function renderPanel(msg = '') {
  const [list, subs] = await Promise.all([call(`/appointments?date=${dia}`), call('/subscribers')]);
  const total = list.reduce((t, a) => t + a.price_cents, 0);
  app.innerHTML = `<section><h2>Agenda do dia</h2>
    <div class="f"><label for="dia">Dia</label><select id="dia">${dias.map((d) => `<option value="${d.date}" ${d.date === dia ? 'selected' : ''}>${WEEKDAYS[d.weekday]} ${shortDate(d.date)}</option>`).join('')}</select></div>
    <div class="sum"><span>${list.length} agendamento(s)</span><b>${brl(total)}</b></div>
    ${list.length ? list.map((a) => `<div class="appt"><div class="t">${hm(a.start)}</div>
      <div class="i"><b>${esc(a.name)}</b> <span class="tag ${a.type === 'plano' ? '' : 'av'}">${a.type === 'plano' ? 'Plano' : 'Avulso'}</span>
      <span>${esc(a.service)} · ${esc(a.barber)} · ${esc(a.phone)}</span></div>
      <button class="x" data-del="${a.id}" aria-label="Cancelar ${esc(a.name)}">Cancelar</button></div>`).join('')
      : '<p class="hint">Nenhum agendamento neste dia. Os novos aparecem aqui.</p>'}</section>
  <section><h2>Clientes do plano</h2>
    ${subs.map((s) => `<div class="appt"><div class="i"><b>${esc(s.name)}</b><span>${esc(s.phone)}</span></div><button class="x" data-rm="${s.id}">Remover</button></div>`).join('') || '<p class="hint">Nenhum assinante cadastrado.</p>'}
    <div class="f" style="margin-top:12px"><label for="sn">Nome</label><input id="sn"></div>
    <div class="f"><label for="st">WhatsApp com DDD</label><input id="st" inputmode="tel"></div>
    <button class="cta" id="add">Adicionar ao plano</button><p class="msg er" role="alert">${esc(msg)}</p></section>
  <section><button class="x" id="out">Sair</button></section>`;
  document.getElementById('dia').onchange = (e) => { dia = e.target.value; renderPanel(); };
  document.getElementById('out').onclick = logout;
  app.querySelectorAll('[data-del]').forEach((b) => b.onclick = async () => {
    if (!window.confirm('Cancelar este agendamento?')) return;
    await call(`/appointments/${b.dataset.del}`, { method: 'DELETE' }); renderPanel();
  });
  app.querySelectorAll('[data-rm]').forEach((b) => b.onclick = async () => {
    await call(`/subscribers/${b.dataset.rm}`, { method: 'DELETE' }); renderPanel();
  });
  document.getElementById('add').onclick = async () => {
    try {
      await call('/subscribers', { method: 'POST', body: { name: document.getElementById('sn').value, phone: document.getElementById('st').value } });
      renderPanel();
    } catch (e) { renderPanel(e.message); }
  };
}

async function start() {
  if (!token) return renderLogin();
  try {
    dias = (await api('/config')).days;
    dia = dia || dias[0].date;
    await renderPanel();
  } catch (e) { if (e.status !== 401) app.innerHTML = `<section><p class="msg er">${esc(e.message)}</p></section>`; }
}
start();
