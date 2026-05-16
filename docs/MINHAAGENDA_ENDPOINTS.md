# Mapa de endpoints - Minha Agenda Portal

## Escopo e premissas

- Portal analisado: `https://portal.minhaagendaapp.com.br`.
- API de produção usada pelo frontend: `https://api.minhaagendaapp.com.br`.
- Todas as chamadas passam pelo `HttpService` do frontend, que usa Axios com `withCredentials: true` e timeout de 20s em produção.
- Cabeçalho comum: `APP_IS_WEB: true`.
- Autenticação comum: `Authorization: Bearer <access_token>` em todos os endpoints, exceto `/oauth/token?isWeb=true`.
- Login usa `application/x-www-form-urlencoded`, `grant_type=password` e `Authorization: Basic <client_secret_do_app>`. O valor do secret/token foi omitido intencionalmente.
- Resposta normal: o interceptor retorna `response.data`. Em erros 4xx/5xx, o frontend espera `message` e/ou `errors[]` no corpo.
- Endpoints com `responseType: arraybuffer` geram arquivos PDF/XLSX no browser. Endpoints com `multipart/form-data` enviam arquivo em `FormData`.
- O OpenAPI/Swagger da API respondeu `401 unauthorized`, então os contratos abaixo são os contratos observados no frontend, não um schema oficial do backend.

## Rotas e menus do portal

| Menu/contexto | Rota(s) principais | Observação |
|---|---|---|
| Agenda | `/agenda` | Agenda diária/semanal, busca, aniversariantes, exportação, lista de espera e pagamentos do atendimento. |
| Cobranças | `/cobrancas` | Cobrança de atendimentos não pagos e recibos. |
| Comandas | `/comandas` | Contas/comandas abertas/fechadas, itens, pagamentos e recibos. |
| Msgs Pre-definidas | `/msgs-pre-definidas` | Templates de mensagens e variáveis para WhatsApp. |
| Clientes & Anamneses | `/clientes`, `/detalhes-do-cliente/:customerId` | Cadastro, comentários, imagens, créditos, orçamentos, unificação e fichas/anamneses. |
| Serviços & Pacotes | `/servicos` | Serviços, pacotes e categorias. |
| Produtos & Estoque | `/produtos-estoque` | Produtos, estoque, compras, vendas, fornecedores e categorias. |
| Despesas | `/despesas` | Despesas, recorrência/fixas, status de pagamento e categorias. |
| Profissionais & Comissão | `/profissionais`, `/profissionais/comissoes` | Profissionais, permissões, avatares, comissão, adiantamentos e pagamentos de comissão. |
| Relatórios / Performance | `/performance`, `/relatorios`, `/melhores-clientes` | Indicadores, fluxo de caixa, resumo financeiro e ranking de clientes. |
| Configurações | `/configuracoes` | Empresa, usuário, tema, horários, taxas, quadras e assinatura. |
| Premium/assinatura | `/quero-ser-premium`, `/gerenciar-assinatura`, rotas temporárias | Stripe/Asaas, portal do cliente, upgrades e ativação por código temporário. |
| Root/Admin | `/newUsers`, `/companiesExpiring`, `/manageCompany`, `/manageUser`, `/asaasCustomers`, etc. | Rotas administrativas presentes no bundle; dependem de permissões elevadas. |

## Autenticação e sessão
Contexto transversal: login, logout, usuário autenticado, recuperação/troca de senha e status básico da conta.
#### AuthService

| Ação frontend | Método | Endpoint | Contrato observado no frontend |
|---|---:|---|---|
| login(userLogin) | POST | `/oauth/token?isWeb=true` | body: formData; config: config |
| logout() | POST | `/logout` | sem body/query no frontend |
| getLoggedInUser() | GET | `/auth/loggedInUser` | sem body/query no frontend |
| updatePassword(passwordUpdateRequest, acessToken) | POST | `/resetPassword` | body: passwordUpdateRequest; config: config |
| updatePassword(passwordUpdateRequest, acessToken) | POST | `/resetPassword` | body: passwordUpdateRequest |
| sendResetPasswordCode(email) | POST | `/passwordRecovery?generateCodeLink=true` | body: { email } |
| resetPassword(code, password) | POST | `/passwordRecovery/reset` | body: { code, password } |

#### UserService

| Ação frontend | Método | Endpoint | Contrato observado no frontend |
|---|---:|---|---|
| getCurrentUser() | GET | `/user/me` | sem body/query no frontend |
| getMyCompany() | GET | `/user/myCompany` | sem body/query no frontend |
| getAccountStatus() | GET | `/user/accountStatus` | sem body/query no frontend |
| checkAccountStatus(isIOS) | GET | `/user/checkAccountStatus` | query: isIOS |
| getUserInfo() | GET | `/user/info` | sem body/query no frontend |
| signUp(user) | POST | `/signUp` | body: user |


## Menu: Agenda
Contexto: carregamento da agenda, busca de atendimentos, criação/edição/cancelamento, repetição, pagamentos, recibo, aniversariantes, sala/profissional e lista de espera.
#### AppointmentService

| Ação frontend | Método | Endpoint | Contrato observado no frontend |
|---|---:|---|---|
| sync(dataList, installationId) | POST | `/appointments/sync` | query: installationId; body: dataList |
| create(appointment) | POST | `/appointments` | body: appointment |
| createAll(appointment) | POST | `/appointments/all` | body: appointment |
| update(appointment) | PUT | `/appointments/{appointment.id}` | body: appointment |
| updateRepetition(appointment) | PUT | `/appointments/{appointment.id}/repetition` | body: appointment |
| deleteRepetition(appointment) | DELETE | `/appointments/{appointment.id}/repetition` | sem body/query no frontend |
| delete(appointment) | DELETE | `/appointments/{appointment.id}` | sem body/query no frontend |
| cancel(appointment) | DELETE | `/appointments/cancel/{appointment.id}` | sem body/query no frontend |
| cancelWithComments(appointmentId, comments) | PUT | `/appointments/cancelWithComments/{appointmentId}` | body: { comments } |
| getById(id) | GET | `/appointments/{id}` | sem body/query no frontend |
| getAllByDate(date) | GET | `/appointments` | query: date |
| getOccupancyStatus(startDate, endDate) | GET | `/appointments/occupancyStatus` | query: startDate, endDate |
| getAllBetweenGroupedByDate(startDate, endDate) | GET | `/appointments/groupedByDate` | query: startDate, endDate |
| getAllByDateGroupedByUser(date) | GET | `/appointments/groupedByEmployee` | query: date |
| getGroupedByEmployeesByDateAndEmployeeIdsOrRoomIds(date, employeeIds, roomIds) | GET | `/appointments/groupedByEmployeesOrRooms` | query: date, employeeIds: employeeIds.join(','), roomIds: roomIds.join(',') |
| getAllByDateForCurrentUser(date) | GET | `/appointments/groupedByEmployee/currentUser` | query: date |
| searchForUser(customerName, startDate, endDate) | GET | `/appointments/search` | query: customerName, startDate, endDate |
| searchForCompany(customerName, startDate, endDate) | GET | `/appointments/searchForCompany` | query: customerName, startDate, endDate |
| findByDateRange({ startDate, endDate, employeeId, fetchComandas }) | GET | `/appointments/byDateRange` | query: startDate, endDate, employeeId, fetchComandas |
| findAppsByDateRange({ startDate, endDate, employeeId, customerId, serviceId, isSlotBlocker }) | GET | `/appointments/appsByDateRange` | query: startDate, endDate, employeeId, customerId, serviceId, isSlotBlocker |
| findAppsByDateRangeWithAudit({ startDate, endDate, employeeId, customerId, onlyDeleted, isSlotBlocker }) | GET | `/appointments/appsByDateRangeWithAudit` | query: startDate, endDate, employeeId, customerId, onlyDeleted, isSlotBlocker |
| findAppsByCreatedAtDateRangeWithAudit({ startDate, endDate, employeeId }) | GET | `/appointments/appsByCreatedAtDateRangeWithAudit` | query: startDate, endDate, employeeId |
| findWeeklyAgenda({ startOfWeek, endOfWeek, employeeId, fetchComandas }) | GET | `/appointments/weeklyAgenda` | query: startOfWeek, endOfWeek, employeeId, fetchComandas |
| findAllForCurrentUser() | GET | `/appointments` | sem body/query no frontend |
| findMostRecentDistinctServices(employeeId) | GET | `/appointments/mostRecentDistinctServices` | query: employeeId |
| findNumberOfAppointmentsForPeriod(startDate, endDate) | GET | `/appointments/mostRecentDistinctServices` | query: startDate, endDate |
| exists({ employeeId, date, startTime, exceptForId }) | GET | `/appointments/exists` | query: employeeId, date, startTime, exceptForId |
| findAllNonPaid(customerId) | GET | `/appointments/nonPaids` | query: customerId |
| addNonPaid(appointment) | POST | `/appointments/nonPaids/{appointment.id}` | sem body/query no frontend |
| removeNonPaid(appointment) | DELETE | `/appointments/nonPaids/{appointment.id}` | sem body/query no frontend |
| createPayment(payment) | POST | `/appointments/{payment.appointmentId}/payments` | body: payment |
| deletePayment(payment) | DELETE | `/appointments/{payment.appointmentId}/payments/{payment.id}` | sem body/query no frontend |
| getPayments(appointmentId) | GET | `/appointments/{appointmentId}/payments` | query: appointmentId |
| getPaymentSummary(appointmentId) | GET | `/appointments/{appointmentId}/paymentSummary` | query: appointmentId |
| generateReceipt(appointmentId) | POST | `/appointments/{appointmentId}/receiptFile` | body: null; responseType: arraybuffer |
| applyDiscount(appointmentId, form) | PUT | `/appointments/{appointmentId}/discount` | body: form |
| updateComments(appointmentId, form) | PUT | `/appointments/{appointmentId}/comments` | body: form |
| updateTag(appointmentId, form) | PUT | `/appointments/{appointmentId}/tag` | body: form |
| updatePaymentMethod(appointmentId, form) | PUT | `/appointments/{appointmentId}/paymentMethod` | body: form |
| getByCustomerAndTag({ startDate, endDate, customerId, appointmentTag }) | GET | `/appointments/byCustomerAndTag` | query: startDate, endDate, customerId, appointmentTag |
| getCompanyPerformance({ startDate, endDate }) | GET | `/appointments/companyPerformance` | query: startDate, endDate |
| getEmployeePerformance({ startDate, endDate, employeeId }) | GET | `/appointments/employeePerformance` | query: startDate, endDate, employeeId |

