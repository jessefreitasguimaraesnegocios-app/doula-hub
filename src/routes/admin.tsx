import { createFileRoute, Link } from "@tanstack/react-router";
import type { Session } from "@supabase/supabase-js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Download, LogOut, Save, Upload } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import {
  DEFAULT_TEAM_SCHEDULE_URL,
  applySiteCmsTheme,
  getSiteCmsFromStorage,
  parseSiteCmsJson,
  setSiteCmsToStorage,
  type SiteCmsV1,
} from "@/lib/site-cms";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  fetchAllDoulasForAdmin,
  updateDoulaPhotoUrl,
  updateDoulaStripeAccount,
  uploadDoulaPhoto,
  upsertSiteSettingsPayload,
  type DoulaRow,
} from "@/lib/supabase/queries";

const ADMIN_SESSION_KEY = "atb-admin-session";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ name: "robots", content: "noindex, nofollow" }],
  }),
  component: Admin,
});

function DoulaRowEditor({ row, onUpdated }: { row: DoulaRow; onUpdated: () => void }) {
  const [stripeId, setStripeId] = useState(row.stripe_account_id ?? "");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setStripeId(row.stripe_account_id ?? "");
  }, [row.id, row.stripe_account_id]);

  const saveStripe = async () => {
    setBusy(true);
    const { error } = await updateDoulaStripeAccount(row.id, stripeId);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Stripe ID actualizado.");
    onUpdated();
  };

  const onPhoto = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    const { publicUrl, error: upErr } = await uploadDoulaPhoto(file, row.slug);
    if (upErr || !publicUrl) {
      toast.error(upErr?.message ?? "Falha no upload");
      setBusy(false);
      return;
    }
    const { error } = await updateDoulaPhotoUrl(row.id, publicUrl);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Foto actualizada.");
    onUpdated();
  };

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4">
      <p className="font-medium text-foreground">{row.slug}</p>
      <p className="text-xs text-muted-foreground">
        {row.kind} · ordem {row.display_order}
      </p>
      <div className="mt-3 space-y-2">
        <Label>stripe_account_id (Connect)</Label>
        <div className="flex flex-wrap gap-2">
          <input
            value={stripeId}
            onChange={(e) => setStripeId(e.target.value)}
            className="min-w-[200px] flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono"
            placeholder="acct_..."
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => void saveStripe()}
            className="rounded-full border border-border bg-background px-3 py-2 text-xs font-medium hover:bg-muted disabled:opacity-50"
          >
            Guardar
          </button>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <Label>Foto (Storage: bucket doulas)</Label>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            void onPhoto(f);
          }}
          className="text-sm"
        />
      </div>
    </div>
  );
}

function DoulaSupabaseTab({ enabled }: { enabled: boolean }) {
  const qc = useQueryClient();
  const { data: rows, isPending } = useQuery({
    queryKey: ["doulas", "admin"],
    queryFn: fetchAllDoulasForAdmin,
    enabled,
    staleTime: 30_000,
  });

  const onUpdated = () => void qc.invalidateQueries({ queryKey: ["doulas", "admin"] });

  if (!enabled) {
    return <p className="text-sm text-muted-foreground">Inicie sessão para gerir doulas na base de dados.</p>;
  }
  if (isPending && !rows) {
    return <p className="text-sm text-muted-foreground">A carregar…</p>;
  }
  if (!rows?.length) {
    return <p className="text-sm text-muted-foreground">Sem linhas na tabela doulas. Corra a migration no projeto Supabase.</p>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {rows.map((r) => (
        <DoulaRowEditor key={r.id} row={r} onUpdated={onUpdated} />
      ))}
    </div>
  );
}

