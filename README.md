# Atendente IA + Minha Agenda

API MVP para atendimento via WhatsApp com OpenAI function calling e integracao real com Minha Agenda.

## Setup

1. Instale dependencias:

```bash
npm install
```

2. Crie `.env` a partir de `.env.example` e preencha as chaves reais.

3. Gere o Prisma Client:

```bash
npm run prisma:generate
```

4. Rode as migracoes no Supabase/Postgres:

```bash
npm run prisma:migrate
```

5. Inicie em desenvolvimento:

```bash
npm run dev
```

## Escrita Real No Minha Agenda

Por seguranca, chamadas reais de escrita ficam bloqueadas ate configurar:

```env
MINHA_AGENDA_ENABLE_WRITES=true
```

Com a flag desligada, leituras como servicos, clientes, agenda e disponibilidade continuam funcionando, mas criar, cancelar, remarcar e criar cliente retornam erro operacional.

## Endpoints

- `GET /health`
- `GET /webhooks/whatsapp`
- `POST /webhooks/whatsapp`
- `GET /internal/handoffs`
- `POST /internal/handoffs`
- `PATCH /internal/handoffs/:id/resolve`

Rotas `/internal/*` exigem `Authorization: Bearer <ADMIN_API_TOKEN>` ou header `x-admin-token`.

## Validacao

```bash
npm run build
npm test
```

Testes de escrita real devem ser feitos manualmente com dados dedicados e `MINHA_AGENDA_ENABLE_WRITES=true`.
