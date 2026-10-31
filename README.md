# Barbearia Graff

Sistema de agendamento (segunda a sábado, 8h–21h) para clientes do plano e avulsos.
Backend Node.js + Express + SQLite; frontend em HTML/CSS/JS puro (PWA).

## Rodar localmente
```bash
npm install
cp .env.example .env        # edite JWT_SECRET e ADMIN_PASSWORD
npm start                   # http://localhost:3000   (painel: /admin)
```
Requer Node 20.6+. O administrador é criado na primeira execução com ADMIN_USER / ADMIN_PASSWORD.

## Estrutura
```
src/
  server.js              app Express (helmet, rate limit, estáticos)
  config.js              variáveis de ambiente e regras de horário
  db.js                  schema SQLite e dados iniciais
  routes/public.js       /api/config, /api/availability, /api/appointments
  routes/admin.js        /api/admin/* (login JWT, agenda, assinantes)
  services/scheduling.js regras de agenda (disponibilidade, conflitos)
  middleware/            auth (JWT) e tratamento de erros
public/                  frontend (index, admin, css, js, manifest, sw.js, icons)
```

## API
| Método | Rota | Descrição |
|---|---|---|
| GET | /api/config | serviços, profissionais, dias abertos |
| GET | /api/availability?date&barberId&serviceId | horários livres |
| POST | /api/appointments | cria agendamento |
| POST | /api/admin/login | retorna token JWT |
| GET/DELETE | /api/admin/appointments | agenda do dia / cancelar |
| GET/POST/DELETE | /api/admin/subscribers | clientes do plano |

## Mudanças comuns
- Serviços, preços (em centavos) e profissionais: tabelas `services` e `barbers` (seed em `src/db.js`).
- Horário de funcionamento e janela de agendamento: `src/config.js`.
- Cores: variáveis CSS em `public/css/styles.css`.

## Deploy
`docker build -t graff . && docker run -p 3000:3000 -v graff-data:/app/data --env-file .env graff`
Use HTTPS (Render, Railway, Fly.io ou VPS com Caddy/Nginx). Mantenha o volume `data/` persistente.

## Play Store
Com o site em HTTPS: `npm i -g @bubblewrap/cli && bubblewrap init --manifest https://SEU-DOMINIO/manifest.webmanifest && bubblewrap build`,
publique o .aab no Google Play Console e configure o Digital Asset Links (assetlinks.json) que o Bubblewrap indicar.