#### WaitingAppointmentService

| Ação frontend | Método | Endpoint | Contrato observado no frontend |
|---|---:|---|---|
| create(waitingAppointment) | POST | `/waitingAppointments` | body: waitingAppointment |
| update(waitingAppointment) | PUT | `/waitingAppointments/{waitingAppointment.id}` | body: waitingAppointment |
| delete(waitingAppointment) | DELETE | `/waitingAppointments/{waitingAppointment.id}` | sem body/query no frontend |
| getById(id) | GET | `/waitingAppointments/{id}` | sem body/query no frontend |
| findAllForCurrentUser() | GET | `/waitingAppointments` | sem body/query no frontend |
| reOrder(waitingAppointmentPreferenceOrderList) | POST | `/waitingAppointments/ordering` | body: waitingAppointmentPreferenceOrderList |

#### EmployeeService

| Ação frontend | Método | Endpoint | Contrato observado no frontend |
|---|---:|---|---|
| findAllForCurrentCompany(professionalOnly, excludeAgendaOnly) | GET | `/employees` | query: professionalOnly, excludeAgendaOnly |
| findAllEmployeesProfessional({ excludeThirdParties, includeDeleted }) | GET | `/employees/professionals` | query: excludeThirdParties, includeDeleted |
| findAllEmployeesFilterAdvanced({ professionalOnly, excludeThirdParties, includeDeleted }) | GET | `/employees/filterAdvanced` | query: professionalOnly, excludeThirdParties, includeDeleted |

#### RoomService

| Ação frontend | Método | Endpoint | Contrato observado no frontend |
|---|---:|---|---|
| findAllForCurrentUser() | GET | `/rooms` | sem body/query no frontend |

#### CustomerService

| Ação frontend | Método | Endpoint | Contrato observado no frontend |
|---|---:|---|---|
| search(query) | GET | `/customers/search` | query: query |
| getBirthdayCountForPeriod(startDate, endDate) | GET | `/customers/birthdayCount` | query: startDate, endDate |
| getBirthdayListForPeriod(startDate, endDate) | GET | `/customers/birthdayList` | query: startDate, endDate |

#### PredefinedMessageService

| Ação frontend | Método | Endpoint | Contrato observado no frontend |
|---|---:|---|---|
| findAllForCurrentUser() | GET | `/predefinedMessages` | sem body/query no frontend |
| search(query) | GET | `/predefinedMessages/search` | query: query |


## Menu: Cobranças
Contexto: atendimentos não pagos, cobrança, resumo de pagamento, recibo e créditos do cliente aplicados ao atendimento.
#### AppointmentService

| Ação frontend | Método | Endpoint | Contrato observado no frontend |
|---|---:|---|---|
| findAllNonPaid(customerId) | GET | `/appointments/nonPaids` | query: customerId |
| addNonPaid(appointment) | POST | `/appointments/nonPaids/{appointment.id}` | sem body/query no frontend |
| removeNonPaid(appointment) | DELETE | `/appointments/nonPaids/{appointment.id}` | sem body/query no frontend |
| createPayment(payment) | POST | `/appointments/{payment.appointmentId}/payments` | body: payment |
| deletePayment(payment) | DELETE | `/appointments/{payment.appointmentId}/payments/{payment.id}` | sem body/query no frontend |
| getPayments(appointmentId) | GET | `/appointments/{appointmentId}/payments` | query: appointmentId |
| getPaymentSummary(appointmentId) | GET | `/appointments/{appointmentId}/paymentSummary` | query: appointmentId |
| generateReceipt(appointmentId) | POST | `/appointments/{appointmentId}/receiptFile` | body: null; responseType: arraybuffer |

#### CustomerCreditService

| Ação frontend | Método | Endpoint | Contrato observado no frontend |
|---|---:|---|---|
| findTotalSumByAppointmentId(appointmentId) | GET | `/customerCredits/totalSum` | query: appointmentId |


## Menu: Comandas
Contexto: contas/comandas abertas ou fechadas, cobrança de comanda, itens de pacote, pagamentos, recibos e associação de atendimentos.
#### AccountsReceivableService

| Ação frontend | Método | Endpoint | Contrato observado no frontend |
|---|---:|---|---|
| createComandaCharge(accountsReceivable) | POST | `/accountsReceivables/comandaCharge` | body: accountsReceivable |
| updateComandaCharge(comandaChargeInfo) | PUT | `/accountsReceivables/comandaCharge/{comandaChargeInfo.id}` | body: comandaChargeInfo |
| createWithComandaInfo(accountsReceivable) | POST | `/accountsReceivables/withComandaInfo` | body: accountsReceivable |
| create(accountsReceivable) | POST | `/accountsReceivables` | body: accountsReceivable |
| update(accountsReceivable) | PUT | `/accountsReceivables/{accountsReceivable.id}` | body: accountsReceivable |
| delete(accountsReceivable) | DELETE | `/accountsReceivables/{accountsReceivable.id}` | sem body/query no frontend |
| openOrClose({ accountsReceivableId, opened }) | PUT | `/accountsReceivables/{accountsReceivableId}/{opened ? 'opened' : 'closed'}` | sem body/query no frontend |
| getById(id) | GET | `/accountsReceivables/{id}` | sem body/query no frontend |
| getComandaChargeById(id) | GET | `/accountsReceivables/comandaCharge/{id}` | sem body/query no frontend |
| findAllForCurrentUser({ opened, customerId }) | GET | `/accountsReceivables` | query: opened, customerId |
| existsOpen(customerId) | GET | `/accountsReceivables/opened` | query: customerId |
| findOpenedList(customerId) | GET | `/accountsReceivables/openedList` | query: customerId |
| searchForCurrentUser({ customerName, opened, startDate, endDate }) | GET | `/accountsReceivables/search` | query: customerName, opened, startDate, endDate |
| getAllForCustomerByOpened(customerId, opened) | GET | `/customers/{customerId}/comandas` | query: customerId, opened |
| getAllForCustomerByOpenedAndDateRange({ customerId, opened, startDate, endDate }) | GET | `/customers/{customerId}/comandas` | query: customerId, opened, startDate, endDate |
| getAllOpened() | GET | `/accountsReceivables/allOpened` | query: opened: true |
| getItemsWithStatus(accountsReceivableId) | GET | `/accountsReceivables/{accountsReceivableId}/servicePackageStatus` | query: accountsReceivableId |
| createPayment(payment) | POST | `/accountsReceivables/{payment.accountsReceivableId}/payments` | body: payment |
| deletePayment(payment) | DELETE | `/accountsReceivables/{payment.accountsReceivableId}/payments/{payment.id}` | sem body/query no frontend |
| getPayments(accountsReceivableId) | GET | `/accountsReceivables/{accountsReceivableId}/payments` | query: accountsReceivableId |
| getAppointments(accountsReceivableId) | GET | `/accountsReceivables/{accountsReceivableId}/appointments` | query: accountsReceivableId |
| generateReceipt(accountsReceivableId) | POST | `/accountsReceivables/{accountsReceivableId}/receiptFile` | body: null; responseType: arraybuffer |
| findAppointmentsForComandaChargeWithPaymentsByCustomerId(customerId) | GET | `/accountsReceivables/comandaCharge/appointmentsWithPayments` | query: customerId |
| findAppointmentsForComandaChargeByCustomerId(customerId, includeFutureAppointments) | GET | `/accountsReceivables/comandaCharge/appointments` | query: customerId, includeFutureAppointments |
| findAppointmentsForComandaChargeByComandaId(comandaId, includeFutureAppointments) | GET | `/accountsReceivables/comandaCharge/appointments` | query: comandaId, includeFutureAppointments |

