# Site em produção (Vercel) — passo a passo simples

Guia curto para publicar o projeto e **onde** definir cada chave. Detalhes de Supabase e Google: [`supabase-integration.md`](./supabase-integration.md) e [`google-workspace-setup.md`](./google-workspace-setup.md).

---

## 1. Antes de publicar

1. Código no **GitHub** (ou GitLab/Bitbucket ligado à Vercel).
2. Projeto **Supabase** criado e migrations aplicadas (tabelas `site_settings`, `doulas`, etc.). Ver [`supabase-integration.md`](./supabase-integration.md).

---

## 2. Ligar o repositório à Vercel

1. Acede a [vercel.com](https://vercel.com) → **Add New…** → **Project**.
2. **Import** o repositório do site.
3. **Framework Preset:** deixa a deteção automática (Vite / TanStack Start).  
   **Build Command:** `pnpm build` (ou `npm run build`).  
   **Output:** a Vercel usa o output gerado pelo Nitro no build (não precisas de configurar pasta à mão na maioria dos casos).
4. **Deploy** — o primeiro build pode falhar até existirem variáveis; é normal. Depois de adicionar as chaves (passo 3), faz **Redeploy**.

---

## 3. Onde pôr as chaves (variáveis de ambiente)

Na Vercel: **Project** → **Settings** → **Environment Variables**.

- Escolhe o ambiente: **Production** (site real), **Preview** (branches/PRs), **Development** (opcional, para `vercel dev`).
- **Name** = nome exacto da variável (ex.: `VITE_SUPABASE_URL`).
- **Value** = valor (sem aspas extra no Gmail/Google; para chaves multi-linha vê notas abaixo).
- Grava cada uma e no fim **Redeploy** o último deployment (ou faz push novo).

**Importante:** tudo com prefixo **`VITE_`** vai para o **bundle do browser** (público). **Nunca** uses `VITE_` em segredos de servidor (service role, SMTP, Google private key).

---

## 4. Lista de variáveis — o quê é obrigatório

| Variável | Obrigatório? | Onde usar | Notas |
|----------|--------------|-----------|--------|
| `VITE_SUPABASE_URL` | **Sim** (site + CMS + equipa) | Production (+ Preview se quiseres previews com dados) | Supabase → **Settings** → **API** → Project URL |
| `VITE_SUPABASE_ANON_KEY` | **Sim** | Idem | Supabase → **API** → chave **anon** `public` |
| `SUPABASE_SERVICE_ROLE_KEY` | Recomendado | Production | Chave **service_role** (só servidor). Grava marcações em `booking_requests`, lógica admin no servidor. **Não** expor ao cliente. |
| `SUPABASE_URL` | Opcional | Production | Só se no servidor quiseres URL separada; muitas vezes basta `VITE_SUPABASE_URL`. |
| `VITE_ADMIN_PASSWORD` | Opcional | Só dev/staging se quiseres | **Evita em produção** — fica no cliente. Em produção usa utilizador Supabase Auth em `/admin`. |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Opcional | Production | Calendário Google / Meet automático na marcação |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | Opcional | Production | Cola a chave **com** `\n` na string se a Vercel pedir uma linha (ex.: `"-----BEGIN…\\n…\\n-----END…"`). Ver `docs/google-workspace-setup.md`. |
| `GOOGLE_CALENDAR_ID` | Opcional | Production | ID do calendário (ex.: `primary` ou e-mail do calendário partilhado) |
| `BOOKING_CALENDAR_TIMEZONE` | Opcional | Production | Ex.: `America/New_York` |
| `SMTP_USER` ou `EMAIL_USER` | Opcional | Production | E-mail de envio (ex. Gmail) |
| `SMTP_PASS` ou `EMAIL_PASS` | Opcional | Production | **Senha de aplicação** Gmail, não a password normal |
| `SMTP_HOST` | Opcional | Production | Ex.: `smtp.gmail.com` |
| `SMTP_PORT` | Opcional | Production | Ex.: `587` |
| `SMTP_SECURE` | Opcional | Production | Ex.: `false` com porta 587 |
| `SMTP_ACTION_SECRET` | Para testes no admin | Production | Segredo à tua escolha; o botão «Enviar teste» de e-mail no `/admin` compara com isto |
| `SMTP_FROM_NAME` | Opcional | Production | Nome «De:» nos e-mails |
| `SMTP_NOTIFY_TO` | Opcional | Production | Cópia BCC / notificações de contacto |
| `DISABLE_SMTP_SENDS` | Opcional | Production | `1` desliga envios (útil em staging) |

**Mínimo para o site “funcionar” em público:** `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`.

**Para marcações gravarem no CRM e e-mails/calendário:** adiciona `SUPABASE_SERVICE_ROLE_KEY` e, se quiseres, bloco Google + SMTP conforme a tabela.

---

## 5. Domínio personalizado (opcional)

**Project** → **Settings** → **Domains** → adiciona o teu domínio e segue as instruções de DNS da Vercel.

---

## 6. Depois do deploy

1. Abre a URL de **Production** e testa `/`, `/booking`, `/contact`, `/admin` (login Supabase).
2. Se algo falhar só em produção: **Deployments** → abre o deploy → **Building** / **Runtime Logs**; no browser **F12 → Consola e Rede**.

---

## Referência rápida local

Copia `.env.example` para `.env` e preenche os mesmos nomes; localmente o Vite lê `.env`. Na Vercel só existe o que configurares no painel (ou `vercel env pull` para trazer para a máquina).
