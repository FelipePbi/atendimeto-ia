PRD — API de Atendente IA no WhatsApp com Node.js + OpenAI + Minha Agenda

Produto: Atendente IA para WhatsApp de profissional de beleza feminina
Versão do PRD: v1.0
Data: 11/05/2026
Stack principal: Evolution Go + Node.js/TypeScript + OpenAI API + API do app Minha Agenda
Status: especificação para desenvolvimento do MVP

1. Objetivo do produto

Criar uma API que permita que uma IA atenda clientes pelo WhatsApp de forma natural, profissional e personalizada, respondendo dúvidas sobre serviços de cílios e design de sobrancelha, consultando disponibilidade real no app Minha Agenda, realizando agendamentos, cancelamentos e, quando necessário, transferindo o atendimento para a profissional humana.

A API deverá ser construída para baixo volume inicial: aproximadamente 200 clientes totais e média de 10 conversas por dia.

A integração com WhatsApp será feita via Evolution Go, que controla uma instancia WhatsApp vinculada por QR Code e entrega webhooks JSON para a API, incluindo mensagens recebidas, mensagens enviadas e eventos de conexão.

A IA deverá usar function calling/tools, ou seja, não deve apenas “responder texto”; ela deve chamar funções internas da aplicação para consultar serviços, buscar horários, criar agendamentos, cancelar atendimentos e acionar atendimento humano. A documentação da OpenAI descreve esse fluxo como um processo em que o modelo recebe ferramentas disponíveis, solicita a execução de uma ferramenta, a aplicação executa a ação e devolve o resultado para o modelo gerar a resposta final.

2. Problema a resolver

Hoje, a profissional precisa responder manualmente clientes no WhatsApp para:

informar valores;
explicar serviços;
confirmar formas de pagamento;
informar endereço;
verificar horários disponíveis;
marcar atendimentos;
remarcar horários;
cancelar atendimentos;
lembrar regras de atraso, sinal e cancelamento.

Esse processo consome tempo, gera risco de atraso nas respostas e pode causar perda de clientes quando a profissional está atendendo e não consegue responder rapidamente.

3. Resultado esperado

A cliente deverá sentir que está conversando com um atendimento humano, natural e acolhedor, mas a API precisa agir com segurança operacional:

não inventar informações;
não confirmar horário sem consultar o Minha Agenda;
não cancelar sem confirmação explícita;
não criar agendamento duplicado;
chamar a profissional quando houver dúvida, exceção ou situação sensível.
4. Escopo do MVP
4.1 Dentro do escopo

O MVP deverá contemplar:

Receber mensagens do WhatsApp via webhook.
Processar texto recebido da cliente.
Manter contexto básico da conversa.
Consultar serviços no app Minha Agenda.
Consultar horários disponíveis no app Minha Agenda.
Criar agendamento no Minha Agenda.
Cancelar agendamento no Minha Agenda.
Remarcar agendamento, se os endpoints permitirem.
Responder dúvidas frequentes com base nos dados do catálogo.
Acionar atendimento humano quando necessário.
Registrar logs de mensagens, decisões da IA e chamadas de API.
Evitar duplicidade de processamento de mensagens.
Permitir configuração manual de prompts, regras e endpoints.
Enviar mensagens de confirmação/lembrete pelo provider WhatsApp quando necessário.

4.2 Fora do escopo do MVP

Não entra na primeira versão:

painel administrativo completo;
integração automática com Pix;
análise automática de áudio;
leitura de imagem enviada pela cliente;
campanhas de marketing;
programa de fidelidade;
chatbot genérico para qualquer assunto;
múltiplas profissionais/unidades, salvo se o Minha Agenda já exigir isso;
confirmação automática de pagamento;
site público de agendamento.
5. Observação importante sobre uso de IA no WhatsApp

Este produto deve ser desenhado como assistente de atendimento de um negócio real de beleza, com funções específicas de suporte, catálogo e agendamento. Ele não deve ser posicionado como um chatbot de IA genérico.

Os termos do WhatsApp Business Solution trazem restrições para provedores de IA quando a funcionalidade principal oferecida é uma tecnologia de IA de propósito geral. Por isso, a especificação deve manter a IA como recurso auxiliar/incidental do atendimento da profissional, com escopo limitado a atendimento, serviços, agenda e suporte ao cliente.

6. Personas
6.1 Cliente final

Pessoa que entra em contato pelo WhatsApp para tirar dúvidas ou marcar atendimento.

Necessidades:

saber valores;
entender duração;
saber endereço;
escolher horário;
remarcar/cancelar;
receber atendimento rápido;
falar com uma pessoa humana quando necessário.
6.2 Profissional de beleza

Dona do negócio e responsável pelos atendimentos.

Necessidades:

reduzir tempo respondendo mensagens;
evitar perda de clientes;
manter controle da agenda no Minha Agenda;
não ter agendamentos errados;
manter tom de conversa parecido com o dela;
assumir atendimento quando necessário.
6.3 Desenvolvedor/admin

Pessoa técnica que configura a API, endpoints, tokens, prompts e regras.

Necessidades:

fácil manutenção;
logs claros;
integração segura;
endpoints bem definidos;
tratamento de erros;
baixo custo operacional.
7. Arquitetura proposta
Cliente WhatsApp
      ↓
