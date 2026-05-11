# Integração Supabase — All Things Babies (doulasite)

Este guia alinha o **projeto Supabase** (Postgres, Auth, Storage, RLS) com o que o **site e o painel `/admin`** esperam.

## O que o app usa

| Recurso | Uso no site |
|--------|-------------|
| **Tabela `site_settings`** | Uma linha `id = 'main'`. O campo **`payload`** (JSON) é o CMS (`SiteCmsV1`): contactos, preços em USD, cores, URL Zoom, **URLs de fotos** (`siteImages`), **contratadas** (`contractedDoulas`: nome, contacto, valor mensal só no painel; `status` ativa/pausada; `visibleOnSite` inclui a pessoa em **Equipa** e **Marcação** quando ativa), opções da **loja** (`shopComingSoon*`) e **e-mail** (`emailFromName`, `emailAutomationBooking`, `emailAutomationContact`). O cliente faz pull no arranque (`SupabaseSiteBootstrap`) e grava no `localStorage`; o admin com sessão faz **upsert** da mesma estrutura. |
| **Tabela `doulas`** | Equipa na página **Equipa** e fotos na **Marcação** quando há dados remotos. Visitantes (`anon`) só veem `published = true`. Admin autenticado vê e edita todas. |
| **Tabela `shop_products`** | Loja quando há produtos activos na base; caso contrário usa `src/data/shop-products.ts`. |
| **Storage bucket `doulas`** (público) | Fotos de equipa (`{slug}/…`), ficheiros do CMS (`site/…`), **contratadas** (`contractors/…`). MIME permitidos nas migrations: imagens + **vídeo** (mp4, webm, quicktime) até 100 MiB — alinhado com vídeo opcional em `siteImages.about_founder`. |

Contrato TypeScript do CMS: `src/lib/site-cms.ts`.

Chaves de **`siteImages`** (URLs `https://…` opcionais; vazio = imagem do código):

- `home_hero`, `home_promise`, `home_cta_newborn`
- `about_founder` (imagem ou URL `.mp4` / `.webm`; o vídeo por defeito da página About está no bundle do app, não na base), `about_campus`
- `team_hero`, `team_member_founder`, `team_member_sofia`, `team_member_elena`, `team_member_mei`
- `shop_hero`, `footer_logo`

## Migrações SQL

Ficheiros em `supabase/migrations/` (aplicar **por ordem**):

1. **`20260510052254_init_cms_schema.sql`** — tabelas, RLS, bucket `doulas`, seeds de `doulas` e `shop_products`, linha inicial `site_settings`.
2. **`20260511000000_supabase_triggers_storage.sql`** — triggers `updated_at`, bucket `doulas` (100 MiB + imagens e vídeo), `COMMENT ON` nas tabelas.
3. **`20260511120000_storage_allow_video.sql`** — idempotente; útil se já tinha aplicado uma versão antiga do ficheiro (2) só com imagens — volta a definir MIME com vídeo.
4. **`20260512000000_site_settings_payload_comment.sql`** — actualiza o `COMMENT` da coluna `payload` para reflectir campos novos do CMS no código.

### Aplicar no Supabase (hosted)

1. Dashboard → **SQL Editor** → colar o conteúdo de cada ficheiro de `supabase/migrations/` **por ordem de nome** → **Run** em cada um.

Ou `supabase db push` (aplica todas as migrations em falta).

Ou, com [Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
npx supabase link --project-ref <SEU_PROJECT_REF>
npx supabase db push
```

## Variáveis de ambiente (front-end)

No `.env` local e na Vercel (ou outro host):

- `VITE_SUPABASE_URL` — URL do projecto (Settings → API).
- `VITE_SUPABASE_ANON_KEY` — chave **anon** (pública no browser; a segurança vem das **RLS**).

**Nunca** coloque `service_role` no bundle do site.

**E-mail (SMTP)** — credenciais Gmail / senha de aplicação ficam só no **servidor** (ex.: Vercel), nunca com prefixo `VITE_`. Ver `.env.example` e o separador **E-mail** em `/admin`.

## Autenticação (painel admin)

1. Dashboard → **Authentication** → **Providers** → activar **Email**.
2. **Users** → **Add user** (ou convite) para criar a conta que vai entrar em `/admin`.
3. Confirme e-mail se tiver confirmação obrigatória activa.

O painel usa `signInWithPassword` com o cliente anon; as políticas `TO authenticated` permitem escrita em `site_settings`, `doulas`, `shop_products` e uploads no Storage.

## Row Level Security (resumo)

- **`site_settings`**: qualquer um pode **ler** (`SELECT`). Só **authenticated** pode inserir/atualizar.
- **`doulas`**: **anon** só `SELECT` com `published = true`. **authenticated** CRUD completo.
- **`shop_products`**: **anon** só produtos `active = true`. **authenticated** CRUD completo.
- **`storage.objects`** (bucket `doulas`): leitura pública; escrita só **authenticated**.

## Slugs importantes em `doulas`

O site e a marcação assumem estes **slugs** (seed na migration):

| slug | kind | Notas |
|------|------|--------|
| `founder` | `founder` | `use_i18n = true` — nomes/textos vêm das traduções quando não há override na linha. |
| `sofia`, `elena`, `mei` | `doula` | Textos e fotos podem vir da tabela (`photo_url`, `name`, etc.). |

Novas doulas na equipa: use **Insert** com `slug` único; no CMS de fotos do site há slots só para os quatro slugs acima na marcação — para novos slugs, use **`photo_url`** na tabela ou amplie o CMS no código.

## Storage — caminhos usados pelo app

- `doulas/{slug}/{timestamp}-ficheiro` — upload de foto de equipa (admin).
- `doulas/site/cms-{chave}/…` — fotos “Fotos do site”.
- `doulas/site/contractors/…` — fotos da lista **Contratadas** (privada no JSON).

O bucket é **público**; as URLs públicas são válidas em `photo_url`, `image_url` e nos campos `siteImages` do JSON.

## Resolução de problemas

| Sintoma | O que verificar |
|--------|------------------|
| Admin diz “Supabase não configurado” | `VITE_SUPABASE_*` definidos e rebuild após alterar `.env`. |
| Erro ao **Guardar** CMS | Sessão iniciada? Políticas `site_settings` para `authenticated`? |
| Erro no **upload** de foto ou vídeo CMS | Utilizador autenticado? Bucket `doulas` existe? Ficheiro dentro do limite do bucket (migrations: **100 MiB**) e MIME permitido (imagens JPEG/PNG/WebP + vídeo mp4/webm/quicktime)? |
| Loja não muda | `shop_products` com `active = true` e `image_url` preenchido se quiser foto remota. |
| Equipa não vem da base | Sem erros na query? Há linhas `published = true`? |

## Ficheiros úteis no repositório

- `src/lib/supabase/client.ts` — cliente browser.
- `src/lib/supabase/queries.ts` — queries e uploads.
- `src/components/SupabaseSiteBootstrap.tsx` — primeiro pull de `site_settings` → `localStorage`.
- `supabase/config.toml` — projecto local CLI (`project_id`, `db.seed` → `supabase/seed.sql`).

## Segurança (checklist rápido)

- [ ] RLS activo em todas as tabelas públicas usadas pelo app (já na migration).
- [ ] Apenas chave **anon** no front-end.
- [ ] Contas de admin com passwords fortes; 2FA no Supabase se disponível.
- [ ] Revisar **Storage** policies se criar buckets novos.

---

*Última revisão: CMS (loja + e-mail), SQL `payload` comment, marcação com slug `founder` alinhado ao seed `doulas`.*
