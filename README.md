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

## Demo para cliente
```bash
npm install
npm run demo
# http://localhost:3000
# painel admin: http://localhost:3000/admin
```
Use `DEMO_MODE=true` para mostrar dados ficcionais, manter a experiência profissional e evitar erros com ambiente real.

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

## Publicação externa (opção recomendada)
Para apresentar ao cliente fora do ambiente local, use uma plataforma com HTTPS e persistência simples:
- Render
- Railway
- Fly.io
- VPS + reverse proxy (Caddy/Nginx)

Fluxo recomendado:
1. Configure a variável `JWT_SECRET` e `ADMIN_PASSWORD` em ambiente da plataforma.
2. Ajuste `PORT` e `DB_FILE` para um diretório persistente.
3. Ative `DEMO_MODE=true` na demo pública.
4. Publique o app com HTTPS.

### Exemplo de deploy em Render
- Build command: `npm install`
- Start command: `node --env-file=.env src/server.js`
- Configure as env vars em painel da plataforma.

## Narrativa de venda para o cliente
- Sistema de agendamento digital para barbearia
- Redução de perda de clientes por ausência de confirmação
- Controle interno de agenda e cliente do plano
- Apresentação visual profissional em PWA
- Base pronta para evoluir com cadastro, pagamento, CRM e notificações