Evolution Go
      ↓ Webhook
API Node.js / TypeScript
      ↓
Orquestrador de Conversa
      ↓
OpenAI API com function calling
      ↓
Ferramentas internas da API
      ↓
Minha Agenda API
      ↓
Resposta final
      ↓
Evolution Go
      ↓
Cliente WhatsApp
Componentes
Componente	Responsabilidade
Evolution Go	Receber e enviar mensagens
Webhook Node.js	Receber eventos do WhatsApp
Conversation Engine	Controlar fluxo e estado da conversa
OpenAI Service	Gerar respostas naturais e acionar ferramentas
Minha Agenda Client	Consultar serviços, clientes, agenda e agendamentos
Persistence Layer	Guardar estado, logs e idempotência
Handoff Service	Avisar profissional quando a IA não deve resolver sozinha
Provider WhatsApp	Enviar mensagens pelo canal configurado
Monitoring/Logs	Auditar mensagens, erros e agendamentos
8. Stack técnica recomendada
8.1 Backend
Node.js 20+ ou 22+
TypeScript
Fastify ou Express
Zod para validação de payloads
Axios ou native fetch para chamadas HTTP
OpenAI Node SDK
Prisma opcional para banco
PostgreSQL/Supabase ou SQLite em VPS pequena

A Responses API da OpenAI permite criar respostas de modelo com texto, estado de conversa e acesso a sistemas externos por function calling.

8.2 Banco de dados

Mesmo usando o Minha Agenda como fonte principal da agenda, a API precisa de banco próprio para:

estado das conversas;
logs;
mensagens processadas;
idempotência;
handoffs;
configurações locais;
histórico mínimo para personalização.

Sugestão de menor custo:

Opção	Uso recomendado
SQLite	MVP em VPS simples
Supabase Postgres Free	MVP em cloud/serverless
PostgreSQL em VPS	produção simples e barata
9. Fonte da verdade dos dados

O app Minha Agenda será a fonte da verdade para:

serviços;
valores;
durações;
clientes;
horários disponíveis;
agendamentos;
cancelamentos;
remarcações;
bloqueios de agenda, se existir endpoint.

A API própria não deve manter uma cópia definitiva da agenda. Ela pode manter cache curto, mas sempre deve revalidar disponibilidade antes de criar um agendamento.

10. Dados e endpoints do Minha Agenda a preencher manualmente

Esta seção deve ser preenchida quando você fornecer token, endpoints e payloads do app Minha Agenda.

10.1 Configuração geral
MINHA_AGENDA_BASE_URL=[PREENCHER]
MINHA_AGENDA_AUTH_TYPE=[Bearer Token | API Key | Basic Auth | OAuth2 | Outro]
MINHA_AGENDA_TOKEN=[PREENCHER]
MINHA_AGENDA_API_KEY_HEADER=[PREENCHER, se aplicável]
MINHA_AGENDA_TIMEOUT_MS=10000
MINHA_AGENDA_RETRY_ATTEMPTS=2
MINHA_AGENDA_TIMEZONE=America/Sao_Paulo
10.2 Endpoints necessários
Recurso	Método	Endpoint	Status
Listar serviços	GET	[PREENCHER]	obrigatório
Buscar serviço por ID	GET	[PREENCHER]	desejável
Listar agendas/profissionais	GET	[PREENCHER]	obrigatório se houver mais de uma agenda
Consultar horários disponíveis	GET/POST	[PREENCHER]	obrigatório
Listar agendamentos por data	GET	[PREENCHER]	obrigatório se não houver endpoint de disponibilidade
Criar agendamento	POST	[PREENCHER]	obrigatório
Buscar cliente por telefone	GET	[PREENCHER]	obrigatório
Criar cliente	POST	[PREENCHER]	obrigatório
Atualizar cliente	PATCH/PUT	[PREENCHER]	desejável
Buscar agendamento por telefone	GET	[PREENCHER]	obrigatório para cancelamento
Cancelar agendamento	PATCH/DELETE	[PREENCHER]	obrigatório
Remarcar agendamento	PATCH/PUT	[PREENCHER]	desejável
Consultar bloqueios/folgas	GET	[PREENCHER]	desejável
Webhook do Minha Agenda	POST/GET	[PREENCHER]	opcional
10.3 Headers esperados
Authorization: Bearer [PREENCHER]
Content-Type: application/json
Accept: application/json

Ou, se for API Key:

[PREENCHER_HEADER_API_KEY]: [PREENCHER_VALOR]
Content-Type: application/json
Accept: application/json
11. Mapeamento de dados do Minha Agenda
11.1 Serviço

Modelo esperado internamente:

type Service = {
  id: string;
  name: string;
  description?: string;
  priceCents?: number;
  durationMinutes: number;
  category?: "cilios" | "sobrancelha" | "outro";
  active: boolean;
  requiresDeposit?: boolean;
  depositCents?: number;
  notes?: string;
};

Mapeamento a preencher:

