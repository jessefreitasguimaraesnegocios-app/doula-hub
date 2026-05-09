## Visão geral

Plataforma web para "All Things Babies" (doula principal + time). Visual aconchegante, tons terrosos/creme inspirados no Instagram (@allthingsbabiesllc), com forte sensação de segurança e acolhimento para gestantes. Multilíngue (EN padrão, PT, ES, IT). Tudo end-to-end: site institucional, contratação passo-a-passo, pagamentos, loja, e painel admin para gerenciar o time de doulas e comissões.

Por ser um escopo grande, proponho entregar em **3 fases**. Posso seguir direto para a Fase 1 após sua aprovação, e seguimos para 2 e 3 conforme você for validando.

---

## Stack & infraestrutura

- TanStack Start + React + Tailwind (já configurado)
- **Lovable Cloud** (banco, auth, storage, server functions) — necessário para clientes/reservas/admin/loja
- **Stripe (Lovable Payments)** — assinaturas de pacotes, pedidos da loja, e split de comissão por doula
- **Lovable Emails** — confirmações, certificados, notificações
- **i18n** via `react-i18next` com EN / PT / ES / IT (seletor no header)
- Vídeo-chamadas: **não criamos um app de vídeo próprio**. Geramos links de Zoom/Google Meet/Teams/FaceTime que a doula cola ao agendar — é o padrão do mercado e o que funciona de verdade. (Integração nativa de Zoom/Meet pode vir depois via OAuth se quiser.)

---

## Fase 1 — Site público + design system + i18n

Objetivo: site lindo, completo de conteúdo, pronto para impressionar, sem backend ainda.

**Páginas (rotas separadas, cada uma com SEO próprio):**
- `/` Home — hero com vídeo de apresentação da doula, frase impactante, prova social, CTA "Book a free consultation"
- `/about` — história da doula principal, certificações, filosofia
- `/services` — pacotes detalhados (Birth Doula, Postpartum, Bereavement, Lactation, etc.) com preços
- `/team` — grid das doulas do time com foto, bio, especialidades
- `/shop` — vitrine de produtos para gestantes (UI apenas nesta fase)
- `/blog` (opcional, posso pular) 
- `/contact` — formulário + WhatsApp/Instagram
- `/booking` — wizard passo-a-passo (UI apenas nesta fase)

**Design system (tokens em `src/styles.css`):**
- Paleta: cremes, areia, rosa-velho suave, verde-sálvia, marrom-cacau (inspirado no IG)
- Tipografia: serifada elegante para títulos (Playfair/Cormorant) + sans humanista para corpo (Inter)
- Componentes com cantos arredondados generosos, sombras suaves, micro-animações
- Imagens: gero hero/seções com `imagegen` (mães, bebês, mãos, atmosfera quente). Substituível depois pelas fotos reais dela.

**i18n:**
- `react-i18next` com 4 idiomas, seletor no header, persistência em localStorage
- Todo texto da UI em arquivos de tradução

**Entregáveis Fase 1:** site navegável, multilíngue, visualmente impecável, com todos os fluxos representados (mas sem submeter a backend).

---

## Fase 2 — Backend, booking, pagamentos, emails

Ativa Lovable Cloud + Stripe.

**Schema (Postgres via Cloud):**
- `profiles` (auth.users → cliente/doula/admin via tabela separada `user_roles`)
- `doulas` (perfil estendido: bio, foto, especialidades, idiomas, % de comissão, ativo)
- `services` / `packages` (nome, descrição, preço, duração, doula_id opcional)
- `bookings` (cliente, doula, pacote, status, datas, link de vídeo, notas)
- `intake_forms` (dados clínicos da gestante: DPP, parto anterior, plano de parto, alergias, emergência, etc.)
- `consultations` (agendamento de entrevista grátis 30min, link de vídeo)
- `orders` / `order_items` (loja)
- `products` (loja)
- `commissions` (cálculo automático por booking/order)
- `certificates` (PDF gerado quando booking concluído)

**Fluxo de contratação (wizard `/booking`):**
1. Escolher pacote → 2. Escolher doula (ou "let us match you") → 3. Formulário de intake completo → 4. Agendar entrevista de vídeo grátis → 5. Pagar via Stripe → 6. Email de confirmação + certificado de contratação em PDF + link da chamada

**Stripe:**
- Checkout para pacotes (one-time ou subscription) e produtos da loja
- Webhook → grava pagamento, dispara emails, calcula comissão da doula indicada
- Painel admin mostra repasses pendentes

**Auth:**
- Email/senha + Google
- Roles: `admin`, `doula`, `client` em tabela `user_roles` com função `has_role()` SECURITY DEFINER (sem recursão de RLS)

**Emails (Lovable Emails):**
- Confirmação de booking, confirmação de consulta, lembrete 24h antes, recibo de pagamento, certificado anexo

---

## Fase 3 — Painel admin + portal da doula + loja completa

**Admin (`/admin`):**
- Dashboard: receita, bookings, comissões a pagar
- Gerenciar doulas do time: convidar por email, definir % de comissão individual, ativar/desativar
- Gerenciar pacotes e produtos
- Ver todos os bookings, orders, intake forms
- Relatório de comissões por doula

**Portal da doula (`/dashboard` para role=doula):**
- Próximos bookings/consultas
- Colar link de vídeo (Zoom/Meet/Teams/FaceTime) por sessão
- Ver intake form do cliente
- Histórico de comissões

**Loja completa:**
- Carrinho, checkout Stripe, gestão de pedidos, status de envio

---

## Detalhes técnicos importantes

- Roles em tabela separada `user_roles` + função `has_role()` SECURITY DEFINER (regra de segurança crítica)
- RLS em todas as tabelas; cliente só vê os próprios dados, doula vê só seus bookings, admin vê tudo
- Validação com Zod no client e server
- Vídeo-chamadas: campo de texto livre para a URL da reunião + botão "Join" (suporta Zoom, Meet, Teams, FaceTime sem integração custosa)
- Certificados em PDF gerados server-side com template HTML → PDF
- Stripe Connect **não** será usado nesta primeira versão; comissões são calculadas e pagas manualmente pela admin (mais simples; podemos migrar para Connect depois)

---

## Pergunta antes de começar

Confirma que faço a **Fase 1 agora** (site público + design + i18n com imagens geradas e conteúdo placeholder realista), e nas próximas mensagens seguimos para Fase 2 (backend/pagamentos) e Fase 3 (admin/loja)?

Se preferir, posso ir direto até a Fase 2 num único turno — só vai ser uma resposta longa e vou ativar Cloud + Stripe automaticamente.
