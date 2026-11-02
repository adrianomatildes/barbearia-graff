# BairroMais

Plataforma de descoberta e agendamento de negócios locais para clientes e comerciantes.
Conecta pet shops, lava-rápidos, barbearias, estética e outros serviços por cidade, bairro e categoria.

## Visão da plataforma
BairroMais ajuda pequenos e médios negócios locais a ganhar visibilidade, receber clientes na região e organizar agendamentos por WhatsApp ou agenda digital.

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
Use `DEMO_MODE=true` para mostrar dados ficcionais e testar a experiência com negócios locais e agendamento.

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
public/                  frontend da plataforma (landing page, painel, assets, PWA)
```

## API
| Método | Rota | Descrição |
|---|---|---|
| GET | /api/config | serviços, profissionais, dias abertos |
| GET | /api/availability?date&barberId&serviceId | horários livres |
| GET | /api/clients/appointments?phone=48999999999 | agendamentos do cliente por telefone |
| POST | /api/appointments | cria agendamento |
| POST | /api/admin/login | retorna token JWT |
| GET/DELETE | /api/admin/appointments | agenda do dia / cancelar |
| GET/POST/DELETE | /api/admin/subscribers | clientes do plano |

## Categorias de negócios
- Pet shop
- Lava-rápido / lava-car
- Barbearia
- Estética e beleza
- Oficina e auto
- Serviços gerais do bairro

## Mudanças comuns
- Serviços, preços e profissionais: tabelas `services` e `barbers` (seed em `src/db.js`).
- Horário de funcionamento e janela de agendamento: `src/config.js`.
- Cores: variáveis CSS em `public/css/styles.css`.

## Deploy
`docker build -t bairro-mais . && docker run -p 3000:3000 -v bairro-mais-data:/app/data --env-file .env bairro-mais`
Use HTTPS (Render, Railway, Fly.io ou VPS com Caddy/Nginx). Mantenha o volume `data/` persistente.

## Play Store
Com o site em HTTPS: `npm i -g @bubblewrap/cli && bubblewrap init --manifest https://SEU-DOMINIO/manifest.webmanifest && bubblewrap build`,
publique o .aab no Google Play Console e configure o Digital Asset Links (assetlinks.json) que o Bubblewrap indicar.

## Publicação externa (opção recomendada)
Para apresentar a plataforma fora do ambiente local, use uma solução com HTTPS e persistência simples:
- Render
- Railway
- Fly.io
- VPS + reverse proxy (Caddy/Nginx)

Fluxo recomendado:
1. Configure a variável `JWT_SECRET` e `ADMIN_PASSWORD` no ambiente da plataforma.
2. Ajuste `PORT` e `DB_FILE` para um diretório persistente.
3. Ative `DEMO_MODE=true` para a demo pública.
4. Publique a plataforma com HTTPS.

### Exemplo de deploy em Render
- Build command: `npm install`
- Start command: `node --env-file=.env src/server.js`
- Configure as env vars no painel da plataforma.

## Narrativa de venda para o comerciante
- Plataforma de descoberta de negócios locais
- Mais visibilidade para pet shops, lava-car e barbearias
- Agenda digital e aumento de agendamentos
- Presença profissional e fácil gestão de clientes
- Base pronta para evoluir com avaliações, pagamentos e CRM

## Slogan
- BairroMais: mais clientes no seu bairro
- Seu negócio perto de quem precisa