#### ServicePackageService

| Ação frontend | Método | Endpoint | Contrato observado no frontend |
|---|---:|---|---|
| findAllForCurrentUser() | GET | `/servicePackages` | sem body/query no frontend |
| searchForCurrentUser(query) | GET | `/servicePackages/search` | query: query |

#### ServiceService

| Ação frontend | Método | Endpoint | Contrato observado no frontend |
|---|---:|---|---|
| findAllForCurrentUser() | GET | `/services` | sem body/query no frontend |
| search(query) | GET | `/services/search` | query: query |


## Menu: Msgs Pre-definidas
Contexto: CRUD, busca e exportação das mensagens pré-definidas usadas em fluxos de WhatsApp.
#### PredefinedMessageService

| Ação frontend | Método | Endpoint | Contrato observado no frontend |
|---|---:|---|---|
| create(predefinedMessage) | POST | `/predefinedMessages` | body: predefinedMessage |
| update(predefinedMessage) | PUT | `/predefinedMessages/{predefinedMessage.id}` | body: predefinedMessage |
| delete(predefinedMessage) | DELETE | `/predefinedMessages/{predefinedMessage.id}` | sem body/query no frontend |
| getById(id) | GET | `/predefinedMessages/{id}` | sem body/query no frontend |
| findAllForCurrentUser() | GET | `/predefinedMessages` | sem body/query no frontend |
| search(query) | GET | `/predefinedMessages/search` | query: query |
| exportForUser() | GET | `/predefinedMessages/exportAllForCurrentUser` | responseType: arraybuffer |

#### CustomerService

| Ação frontend | Método | Endpoint | Contrato observado no frontend |
|---|---:|---|---|
| search(query) | GET | `/customers/search` | query: query |


## Menu: Clientes & Anamneses
Contexto: clientes, histórico, aniversários, sumidos/retornos, unificação, comentários, imagens, créditos, orçamentos, anamneses e fidelidade.
#### CustomerService

| Ação frontend | Método | Endpoint | Contrato observado no frontend |
|---|---:|---|---|
| sync(dataList, installationId) | POST | `/customers/sync` | query: installationId; body: dataList |
| create(customer) | POST | `/customers` | body: customer |
| createAll(customers) | POST | `/customers/all` | body: customers |
| update(customer) | PUT | `/customers/{customer.id}` | body: customer |
| updateComments(customerId, comments) | PUT | `/customers/{customerId}/comments` | body: { comments } |
| delete(customer) | DELETE | `/customers/{customer.id}` | sem body/query no frontend |
| getById(id) | GET | `/customers/{id}` | sem body/query no frontend |
| findAllForCurrentUser() | GET | `/customers` | sem body/query no frontend |
| appointmentHistoryForCustomerId(customerId, startDate, endDate) | GET | `/customers/{customerId}/appointments` | query: startDate, endDate |
| findBirthDayList(month) | GET | `/customers/birthDays` | query: month |
| search(query) | GET | `/customers/search` | query: query |
| searchExceptForId(query, exceptForIds) | GET | `/customers/searchExceptForId` | query: query, exceptForIds: exceptForIds.join(',') |
| existsByPhone(phone1, exceptForId) | GET | `/customers/exists` | query: phone1, exceptForId |
| getBasicStats(customerId) | GET | `/customers/basicStats` | query: customerId |
| getCustomersGoneList(lastAppointmentDaysAgo, minNumberOfAppointments) | GET | `/customers/goneList` | query: lastAppointmentDaysAgo, minNumberOfAppointments |
| getCustomersReturningList(numberOfDaysForReturning, serviceId, showAll) | GET | `/customers/returningList` | query: numberOfDaysForReturning, serviceId, showAll |
| getCustomersByAppointmentStatus(appointmentStatus) | GET | `/customers/byAppointmentStatus` | query: appointmentStatus |
| findAllForCurrentUserSliced(pageNumber, pageSize, searchTerm) | GET | `/customers/sliced` | query: pageNumber, pageSize, searchTerm |
| findAllForCurrentUserPaged(pageNumber, pageSize, searchTerm) | GET | `/customers/paged` | query: pageNumber, pageSize, searchTerm |
| findSimilarCustomers(customerId) | GET | `/customers/similarCustomers` | query: customerId |
| joinCustomers(destinationCustomerId, customerIdsToUnify) | POST | `/customers/joinCustomers` | body: { destinationCustomerId, customerIdsToUnify } |
| getProfileStats(customerId) | GET | `/customers/profileStats` | query: customerId |
| exportForUser() | GET | `/customers/exportAllForCurrentUser` | responseType: arraybuffer |
| getBirthdayCountForPeriod(startDate, endDate) | GET | `/customers/birthdayCount` | query: startDate, endDate |
| getBirthdayListForPeriod(startDate, endDate) | GET | `/customers/birthdayList` | query: startDate, endDate |
| findAutomaticCustomersToUnify(unifyType) | GET | `/customers/automaticCustomersToUnify` | query: unifyType |
| unifyCustomers(customerIdsList, preferNameForFirstInTheList) | POST | `/customers/customersToUnify` | body: { customerIdsList, preferNameForFirstInTheList, } |

#### CustomerCommentService

| Ação frontend | Método | Endpoint | Contrato observado no frontend |
|---|---:|---|---|
| create(customerComment) | POST | `/customerComments` | body: customerComment |
| update(customerComment) | PUT | `/customerComments/{customerComment.id}` | body: customerComment |
| delete(customerComment) | DELETE | `/customerComments/{customerComment.id}` | sem body/query no frontend |
| getById(id) | GET | `/customerComments/{id}` | sem body/query no frontend |
| getList(customerId, numberOfResults) | GET | `/customerComments` | query: customerId, numberOfResults |
| getSlicedList({ customerId, pageNumber, pageSize }) | GET | `/customerComments/sliced` | query: customerId, pageNumber, pageSize |
| getPagedList({ customerId, pageNumber, pageSize }) | GET | `/customerComments/paged` | query: customerId, pageNumber, pageSize |

#### CustomerImageService

| Ação frontend | Método | Endpoint | Contrato observado no frontend |
|---|---:|---|---|
| create(customerId, selectedImage) | POST | `/customerImages` | body: formData; config: config |
| update(customerImage) | PUT | `/customerImages/{customerImage.id}` | body: customerImage |
| highlight(customerImage) | PUT | `/customerImages/{customerImage.id}/highlight` | body: customerImage |
| unhighlight(customerImage) | PUT | `/customerImages/{customerImage.id}/unhighlight` | body: customerImage |
| delete(customerImage) | DELETE | `/customerImages/{customerImage.id}` | sem body/query no frontend |
| getById(id) | GET | `/customerImages/{id}` | sem body/query no frontend |
| getList(customerId, numberOfResults) | GET | `/customerImages` | query: customerId, numberOfResults |
| getSlicedList({ customerId, pageNumber, pageSize }) | GET | `/customerImages/sliced` | query: customerId, pageNumber, pageSize |

#### CustomerCreditService

| Ação frontend | Método | Endpoint | Contrato observado no frontend |
|---|---:|---|---|
| create(customerCredit) | POST | `/customerCredits` | body: customerCredit |
| update(customerCredit) | PUT | `/customerCredits/{customerCredit.id}` | body: customerCredit |
| findTotalSumByAppointmentId(appointmentId) | GET | `/customerCredits/totalSum` | query: appointmentId |
| findTotalSumByCustomerId(customerId) | GET | `/customerCredits/totalSum` | query: customerId |
| findSummary(customerId) | GET | `/customerCredits/summary` | query: customerId |

#### CustomerBudgetService

| Ação frontend | Método | Endpoint | Contrato observado no frontend |
|---|---:|---|---|
| create(customerBudget) | POST | `/customerBudgets` | body: customerBudget |
| update(customerBudget) | PUT | `/customerBudgets/{customerBudget.id}` | body: customerBudget |
| delete(customerBudget) | DELETE | `/customerBudgets/{customerBudget.id}` | sem body/query no frontend |
| getById(id) | GET | `/customerBudgets/{id}` | sem body/query no frontend |
| findAll(customerId, startDate, endDate) | GET | `/customerBudgets` | query: customerId, startDate, endDate |
| generateReceipt(budget) | POST | `/customerBudgets/{budget.id}/receiptFile` | body: null; responseType: arraybuffer |

#### AnamneseFormService

| Ação frontend | Método | Endpoint | Contrato observado no frontend |
|---|---:|---|---|
| getForms() | GET | `/anamneseForms` | sem body/query no frontend |
| getFormWithQuestions(formId) | GET | `/anamneseForms/{formId}/withQuestions` | sem body/query no frontend |
| getFormsGroupedForCompany() | GET | `/anamneseForms/groupedCompany` | sem body/query no frontend |
| addFavorite(anamneseFormId) | POST | `/anamneseForms/{anamneseFormId}/favorite` | sem body/query no frontend |
| removeFavorite(anamneseFormId) | DELETE | `/anamneseForms/{anamneseFormId}/favorite` | sem body/query no frontend |
| getById(formId) | GET | `/anamneseForms/{formId}` | sem body/query no frontend |

