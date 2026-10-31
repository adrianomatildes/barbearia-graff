import { api, esc, brl, hm, WEEKDAYS, shortDate } from './api.js';

const app = document.getElementById('app');
const TOKEN_KEY = 'admin-token';
let token = sessionStorage.getItem(TOKEN_KEY);
let dias = [];
let dia = null;
let clientFilter = 'plano';
let subscriberType = 'plano';
let currentMonth = new Date().toISOString().slice(0, 7);
let currentView = 'agenda';

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
  currentView = 'agenda';
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
        <button class="toolbar-button" id="goCatalog">Catálogo</button>
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

    ${clientRows.length ? clientRows.map((s) => {
      if (clientFilter === 'plano') {
        return `<div class="appt client-row"><div class="i"><b>${esc(s.name)}</b><span>${esc(s.phone || s.date || '')}</span></div><button class="x" data-rm="${s.id || ''}">Remover</button></div>`;
      }
      return `<div class="appt client-row"><div class="i"><b>${esc(s.name)}</b><span>${esc(s.phone || s.date || '')}</span></div><div class="client-actions"><button class="x" data-rm="${s.id || ''}" data-action="details">Detalhes</button><button class="x danger" data-rm="${s.id || ''}" data-action="delete">Excluir</button></div></div>`;
    }).join('') : '<p class="hint">Nenhum cliente neste segmento.</p>'}

    ${clientFilter === 'plano' ? `<div class="f" style="margin-top:12px"><label for="sn">Nome</label><input id="sn"></div>
    <div class="f"><label for="st">WhatsApp com DDD</label><input id="st" inputmode="tel"></div>
    <div class="type-selector" aria-label="Tipo de cliente">
      <span class="type-label">Tipo de cliente</span>
      <div class="type-options">
        <button type="button" class="type-chip ${subscriberType === 'plano' ? 'active' : ''}" data-subscriber-type="plano">Plano</button>
        <button type="button" class="type-chip ${subscriberType === 'avulso' ? 'active' : ''}" data-subscriber-type="avulso">Avulso</button>
      </div>
    </div>
    <button class="cta" id="add">Adicionar</button>` : ''}
    <p class="msg er" role="alert">${esc(msg)}</p>
  </section>`;

  document.getElementById('goCatalog').onclick = () => renderServicesPanel();
  document.getElementById('out').onclick = logout;

  document.getElementById('monthPicker').onchange = async (e) => {
    currentMonth = e.target.value || new Date().toISOString().slice(0, 7);
    await renderPanel();
  };

  document.getElementById('dayPicker').onchange = (e) => {
    dia = e.target.value;
    renderPanel();
  };

  document.querySelectorAll('[data-subscriber-type]').forEach((btn) => {
    btn.onclick = () => {
      subscriberType = btn.dataset.subscriberType;
      renderPanel();
    };
  });

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
    const action = b.dataset.action || 'default';
    const item = (clientFilter === 'plano')
      ? subs.find((s) => String(s.id) === String(b.dataset.rm))
      : avulso.find((s) => String(s.id) === String(b.dataset.rm));

    if (clientFilter === 'plano') {
      await call(`/subscribers/${b.dataset.rm}`, { method: 'DELETE' });
      renderPanel();
      return;
    }

    if (action === 'delete') {
      if (!window.confirm(`Excluir ${item?.name || 'este cliente'}?`)) return;
      await call(`/subscribers/${b.dataset.rm}`, { method: 'DELETE' });
      renderPanel();
      return;
    }

    if (item) {
      const details = [
        `Nome: ${item.name}`,
        `WhatsApp: ${item.phone || '—'}`,
        `Serviço: ${item.service || '—'}`,
        `Barbeiro: ${item.barber || '—'}`,
        `Data: ${item.date ? new Date(`${item.date}T12:00:00`).toLocaleDateString('pt-BR') : '—'}`,
        `Hora: ${item.start ? hm(item.start) : '—'}`,
      ].join('\n');
      window.alert(details);
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
            type: subscriberType,
          },
        });
        subscriberType = 'plano';
        renderPanel();
      } catch (e) {
        renderPanel(e.message);
      }
    };
  }
}

async function renderServicesPanel() {
  currentView = 'catalog';
  const services = await call('/services');
  const activeServices = services.filter((s) => Number(s.active) === 1);
  const inactiveServices = services.filter((s) => Number(s.active) !== 1);

  app.innerHTML = `<section class="services-panel">
    <div class="panel-toolbar">
      <div class="panel-title-wrap">
        <span class="mini-label">Catálogo</span>
        <h2>Serviços</h2>
      </div>
      <div class="toolbar-actions">
        <button class="toolbar-button" id="goAgenda">Agenda</button>
        <button class="toolbar-button secondary" id="out">Sair</button>
      </div>
    </div>

    <div class="service-form-box">
      <h3>Novo serviço</h3>
      <div class="service-grid">
        <div class="f"><label for="svcName">Nome</label><input id="svcName" placeholder="Ex: Barba, Cabelo, Sombrancelha"></div>
        <div class="f"><label for="svcPrice">Preço avulso</label><input id="svcPrice" type="number" min="0" step="100" placeholder="4500"></div>
        <div class="f"><label for="svcPlanPrice">Preço plano</label><input id="svcPlanPrice" type="number" min="0" step="100" placeholder="1750"></div>
        <div class="f"><label for="svcSlots">Tempo (slots)</label><input id="svcSlots" type="number" min="1" max="8" value="1"></div>
      </div>
      <button class="cta" id="createService">Salvar serviço</button>
    </div>

    <div class="service-list-box">
      <h3>Ativos</h3>
      ${activeServices.length ? activeServices.map((svc) => `
        <div class="service-item">
          <div class="service-copy">
            <strong>${esc(svc.name)}</strong>
            <span>${brl(svc.price_cents)} · plano ${brl(svc.plan_price_cents)} · ${svc.slots} slot(s)</span>
          </div>
          <div class="service-actions">
            <button class="x" data-service-edit="${svc.id}">Editar</button>
            <button class="x danger" data-service-delete="${svc.id}">Ocultar</button>
          </div>
        </div>
      `).join('') : '<p class="hint">Nenhum serviço ativo no catálogo.</p>'}
    </div>

    ${inactiveServices.length ? `<div class="service-list-box muted">
      <h3>Inativos</h3>
      ${inactiveServices.map((svc) => `
        <div class="service-item compact">
          <div class="service-copy">
            <strong>${esc(svc.name)}</strong>
            <span>Inativo</span>
          </div>
          <button class="x" data-service-reactivate="${svc.id}">Ativar</button>
        </div>
      `).join('')}
    </div>` : ''}
  </section>`;

  document.getElementById('goAgenda').onclick = () => renderPanel();
  document.getElementById('out').onclick = logout;

  document.getElementById('createService').onclick = async () => {
    const payload = {
      name: document.getElementById('svcName').value.trim(),
      price_cents: Number(document.getElementById('svcPrice').value || 0),
      plan_price_cents: Number(document.getElementById('svcPlanPrice').value || 0),
      slots: Number(document.getElementById('svcSlots').value || 1),
      active: true,
    };

    try {
      await call('/services', { method: 'POST', body: payload });
      renderServicesPanel();
    } catch (e) {
      window.alert(e.message || 'Não foi possível salvar o serviço.');
    }
  };

  app.querySelectorAll('[data-service-delete]').forEach((btn) => {
    btn.onclick = async () => {
      await call(`/services/${btn.dataset.serviceDelete}`, { method: 'DELETE' });
      renderServicesPanel();
    };
  });

  app.querySelectorAll('[data-service-reactivate]').forEach((btn) => {
    btn.onclick = async () => {
      const service = services.find((s) => String(s.id) === btn.dataset.serviceReactivate);
      if (!service) return;
      await call(`/services/${service.id}`, { method: 'PUT', body: { ...service, active: true } });
      renderServicesPanel();
    };
  });

  app.querySelectorAll('[data-service-edit]').forEach((btn) => {
    btn.onclick = async () => {
      const service = services.find((s) => String(s.id) === btn.dataset.serviceEdit);
      if (!service) return;

      document.getElementById('svcName').value = service.name;
      document.getElementById('svcPrice').value = String(service.price_cents);
      document.getElementById('svcPlanPrice').value = String(service.plan_price_cents);
      document.getElementById('svcSlots').value = String(service.slots);

      const submit = document.getElementById('createService');
      submit.textContent = 'Atualizar serviço';
      submit.dataset.editId = String(service.id);
      submit.onclick = async () => {
        const payload = {
          name: document.getElementById('svcName').value.trim(),
          price_cents: Number(document.getElementById('svcPrice').value || 0),
          plan_price_cents: Number(document.getElementById('svcPlanPrice').value || 0),
          slots: Number(document.getElementById('svcSlots').value || 1),
          active: true,
        };

        try {
          await call(`/services/${service.id}`, { method: 'PUT', body: payload });
          renderServicesPanel();
        } catch (e) {
          window.alert(e.message || 'Não foi possível atualizar o serviço.');
        }
      };
    };
  });
}

async function start() {
  if (!token) return renderLogin();

  try {
    dias = (await api('/config')).days;
    dia = dia || dias[0].date;
    if (currentView === 'catalog') {
      await renderServicesPanel();
      return;
    }
    await renderPanel();
  } catch (e) {
    if (e.status !== 401) app.innerHTML = `<section><p class="msg er">${esc(e.message)}</p></section>`;
  }
}

start();
