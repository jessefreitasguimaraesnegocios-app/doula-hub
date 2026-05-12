# Google Workspace (Calendar + Meet) e CRM de marcações

Este site pode, ao concluir o fluxo em `/booking`:

1. **Gravar no CRM ao sair do passo «Agenda»** (plataforma de vídeo + data + hora) — `POST /api/booking-schedule-snapshot` com `SUPABASE_SERVICE_ROLE_KEY`. O registo fica com `submission_phase = schedule_saved` (sem evento Google nem e-mail de confirmação até ao passo final).
2. **Ao concluir o último passo**, o mesmo registo é atualizado (`submission_phase = completed`) e, se configurado, **cria-se o evento** no Google Calendar com **Google Meet** — service account + API Calendar.
3. O e-mail de confirmação para a cliente continua a ser o **SMTP** configurado no CMS (separador E-mail no `/admin`), quando «automação de marcação» está ligada.

O e-mail de confirmação para a cliente continua a ser o **SMTP** configurado no CMS (separador E-mail no `/admin`), quando «automação de marcação» está ligada.

## 1. Google Cloud

1. Cria um projeto em [Google Cloud Console](https://console.cloud.google.com/).
2. **APIs e serviços** → **Biblioteca** → ativa **Google Calendar API**.
3. **IAM e administrador** → **Contas de serviço** → **Criar conta de serviço** (nome qualquer).
4. Nessa conta: **Chaves** → **Adicionar chave** → **JSON**. Guarda o ficheiro em local seguro (não commits).

Do JSON precisas de:

- `client_email` → variável `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `private_key` → variável `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` (mantém as quebras `\n` como no JSON; em `.env` podes usar aspas e `\n`)

## 2. Partilhar o calendário com a service account

A service account **não** usa a tua conta Gmail por defeito. Tens de lhe dar acesso ao calendário onde queres os eventos:

1. Abre [Google Calendar](https://calendar.google.com/) com a conta que gere esse calendário.
2. Definições do calendário desejado → **Partilhar com pessoas específicas**.
3. Adiciona o e-mail da service account (`...@...iam.gserviceaccount.com`) com permissão **Fazer alterações em eventos**.

O ID do calendário:

- Calendário principal da conta: normalmente `primary` (só funciona se a conta dona do calendário for a que partilhou com a SA, ou usas o e-mail do calendário).
- Calendário secundário: em **Integrar calendário** copia o **ID do calendário** (formato `xxxx@group.calendar.google.com`).

Define `GOOGLE_CALENDAR_ID` com esse valor.

## 3. Variáveis de ambiente (servidor)

Vê `.env.example`. Resumo:

| Variável | Descrição |
|----------|-----------|
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | E-mail da service account |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | Chave privada PEM (com `\n`) |
| `GOOGLE_CALENDAR_ID` | `primary` ou ID do calendário partilhado |
| `BOOKING_CALENDAR_TIMEZONE` | Ex.: `America/New_York` — usado ao interpretar data/hora da marcação |

Reinicia o servidor de desenvolvimento / redeploy após alterar envs.

## 4. Supabase

Aplica a migração que cria `booking_requests` (política: utilizadores **authenticated** podem **ler** no admin; **escrita** é feita pelo backend com a service role).

Sem `SUPABASE_SERVICE_ROLE_KEY`, o utilizador ainda pode concluir a marcação e receber e-mail/Meet se o Google e o SMTP estiverem corretos, mas **não** há linha no CRM.

## 5. Meet e convites

O código pede `conferenceData` ao Calendar; o link Meet vem na resposta da API e é guardado em `google_meet_link` quando há registo CRM. A convidada é adicionada como **attendee** com o e-mail do formulário (recebe convite do Google conforme as definições da conta/calendário).

## 6. Resolução de problemas

- **403 / insufficient permissions**: confirma que o calendário foi partilhado com o e-mail exato da service account e que `GOOGLE_CALENDAR_ID` corresponde a esse calendário.
- **Invalid JWT / bad key**: verifica aspas e `\n` na private key no ambiente de deploy.
- **CRM vazio no admin**: confirma login Supabase no `/admin` e `SUPABASE_SERVICE_ROLE_KEY` no servidor.