#### AnamneseAnswerService

| Ação frontend | Método | Endpoint | Contrato observado no frontend |
|---|---:|---|---|
| create(anamneseAnswer) | POST | `/anamneseAnswers` | body: anamneseAnswer |
| update(anamneseAnswer) | PUT | `/anamneseAnswers/{anamneseAnswer.id}` | body: anamneseAnswer |
| delete(anamneseAnswer) | DELETE | `/anamneseAnswers/{anamneseAnswer.id}` | sem body/query no frontend |
| registerSignature(id, signatureFile) | POST | `/anamneseAnswers/{id}/signature` | body: formData; config: config |
| registerSignatureDeviceSource(id, deviceInfo) | POST | `/anamneseAnswers/{id}/signatureDeviceSource` | body: deviceInfo |
| getById(id) | GET | `/anamneseAnswers/{id}` | sem body/query no frontend |
| getList({ customerId, startDate, endDate }) | GET | `/anamneseAnswers` | query: customerId, startDate, endDate |

#### LoyaltyCardService

| Ação frontend | Método | Endpoint | Contrato observado no frontend |
|---|---:|---|---|
| findOpened(customerId, appointmentId) | GET | `/loyaltyCards/opened` | query: customerId, appointmentId |
| findCardListByCardConfigId(loyaltyCardConfigId, redeemed) | GET | `/loyaltyCards/cardList` | query: loyaltyCardConfigId, redeemed |
| findCardListByCustomerId(customerId, redeemed) | GET | `/loyaltyCards/cardList` | query: customerId, redeemed |
| createCustomerCard(loyaltyCardCustomerForm) | POST | `/loyaltyCards/customerCards` | body: loyaltyCardCustomerForm |
| deleteCustomerCard(id) | DELETE | `/loyaltyCards/customerCards/{id}` | sem body/query no frontend |
| findAppointmentsForCustomerCard(id) | GET | `/loyaltyCards/customerCards/{id}/appointments` | sem body/query no frontend |
| revertRedeemCustomerCard(id) | POST | `/loyaltyCards/customerCards/{id}/revertRedeem` | sem body/query no frontend |
| deleteAppointmentForCustomerCard(id, appointmentId) | DELETE | `/loyaltyCards/customerCards/{id}/appointments/{appointmentId}` | sem body/query no frontend |

#### AccountsReceivableService

| Ação frontend | Método | Endpoint | Contrato observado no frontend |
|---|---:|---|---|
| delete(accountsReceivable) | DELETE | `/accountsReceivables/{accountsReceivable.id}` | sem body/query no frontend |
| getById(id) | GET | `/accountsReceivables/{id}` | sem body/query no frontend |
| getAllForCustomerByOpened(customerId, opened) | GET | `/customers/{customerId}/comandas` | query: customerId, opened |
| getAllForCustomerByOpenedAndDateRange({ customerId, opened, startDate, endDate }) | GET | `/customers/{customerId}/comandas` | query: customerId, opened, startDate, endDate |

#### AppointmentService

| Ação frontend | Método | Endpoint | Contrato observado no frontend |
|---|---:|---|---|
| getById(id) | GET | `/appointments/{id}` | sem body/query no frontend |
| getByCustomerAndTag({ startDate, endDate, customerId, appointmentTag }) | GET | `/appointments/byCustomerAndTag` | query: startDate, endDate, customerId, appointmentTag |


## Menu: Serviços & Pacotes
Contexto: serviços, categorias, upload de imagem, pacotes e exportações.
#### ServiceService

| Ação frontend | Método | Endpoint | Contrato observado no frontend |
|---|---:|---|---|
| sync(dataList, installationId) | POST | `/services/sync` | query: installationId; body: dataList |
| create(services) | POST | `/services` | body: services |
| update(services) | PUT | `/services/{services.id}` | body: services |
| delete(services) | DELETE | `/services/{services.id}` | sem body/query no frontend |
| getById(id) | GET | `/services/{id}` | sem body/query no frontend |
| findAllForCurrentUser() | GET | `/services` | sem body/query no frontend |
| search(query) | GET | `/services/search` | query: query |
| exportForUser() | GET | `/services/exportAllForCurrentUser` | responseType: arraybuffer |
| updateImage({ serviceId, file }) | PUT | `/services/{serviceId}/image` | body: formData; config: config |
| deleteImage(serviceId) | DELETE | `/services/{serviceId}/image` | sem body/query no frontend |

#### ServicePackageService

| Ação frontend | Método | Endpoint | Contrato observado no frontend |
|---|---:|---|---|
| create(services) | POST | `/servicePackages` | body: services |
| update(services) | PUT | `/servicePackages/{services.id}` | body: services |
| delete(services) | DELETE | `/servicePackages/{services.id}` | sem body/query no frontend |
| getById(id) | GET | `/servicePackages/{id}` | sem body/query no frontend |
| findAllForCurrentUser() | GET | `/servicePackages` | sem body/query no frontend |
| searchForCurrentUser(query) | GET | `/servicePackages/search` | query: query |

#### ServiceCategoryService

| Ação frontend | Método | Endpoint | Contrato observado no frontend |
|---|---:|---|---|
| create(serviceCategory) | POST | `/serviceCategories` | body: serviceCategory |
| update(serviceCategory) | PUT | `/serviceCategories/{serviceCategory.id}` | body: serviceCategory |
| delete(serviceCategory) | DELETE | `/serviceCategories/{serviceCategory.id}` | sem body/query no frontend |
| getById(id) | GET | `/serviceCategories/{id}` | sem body/query no frontend |
| findAllForCurrentUser() | GET | `/serviceCategories` | sem body/query no frontend |


## Menu: Produtos & Estoque
Contexto: produtos, estoque, movimentações manuais, histórico, imagens, compras, vendas, pagamentos, fornecedores e categorias.
#### ProductService

| Ação frontend | Método | Endpoint | Contrato observado no frontend |
|---|---:|---|---|
| create(products) | POST | `/products` | body: products |
| update(products) | PUT | `/products/{products.id}` | body: products |
| delete(products) | DELETE | `/products/{products.id}` | sem body/query no frontend |
| getById(id) | GET | `/products/{id}` | sem body/query no frontend |
| findAllForCurrentUser() | GET | `/products` | sem body/query no frontend |
| findProductStockInfo() | GET | `/products/stock` | sem body/query no frontend |
| findProductStockInfoByProductId(productId) | GET | `/products/stockProduct` | query: productId |
| searchWithStockForCurrentUser(query) | GET | `/products/searchStockProduct` | query: query |
| searchForCurrentUser(query) | GET | `/products/search` | query: query |
| createManualStockMovement(productManualStock) | POST | `/products/{productManualStock.productId}/manualStocks` | body: productManualStock |
| getStockMovementHistory({ productId, year }) | GET | `/products/{productId}/stockHistory` | query: productId, year |
| updateImage({ productId, file }) | PUT | `/products/{productId}/image` | body: formData; config: config |
| deleteImage(productId) | DELETE | `/products/{productId}/image` | sem body/query no frontend |

#### ProductPurchaseService

| Ação frontend | Método | Endpoint | Contrato observado no frontend |
|---|---:|---|---|
| create(object) | POST | `/productPurchases` | body: object |
| update(object) | PUT | `/productPurchases/{object.id}` | body: object |
| delete(object) | DELETE | `/productPurchases/{object.id}` | sem body/query no frontend |
| getById(id) | GET | `/productPurchases/{id}` | sem body/query no frontend |
| findAll(startDate, endDate) | GET | `/productPurchases` | query: startDate, endDate |
| updatePaymentDate(object) | PUT | `/productPurchases/{object.id}/paymentDate` | body: object |

#### ProductSaleService

| Ação frontend | Método | Endpoint | Contrato observado no frontend |
|---|---:|---|---|
| create(object) | POST | `/productSales` | body: object |
| update(object) | PUT | `/productSales/{object.id}` | body: object |
| delete(object) | DELETE | `/productSales/{object.id}` | sem body/query no frontend |
| getById(id) | GET | `/productSales/{id}` | sem body/query no frontend |
| getSummaryById(id) | GET | `/productSales/{id}/summary` | sem body/query no frontend |
| findAll(startDate, endDate) | GET | `/productSales` | query: startDate, endDate |
| createPayment(payment) | POST | `/productSales/{payment.productSaleId}/payments` | body: payment |
| deletePayment(payment) | DELETE | `/productSales/{payment.productSaleId}/payments/{payment.id}` | sem body/query no frontend |
| getPayments(productSaleId) | GET | `/productSales/{productSaleId}/payments` | query: productSaleId |
| generateReceipt(productSaleId) | POST | `/productSales/{productSaleId}/receiptFile` | body: null; responseType: arraybuffer |

#### ProductCategoryService

