import type { FastifyInstance, FastifyReply } from "fastify";

const updatedAt = "16 de maio de 2026";
const serviceName = "Atendente IA";
const businessName = "Camili Krauser";
const contactEmail = "camililash@outlook.com";

export async function registerLegalRoutes(app: FastifyInstance): Promise<void> {
  app.get("/privacy", async (_request, reply) => {
    return sendLegalPage(reply, "Política de Privacidade", renderPrivacyPolicy());
  });

  app.get("/terms", async (_request, reply) => {
    return sendLegalPage(reply, "Termos de Uso", renderTermsOfUse());
  });

  app.get("/data-deletion", async (_request, reply) => {
    return sendLegalPage(reply, "Exclusão de Dados", renderDataDeletionInstructions());
  });
}

function sendLegalPage(reply: FastifyReply, title: string, content: string): FastifyReply {
  return reply
    .header("Cache-Control", "public, max-age=300")
    .type("text/html; charset=utf-8")
    .send(renderLayout(title, content));
}

function renderLayout(title: string, content: string): string {
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} | ${serviceName}</title>
  <style>
    :root {
      color-scheme: light;
      --background: #f7f3ed;
      --surface: #ffffff;
      --text: #1f2933;
      --muted: #5b6472;
      --border: #ded6ca;
      --accent: #6b3f58;
      --accent-soft: #f2e8ee;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      background: var(--background);
      color: var(--text);
      font-family: Arial, Helvetica, sans-serif;
      line-height: 1.6;
    }

    main {
      width: min(880px, calc(100% - 32px));
      margin: 32px auto;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: clamp(24px, 5vw, 48px);
    }

    nav {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 32px;
      padding-bottom: 20px;
      border-bottom: 1px solid var(--border);
    }

    nav a {
      color: var(--accent);
      background: var(--accent-soft);
      border-radius: 6px;
      padding: 8px 12px;
      text-decoration: none;
      font-size: 0.94rem;
      font-weight: 700;
    }

    h1 {
      margin: 0 0 8px;
      font-size: clamp(2rem, 5vw, 3rem);
      line-height: 1.1;
    }

    h2 {
      margin: 32px 0 8px;
      font-size: 1.25rem;
      line-height: 1.3;
    }

    p {
      margin: 0 0 14px;
    }

    ul, ol {
      padding-left: 24px;
      margin: 8px 0 18px;
    }

    li {
      margin-bottom: 8px;
    }

    a {
      color: var(--accent);
      overflow-wrap: anywhere;
    }

    .updated {
      color: var(--muted);
      margin-bottom: 24px;
    }

    .notice {
      border-left: 4px solid var(--accent);
      background: var(--accent-soft);
      padding: 14px 16px;
      border-radius: 6px;
    }
  </style>
</head>
<body>
  <main>
    <nav aria-label="Páginas legais">
      <a href="/privacy">Privacidade</a>
      <a href="/terms">Termos</a>
      <a href="/data-deletion">Exclusão de dados</a>
    </nav>
    ${content}
  </main>
