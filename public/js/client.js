import { api, esc, brl, hm, WEEKDAYS, shortDate } from './api.js';

const app = document.getElementById('app');
const S = { cfg: null, tipo: 'avulso', serv: null, barb: null, dia: null, hora: null, mes: null, slots: [], done: null, err: '', nome: '', tel: '' };

const service = () => S.cfg.services.find((s) => s.id === S.serv);
const price = (s) => (S.tipo === 'plano' ? s.plan_price_cents : s.price_cents);

async function loadSlots() {
  S.slots = [];
  if (!S.serv || !S.barb || !S.dia) return;
  try {
    S.slots = await api(`/availability?date=${S.dia}&barberId=${S.barb}&serviceId=${S.serv}`);
  } catch (e) { S.err = e.message; }
}

function keep() {
  const n = document.getElementById('nome'), t = document.getElementById('tel');
  if (n) S.nome = n.value;
  if (t) S.tel = t.value;
}

async function update(patch) {
  keep();
  Object.assign(S, patch, { err: '' });
  if ('serv' in patch || 'barb' in patch || 'dia' in patch) { S.hora = null; await loadSlots(); }
  render();
}

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function calendar() {
  const open = new Set(S.cfg.days.map((d) => d.date));
  const months = [...new Set(S.cfg.days.map((d) => d.date.slice(0, 7)))];
  const [y, m] = S.mes.split('-').map(Number);
  const i = months.indexOf(S.mes);
  const offset = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const total = new Date(Date.UTC(y, m, 0)).getUTCDate();
  let cells = '<span></span>'.repeat(offset);
  for (let d = 1; d <= total; d++) {
    const iso = `${S.mes}-${String(d).padStart(2, '0')}`;
    cells += `<button class="day" data-k="dia" data-v="${iso}" ${open.has(iso) ? '' : 'disabled'} aria-pressed="${S.dia === iso}" aria-label="${d} de ${MESES[m - 1]}">${d}</button>`;
  }
  return `<div class="cal">
    <div class="cal-h">
      <button class="x" data-mes="${months[i - 1] || ''}" ${i > 0 ? '' : 'disabled'} aria-label="Mês anterior">‹</button>
      <b>${MESES[m - 1]} ${y}</b>
      <button class="x" data-mes="${months[i + 1] || ''}" ${i < months.length - 1 ? '' : 'disabled'} aria-label="Próximo mês">›</button>
    </div>
    <div class="cal-g">${WEEKDAYS.map((w) => `<small>${w}</small>`).join('')}${cells}</div>
  </div>`;
}

function render() {
  if (S.done) return renderDone();
  const sv = S.serv ? service() : null;
  const free = S.slots.some((x) => x.free);
  app.innerHTML = `
  <section><h2>Você é cliente do plano?</h2><div class="row">
    <button class="chip" data-k="tipo" data-v="avulso" aria-pressed="${S.tipo === 'avulso'}">Avulso<small>Pago por serviço</small></button>
    <button class="chip" data-k="tipo" data-v="plano" aria-pressed="${S.tipo === 'plano'}">Sou do plano<small>Corte incluso, barba com 50%</small></button></div></section>
  <section><h2>Serviço</h2><div class="row">${S.cfg.services.map((s) => `
    <button class="chip" data-k="serv" data-v="${s.id}" aria-pressed="${S.serv === s.id}">${esc(s.name)}<small>${price(s) ? brl(price(s)) : 'Incluso'} · ${s.slots * S.cfg.hours.step} min</small></button>`).join('')}</div></section>
  <section><h2>Profissional</h2><div class="row">${S.cfg.barbers.map((b) => `
    <button class="chip" data-k="barb" data-v="${b.id}" aria-pressed="${S.barb === b.id}">${esc(b.name)}</button>`).join('')}</div></section>
  <section><h2>Escolha o dia</h2>${calendar()}<p class="hint">${S.dia ? `Dia escolhido: <b>${new Date(`${S.dia}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</b>. ` : ''}Domingo fechado.</p></section>
  <section><h2>Horário</h2>${sv ? `<div class="row slots">${S.slots.map((x) => `
    <button class="chip" data-k="hora" data-v="${x.start}" ${x.free ? '' : 'disabled'} aria-pressed="${S.hora === x.start}">${hm(x.start)}</button>`).join('')}</div>
    ${free ? '' : '<p class="hint">Sem horários livres neste dia. Escolha outro dia ou profissional.</p>'}` : '<p class="hint">Escolha um serviço para ver os horários livres.</p>'}</section>
  <section><h2>Seus dados</h2>
    <div class="f"><label for="nome">Nome</label><input id="nome" autocomplete="name" value="${esc(S.nome)}"></div>
    <div class="f"><label for="tel">WhatsApp com DDD</label><input id="tel" inputmode="tel" autocomplete="tel" placeholder="(48) 99999-0000" value="${esc(S.tel)}"></div>
    <div class="sum"><span>Total</span><b>${sv ? brl(price(sv)) : '–'}</b></div>
    <button class="cta" id="ok" ${sv && S.hora !== null ? '' : 'disabled'}>Confirmar horário</button>
    <p class="msg er" role="alert">${esc(S.err)}</p></section>`;
  app.querySelectorAll('[data-k]').forEach((b) => {
    b.onclick = () => {
      const k = b.dataset.k, v = b.dataset.v;
      update({ [k]: ['serv', 'barb', 'hora'].includes(k) ? Number(v) : v });
    };
  });
  app.querySelectorAll('[data-mes]').forEach((b) => { b.onclick = () => { keep(); S.mes = b.dataset.mes; render(); }; });
  document.getElementById('ok').onclick = confirm;
}

async function confirm() {
  keep();
  const btn = document.getElementById('ok');
  btn.disabled = true;
  try {
    S.done = await api('/appointments', {
      method: 'POST',
      body: { serviceId: S.serv, barberId: S.barb, date: S.dia, start: S.hora, name: S.nome, phone: S.tel, type: S.tipo },
    });
    render();
  } catch (e) {
    S.err = e.message;
    if (e.status === 409) { S.hora = null; await loadSlots(); }
    render();
  }
}

function renderDone() {
  const a = S.done;
  app.innerHTML = `<section class="done"><h2>Horário confirmado!</h2>
    <p><b>${esc(a.name)}</b>, te esperamos dia ${shortDate(a.date)} às <b>${hm(a.start)}</b> com ${esc(a.barber)}.</p>
    <p>${esc(a.service)} – ${a.type === 'plano' ? 'Plano' : 'Avulso'}: <b>${brl(a.price_cents)}</b> (pague na barbearia).</p>
    <button class="cta" id="novo">Fazer outro agendamento</button></section>`;
  document.getElementById('novo').onclick = async () => { S.done = null; S.hora = null; await loadSlots(); render(); };
}

(async function init() {
  try {
    S.cfg = await api('/config');
    S.barb = S.cfg.barbers[0]?.id ?? null;
    S.dia = S.cfg.days[0]?.date ?? null;
    S.mes = S.dia?.slice(0, 7) ?? null;
    render();
  } catch (e) {
    app.innerHTML = `<section><p class="msg er">${esc(e.message)}</p></section>`;
  }
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
})();