| Ação frontend | Método | Endpoint | Contrato observado no frontend |
|---|---:|---|---|
| create(productCategory) | POST | `/productCategories` | body: productCategory |
| update(productCategory) | PUT | `/productCategories/{productCategory.id}` | body: productCategory |
| delete(productCategory) | DELETE | `/productCategories/{productCategory.id}` | sem body/query no frontend |
| getById(id) | GET | `/productCategories/{id}` | sem body/query no frontend |
| findAllForCurrentUser() | GET | `/productCategories` | sem body/query no frontend |

#### ProductSupplierService

| Ação frontend | Método | Endpoint | Contrato observado no frontend |
|---|---:|---|---|
| create(productSupplier) | POST | `/productSuppliers` | body: productSupplier |
| update(productSupplier) | PUT | `/productSuppliers/{productSupplier.id}` | body: productSupplier |
| delete(productSupplier) | DELETE | `/productSuppliers/{productSupplier.id}` | sem body/query no frontend |
| getById(id) | GET | `/productSuppliers/{id}` | sem body/query no frontend |
| findAllForCurrentUser() | GET | `/productSuppliers` | sem body/query no frontend |

#### EmployeeService

| Ação frontend | Método | Endpoint | Contrato observado no frontend |
|---|---:|---|---|
| findAllEmployeesProfessional({ excludeThirdParties, includeDeleted }) | GET | `/employees/professionals` | query: excludeThirdParties, includeDeleted |


## Menu: Despesas
Contexto: despesas, categorias, recorrência/fixas, status de pagamento, ajuste de data/valor e exportação.
#### ExpenseService

| Ação frontend | Método | Endpoint | Contrato observado no frontend |
|---|---:|---|---|
| sync(dataList, installationId) | POST | `/expenses/sync` | query: installationId; body: dataList |
| create(expense) | POST | `/expenses` | body: expense |
| update(expense) | PUT | `/expenses/{expense.id}` | body: expense |
| endFixedExpense(expense) | PUT | `/expenses/{expense.id}/endFixed` | body: expense |
| delete(expense) | DELETE | `/expenses/{expense.id}` | sem body/query no frontend |
| getById(id) | GET | `/expenses/{id}` | sem body/query no frontend |
| getCashFlowDetailById(id) | GET | `/expenses/{id}/cashFlowDetail` | sem body/query no frontend |
| findAllForCurrentUser() | GET | `/expenses` | sem body/query no frontend |
| searchForCurrentUser({ query, startDate, endDate }) | GET | `/expenses/search` | query: query, startDate, endDate |
| findByDateRange({ startDate, endDate }) | GET | `/expenses/byDateRange` | query: startDate, endDate |
| exportForUser() | GET | `/expenses/exportAllForCurrentUser` | responseType: arraybuffer |
| updateToPaid(expense) | PUT | `/expenses/{expense.id}/paid` | body: { targetDate: expense.date, targetMonthDate: expense.targetMonthDate, } |
| updateToNonPaid(expense) | PUT | `/expenses/{expense.id}/nonPaid` | body: { targetDate: expense.date, targetMonthDate: expense.targetMonthDate, } |
| updateExpenseDate(object) | PUT | `/expenses/{object.id}/expenseDate` | body: object |
| updateExpenseValue(object) | PUT | `/expenses/{object.id}/expenseValue` | body: object |

#### ExpenseCategoryService

| Ação frontend | Método | Endpoint | Contrato observado no frontend |
|---|---:|---|---|
| create(expenseCategory) | POST | `/expenseCategories` | body: expenseCategory |
| update(expenseCategory) | PUT | `/expenseCategories/{expenseCategory.id}` | body: expenseCategory |
| delete(expenseCategory) | DELETE | `/expenseCategories/{expenseCategory.id}` | sem body/query no frontend |
| getById(id) | GET | `/expenseCategories/{id}` | sem body/query no frontend |
| findAllForCurrentUser() | GET | `/expenseCategories` | sem body/query no frontend |


## Menu: Profissionais & Comissão
Contexto: profissionais, permissões, ativação/desativação, avatar, configurações de comissão, adiantamentos e pagamento de comissões.
#### EmployeeService

| Ação frontend | Método | Endpoint | Contrato observado no frontend |
|---|---:|---|---|
| create(employee) | POST | `/employees` | body: employee |
| update(employee) | PUT | `/employees/{employee.id}` | body: employee |
| delete(employee) | DELETE | `/employees/{employee.id}` | sem body/query no frontend |
| getById(id) | GET | `/employees/{id}` | sem body/query no frontend |
| findAllForCurrentCompany(professionalOnly, excludeAgendaOnly) | GET | `/employees` | query: professionalOnly, excludeAgendaOnly |
| findAllEmployeesProfessional({ excludeThirdParties, includeDeleted }) | GET | `/employees/professionals` | query: excludeThirdParties, includeDeleted |
| findAllEmployeesFilterAdvanced({ professionalOnly, excludeThirdParties, includeDeleted }) | GET | `/employees/filterAdvanced` | query: professionalOnly, excludeThirdParties, includeDeleted |
| enable(employeeId) | PUT | `/employees/{employeeId}/enabled` | sem body/query no frontend |
| disable(employeeId) | PUT | `/employees/{employeeId}/disabled` | sem body/query no frontend |
| hasFutureAppointments(employeeId) | GET | `/employees/{employeeId}/hasFutureAppointments` | sem body/query no frontend |
| getCommissionSettings(employeeId) | GET | `/employees/{employeeId}/commissionSettings` | sem body/query no frontend |
| updateCommissionSettings(employeeId, form) | PUT | `/employees/{employeeId}/commissionSettings` | body: form |
| updateAvatar({ employeeId, file }) | PUT | `/employees/{employeeId}/avatar` | body: formData; config: config |
| deleteAvatar(employeeId) | DELETE | `/employees/{employeeId}/avatar` | sem body/query no frontend |

#### ApplicationRoleService

| Ação frontend | Método | Endpoint | Contrato observado no frontend |
|---|---:|---|---|
| findAll(onlyActives) | GET | `/applicationRoles` | query: onlyActives |
| findByValues(values) | GET | `/applicationRoles/search` | query: values: values.join(',') |

#### CompanyCommissionSettingsService

| Ação frontend | Método | Endpoint | Contrato observado no frontend |
|---|---:|---|---|
| getForCompany() | GET | `/companyCommissionSettings` | sem body/query no frontend |
| saveForCompany(form) | PUT | `/companyCommissionSettings` | body: form |

#### CommissionPaymentsService

| Ação frontend | Método | Endpoint | Contrato observado no frontend |
|---|---:|---|---|
| getGrossTotalSummary({ employeeId, startDate, endDate }) | GET | `/commissionPayments/grossTotalSummary` | query: employeeId, startDate, endDate |
| getNotPaidList({ employeeId, startDate, endDate, filterType }) | GET | `/commissionPayments/notPaid` | query: employeeId, startDate, endDate, filterType |
| getPaidList({ employeeId, startDate, endDate }) | GET | `/commissionPayments` | query: employeeId, startDate, endDate |
| deleteCommissionPaymentById(commissionPaymentId) | DELETE | `/commissionPayments/{commissionPaymentId}` | sem body/query no frontend |
| getCommissionDetails(commissionPaymentId) | GET | `/commissionPayments/{commissionPaymentId}` | sem body/query no frontend |
| payCommissions(commissionPaymentForm) | POST | `/commissionPayments` | body: commissionPaymentForm |
| getDetails(commissionPaymentId, withCustomerDetailsSeparated) | GET | `/commissionPayments/{commissionPaymentId}/details` | query: withCustomerDetailsSeparated |
| getCostsDetail(appointmentId) | GET | `/commissionPayments/costsDetail` | query: appointmentId |

#### EmployeeAdvanceMoneyService

| Ação frontend | Método | Endpoint | Contrato observado no frontend |
|---|---:|---|---|
| create(advanceMoney) | POST | `/employeeAdvanceMoney` | body: advanceMoney |
| update(advanceMoney) | PUT | `/employeeAdvanceMoney/{advanceMoney.id}` | body: advanceMoney |
| delete(advanceMoney) | DELETE | `/employeeAdvanceMoney/{advanceMoney.id}` | sem body/query no frontend |
| getById(id) | GET | `/employeeAdvanceMoney/{id}` | sem body/query no frontend |
| search({ employeeId, payDeducted, payDeductedStartDate, payDeductedEndDate }) | GET | `/employeeAdvanceMoney/search` | query: employeeId, payDeducted, payDeductedStartDate, payDeductedEndDate |

#### CompanyService

| Ação frontend | Método | Endpoint | Contrato observado no frontend |
|---|---:|---|---|
| updateTryOutEnterprise(maxNumberOfUsers) | PUT | `/companies/tryOutEnterprise` | body: { maxNumberOfUsers } |


## Relatórios: Performance
Contexto: performance da empresa/profissionais, receita por período e totais brutos de comissão.
#### AppointmentService