Campo interno	Campo no Minha Agenda	Obrigatório
id	[PREENCHER]	sim
name	[PREENCHER]	sim
description	[PREENCHER]	não
priceCents	[PREENCHER]	sim
durationMinutes	[PREENCHER]	sim
category	[PREENCHER]	não
active	[PREENCHER]	sim
requiresDeposit	[PREENCHER]	não
depositCents	[PREENCHER]	não
notes	[PREENCHER]	não
11.2 Cliente
type Customer = {
  id?: string;
  name: string;
  phoneE164: string;
  whatsappName?: string;
  notes?: string;
  createdAt?: string;
};

Mapeamento:

Campo interno	Campo no Minha Agenda	Obrigatório
id	[PREENCHER]	desejável
name	[PREENCHER]	sim
phoneE164	[PREENCHER]	sim
whatsappName	[PREENCHER]	não
notes	[PREENCHER]	não
11.3 Agendamento
type Appointment = {
  id: string;
  customerId: string;
  customerName: string;
  customerPhoneE164: string;
  serviceId: string;
  serviceName: string;
  startAt: string;
  endAt: string;
  status: "scheduled" | "confirmed" | "cancelled" | "completed" | "no_show";
  notes?: string;
  source: "whatsapp_ai";
};

Mapeamento:

Campo interno	Campo no Minha Agenda	Obrigatório
id	[PREENCHER]	sim
customerId	[PREENCHER]	sim
serviceId	[PREENCHER]	sim
startAt	[PREENCHER]	sim
endAt	[PREENCHER]	sim
status	[PREENCHER]	sim
notes	[PREENCHER]	não
source	[PREENCHER]	não
12. Regras de negócio
12.1 Regras gerais
A IA nunca deve confirmar horário sem consultar disponibilidade real.
A IA nunca deve inventar preço, duração ou serviço.
A IA deve usar os serviços retornados pelo Minha Agenda.
Se o serviço não existir, deve dizer que vai confirmar com a profissional.
A IA deve oferecer no máximo 3 opções de horário por vez.
Antes de criar agendamento, deve confirmar:
nome da cliente;
serviço;
data;
horário;
valor, se disponível;
duração aproximada.
O agendamento só deve ser criado após confirmação clara da cliente.
Cancelamento só deve ser realizado após confirmação explícita.
Remarcação deve consultar disponibilidade antes.
Se o Minha Agenda estiver fora do ar, a IA não deve inventar horários.
Casos de alergia, reação, reclamação ou urgência devem ir para atendimento humano.
Se a cliente perguntar se é robô/IA, responder com transparência sem quebrar a naturalidade.
12.2 Exemplo de resposta transparente

“Eu sou a assistente virtual do atendimento, mas estou aqui pra te ajudar com as informações e horários certinhos. Se precisar, eu chamo a profissional pra falar com você também 💕”

12.3 Regras de atraso

Campos a preencher:

TOLERANCIA_ATRASO_MINUTOS=[PREENCHER]
POLITICA_ATRASO=[PREENCHER]

Exemplo:

“A tolerância é de 10 minutinhos, tá? Depois disso pode ser necessário remarcar, porque os horários são organizados certinho pra cada atendimento.”

12.4 Regras de cancelamento

Campos a preencher:

CANCELAMENTO_MINIMO_HORAS=[PREENCHER]
PERMITE_CANCELAMENTO_AUTOMATICO=true|false
POLITICA_CANCELAMENTO=[PREENCHER]

Exemplo:

“Consigo cancelar sim. Só confirmando: você quer cancelar o horário de terça às 14h para design de sobrancelha?”

12.5 Regras de sinal/pagamento

Campos a preencher:

FORMAS_PAGAMENTO=[Pix, dinheiro, cartão, etc.]
EXIGE_SINAL=true|false
VALOR_SINAL_PADRAO=[PREENCHER]
CHAVE_PIX=[PREENCHER, se quiser informar]

No MVP, o pagamento pode ser apenas informado, sem automação.

13. Estados da conversa

A API deverá manter uma máquina de estados simples.

Estado	Descrição
idle	Sem fluxo ativo
answering_question	Respondendo dúvida geral
collecting_service	Tentando identificar serviço desejado
collecting_date	Tentando identificar data/período
searching_availability	Consultando horários no Minha Agenda
offering_slots	Oferecendo opções de horário
confirming_booking	Aguardando confirmação final
creating_booking	Criando agendamento
booking_confirmed	Agendamento concluído
cancellation_lookup	Buscando agendamento para cancelar
confirming_cancellation	Aguardando confirmação de cancelamento
rescheduling	Fluxo de remarcação
human_handoff	Atendimento transferido para humana
error_recovery	Recuperação após erro técnico
14. Fluxos principais
14.1 Fluxo de pergunta sobre serviço
Exemplo

Cliente:

“Quanto é design com henna?”

Processo:

Receber mensagem.
Normalizar telefone e texto.
Identificar intenção: service_price_question.
Chamar ferramenta listServices ou searchServices.
Encontrar serviço compatível.
Responder com valor, duração e observação.

Resposta esperada:

“Design com henna fica R$ [valor] e leva em média [duração]. Ele ajuda a preencher e destacar mais o desenho da sobrancelha. Quer que eu veja um horário pra você? 💕”

Se não encontrar:

“Esse serviço eu não encontrei certinho na agenda, então vou confirmar com a profissional pra não te passar informação errada, tá?”

