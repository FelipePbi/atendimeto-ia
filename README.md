# Atendente IA + Minha Agenda + Evolution Go

API MVP para atendimento via WhatsApp com Evolution Go, OpenAI function calling e integracao real com Minha Agenda.

## Setup Local

1. Instale dependencias:

```bash
npm install
```

2. Crie `.env` a partir de `.env.example` e preencha as chaves reais:

```bash
cp .env.example .env
```

Configure pelo menos:

```env
EVOLUTION_API_KEY=uma-chave-forte
EVOLUTION_WEBHOOK_TOKEN=outro-token-forte
EVOLUTION_INSTANCE_TOKEN=token-da-instancia
EVOLUTION_ALLOW_SELF_CHAT=false
OPENAI_API_KEY=
MINHA_AGENDA_BASIC_AUTH=
MINHA_AGENDA_USERNAME=
MINHA_AGENDA_PASSWORD=
```

3. Gere o Prisma Client:

```bash
npm run prisma:generate
```

4. Rode as migracoes no Postgres:

```bash
npm run prisma:migrate
```

5. Inicie em desenvolvimento:

```bash
npm run dev
```

## Stack Docker

Suba API, banco da API, banco do Evolution Go e Evolution Go:

```bash
docker compose up --build
```

Servicos locais:

- API Node: `http://localhost:3000`
- Evolution Go: `http://localhost:8080`
- Swagger Evolution Go: `http://localhost:8080/swagger/index.html`
- Manager Evolution Go: `http://localhost:8080/manager/login`

Quando configurar a instancia no Evolution Go, use o hostname interno Docker no webhook:

```text
http://api:3000/webhooks/evolution?token=<EVOLUTION_WEBHOOK_TOKEN>
```

Assinaturas recomendadas para o MVP:

```json
["MESSAGE", "SEND_MESSAGE", "CONNECTION", "QRCODE"]
```

## Evolution Go

Crie a instancia:

```bash
curl -X POST http://localhost:8080/instance/create \
  -H "Content-Type: application/json" \
  -H "apikey: $EVOLUTION_API_KEY" \
  -d '{
    "instanceName": "salao-principal",
    "integration": "WHATSAPP-BAILEYS"
  }'
```

Guarde o `id` retornado em `EVOLUTION_INSTANCE_ID` e o `token` retornado em `EVOLUTION_INSTANCE_TOKEN`. As rotas de envio do Evolution Go usam o token da instância no header `apikey`.

Conecte com webhook:

```bash
curl -X POST http://localhost:8080/instance/connect \
  -H "Content-Type: application/json" \
  -H "apikey: $EVOLUTION_API_KEY" \
  -H "instanceId: $EVOLUTION_INSTANCE_ID" \
  -d '{
    "webhookUrl": "http://api:3000/webhooks/evolution?token=troque-este-token",
    "subscribe": ["MESSAGE", "SEND_MESSAGE", "CONNECTION", "QRCODE"],
    "immediate": true
  }'
```

O Evolution Go pode exigir ativacao de licenca no primeiro uso; nesse caso, acesse o Manager antes de criar/conectar a instancia.

## Escrita Real No Minha Agenda

Por seguranca, chamadas reais de escrita ficam bloqueadas ate configurar:

```env
MINHA_AGENDA_ENABLE_WRITES=true
```

Com a flag desligada, leituras como servicos, clientes, agenda e disponibilidade continuam funcionando, mas criar, cancelar, remarcar e criar cliente retornam erro operacional.

## Endpoints

- `GET /health`
- `GET /privacy`
- `GET /terms`
- `GET /data-deletion`
- `POST /webhooks/evolution`
- `GET /internal/handoffs`
- `POST /internal/handoffs`
- `PATCH /internal/handoffs/:id/resolve`

Rotas `/internal/*` exigem `Authorization: Bearer <ADMIN_API_TOKEN>` ou header `x-admin-token`.

## Handoff Humano

- Resposta manual pelo celular (`fromMe=true`) pausa o bot no chat por `HUMAN_HANDOFF_PAUSE_MINUTES`.
- Para testar conversando no chat consigo mesmo, use `EVOLUTION_ALLOW_SELF_CHAT=true`; o bot continua pausando mensagens manuais para outros chats.
- `/bot off` pausa o bot indefinidamente naquele chat.
- `/bot on` reativa o bot naquele chat.
- Grupos sao ignorados quando `EVOLUTION_IGNORE_GROUPS=true`.

## Validacao

```bash
npm run build
npm test
```

Teste manual de webhook:

```bash
EVOLUTION_WEBHOOK_TOKEN=troque-este-token npm run test:webhook
```

Testes de escrita real devem ser feitos manualmente com dados dedicados e `MINHA_AGENDA_ENABLE_WRITES=true`.
