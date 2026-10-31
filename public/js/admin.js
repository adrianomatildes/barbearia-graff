import { api, esc, brl, hm, WEEKDAYS, shortDate } from './api.js';

const app = document.getElementById('app');
const TOKEN_KEY = 'admin-token';
let token = sessionStorage.getItem(TOKEN_KEY);
let dias = [];
let dia = null;
let clientFilter = 'plano';
let currentMonth = new Date().toISOString().slice(0, 7);

const call = async (path, opts = {}) => {
  try { return await api(`/admin${path}`, { ...opts, token }); }
  catch (e) { if (e.status === 401 && token) logout(); throw e; }
};

function logout() {
  sessionStorage.removeItem(TOKEN_KEY);
  token = null;
  renderLogin();
}

function renderLogin(err = '') {
  app.innerHTML = `<section class="login-card"><h2>Entrar</h2>
    <div class="f"><label for="u">Usuário</label><input id="u" autocomplete="username" value="admin" readonly></div>
    <div class="f"><label for="p">Senha</label><input id="p" type="password" autocomplete="current-password" placeholder="Senha do painel"></div>
    <button class="cta" id="go">Entrar</button><p class="msg er" role="alert">${esc(err)}</p></section>`;

  const go = async () => {
    try {
      const r = await api('/admin/login', {
        method: 'POST',
        body: {
          username: document.getElementById('u').value,
          password: document.getElementById('p').value,
        },
      });
      token = r.token;
      sessionStorage.setItem(TOKEN_KEY, token);
      start();
    } catch (e) {
      renderLogin(e.message);
    }
  };

  document.getElementById('go').onclick = go;
  document.getElementById('p').onkeydown = (e) => {
    if (e.key === 'Enter') go();
  };
}