14.2 Fluxo de agendamento

Cliente:

“Quero marcar cílios pra sexta.”

Processo:

Identificar intenção: schedule_appointment.
Identificar serviço: “cílios”.
Se houver mais de um serviço parecido, perguntar qual:
extensão de cílios;
manutenção;
lash lifting;
outro.
Identificar data: próxima sexta.
Consultar serviço no Minha Agenda.
Consultar disponibilidade.
Oferecer até 3 horários.
Cliente escolhe.
IA confirma dados finais.
Cliente confirma.
API revalida disponibilidade.
API cria cliente, se necessário.
API cria agendamento.
IA envia confirmação.
Confirmação antes de criar

“Perfeito. Só pra confirmar: vou marcar [serviço] para [data] às [horário], no valor de R$ [valor], com duração média de [duração]. Posso confirmar esse horário pra você?”

Resposta após criar

“Prontinho, seu horário está confirmado para [data] às [horário] 💕
Serviço: [serviço]
Endereço: [endereço]
Qualquer imprevisto, me avisa com antecedência, tá?”

14.3 Fluxo de cancelamento

Cliente:

“Preciso cancelar meu horário.”

Processo:

Identificar intenção: cancel_appointment.
Buscar agendamentos ativos pelo telefone.
Se houver um agendamento, pedir confirmação.
Se houver múltiplos, listar opções.
Após confirmação explícita, cancelar no Minha Agenda.
Enviar resposta final.
Notificar profissional.

Resposta:

“Tudo bem. Encontrei seu horário de [data] às [horário] para [serviço]. Você confirma que quer cancelar esse agendamento?”

Após confirmação:

“Seu horário foi cancelado, tá? Quando quiser remarcar, posso ver os próximos horários pra você 💕”

14.4 Fluxo de remarcação

Cliente:

“Consegue trocar meu horário?”

Processo:

Buscar agendamento ativo pelo telefone.
Confirmar qual agendamento será remarcado.
Perguntar nova data/período.
Consultar disponibilidade.
Oferecer horários.
Cliente escolhe.
Revalidar disponibilidade.
Remarcar no Minha Agenda ou cancelar + criar novo, dependendo da API.
Enviar confirmação.

Se o Minha Agenda não tiver endpoint de remarcação:

Estratégia:
1. Criar novo agendamento.
2. Confirmar sucesso.
3. Cancelar agendamento antigo.
4. Se falhar o cancelamento antigo, acionar humano imediatamente.

Preferência técnica: se a API permitir, usar endpoint atômico de remarcação.

14.5 Fluxo de atendimento humano

Situações que devem acionar humano:

cliente irritada;
reclamação;
alergia, reação ou desconforto;
pedido de encaixe fora da agenda;
desconto;
atendimento fora do horário;
serviço não cadastrado;
erro na API do Minha Agenda;
conflito de agenda;
cliente VIP/manual;
mensagens ofensivas;
pergunta médica ou sensível.

Resposta:

“Nesse caso é melhor eu confirmar direto com a profissional pra não te passar nada errado. Já vou chamar ela aqui pra te responder, tá? 💕”

A API deve registrar:

type Handoff = {
  id: string;
  phoneE164: string;
  customerName?: string;
  reason: string;
  lastMessages: string[];
  status: "pending" | "resolved";
  createdAt: string;
};
15. Ferramentas internas da IA

A IA deverá ter acesso apenas a ferramentas controladas. Ela não deve chamar livremente endpoints externos.

15.1 buscar_servicos

Uso: listar ou buscar serviços disponíveis.

type BuscarServicosInput = {
  termo?: string;
  categoria?: "cilios" | "sobrancelha" | "outro";
};

type BuscarServicosOutput = {
  services: Service[];
};
15.2 buscar_horarios_disponiveis

Uso: consultar horários reais no Minha Agenda.

type BuscarHorariosDisponiveisInput = {
  serviceId: string;
  dateFrom: string;
  dateTo: string;
  preferredPeriod?: "manha" | "tarde" | "noite" | "qualquer";
};

type Slot = {
  startAt: string;
  endAt: string;
  professionalId?: string;
  agendaId?: string;
};

type BuscarHorariosDisponiveisOutput = {
  slots: Slot[];
  source: "minha_agenda";
};
15.3 buscar_cliente_por_telefone
type BuscarClientePorTelefoneInput = {
  phoneE164: string;
};

type BuscarClientePorTelefoneOutput = {
  customer?: Customer;
};
15.4 criar_cliente
type CriarClienteInput = {
  name: string;
  phoneE164: string;
  notes?: string;
};

type CriarClienteOutput = {
  customer: Customer;
};
15.5 criar_agendamento
type CriarAgendamentoInput = {
  customerId: string;
  customerName: string;
  customerPhoneE164: string;
  serviceId: string;
  startAt: string;
  endAt?: string;
  notes?: string;
  source: "whatsapp_ai";
};

type CriarAgendamentoOutput = {
  appointment: Appointment;
  success: boolean;
  error?: string;
};
15.6 buscar_agendamentos_cliente
type BuscarAgendamentosClienteInput = {
  phoneE164: string;
  status?: "scheduled" | "confirmed" | "all";
};