| Ação frontend | Método | Endpoint | Contrato observado no frontend |
|---|---:|---|---|
| getCompanyPerformance({ startDate, endDate }) | GET | `/appointments/companyPerformance` | query: startDate, endDate |
| getEmployeePerformance({ startDate, endDate, employeeId }) | GET | `/appointments/employeePerformance` | query: startDate, endDate, employeeId |

#### ReportsService

| Ação frontend | Método | Endpoint | Contrato observado no frontend |
|---|---:|---|---|
| getRevenueStatusByDateRange(startDate, endDate) | GET | `/agendaReports/revenueStatusByDateRange` | query: startDate, endDate |

#### CommissionPaymentsService

| Ação frontend | Método | Endpoint | Contrato observado no frontend |
|---|---:|---|---|
| getGrossTotalSummary({ employeeId, startDate, endDate }) | GET | `/commissionPayments/grossTotalSummary` | query: employeeId, startDate, endDate |

#### EmployeeService

| Ação frontend | Método | Endpoint | Contrato observado no frontend |
|---|---:|---|---|
| findAllForCurrentCompany(professionalOnly, excludeAgendaOnly) | GET | `/employees` | query: professionalOnly, excludeAgendaOnly |


## Relatórios: Resumo Financeiro e Melhores Clientes
Contexto: fluxo de caixa, status de receita, performance diária/mensal, formas de pagamento, despesas, clientes e ranking de melhores clientes.
#### ReportsService

| Ação frontend | Método | Endpoint | Contrato observado no frontend |
|---|---:|---|---|
| getRevenueStatus(month, year) | GET | `/agendaReports/revenueStatus` | query: month, year |
| getRevenueStatusByDateRange(startDate, endDate) | GET | `/agendaReports/revenueStatusByDateRange` | query: startDate, endDate |
| getRevenuePerService(month, year) | GET | `/agendaReports/revenuePerService` | query: month, year |
| getAppointmentsForService(serviceId, month, year) | GET | `/agendaReports/appointmentsForService` | query: serviceId, month, year |
| getDailyPerformance(month, year) | GET | `/agendaReports/dailyPerformance` | query: month, year |
| getDailyPerformanceByDateRange(startDate, endDate) | GET | `/agendaReports/dailyPerformanceByDateRange` | query: startDate, endDate |
| getMonthlyPerformanceByDateRange(startDate, endDate) | GET | `/agendaReports/monthlyPerformanceByDateRange` | query: startDate, endDate |
| getExpenseList(startDate, endDate) | GET | `/agendaReports/expenseList` | query: startDate, endDate |
| getPaymentSummary(startDate, endDate) | GET | `/agendaReports/paymentMethodsSummary` | query: startDate, endDate |
| getTotalCustomerStats() | GET | `/agendaReports/totalCustomerStats` | sem body/query no frontend |
| getCashFlowByDate(startDate, endDate) | GET | `/agendaReports/cashFlow` | query: startDate, endDate |
| getBestCustomers(startDate, endDate, numberOfResults) | GET | `/agendaReports/bestCustomers` | query: startDate, endDate, numberOfResults |
| getBestCustomersByNumberOfAppointments(startDate, endDate, numberOfResults) | GET | `/agendaReports/bestCustomersByNumberOfAppointments` | query: startDate, endDate, numberOfResults |

#### ExtraRevenueService

| Ação frontend | Método | Endpoint | Contrato observado no frontend |
|---|---:|---|---|
| create(extraRevenue) | POST | `/extraRevenues` | body: extraRevenue |
| update(extraRevenue) | PUT | `/extraRevenues/{extraRevenue.id}` | body: extraRevenue |
| delete(extraRevenue) | DELETE | `/extraRevenues/{extraRevenue.id}` | sem body/query no frontend |
| getById(id) | GET | `/extraRevenues/{id}` | sem body/query no frontend |
| findAllForCurrentUser() | GET | `/extraRevenues` | sem body/query no frontend |
| searchForCurrentUser({ query, startDate, endDate }) | GET | `/extraRevenues/search` | query: query, startDate, endDate |

#### ExtraRevenueCategoryService

| Ação frontend | Método | Endpoint | Contrato observado no frontend |
|---|---:|---|---|
| create(extraRevenue) | POST | `/extraRevenueCategories` | body: extraRevenue |
| update(extraRevenue) | PUT | `/extraRevenueCategories/{extraRevenue.id}` | body: extraRevenue |
| delete(extraRevenue) | DELETE | `/extraRevenueCategories/{extraRevenue.id}` | sem body/query no frontend |
| getById(id) | GET | `/extraRevenueCategories/{id}` | sem body/query no frontend |
| findAllForCurrentUser() | GET | `/extraRevenueCategories` | sem body/query no frontend |

#### AccountsReceivableService

| Ação frontend | Método | Endpoint | Contrato observado no frontend |
|---|---:|---|---|
| getById(id) | GET | `/accountsReceivables/{id}` | sem body/query no frontend |

#### ProductSaleService

| Ação frontend | Método | Endpoint | Contrato observado no frontend |
|---|---:|---|---|
| getSummaryById(id) | GET | `/productSales/{id}/summary` | sem body/query no frontend |

#### ExpenseService

| Ação frontend | Método | Endpoint | Contrato observado no frontend |
|---|---:|---|---|
| getCashFlowDetailById(id) | GET | `/expenses/{id}/cashFlowDetail` | sem body/query no frontend |


## Menu: Configurações
Contexto: dados da empresa, dados do usuário, tema, e-mail, status da conta, horários, taxas, quadras e preferências.
#### CompanyService

| Ação frontend | Método | Endpoint | Contrato observado no frontend |
|---|---:|---|---|
| updateCompanyInfo(companyInfo) | POST | `/companies` | body: companyInfo |
| updateLogo(logoFile) | PUT | `/companies/logo` | body: formData; config: config |
| getCompanyInfo() | GET | `/companies` | sem body/query no frontend |
| getEligibleForMobileDiscount(isIOS) | GET | `/companies/eligibleForMobileDiscount` | query: isIOS |
| getLocale() | GET | `/companies/locale` | sem body/query no frontend |
| updateLocale(locale) | PUT | `/companies/locale` | body: { locale } |
| updateTryOutEnterprise(maxNumberOfUsers) | PUT | `/companies/tryOutEnterprise` | body: { maxNumberOfUsers } |
| getYearRetrospect() | GET | `/companies/yearRetrospect` | sem body/query no frontend |

#### CompanySettingsService

| Ação frontend | Método | Endpoint | Contrato observado no frontend |
|---|---:|---|---|
| getSettings() | GET | `/companySettings` | sem body/query no frontend |
| updateSettings(companySettings) | POST | `/companySettings` | body: companySettings |

#### UserService

| Ação frontend | Método | Endpoint | Contrato observado no frontend |
|---|---:|---|---|
| getCurrentUser() | GET | `/user/me` | sem body/query no frontend |
| getMyCompany() | GET | `/user/myCompany` | sem body/query no frontend |
| getAccountStatus() | GET | `/user/accountStatus` | sem body/query no frontend |
| checkAccountStatus(isIOS) | GET | `/user/checkAccountStatus` | query: isIOS |
| updateTheme(themeSettings) | PUT | `/user/theme` | body: themeSettings |
| updateUserName(userBasicInfo) | PUT | `/user/name` | body: userBasicInfo |
| updateUserEmail(userBasicInfo) | PUT | `/user/email` | body: userBasicInfo |
| sendConfirmationCode() | POST | `/user/email/code` | sem body/query no frontend |
| getUserInfo() | GET | `/user/info` | sem body/query no frontend |
| checkInstalledAppVersion(lastInstalledAppVersionString, currentUserId, currentInstalledVersion) | GET | `/user/registerBuildNumber` | query: lastInstalledAppVersionString, currentUserId, currentInstalledVersion |
| registerInstalledAppVersion(buildNumber, deviceId) | POST | `/user/registerBuildNumber` | body: { buildNumber, deviceId } |
| signUp(user) | POST | `/signUp` | body: user |
| becomeFree() | POST | `/user/becomeFree` | sem body/query no frontend |
| becomePaid() | POST | `/user/becomePaid` | sem body/query no frontend |

#### WorkScheduleService

| Ação frontend | Método | Endpoint | Contrato observado no frontend |
|---|---:|---|---|
| updateCompanyWorkSchedule(companyWorkSchedule) | POST | `/companyWorkSchedule` | body: companyWorkSchedule |
| getCompanyWorkSchedule() | GET | `/companyWorkSchedule` | sem body/query no frontend |
| getEmployeeWorkScheduleByEmployeeId(employeeId) | GET | `/employeeWorkScheduleByEmployeeId/{employeeId}` | sem body/query no frontend |
| createEmployeeWorkSchedule(employeeWorkSchedule) | POST | `/employeeWorkSchedule` | body: employeeWorkSchedule |
| updateEmployeeWorkSchedule(employeeWorkSchedule) | PUT | `/employeeWorkSchedule/{employeeWorkSchedule.id}` | body: employeeWorkSchedule |
| deleteEmployeeWorkScheduleById(employeeWorkScheduleId) | DELETE | `/employeeWorkSchedule/{employeeWorkScheduleId}` | sem body/query no frontend |