function monthLabel(month) {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Date(year, monthNumber - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

async function renderPanel(msg = '') {
  const [list, subs, metrics, avulso] = await Promise.all([
    call(`/appointments?date=${dia}`),
    call('/subscribers'),
    call(`/metrics/monthly?month=${currentMonth}`),
    call('/clients?type=avulso'),
  ]);

  const total = list.reduce((t, a) => t + a.price_cents, 0);
  const clientRows = clientFilter === 'plano' ? subs : avulso;
  const monthTitle = monthLabel(currentMonth);

  app.innerHTML = `<section class="agenda-panel">
    <div class="panel-toolbar">
      <div class="panel-title-wrap">
        <span class="mini-label">Operação</span>
        <h2>Agenda do dia</h2>
      </div>
      <div class="toolbar-actions">
        <a class="toolbar-link" href="/" aria-label="Abrir agendamento">Agendamento</a>
        <button class="toolbar-button secondary" id="out">Sair</button>
      </div>
    </div>

    <div class="metrics-grid">
      <article class="metric-card accent">
        <span>Receita do mês</span>
        <strong>${brl(metrics.revenue)}</strong>
        <small>${monthTitle}</small>
      </article>
      <article class="metric-card">
        <span>Agendamentos</span>
        <strong>${metrics.appointments}</strong>
        <small>${metrics.planAppointments} plano · ${metrics.avulsoAppointments} avulso</small>
      </article>
      <article class="metric-card">
        <span>Plano</span>
        <strong>${brl(metrics.planRevenue)}</strong>
        <small>${metrics.planAppointments} clientes</small>
      </article>
      <article class="metric-card">
        <span>Avulsos</span>
        <strong>${brl(metrics.avulsoRevenue)}</strong>
        <small>${metrics.avulsoAppointments} atendimentos</small>
      </article>
    </div>

    <div class="calendar-row">
      <div class="f calendar-field">
        <label for="monthPicker">Mês</label>
        <input id="monthPicker" type="month" value="${currentMonth}">
      </div>
      <div class="f calendar-field">
        <label for="dayPicker">Dia</label>
        <input id="dayPicker" type="date" min="${dias[0]?.date || ''}" max="${dias[dias.length - 1]?.date || ''}" value="${dia}">
      </div>
    </div>

    <div class="sum"><span>${list.length} agendamento(s)</span><b>${brl(total)}</b></div>
    ${list.length ? list.map((a) => `<div class="appt"><div class="t">${hm(a.start)}</div>
      <div class="i"><b>${esc(a.name)}</b> <span class="tag ${a.type === 'plano' ? '' : 'av'}">${a.type === 'plano' ? 'Plano' : 'Avulso'}</span>
      <span>${esc(a.service)} · ${esc(a.barber)} · ${esc(a.phone)}</span></div>
      <button class="x" data-del="${a.id}" aria-label="Cancelar ${esc(a.name)}">Cancelar</button></div>`).join('')
      : '<p class="hint">Nenhum agendamento neste dia. Os novos aparecem aqui.</p>'}
  </section>

  <section class="subscribers-panel">
    <div class="panel-toolbar compact">
      <div class="panel-title-wrap">
        <span class="mini-label">Clientes</span>
        <h2>Base de clientes</h2>
      </div>
      <div class="tab-group" aria-label="Tipos de clientes">
        <button class="tab-button ${clientFilter === 'plano' ? 'active' : ''}" data-client-filter="plano">Plano</button>
        <button class="tab-button ${clientFilter === 'avulso' ? 'active' : ''}" data-client-filter="avulso">Avulso</button>
      </div>
    </div>

    ${clientRows.length ? clientRows.map((s) => `<div class="appt"><div class="i"><b>${esc(s.name)}</b><span>${esc(s.phone || s.date || '')}</span></div><button class="x" data-rm="${s.id || ''}" ${clientFilter === 'avulso' ? 'data-avulso="true"' : ''}>${clientFilter === 'plano' ? 'Remover' : 'Ver'}</button></div>`).join('') : '<p class="hint">Nenhum cliente neste segmento.</p>'}

    ${clientFilter === 'plano' ? `<div class="f" style="margin-top:12px"><label for="sn">Nome</label><input id="sn"></div>
    <div class="f"><label for="st">WhatsApp com DDD</label><input id="st" inputmode="tel"></div>
    <button class="cta" id="add">Adicionar ao plano</button>` : ''}
    <p class="msg er" role="alert">${esc(msg)}</p>
  </section>`;

  document.getElementById('monthPicker').onchange = async (e) => {
    currentMonth = e.target.value || new Date().toISOString().slice(0, 7);
    await renderPanel();
  };

  document.getElementById('dayPicker').onchange = (e) => {
    dia = e.target.value;
    renderPanel();
  };

  document.getElementById('out').onclick = logout;

  document.querySelectorAll('[data-client-filter]').forEach((btn) => {
    btn.onclick = () => {
      clientFilter = btn.dataset.clientFilter;
      renderPanel();
    };
  });

  app.querySelectorAll('[data-del]').forEach((b) => b.onclick = async () => {
    if (!window.confirm('Cancelar este agendamento?')) return;
    await call(`/appointments/${b.dataset.del}`, { method: 'DELETE' });
    renderPanel();
  });

  app.querySelectorAll('[data-rm]').forEach((b) => b.onclick = async () => {
    if (clientFilter === 'plano') {
      await call(`/subscribers/${b.dataset.rm}`, { method: 'DELETE' });
      renderPanel();
    }
  });

  const addButton = document.getElementById('add');
  if (addButton) {
    addButton.onclick = async () => {
      try {
        await call('/subscribers', {
          method: 'POST',
          body: {
            name: document.getElementById('sn').value,
            phone: document.getElementById('st').value,
          },
        });
        renderPanel();
      } catch (e) {
        renderPanel(e.message);
      }
    };
  }
}

async function start() {
  if (!token) return renderLogin();

  try {
    dias = (await api('/config')).days;
    dia = dia || dias[0].date;
    await renderPanel();
  } catch (e) {
    if (e.status !== 401) app.innerHTML = `<section><p class="msg er">${esc(e.message)}</p></section>`;
  }
}

start();