type BuscarAgendamentosClienteOutput = {
  appointments: Appointment[];
};
15.7 cancelar_agendamento
type CancelarAgendamentoInput = {
  appointmentId: string;
  reason?: string;
};

type CancelarAgendamentoOutput = {
  success: boolean;
  appointmentId: string;
  error?: string;
};
15.8 remarcar_agendamento
type RemarcarAgendamentoInput = {
  appointmentId: string;
  newStartAt: string;
  newEndAt?: string;
};

type RemarcarAgendamentoOutput = {
  success: boolean;
  appointment: Appointment;
  error?: string;
};
15.9 acionar_humano
type AcionarHumanoInput = {
  phoneE164: string;
  customerName?: string;
  reason: string;
  summary: string;
};

type AcionarHumanoOutput = {
  success: boolean;
  handoffId: string;
};
16. Prompt base da IA
16.1 Prompt de sistema
Você é a assistente de atendimento da [NOME DA PROFISSIONAL/ESTÚDIO], profissional de beleza especializada em cílios e design de sobrancelha.

Seu papel é atender clientes pelo WhatsApp de forma natural, gentil, profissional e objetiva.

Você deve:
- responder em português do Brasil;
- usar tom acolhedor, feminino e próximo;
- ser clara e simpática;
- usar poucos emojis, apenas quando combinar com a conversa;
- parecer natural, sem textos longos demais;
- evitar linguagem robótica;
- manter as respostas curtas quando a cliente fizer perguntas simples;
- conduzir a cliente para agendamento quando fizer sentido.

Você nunca deve:
- inventar serviços, valores, duração ou horários;
- confirmar horário sem consultar a ferramenta de disponibilidade;
- criar agendamento sem confirmação explícita da cliente;
- cancelar agendamento sem confirmação explícita da cliente;
- prometer descontos;
- responder dúvidas médicas;
- dizer que um procedimento não causa reação ou alergia;
- insistir se a cliente não quiser agendar;
- fingir ser uma pessoa humana se a cliente perguntar diretamente.

Quando precisar de dados reais, use as ferramentas disponíveis.
Quando não tiver certeza, acione atendimento humano.

Dados fixos do negócio:
- Nome do negócio: [PREENCHER]
- Nome da profissional: [PREENCHER]
- Endereço: [PREENCHER]
- Formas de pagamento: [PREENCHER]
- Política de atraso: [PREENCHER]
- Política de cancelamento: [PREENCHER]
- Política de sinal: [PREENCHER]
16.2 Estilo de conversa

Configuração:

TOM_DE_VOZ=[PREENCHER]
EMOJIS_PERMITIDOS=💕, ✨, ☺️
USAR_AUDIO=false
RESPOSTAS_LONGAS=false
LINGUAGEM="natural, profissional, delicada"

Exemplo de estilo desejado:

“Oi, tudo bem? 💕 Faço sim! Você queria ver horário pra design de sobrancelha ou cílios?”

Exemplo de estilo proibido:

“Olá. Sou um assistente virtual automatizado. Por favor, selecione uma das opções abaixo para prosseguir.”

17. API própria — endpoints internos
17.1 Health check
GET /health

Resposta:

{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "2026-05-11T12:00:00-03:00"
}
17.2 Webhook de mensagens do Evolution Go
POST /webhooks/evolution?token=<EVOLUTION_WEBHOOK_TOKEN>

Responsável por receber eventos de mensagens.

Requisitos:

validar token simples do webhook;
extrair telefone;
extrair nome do contato;
extrair texto;
ignorar eventos sem mensagem;
salvar chave idempotente provider:instanceId:messageId;
não processar mensagem duplicada;
retornar HTTP 200 rapidamente;
processar IA de forma assíncrona, se necessário.

Payload interno normalizado:

type ChannelInboundMessage = {
  provider: "evolution-go";
  instanceId: string;
  messageId: string;
  chatId: string;
  customerPhone: string;
  customerName?: string;
  fromMe: boolean;
  isGroup: boolean;
  text?: string;
  kind: "text" | "audio" | "image" | "document" | "unknown";
  timestamp?: string;
  raw: unknown;
};
17.3 Forçar handoff humano
POST /internal/handoffs
{
  "phone": "5511999999999",
  "reason": "Cliente pediu encaixe urgente",
  "summary": "Cliente quer horário hoje após 19h para cílios."
}
17.4 Reprocessar conversa
POST /admin/conversations/:conversationId/reprocess

Uso opcional para debug.

18. Integração com Evolution Go
18.1 Variáveis de ambiente
CHANNEL_PROVIDER=evolution-go
EVOLUTION_WEBHOOK_TOKEN=[PREENCHER]
EVOLUTION_BASE_URL=http://evolution-go:8080
EVOLUTION_API_KEY=[PREENCHER]
EVOLUTION_INSTANCE_ID=[PREENCHER]
EVOLUTION_INSTANCE_NAME=salao-principal
EVOLUTION_SEND_TEXT_PATH=/send/text
EVOLUTION_IGNORE_GROUPS=true
EVOLUTION_BOT_ENABLED=true
HUMAN_HANDOFF_PAUSE_MINUTES=120
18.2 Tipos de mensagens suportados no MVP
Tipo	MVP
Texto	sim
Áudio	não, salvar e acionar humano
Imagem	não, salvar e acionar humano
Documento	não
Botões/listas	opcional
Templates	sim para confirmação/lembrete fora da janela
18.3 Templates sugeridos