#### CreditCardRateService

| Ação frontend | Método | Endpoint | Contrato observado no frontend |
|---|---:|---|---|
| create(creditCardRate) | POST | `/creditCardRates` | body: creditCardRate |
| update(creditCardRate) | PUT | `/creditCardRates/{creditCardRate.id}` | body: creditCardRate |
| delete(creditCardRate) | DELETE | `/creditCardRates/{creditCardRate.id}` | sem body/query no frontend |
| getById(id) | GET | `/creditCardRates/{id}` | sem body/query no frontend |
| findAllForCurrentUser() | GET | `/creditCardRates` | sem body/query no frontend |

#### DebitCardRateService

| Ação frontend | Método | Endpoint | Contrato observado no frontend |
|---|---:|---|---|
| save(debitCardRate) | PUT | `/debitCardRates` | body: debitCardRate |
| getForLoggedInUser() | GET | `/debitCardRates` | sem body/query no frontend |

#### CourtService

| Ação frontend | Método | Endpoint | Contrato observado no frontend |
|---|---:|---|---|
| create(court) | POST | `/courts` | body: court |
| update(court) | PUT | `/courts/{court.id}` | body: court |
| delete(court) | DELETE | `/courts/{court.id}` | sem body/query no frontend |
| getById(id) | GET | `/courts/{id}` | sem body/query no frontend |
| findAllForCurrentUser() | GET | `/courts` | sem body/query no frontend |

#### StripeSubscriptionService

| Ação frontend | Método | Endpoint | Contrato observado no frontend |
|---|---:|---|---|
| getCustomerPortalLink() | GET | `/stripeSubscriptions/customerPortal` | sem body/query no frontend |
| getUserCurrentMobilePlanInfo() | GET | `/stripeSubscriptions/userCurrentMobilePlanInfo` | sem body/query no frontend |

#### UserSubscriptionService

| Ação frontend | Método | Endpoint | Contrato observado no frontend |
|---|---:|---|---|
| cancelSubscription() | POST | `/subscriptions/cancel` | sem body/query no frontend |
| getPlan() | GET | `/subscriptions/plan` | sem body/query no frontend |


## Menu opcional: Quadras
Contexto específico para contas com tipo de app de aluguel de quadras; no menu padrão aparece dentro de configurações, mas há rota própria `/quadras` para esse tipo.
#### CourtService

| Ação frontend | Método | Endpoint | Contrato observado no frontend |
|---|---:|---|---|
| create(court) | POST | `/courts` | body: court |
| update(court) | PUT | `/courts/{court.id}` | body: court |
| delete(court) | DELETE | `/courts/{court.id}` | sem body/query no frontend |
| getById(id) | GET | `/courts/{id}` | sem body/query no frontend |
| findAllForCurrentUser() | GET | `/courts` | sem body/query no frontend |


## Premium e assinatura
Contexto: compra/ativação/upgrade, portal do cliente Stripe, planos, Asaas e fluxos com código temporário de acesso.
#### StripeSubscriptionService

| Ação frontend | Método | Endpoint | Contrato observado no frontend |
|---|---:|---|---|
| createSessionForPlan(stripePlanId, enterpriseUpgrade, maxNumberOfUsers) | POST | `/stripeSubscriptions/session` | body: { stripePlanId, enterpriseUpgrade, maxNumberOfUsers, } |
| activateSubscription(sessionId) | POST | `/stripeSubscriptions/activate` | body: { sessionId } |
| activateSubscriptionUpgrade(sessionId) | POST | `/stripeSubscriptions/activateUpgrade` | body: { sessionId } |
| getPlan() | GET | `/stripeSubscriptions/plans` | sem body/query no frontend |
| getPlansForUpgradeByNumberOfUsers(numberOfUsers) | GET | `/stripeSubscriptions/plansForUpgradeByNumberOfUsers` | query: numberOfUsers |
| getCustomerPortalLink() | GET | `/stripeSubscriptions/customerPortal` | sem body/query no frontend |
| getUserCurrentMobilePlanInfo() | GET | `/stripeSubscriptions/userCurrentMobilePlanInfo` | sem body/query no frontend |

#### UserSubscriptionService

| Ação frontend | Método | Endpoint | Contrato observado no frontend |
|---|---:|---|---|
| storeSubscription(data) | POST | `/subscriptions` | body: data |
| cancelSubscription() | POST | `/subscriptions/cancel` | sem body/query no frontend |
| getPlan() | GET | `/subscriptions/plan` | sem body/query no frontend |

#### CompanyTempAccessService

| Ação frontend | Método | Endpoint | Contrato observado no frontend |
|---|---:|---|---|
| getCodeInfo(tempAccessCode) | GET | `/companyTempAccess/codeInfo` | config: config |
| getAccountInfo(tempAccessCode) | GET | `/companyTempAccess/accountInfo` | config: config |
| getStripePlans(tempAccessCode, shouldUseTempCodeDiscount) | GET | `/companyTempAccess/stripePlans` | config: config |
| getAsaasPlans(tempAccessCode) | GET | `/companyTempAccess/asaasPlans` | config: config |
| createStripeSessionForPlan({ tempAccessCode, stripePlanId, enterpriseUpgrade, shouldUseTempCodeDiscount }) | POST | `/companyTempAccess/stripeSession` | body: { stripePlanId, enterpriseUpgrade: enterpriseUpgrade, shouldUseTempCodeDiscount, }; config: config |
| createAsaasSubscription({ tempAccessCode, planId, cpf, cnpj }) | POST | `/companyTempAccess/asaasSubscription` | body: { planId, cpf, cnpj, }; config: config |
| createStripeSessionForSetup({ tempAccessCode, selectedDay }) | POST | `/companyTempAccess/stripeSessionForSetup` | body: { selectedDay, }; config: config |
| activateStripeSubscription({ tempAccessCode, sessionId }) | POST | `/companyTempAccess/stripeSubscription` | body: { sessionId, }; config: config |
| activateStripeForSetup({ tempAccessCode, sessionId, selectedDay }) | POST | `/companyTempAccess/activateStripeSessionForSetup` | body: { sessionId, selectedDay, }; config: config |
| getAsaasSubscriptionsPaymentCharge(tempAccessCode) | GET | `/companyTempAccess/asaasSubscriptionsPaymentCharge` | config: config |
| getAsaasSubscriptionsPixCode(tempAccessCode) | GET | `/companyTempAccess/asaasSubscriptionsPixCode` | config: config |
| getAsaasSubscriptionsBarCodeNumber(tempAccessCode) | GET | `/companyTempAccess/asaasSubscriptionsBarCodeNumber` | config: config |
| getMobilePlanInfo(tempAccessCode) | GET | `/companyTempAccess/mobilePlanInfo` | config: config |
| getStripePlansForUpgrade({ tempAccessCode, numberOfUsers }) | GET | `/companyTempAccess/stripePlansForUpgrade` | config: config |
| activateUpgradeStripeSubscription({ tempAccessCode, sessionId }) | POST | `/companyTempAccess/stripeSubscriptionUpgrade` | body: { sessionId, }; config: config |
| getStripeCustomerPortal(tempAccessCode) | GET | `/companyTempAccess/customerPortal` | config: config |


## Root/Admin
Contexto: rotas administrativas presentes no bundle. Elas exigem permissões elevadas e não fazem parte do menu comum da conta analisada.
#### SuperUserService