</body>
</html>`;
}

function renderPrivacyPolicy(): string {
  return `
    <h1>Política de Privacidade</h1>
    <p class="updated">Última atualização: ${updatedAt}</p>

    <p>Esta Política de Privacidade explica como o ${serviceName}, usado no atendimento por WhatsApp do negócio de beleza de ${businessName}, trata dados pessoais para responder clientes, consultar disponibilidade e apoiar agendamentos.</p>

    <h2>1. Dados que podemos tratar</h2>
    <p>Podemos tratar os seguintes dados, conforme a interação da cliente com o atendimento:</p>
    <ul>
      <li>Nome, telefone e identificadores de contato recebidos pelo WhatsApp ou informados pela cliente.</li>
      <li>Conteúdo das mensagens enviadas ao atendimento, incluindo dúvidas, preferências de serviço e pedidos de agendamento, cancelamento ou remarcação.</li>
      <li>Dados de agendamento, como serviço solicitado, data, horário, profissional, status do atendimento e histórico operacional necessário para prestar o serviço.</li>
      <li>Registros técnicos da aplicação, como eventos de webhook, identificadores de mensagens, erros e logs de segurança.</li>
    </ul>

    <h2>2. Finalidades de uso</h2>
    <p>Os dados são usados para:</p>
    <ul>
      <li>Responder mensagens e prestar atendimento pelo WhatsApp.</li>
      <li>Consultar serviços, disponibilidade e agendamentos no sistema Minha Agenda.</li>
      <li>Criar, cancelar, remarcar ou acompanhar agendamentos quando solicitado.</li>
      <li>Acionar atendimento humano quando o caso exigir revisão da profissional.</li>
      <li>Manter segurança, prevenir abuso, diagnosticar erros e cumprir obrigações legais.</li>
    </ul>

    <h2>3. Compartilhamento e operadores</h2>
    <p>Para operar o atendimento, dados podem trafegar por serviços de terceiros estritamente necessários, incluindo WhatsApp via Evolution Go, Minha Agenda, OpenAI e provedores de hospedagem e banco de dados. Esses terceiros tratam dados conforme suas próprias políticas e conforme as configurações técnicas do serviço.</p>

    <h2>4. Base legal e consentimento</h2>
    <p>O tratamento ocorre para executar o atendimento solicitado pela cliente, cumprir obrigações legais ou atender interesses legítimos de segurança e operação. Quando uma cliente envia mensagem ao WhatsApp do negócio, entende-se que ela solicita atendimento naquele canal.</p>

    <h2>5. Retenção</h2>
    <p>Os dados são mantidos pelo tempo necessário para atendimento, controle de agendamentos, segurança, auditoria e cumprimento de obrigações legais. Quando possível, dados deixam de ser associados a uma pessoa identificável após pedido de exclusão ou quando não forem mais necessários.</p>

    <h2>6. Direitos da titular</h2>
    <p>A cliente pode solicitar confirmação de tratamento, acesso, correção, anonimização, bloqueio ou exclusão de dados, observados limites legais e operacionais. Para exercer esses direitos, envie uma solicitação para <a href="mailto:${contactEmail}">${contactEmail}</a> ou pelo próprio WhatsApp do atendimento.</p>

    <h2>7. Segurança</h2>
    <p>Adotamos medidas técnicas e administrativas para restringir acesso a dados, proteger credenciais, validar webhooks e reduzir exposição de informações pessoais em logs. Nenhum sistema é completamente imune a riscos, mas buscamos limitar o tratamento ao necessário para a prestação do serviço.</p>

    <h2>8. Alterações nesta política</h2>
    <p>Esta política pode ser atualizada para refletir mudanças no atendimento, na tecnologia usada ou em requisitos legais. A versão publicada nesta página é a versão vigente.</p>

    <h2>9. Contato</h2>
    <p>Para dúvidas sobre privacidade ou uso de dados, entre em contato pelo email <a href="mailto:${contactEmail}">${contactEmail}</a>.</p>
  `;
}

function renderTermsOfUse(): string {
  return `
    <h1>Termos de Uso</h1>
    <p class="updated">Última atualização: ${updatedAt}</p>

    <p>Estes Termos de Uso regulam o acesso e uso do ${serviceName}, assistente de atendimento por WhatsApp usado para apoiar o relacionamento entre clientes e o negócio de beleza de ${businessName}.</p>

    <h2>1. O que o serviço faz</h2>
    <p>O serviço auxilia em respostas sobre atendimentos, consulta de horários, solicitações de agendamento, remarcação, cancelamento e encaminhamento para atendimento humano quando necessário.</p>

    <h2>2. Uso adequado</h2>
    <p>A cliente deve usar o atendimento de forma lícita, respeitosa e com informações verdadeiras. Não é permitido tentar acessar áreas restritas, interferir no funcionamento da API, enviar conteúdo abusivo, fraudulento ou que viole direitos de terceiros.</p>

    <h2>3. Agendamentos e informações de serviço</h2>
    <p>Horários, duração, valores, políticas de atraso, cancelamento e pagamento podem depender das regras do negócio e da disponibilidade real da agenda. Um agendamento só deve ser considerado confirmado quando o atendimento informar a confirmação ou quando constar no sistema de agenda usado pelo negócio.</p>

    <h2>4. Atendimento automatizado e atendimento humano</h2>
    <p>Parte do atendimento pode ser automatizada com apoio de inteligência artificial. Casos sensíveis, ambíguos, reclamações, urgências, mensagens fora do escopo, imagens, áudios ou falhas técnicas podem ser encaminhados para a profissional responsável.</p>

    <h2>5. Disponibilidade</h2>
    <p>O serviço pode ficar indisponível temporariamente por manutenção, falhas de provedores externos, indisponibilidade do WhatsApp, do Evolution Go, do Minha Agenda, da OpenAI ou de infraestrutura de hospedagem. Não garantimos funcionamento ininterrupto.</p>

    <h2>6. Privacidade</h2>
    <p>O tratamento de dados pessoais está descrito na <a href="/privacy">Política de Privacidade</a>. Ao usar o atendimento, a cliente reconhece que suas mensagens e dados necessários poderão ser tratados para prestar o serviço solicitado.</p>

    <h2>7. Limitação de responsabilidade</h2>
    <p>O serviço busca fornecer informações corretas e atuais, mas pode haver erro, atraso ou indisponibilidade. Quando houver divergência, prevalecem as informações confirmadas diretamente pela profissional ou registradas no sistema oficial de agenda do negócio.</p>

    <h2>8. Alterações dos termos</h2>
    <p>Estes termos podem ser atualizados a qualquer momento para refletir mudanças operacionais, legais ou técnicas. A versão publicada nesta página é a versão vigente.</p>

    <h2>9. Contato</h2>
    <p>Para dúvidas sobre estes termos, entre em contato pelo email <a href="mailto:${contactEmail}">${contactEmail}</a>.</p>
  `;
}

function renderDataDeletionInstructions(): string {
  return `
    <h1>Exclusão de Dados</h1>
    <p class="updated">Última atualização: ${updatedAt}</p>

    <p class="notice">Esta página explica como solicitar exclusão de dados associados ao atendimento por WhatsApp.</p>

    <p>Se você interagiu com o ${serviceName} pelo WhatsApp, pode solicitar a exclusão dos dados pessoais associados ao seu atendimento.</p>

    <h2>1. Como pedir exclusão diretamente</h2>
    <p>Envie um email para <a href="mailto:${contactEmail}?subject=Exclus%C3%A3o%20de%20dados%20-%20Atendente%20IA">${contactEmail}</a> com o assunto "Exclusão de dados - Atendente IA" e inclua, quando possível:</p>
    <ul>
      <li>Nome usado no atendimento.</li>
      <li>Telefone WhatsApp usado para conversar com o atendimento.</li>
      <li>Descrição do que deseja excluir ou anonimizar.</li>
    </ul>
    <p>Você também pode solicitar a exclusão pelo próprio WhatsApp do atendimento, informando que deseja remover seus dados pessoais.</p>

    <h2>2. O que será excluído ou anonimizado</h2>
    <p>Após verificação da solicitação, removeremos ou anonimizaremos dados pessoais mantidos pelo ${serviceName}, como histórico de mensagens, vínculo entre telefone e cliente, registros operacionais associados e dados de atendimento que não precisem ser preservados por obrigação legal, segurança, defesa de direitos ou execução de serviços ainda pendentes.</p>

    <h2>3. Prazos</h2>
    <p>Confirmaremos o recebimento da solicitação e buscaremos concluir a exclusão ou anonimização em até 15 dias, salvo quando houver necessidade de prazo maior por obrigação legal, validação de identidade, preservação de registros ou dependência de sistemas de terceiros.</p>

    <h2>4. Dados em serviços de terceiros</h2>
    <p>Alguns dados podem permanecer em sistemas de terceiros necessários ao atendimento, como WhatsApp via Evolution Go, Minha Agenda, OpenAI, provedores de hospedagem ou backups temporários. Quando aplicável, a exclusão seguirá os procedimentos e prazos desses fornecedores.</p>

    <h2>5. Contato</h2>
    <p>Para acompanhar uma solicitação de exclusão, envie email para <a href="mailto:${contactEmail}">${contactEmail}</a>.</p>
  `;
}