Mensagens operacionais sugeridas:

Nome do template	Uso
confirmacao_agendamento	confirmar agendamento criado
lembrete_24h	lembrete 24h antes
lembrete_2h	lembrete no dia
cancelamento_confirmado	confirmar cancelamento
reagendamento_confirmado	confirmar remarcação
retorno_atendimento_humano	avisar que a profissional vai responder

Exemplo de template:

Oi, {{1}}! Passando pra lembrar do seu horário amanhã, {{2}}, às {{3}}, para {{4}}. 
Qualquer imprevisto, me avisa com antecedência, tá? 💕
19. Integração com OpenAI
19.1 Variáveis de ambiente
OPENAI_API_KEY=[PREENCHER]
OPENAI_MODEL=[PREENCHER]
OPENAI_TEMPERATURE=0.4
OPENAI_MAX_OUTPUT_TOKENS=600
19.2 Estratégia

A IA deve funcionar como orquestradora conversacional.

Ela pode:

entender intenção;
extrair dados;
decidir próxima pergunta;
chamar ferramentas;
resumir resultado;
responder naturalmente.

Ela não pode:

acessar diretamente token do Minha Agenda;
chamar endpoint externo livremente;
criar agendamento sem passar pela função validada;
ignorar regras de negócio.
19.3 Structured Outputs

Para classificação de intenção e extração de dados, pode-se usar saída estruturada com JSON Schema. A OpenAI documenta Structured Outputs como recurso para fazer o modelo aderir a um schema definido, reduzindo risco de campos faltando ou enums inválidos.

Exemplo de schema de intenção:

type IntentClassification = {
  intent:
    | "ask_service_price"
    | "ask_location"
    | "schedule_appointment"
    | "cancel_appointment"
    | "reschedule_appointment"
    | "ask_payment"
    | "complaint"
    | "human_request"
    | "unknown";
  confidence: number;
  extracted: {
    serviceName?: string;
    dateText?: string;
    timeText?: string;
    customerName?: string;
  };
};
20. Banco de dados próprio
20.1 Tabela conversations
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  phone_e164 TEXT NOT NULL,
  whatsapp_name TEXT,
  current_state TEXT NOT NULL DEFAULT 'idle',
  last_intent TEXT,
  context_json JSONB,
  human_handoff BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
20.2 Tabela messages
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  whatsapp_message_id TEXT UNIQUE,
  direction TEXT NOT NULL,
  type TEXT NOT NULL,
  content TEXT,
  raw_payload JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