| Ação frontend | Método | Endpoint | Contrato observado no frontend |
|---|---:|---|---|
| getNewUsers(startDate, endDate) | GET | `/superUser/newUsers` | query: startDate, endDate |
| getCompaniesExpiring() | GET | `/superUser/companiesExpiring` | sem body/query no frontend |
| getCompanyInfo({ phoneOrEmail, emailOnly }) | GET | `/superUser/companyInfo` | query: phoneOrEmail, emailOnly |
| updateMaxNumberOfUsers(companyInfoForm) | POST | `/superUser/updateMaxNumberUsers` | body: companyInfoForm |
| updateMaxNumberOfUsersCourtesy(companyInfoForm) | POST | `/superUser/updateMaxNumberUsersCourtesy` | body: companyInfoForm |
| deleteUnusedCustomers(companyId) | POST | `/superUser/deleteUnusedCustomers` | body: { companyId } |
| deleteCompany(companyId) | DELETE | `/superUser/companyInfo/{companyId}` | sem body/query no frontend |
| resetCompany(companyId) | POST | `/superUser/companyInfo/{companyId}/reset` | sem body/query no frontend |
| updatePhoneNumber(companyPhoneNumberForm) | POST | `/superUser/companyPhoneNumber` | body: companyPhoneNumberForm |
| updateEmailAddress(companyEmailAddressForm) | POST | `/superUser/companyEmailAddress` | body: companyEmailAddressForm |
| getCompanyDiscount(companyId) | GET | `/superUser/companyDiscount` | query: companyId |
| getPlansForCompany(companyId) | GET | `/superUser/plans` | query: companyId |
| updateCompanyDiscount(updateDiscountForm) | POST | `/superUser/companyDiscount` | body: updateDiscountForm |
| getDiscountList() | GET | `/superUser/discountList` | sem body/query no frontend |
| updateAsaasCustomer(asaasInfo) | POST | `/superUser/asaasInfo` | body: asaasInfo |
| createTempPassword(userId) | POST | `/superUser/createTempPassword` | body: { userId, } |
| kickUser(userId) | POST | `/superUser/kickUser` | body: { userId, } |
| toggleBlocked(userId) | POST | `/superUser/toggleBlocked` | body: { userId, } |
| toggleRevenueExcluded(userId) | POST | `/superUser/toggleRevenueExcluded` | body: { userId, } |
| recoverDeletedUser(userId) | POST | `/superUser/recoverDeletedUser` | body: { userId, } |
| getAsaasCustomers() | GET | `/superUser/asaasCustomers` | sem body/query no frontend |
| createAsaasSubscription(form) | POST | `/superUser/asaasSubscription` | body: form |
| upgradeAsaasSubscription(form) | POST | `/superUser/asaasSubscriptionUpgrade` | body: form |
| createAsaasCharge(form) | POST | `/superUser/asaasCharge` | body: form |
| deleteAsaasSubscription(companyId) | DELETE | `/superUser/asaasSubscription` | query: companyId |
| getAsaasPlan(maxNumberUsers) | GET | `/superUser/asaasPlan` | query: maxNumberUsers |
| updateAccountType(accountTypeForm) | POST | `/superUser/accountType` | body: accountTypeForm |
| getUserListForCompany(companyId, includeDeleted) | GET | `/superUser/userListForCompany` | query: companyId, includeDeleted |
| getLoginHistory(userId) | GET | `/superUser/loginHistory` | query: userId |
| getResetPasswordHistory(userId) | GET | `/superUser/resetPasswordHistory` | query: userId |
| searchUsers(nameOrPhoneOrEmail) | GET | `/superUser/searchUsers` | query: nameOrPhoneOrEmail |
| getBoletoLink(companyId) | GET | `/superUser/boletoLinkForCompany` | query: companyId |
| getAndroidSubscriptionInfo(androidReceiptHistoryId) | GET | `/superUser/androidSubscriptionInfo` | query: androidReceiptHistoryId |
| getAppleSubscriptionInfo(appleReceiptHistoryId) | GET | `/superUser/appleSubscriptionInfo` | query: appleReceiptHistoryId |
| getSherlockHolmesInfo() | GET | `/superUser/sherlockHolmes` | sem body/query no frontend |
| connectSherlockHolmesInfo(companyId) | PUT | `/superUser/sherlockHolmes` | body: { companyId, } |
| disconnectSherlockHolmesInfo() | DELETE | `/superUser/sherlockHolmes` | sem body/query no frontend |
| sendMarketingEmail(companyId) | GET | `/superUser/sendMarketingEmail` | query: companyId |
| getAppointmentReports({ companyId, startDate, endDate, excludeDeleted, byActivityDate }) | GET | `/superUser/appointmentReports` | query: companyId, startDate, endDate, excludeDeleted, byActivityDate |
| getAppointmentWithPaymentsReports({ companyId, startDate, endDate }) | GET | `/superUser/appointmentWithPaymentsReports` | query: companyId, startDate, endDate |
| getAllCustomers(companyId) | GET | `/superUser/allCustomers` | query: companyId |
| importCustomers({ companyId, forms }) | POST | `/superUser/allCustomers` | body: { companyId, forms, } |
| getCompanyWorkSchedule(companyId) | GET | `/superUser/workScheduleForCompany` | query: companyId |
| getCompanyWorkScheduleChangeLogs(workingScheduleId) | GET | `/superUser/workScheduleChangeLogForId` | query: workingScheduleId |
| updateCompanyOnlineSchedulingSettings(companyOnlineSchedulingSpecialForm) | POST | `/superUser/companyOnlineSchedulingSettings` | body: companyOnlineSchedulingSpecialForm |
| createTempAccessForCompany(companyId) | POST | `/superUser/tempAccessForCompany` | body: { companyId } |
| changeCompanyMaster({ companyId, masterUserId }) | POST | `/superUser/companyMaster` | body: { companyId, masterUserId } |
| changeSubscriptionType({ companyId, subscriptionType, lastPaidAt }) | POST | `/superUser/subscriptionTypeSettings` | body: { companyId, subscriptionType, lastPaidAt, } |
| containsStripeScheduledSubscription(companyId) | GET | `/superUser/containsStripeScheduledSubscription` | query: companyId |
| getStripeSubscription(companyId) | GET | `/superUser/stripeSubscription` | query: companyId |
| scheduleStripeSubscription({ companyId, priceCode, startDate, stripeDiscountId }) | POST | `/superUser/scheduleStripeSubscription` | body: { companyId, priceCode, startDate, stripeDiscountId, } |
| cancelAndroidSubscription(companyId) | POST | `/superUser/cancelAndroidSubscription` | body: { companyId, } |
| sendPushNotification({ companyId, notificationType }) | POST | `/superUser/pushNotification` | body: { companyId, notificationType, } |
| changeStripeAsaasSubscriptionSettings({ companyId, asaasCustomerId, asaasSubscriptionId, stripeCustomerId, stripeSubscriptionId, }) | POST | `/superUser/stripeAsaasSubscriptionSettings` | body: { companyId, asaasCustomerId, asaasSubscriptionId, stripeCustomerId, stripeSubscriptionId, } |
| changePageBioSettings({ companyId, name, headerText, whatsNumber, whatsTitle, whatsMessage, whatsNumber2, whatsTitle2, whatsMessage2, whatsNumber3, whatsTitle3, whatsMessage3, instagramUser, address, externalLinkTitle, externalLinkUrl, }) | POST | `/superUser/pageBioSettings` | body: { companyId, name, headerText, whatsNumber, whatsTitle, whatsMessage, whatsNumber2, whatsTitle2, whatsMessage2, whatsNumber3, whatsTitle3, whatsMessage3, instagramUser, address, externalLinkTitle, externalLinkUrl, } |

#### AdminReleaseNewsService

| Ação frontend | Método | Endpoint | Contrato observado no frontend |
|---|---:|---|---|
| create(releaseNewsObj) | POST | `/adminReleaseNews` | body: formData; config: config |
| update(releaseNewsObj) | PUT | `/adminReleaseNews/{releaseNewsObj.id}` | body: formData; config: config |
| delete(releaseNewsObj) | DELETE | `/adminReleaseNews/{releaseNewsObj.id}` | sem body/query no frontend |
| getById(id) | GET | `/adminReleaseNews/{id}` | sem body/query no frontend |
| findAllForCurrentUser({ pageNumber, pageSize }) | GET | `/adminReleaseNews` | query: pageNumber, pageSize |


## Cobertura por service

| Service | Chamadas HTTP extraídas |
|---|---:|
| AccountsReceivableService | 25 |
| AdminReleaseNewsService | 5 |
| AnamneseAnswerService | 7 |
| AnamneseFormService | 6 |
| ApplicationRoleService | 2 |
| AppointmentService | 42 |
| AuthService | 7 |
| CommissionPaymentsService | 8 |
| CompanyCommissionSettingsService | 2 |
| CompanyService | 8 |
| CompanySettingsService | 2 |
| CompanyTempAccessService | 16 |
| CourtService | 5 |
| CreditCardRateService | 5 |
| CustomerBudgetService | 6 |
| CustomerCommentService | 7 |
| CustomerCreditService | 5 |
| CustomerImageService | 8 |
| CustomerService | 27 |
| DebitCardRateService | 2 |
| EmployeeAdvanceMoneyService | 5 |
| EmployeeService | 14 |
| ExpenseCategoryService | 5 |
| ExpenseService | 15 |
| ExtraRevenueCategoryService | 5 |
| ExtraRevenueService | 6 |
| LoyaltyCardService | 8 |
| PredefinedMessageService | 7 |
| ProductCategoryService | 5 |
| ProductPurchaseService | 6 |
| ProductSaleService | 10 |
| ProductService | 13 |
| ProductSupplierService | 5 |
| ReportsService | 13 |
| RoomService | 1 |
| ServiceCategoryService | 5 |
| ServicePackageService | 6 |
| ServiceService | 10 |
| StripeSubscriptionService | 7 |
| SuperUserService | 55 |
| UserService | 14 |
| UserSubscriptionService | 3 |
| WaitingAppointmentService | 6 |
| WorkScheduleService | 6 |

Total: 425 chamadas HTTP extraídas.

## Observações finais

- Alguns endpoints aparecem em mais de um contexto porque o mesmo resource é reutilizado por menus diferentes.
- Campos de body aparecem com o nome do objeto enviado pelo frontend quando não há schema TypeScript formal no código fonte. Para esses casos, a fonte confiável é a tela/formulário correspondente e o DTO aceito pelo backend.
- Endpoints administrativos/root foram mapeados do bundle, mas devem retornar 403/401 para usuários sem permissão.