function Admin() {
  const supabaseOk = isSupabaseConfigured();
  const envPassword = import.meta.env.VITE_ADMIN_PASSWORD as string | undefined;
  const [legacyUnlocked, setLegacyUnlocked] = useState(
    () => (typeof sessionStorage !== "undefined" ? sessionStorage.getItem(ADMIN_SESSION_KEY) === "1" : false),
  );
  const [session, setSession] = useState<Session | null>(null);
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [supabasePassword, setSupabasePassword] = useState("");
  const [draft, setDraft] = useState<SiteCmsV1>(() => ({ ...getSiteCmsFromStorage() }));
  const importRef = useRef<HTMLInputElement>(null);

  const unlocked = supabaseOk ? Boolean(session) : legacyUnlocked;

  useEffect(() => {
    if (!supabaseOk) return;
    const c = getSupabaseBrowserClient();
    if (!c) return;
    void c.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: sub } = c.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => sub.subscription.unsubscribe();
  }, [supabaseOk]);

  useEffect(() => {
    if (unlocked) setDraft({ ...getSiteCmsFromStorage() });
  }, [unlocked]);

  const tryLegacyLogin = useCallback(() => {
    if (!envPassword?.trim()) {
      toast.error("Defina VITE_ADMIN_PASSWORD no .env (local) ou na Vercel. Reinicie o dev server após alterar.");
      return;
    }
    if (password === envPassword) {
      sessionStorage.setItem(ADMIN_SESSION_KEY, "1");
      setLegacyUnlocked(true);
      setPassword("");
      toast.success("Sessão iniciada.");
    } else {
      toast.error("Senha incorreta.");
    }
  }, [envPassword, password]);

  const trySupabaseLogin = useCallback(async () => {
    const c = getSupabaseBrowserClient();
    if (!c) {
      toast.error("Supabase não configurado.");
      return;
    }
    const { error } = await c.auth.signInWithPassword({
      email: email.trim(),
      password: supabasePassword,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setSupabasePassword("");
    toast.success("Sessão iniciada.");
  }, [email, supabasePassword]);

  const logout = useCallback(async () => {
    if (supabaseOk) {
      const c = getSupabaseBrowserClient();
      await c?.auth.signOut();
      setSession(null);
    } else {
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
      setLegacyUnlocked(false);
    }
    toast.message("Sessão encerrada.");
  }, [supabaseOk]);

  const save = useCallback(async () => {
    setSiteCmsToStorage(draft);
    applySiteCmsTheme(draft);
    if (supabaseOk && session) {
      const { error } = await upsertSiteSettingsPayload(draft);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Guardado no Supabase e neste navegador.");
      return;
    }
    toast.success("Alterações guardadas neste navegador.");
  }, [draft, supabaseOk, session]);

  const exportJson = useCallback(() => {
    const blob = new Blob([JSON.stringify(draft, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `atb-site-cms-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success("JSON exportado.");
  }, [draft]);

  const onImportFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const parsed = parseSiteCmsJson(text);
      setDraft(parsed);
      setSiteCmsToStorage(parsed);
      applySiteCmsTheme(parsed);
      toast.success("JSON importado e aplicado.");
    };
    reader.readAsText(file);
  }, []);

  if (!unlocked) {
    if (supabaseOk) {
      return (
        <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-20">
          <h1 className="font-serif text-3xl text-foreground">Painel admin</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Inicie sessão com um utilizador criado em Supabase → Authentication (email/password). As chaves{" "}
            <code className="rounded bg-muted px-1">VITE_SUPABASE_URL</code> e{" "}
            <code className="rounded bg-muted px-1">VITE_SUPABASE_ANON_KEY</code> são públicas no cliente; permissões vêm
            das políticas RLS.
          </p>
          <div className="mt-8 space-y-2">
            <Label htmlFor="admin-email">E-mail</Label>
            <input
              id="admin-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <div className="mt-4 space-y-2">
            <Label htmlFor="admin-supa-pw">Palavra-passe</Label>
            <input
              id="admin-supa-pw"
              type="password"
              autoComplete="current-password"
              value={supabasePassword}
              onChange={(e) => setSupabasePassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void trySupabaseLogin()}
              className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => void trySupabaseLogin()}
            className="mt-6 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Entrar
          </button>
          <Link to="/" className="mt-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Voltar ao site
          </Link>
        </div>
      );
    }

    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-20">
        <h1 className="font-serif text-3xl text-foreground">Painel admin</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sem Supabase configurado, o acesso usa <code className="rounded bg-muted px-1">VITE_ADMIN_PASSWORD</code> no
          bundle — só para desenvolvimento ou staging. Para produção, configure{" "}
          <code className="rounded bg-muted px-1">VITE_SUPABASE_URL</code> e{" "}
          <code className="rounded bg-muted px-1">VITE_SUPABASE_ANON_KEY</code>.
        </p>
        <div className="mt-8 space-y-2">
          <Label htmlFor="admin-pw">Senha</Label>
          <input
            id="admin-pw"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && tryLegacyLogin()}
            className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={tryLegacyLogin}
          className="mt-6 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Entrar
        </button>
        <Link to="/" className="mt-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar ao site
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 pb-20">
      <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div>
            <h1 className="font-serif text-2xl text-foreground">Painel admin</h1>
            <p className="text-xs text-muted-foreground">
              {supabaseOk && session
                ? "Guardar envia o CMS para Supabase (site_settings) e para este navegador."
                : "Alterações guardadas no navegador (localStorage). Exporte/importe JSON se precisar."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void save()}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Save className="h-4 w-4" /> Guardar
            </button>
            <button
              type="button"
              onClick={exportJson}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm hover:bg-muted"
            >
              <Download className="h-4 w-4" /> Exportar JSON
            </button>
            <button
              type="button"
              onClick={() => importRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm hover:bg-muted"
            >
              <Upload className="h-4 w-4" /> Importar JSON
            </button>
            <input ref={importRef} type="file" accept="application/json,.json" className="hidden" onChange={onImportFile} />
            <button
              type="button"
              onClick={() => void logout()}
              className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm hover:bg-muted"
            >
              <LogOut className="h-4 w-4" /> Sair
            </button>
            <Link to="/" className="text-sm text-primary underline-offset-4 hover:underline">
              Ver site
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 pt-8">
        <Tabs defaultValue="contacts" className="w-full">
          <TabsList className="mb-6 flex h-auto flex-wrap justify-start gap-1 bg-muted/80 p-1">
            <TabsTrigger value="contacts">Contatos & redes</TabsTrigger>
            <TabsTrigger value="theme">Cores (tema)</TabsTrigger>
            <TabsTrigger value="prices">Preços (USD)</TabsTrigger>
            <TabsTrigger value="team">Equipe / Zoom</TabsTrigger>
            <TabsTrigger value="shop">Loja</TabsTrigger>
            {supabaseOk ? <TabsTrigger value="doulas-db">Doulas (Supabase)</TabsTrigger> : null}
            <TabsTrigger value="stripe">Stripe</TabsTrigger>
          </TabsList>

          <TabsContent value="contacts" className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-serif text-xl">Contatos & redes</h2>
            <p className="mt-1 text-sm text-muted-foreground">Usados no rodapé e na página Contactos.</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>E-mail de contacto</Label>
                <input
                  value={draft.contactEmail}
                  onChange={(e) => setDraft((d) => ({ ...d, contactEmail: e.target.value }))}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone (texto)</Label>
                <input
                  value={draft.contactPhoneDisplay}
                  onChange={(e) => setDraft((d) => ({ ...d, contactPhoneDisplay: e.target.value }))}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone (href, só dígitos +)</Label>
                <input
                  value={draft.contactPhoneHref}
                  onChange={(e) => setDraft((d) => ({ ...d, contactPhoneHref: e.target.value }))}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  placeholder="+13236406640"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Morada (linha única)</Label>
                <input
                  value={draft.addressLine}
                  onChange={(e) => setDraft((d) => ({ ...d, addressLine: e.target.value }))}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>URL do Instagram</Label>
                <input
                  value={draft.instagramUrl}
                  onChange={(e) => setDraft((d) => ({ ...d, instagramUrl: e.target.value }))}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Handle Instagram (texto)</Label>
                <input
                  value={draft.instagramHandle}
                  onChange={(e) => setDraft((d) => ({ ...d, instagramHandle: e.target.value }))}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="theme" className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-serif text-xl">Cores (tema)</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Valores em <strong>oklch(...)</strong> ou qualquer CSS válido. Deixe vazio para voltar ao CSS do projeto.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>--primary</Label>
                <input
                  value={draft.theme.primary}
                  onChange={(e) => setDraft((d) => ({ ...d, theme: { ...d.theme, primary: e.target.value } }))}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-sm"
                  placeholder="oklch(0.55 0.05 145)"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>--primary-foreground</Label>
                <input
                  value={draft.theme.primaryForeground}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, theme: { ...d.theme, primaryForeground: e.target.value } }))
                  }
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-sm"
                  placeholder="oklch(0.975 0.012 85)"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="prices" className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-serif text-xl">Preços (USD)</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Só inglês/espanhol no site usam estes símbolos $ nos cartões de serviços. Deixe vazio para usar o texto dos ficheiros de tradução.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Birth (ex.: $3,800)</Label>
                <input
                  value={draft.servicesPrices.birthUsd}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      servicesPrices: { ...d.servicesPrices, birthUsd: e.target.value },
                    }))
                  }
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label>Postpartum (ex.: $95/hr)</Label>
                <input
                  value={draft.servicesPrices.postpartumUsd}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      servicesPrices: { ...d.servicesPrices, postpartumUsd: e.target.value },
                    }))
                  }
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label>Lactation (ex.: $195)</Label>
                <input
                  value={draft.servicesPrices.lactationUsd}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      servicesPrices: { ...d.servicesPrices, lactationUsd: e.target.value },
                    }))
                  }
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="team" className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-serif text-xl">Equipe / Zoom</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              URL padrão do agendador Zoom (botão &quot;Agendar videochamada&quot; na página Equipe). Vazio = usar o link
              pré-definido no código ({DEFAULT_TEAM_SCHEDULE_URL.slice(0, 48)}…).
            </p>
            <div className="mt-6 space-y-2">
              <Label>URL do agendador</Label>
              <input
                value={draft.teamDefaultScheduleUrl}
                onChange={(e) => setDraft((d) => ({ ...d, teamDefaultScheduleUrl: e.target.value }))}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                placeholder={DEFAULT_TEAM_SCHEDULE_URL}
              />
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              Os cartões da equipa vêm da tabela <code className="rounded bg-muted px-1">doulas</code> no Supabase quando
              configurado; caso contrário usa-se o conteúdo estático do código.
            </p>
          </TabsContent>

          <TabsContent value="shop" className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-serif text-xl">Loja</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Com Supabase, a rota Shop lê <code className="rounded bg-muted px-1">shop_products</code> (activos). Se a
              consulta falhar ou estiver vazia, usa-se <code className="rounded bg-muted px-1">src/data/shop-products.ts</code>{" "}
              e imagens em <code className="rounded bg-muted px-1">src/assets/shop/</code>. Defina{" "}
              <code className="rounded bg-muted px-1">image_url</code> no painel SQL ou Table Editor para substituir fotos.
            </p>
          </TabsContent>

          {supabaseOk ? (
            <TabsContent value="doulas-db" className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="font-serif text-xl">Doulas (Supabase)</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Upload de fotos para o bucket <code className="rounded bg-muted px-1">doulas</code> e actualização de{" "}
                <code className="rounded bg-muted px-1">stripe_account_id</code> por linha.
              </p>
              <div className="mt-6">
                <DoulaSupabaseTab enabled={Boolean(session)} />
              </div>
            </TabsContent>
          ) : null}

          <TabsContent value="stripe" className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-serif text-xl">Stripe & carteiras</h2>
            <ul className="mt-4 list-inside list-disc space-y-2 text-sm text-muted-foreground">
              <li>Contas Connect (Standard ou Express) por doula — requer backend seguro e webhooks Stripe.</li>
              <li>
                O campo <code className="rounded bg-muted px-1">stripe_account_id</code> por doula está na tabela{" "}
                <code className="rounded bg-muted px-1">doulas</code> e pode ser editado no separador Doulas (com sessão).
              </li>
              <li>Nunca colocar chaves secretas no front; usar variáveis de ambiente na Vercel e funções serverless.</li>
            </ul>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