20.3 Tabela tool_calls
CREATE TABLE tool_calls (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  input_json JSONB,
  output_json JSONB,
  success BOOLEAN NOT NULL,
  error TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
20.4 Tabela processed_events
CREATE TABLE processed_events (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  provider_event_id TEXT NOT NULL UNIQUE,
  processed_at TIMESTAMP NOT NULL DEFAULT NOW()
);
20.5 Tabela handoffs
CREATE TABLE handoffs (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  phone_e164 TEXT NOT NULL,
  reason TEXT NOT NULL,
  summary TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMP
);
21. Algoritmo de disponibilidade
21.1 Se o Minha Agenda tiver endpoint de horários disponíveis

Usar diretamente:

buscar_horarios_disponiveis(serviceId, dateFrom, dateTo)

A API deve:

Converter data relativa para data absoluta.
Consultar horários.
Filtrar horários inválidos.
Ordenar por proximidade.
Retornar no máximo 3 opções para a IA.
21.2 Se o Minha Agenda não tiver endpoint de disponibilidade

A API deve calcular disponibilidade com base em:

horários de funcionamento;
duração do serviço;
agendamentos existentes;
bloqueios;
intervalo entre atendimentos;
antecedência mínima.

Campos necessários:

HORARIO_FUNCIONAMENTO=[PREENCHER]
INTERVALO_ENTRE_ATENDIMENTOS_MINUTOS=[PREENCHER]
ANTECEDENCIA_MINIMA_HORAS=[PREENCHER]

Atenção: mesmo calculando disponibilidade localmente, antes de criar o agendamento a API deve consultar novamente os agendamentos do horário para evitar conflito.

22. Prevenção de agendamento duplicado

A API deve implementar:

Idempotência por whatsapp_message_id.
Confirmação explícita antes de criar.
Revalidação de disponibilidade imediatamente antes do POST de criação.
Registro do appointmentId retornado pelo Minha Agenda.
Bloqueio temporário por telefone/conversa durante criação.

Exemplo:

const lockKey = `booking:${phoneE164}`;

await acquireLock(lockKey, 30_000);

try {
  await revalidateSlot();
  await createAppointment();
} finally {
  await releaseLock(lockKey);
}
23. Tratamento de erros
23.1 Erro no Minha Agenda

Se a API do Minha Agenda falhar:

“Tô com uma instabilidade pra consultar a agenda agora. Vou chamar a profissional pra confirmar certinho pra você, tá? 💕”

Ação:

registrar erro;
criar handoff;
não oferecer horário inventado;
não criar agendamento parcial.
23.2 Erro no WhatsApp

Se falhar envio:

registrar erro;
tentar retry;
se continuar falhando, marcar conversa como send_failed.
23.3 Erro na OpenAI

Se falhar IA:

enviar resposta fallback curta, se possível;
acionar humano se o erro persistir.

Fallback:

“Só um instante, vou chamar a profissional pra te responder certinho, tá?”

24. Segurança
24.1 Tokens

Todos os tokens devem ficar em variáveis de ambiente:

OPENAI_API_KEY
EVOLUTION_API_KEY
MINHA_AGENDA_TOKEN
EVOLUTION_WEBHOOK_TOKEN

Não armazenar tokens em:

código-fonte;
commits;
logs;
mensagens;
planilhas.
24.2 Validação de webhook

Implementar:

verify_token no GET;
validação de assinatura do payload, se disponível;
allowlist opcional de IPs, se viável;
rate limit.
24.3 LGPD

A API tratará dados pessoais como nome, telefone, histórico de atendimento e agendamentos. A LGPD dispõe sobre tratamento de dados pessoais, inclusive em meios digitais, com objetivo de proteger liberdade, privacidade e desenvolvimento da personalidade da pessoa natural.

Requisitos:

coletar apenas dados necessários;
não pedir CPF, endereço residencial ou dados sensíveis sem necessidade;
permitir exclusão/anonymização mediante solicitação;
registrar finalidade: atendimento e agendamento;
limitar acesso aos logs;
mascarar telefone em logs públicos;
não usar conversas para treinamento externo sem autorização.
25. Monitoramento e logs
25.1 Eventos a registrar
Evento	Registrar
Mensagem recebida	sim
Mensagem enviada	sim
Intenção detectada	sim
Tool call	sim
Consulta de agenda	sim
Agendamento criado	sim
Cancelamento	sim
Remarcação	sim
Handoff	sim
Erro técnico	sim
25.2 Métricas do MVP
total de mensagens por dia;
conversas por dia;
agendamentos criados;
cancelamentos;
remarcações;
handoffs;
taxa de erro do Minha Agenda;
tempo médio de resposta;
intents mais comuns.
26. Critérios de aceite
26.1 Recebimento de mensagem

Dado que uma cliente envia mensagem pelo WhatsApp
Quando o webhook recebe o evento
Então a API deve salvar a mensagem, identificar o telefone e iniciar/resgatar a conversa.

26.2 Pergunta sobre serviço

Dado que a cliente pergunta o valor de um serviço cadastrado
Quando a IA processa a mensagem
Então deve consultar os serviços do Minha Agenda e responder com valor/duração reais.

26.3 Serviço inexistente

Dado que a cliente pergunta por serviço não cadastrado
Quando não houver correspondência confiável
Então a IA deve acionar humano e não inventar preço.

26.4 Agendamento

Dado que a cliente quer agendar
Quando informa serviço e data
Então a API deve consultar disponibilidade no Minha Agenda e oferecer até 3 horários.

26.5 Confirmação de agendamento

Dado que a cliente escolhe horário
Quando a IA pede confirmação final
Então o agendamento só deve ser criado se a cliente confirmar claramente.

26.6 Revalidação

Dado que a cliente confirmou um horário
Quando a API for criar o agendamento
Então deve revalidar disponibilidade antes do POST de criação.

26.7 Cancelamento

Dado que a cliente pede cancelamento
Quando houver agendamento ativo
Então a IA deve pedir confirmação antes de cancelar.

26.8 Handoff

Dado que a cliente relata alergia/reclamação/urgência
Quando a IA classificar como caso sensível
Então deve acionar humano e parar automação naquele fluxo.

27. Casos de teste essenciais
27.1 Perguntas simples
“Quanto é design?”
“Faz cílios?”
“Onde você atende?”
“Aceita Pix?”
“Tem horário hoje?”
27.2 Agendamento
“Quero marcar sobrancelha amanhã.”
“Tem cílios sexta à tarde?”
“Pode ser às 15h.”
“Confirmo.”
“Qualquer horário de manhã.”
27.3 Cancelamento
“Cancela meu horário.”
“Não vou conseguir ir amanhã.”
“Quero desmarcar.”
“Pode cancelar sim.”
27.4 Remarcação
“Consegue trocar pra outro dia?”
“Queria passar de sexta pra sábado.”
“Tem mais cedo?”
27.5 Erros e exceções
Cliente sem nome.
Serviço ambíguo.
Duas clientes tentando o mesmo horário.
Minha Agenda fora do ar.
Cliente pede desconto.
Cliente reclama.
Cliente manda áudio.
Cliente manda imagem.
28. Configurações do negócio

Arquivo sugerido:

export const businessConfig = {
  businessName: "[PREENCHER]",
  professionalName: "[PREENCHER]",
  address: "[PREENCHER]",
  paymentMethods: ["Pix", "Dinheiro", "Cartão"],
  cancellationPolicy: "[PREENCHER]",
  delayPolicy: "[PREENCHER]",
  depositPolicy: "[PREENCHER]",
  workingTimezone: "America/Sao_Paulo",
  maxSlotsToOffer: 3,
  minAdvanceHours: "[PREENCHER]",
  emojisAllowed: ["💕", "✨", "☺️"],
  humanContactPhone: "[PREENCHER]"
};
29. Variáveis de ambiente completas
NODE_ENV=production
PORT=3000

DATABASE_URL=[PREENCHER]

OPENAI_API_KEY=[PREENCHER]
OPENAI_MODEL=[PREENCHER]
OPENAI_TEMPERATURE=0.4
OPENAI_MAX_OUTPUT_TOKENS=600

CHANNEL_PROVIDER=evolution-go
EVOLUTION_WEBHOOK_TOKEN=[PREENCHER]
EVOLUTION_BASE_URL=http://evolution-go:8080
EVOLUTION_API_KEY=[PREENCHER]
EVOLUTION_INSTANCE_ID=[PREENCHER]
EVOLUTION_INSTANCE_NAME=salao-principal
EVOLUTION_SEND_TEXT_PATH=/send/text
EVOLUTION_IGNORE_GROUPS=true
EVOLUTION_BOT_ENABLED=true
HUMAN_HANDOFF_PAUSE_MINUTES=120

MINHA_AGENDA_BASE_URL=[PREENCHER]
MINHA_AGENDA_AUTH_TYPE=[PREENCHER]
MINHA_AGENDA_TOKEN=[PREENCHER]
MINHA_AGENDA_TIMEOUT_MS=10000
MINHA_AGENDA_RETRY_ATTEMPTS=2

OWNER_PHONE_E164=[PREENCHER]
BUSINESS_TIMEZONE=America/Sao_Paulo
30. Estrutura de pastas sugerida
src/
  app.ts
  server.ts

  config/
    env.ts
    business-config.ts

  modules/
    channel/
      domain/
        ChannelMessage.ts
      ports/
        WhatsAppProvider.ts
      adapters/
        evolution/
          EvolutionInboundMapper.ts
          EvolutionProvider.ts
      routes/
        evolutionWebhook.routes.ts

    automation/
      MessageOrchestrator.ts

    openai/
      openai.client.ts
      assistant.service.ts
      tools.registry.ts
      prompts.ts
      schemas.ts

    minha-agenda/
      minha-agenda.client.ts
      minha-agenda.mapper.ts
      minha-agenda.types.ts

    conversations/
      conversation.service.ts
      conversation.state-machine.ts
      intent.service.ts

    appointments/
      appointment.service.ts
      availability.service.ts
      booking-lock.service.ts

    handoff/
      handoff.service.ts
      owner-notification.service.ts

    persistence/
      db.ts
      repositories/

    logs/
      logger.ts

  shared/
    errors.ts
    date-utils.ts
    phone-utils.ts
    idempotency.ts
31. Roadmap
Fase 1 — Fundação técnica
criar projeto Node.js/TypeScript;
configurar banco;
configurar webhook do WhatsApp;
receber mensagens;
enviar mensagens simples;
salvar logs.
Fase 2 — Minha Agenda
configurar token;
implementar client HTTP;
mapear serviços;
mapear clientes;
mapear agendamentos;
testar disponibilidade;
testar criação/cancelamento.
Fase 3 — IA
criar prompt base;
criar tools;
implementar function calling;
classificar intenções;
responder dúvidas;
consultar serviços reais.
Fase 4 — Agendamento
fluxo de escolha de serviço;
fluxo de escolha de data;
consulta de horários;
confirmação final;
criação do agendamento;
resposta de confirmação.
Fase 5 — Cancelamento/remarcação
buscar agendamento pelo telefone;
confirmar cancelamento;
cancelar no Minha Agenda;
remarcar, se endpoint permitir.
Fase 6 — Segurança e produção
idempotência;
retries;
rate limit;
logs;
alertas;
handoff humano;
templates aprovados;
testes finais.
32. Pendências para preencher quando você fornecer a API do Minha Agenda

Checklist:

[ ] Base URL do Minha Agenda
[ ] Tipo de autenticação
[ ] Token/API key
[ ] Endpoint de serviços
[ ] Endpoint de disponibilidade
[ ] Endpoint de criar agendamento
[ ] Endpoint de cancelar agendamento
[ ] Endpoint de remarcar agendamento
[ ] Endpoint de cliente por telefone
[ ] Endpoint de criar cliente
[ ] Formato de data/hora usado pela API
[ ] Timezone usado pela API
[ ] IDs de agenda/profissional
[ ] Status possíveis de agendamento
[ ] Payload real de resposta dos serviços
[ ] Payload real de resposta dos horários
[ ] Payload real de criação de agendamento
[ ] Payload real de cancelamento
[ ] Limites/rate limits da API
[ ] Se existe webhook do Minha Agenda
33. Decisão recomendada para o MVP

A primeira versão deve ser simples:

Evolution Go para entrada/saída;
Node.js + TypeScript para API;
OpenAI com function calling para conversa e ferramentas;
Minha Agenda como fonte da verdade;
Postgres/Supabase ou SQLite apenas para estado e logs;
handoff humano obrigatório para exceções;
sem pagamento automático no começo.

Com essa arquitetura, você evita mensalidades desnecessárias, mantém o Minha Agenda como sistema principal e cria um atendimento inteligente sem perder controle sobre os agendamentos.
