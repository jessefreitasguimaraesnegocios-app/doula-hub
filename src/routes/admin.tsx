import { createFileRoute, Link } from "@tanstack/react-router";
import type { Session } from "@supabase/supabase-js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ChevronDown, Download, LogOut, Mail, Save, Upload } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  DEFAULT_TEAM_SCHEDULE_URL,
  applySiteCmsTheme,
  getSiteCmsFromStorage,
  parseSiteCmsJson,
  setSiteCmsToStorage,
  type SiteCmsV1,
} from "@/lib/site-cms";
import { AdminContractedDoulasPanel } from "@/components/admin/AdminContractedDoulasPanel";
import { AdminSitePhotosPanel } from "@/components/admin/AdminSitePhotosPanel";
import { AdminThemePanel } from "@/components/admin/AdminThemePanel";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  fetchAllDoulasForAdmin,
  updateDoulaPhotoUrl,
  updateDoulaStripeAccount,
  uploadDoulaPhoto,
  upsertSiteSettingsPayload,
  type DoulaRow,
} from "@/lib/supabase/queries";
import { sendSmtpTestEmail } from "@/lib/email/email-fns";

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
    toast.success("Conta Stripe guardada.");
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
    toast.success("Foto guardada.");
    onUpdated();
  };

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4">
      <p className="font-medium text-foreground">{row.slug}</p>
      <p className="text-xs text-muted-foreground">
        {row.kind} · ordem {row.display_order}
      </p>
      <div className="mt-3 space-y-2">
        <Label>Identificador da conta Stripe (opcional)</Label>
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
        <Label>Foto (escolher ficheiro no computador)</Label>
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
    return <p className="text-sm text-muted-foreground">Entre com o seu e-mail e palavra-passe para ver a equipa aqui.</p>;
  }
  if (isPending && !rows) {
    return <p className="text-sm text-muted-foreground">A carregar…</p>;
  }
  if (!rows?.length) {
    return (
      <p className="text-sm text-muted-foreground">
        Ainda não há ninguém na lista da base de dados. Peça ao técnico do site para adicionar a equipa.
      </p>
    );
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
  const [emailTestTo, setEmailTestTo] = useState("");
  const [emailTestSecret, setEmailTestSecret] = useState("");
  const [emailTestBusy, setEmailTestBusy] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  const unlocked = supabaseOk ? Boolean(session) : legacyUnlocked;
  const canUploadToCloud = supabaseOk && Boolean(session);

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

  useEffect(() => {
    if (!unlocked) return;
    applySiteCmsTheme(draft);
  }, [unlocked, draft.theme.primary, draft.theme.primaryForeground]);

  useEffect(() => {
    if (!unlocked) return;
    return () => {
      applySiteCmsTheme(getSiteCmsFromStorage());
    };
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
    toast.message("Saiu das definições.");
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
      toast.success("Guardado na Internet e neste computador.");
      return;
    }
    toast.success("Guardado neste computador.");
  }, [draft, supabaseOk, session]);

  const exportJson = useCallback(() => {
    const blob = new Blob([JSON.stringify(draft, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `atb-site-cms-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success("Ficheiro descarregado. Guarde-o num sítio seguro, se quiser.");
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
      toast.success(
        "Ficheiro carregado. O site neste computador já mostra essas definições. Toque em Guardar alterações para ficarem guardadas de vez.",
      );
    };
    reader.readAsText(file);
  }, []);

  if (!unlocked) {
    if (supabaseOk) {
      return (
        <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-20">
          <h1 className="font-serif text-3xl text-foreground">Entrar nas definições</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Use o e-mail e a palavra-passe que o técnico do site lhe deu. Se não tiver conta, peça ajuda a quem gere o
            site.
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
          <h1 className="font-serif text-3xl text-foreground">Entrar nas definições</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Modo simples de teste: escreva a senha que está no ficheiro de configuração do site (só para quem montou o
            projeto). Em produção costuma-se usar e-mail e palavra-passe em vez disto.
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
        <div className="mx-auto max-w-6xl px-6 py-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 max-w-xl">
              <h1 className="font-serif text-2xl text-foreground">Definições do site</h1>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Mude o que precisar nos separadores abaixo. Quando terminar, toque em{" "}
                <strong className="text-foreground">Guardar alterações</strong>. Depois abra{" "}
                <strong className="text-foreground">Ver o site</strong> para ver como ficou.
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {supabaseOk && session
                  ? "Com a sua sessão, Guardar também envia tudo para a Internet (além deste computador)."
                  : "Sem sessão na Internet, Guardar mantém as alterações só neste computador."}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => void save()}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
              >
                <Save className="h-4 w-4" /> Guardar alterações
              </button>
              <Link
                to="/"
                className="inline-flex items-center rounded-full border border-border bg-background px-5 py-2.5 text-sm font-medium hover:bg-muted"
              >
                Ver o site
              </Link>
              <button
                type="button"
                onClick={() => void logout()}
                className="inline-flex items-center gap-2 rounded-full border border-transparent px-4 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <LogOut className="h-4 w-4" /> Sair
              </button>
            </div>
          </div>

          <details className="group mt-5 border-t border-border pt-4">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-foreground hover:underline [&::-webkit-details-marker]:hidden">
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
              Só se precisar: cópia no computador (ficheiro)
            </summary>
            <div className="mt-4 flex flex-col gap-3 rounded-xl border border-border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-lg text-xs leading-relaxed text-muted-foreground">
                Isto não é obrigatório. Serve para descarregar uma cópia das definições ou para trazer uma cópia antiga
                — por exemplo se mudou de computador. O dia a dia do site é só: alterar → Guardar alterações.
              </p>
              <div className="flex shrink-0 flex-wrap gap-2">
                <button
                  type="button"
                  onClick={exportJson}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm hover:bg-muted"
                >
                  <Download className="h-4 w-4" /> Baixar cópia
                </button>
                <button
                  type="button"
                  onClick={() => importRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm hover:bg-muted"
                >
                  <Upload className="h-4 w-4" /> Carregar cópia
                </button>
              </div>
            </div>
            <input ref={importRef} type="file" accept="application/json,.json" className="hidden" onChange={onImportFile} />
          </details>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 pt-8">
        <Tabs defaultValue="contacts" className="w-full">
          <TabsList className="mb-6 flex h-auto flex-wrap justify-start gap-1 bg-muted/80 p-1">
            <TabsTrigger value="contacts">Contactos</TabsTrigger>
            <TabsTrigger value="photos">Fotos do site</TabsTrigger>
            <TabsTrigger value="contracted">Contratadas</TabsTrigger>
            <TabsTrigger value="theme">Cores</TabsTrigger>
            <TabsTrigger value="prices">Preços</TabsTrigger>
            <TabsTrigger value="team">Videochamada</TabsTrigger>
            <TabsTrigger value="shop">Loja</TabsTrigger>
            {supabaseOk ? <TabsTrigger value="doulas-db">Equipa</TabsTrigger> : null}
            <TabsTrigger value="stripe">Pagamentos</TabsTrigger>
            <TabsTrigger value="email" className="gap-1.5">
              <Mail className="h-3.5 w-3.5" /> E-mail
            </TabsTrigger>
          </TabsList>

          <TabsContent value="photos" className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-serif text-xl">Fotos do site</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Troque imagens sem mexer no código. As fotos da loja por produto continuam na base de dados ou no ficheiro
              da loja — aqui são sobretudo páginas principais e equipa.
            </p>
            <div className="mt-6">
              <AdminSitePhotosPanel
                siteImages={draft.siteImages}
                onChange={(next) => setDraft((d) => ({ ...d, siteImages: next }))}
                canUpload={canUploadToCloud}
              />
            </div>
          </TabsContent>

          <TabsContent value="contracted" className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-serif text-xl">Contratadas (lista privada)</h2>
            <div className="mt-6">
              <AdminContractedDoulasPanel
                list={draft.contractedDoulas}
                onChange={(next) => setDraft((d) => ({ ...d, contractedDoulas: next }))}
                canUpload={canUploadToCloud}
              />
            </div>
          </TabsContent>

          <TabsContent value="contacts" className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-serif text-xl">Contactos e redes sociais</h2>
            <p className="mt-1 text-sm text-muted-foreground">Aparecem no rodapé e na página de contactos do site.</p>
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
                <Label>Telefone (como aparece escrito)</Label>
                <input
                  value={draft.contactPhoneDisplay}
                  onChange={(e) => setDraft((d) => ({ ...d, contactPhoneDisplay: e.target.value }))}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone para o botão “ligar” (só números e +)</Label>
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
                <Label>Nome no Instagram (com @)</Label>
                <input
                  value={draft.instagramHandle}
                  onChange={(e) => setDraft((d) => ({ ...d, instagramHandle: e.target.value }))}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="theme" className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-serif text-xl">Cores do site</h2>
            <p className="mt-1 text-sm text-muted-foreground">Toque nas cores; não precisa de escrever códigos.</p>
            <div className="mt-6">
              <AdminThemePanel
                theme={draft.theme}
                onThemeChange={(next) => setDraft((d) => ({ ...d, theme: next }))}
              />
            </div>
          </TabsContent>

          <TabsContent value="prices" className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-serif text-xl">Preços nos serviços</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Só em inglês e espanhol no site aparecem estes preços em dólares ($). Deixe em branco para usar o texto
              padrão do site.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Nascimento (ex.: $3,800)</Label>
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
                <Label>Pós-parto (ex.: $95/hr)</Label>
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
                <Label>Amamentação (ex.: $195)</Label>
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
            <h2 className="font-serif text-xl">Link da videochamada (Zoom)</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Cole aqui o link do calendário Zoom que as visitantes devem abrir ao tocar em “Agendar videochamada” na
              página da equipa. Se deixar em branco, o site usa o link que já veio configurado.
            </p>
            <div className="mt-6 space-y-2">
              <Label>Endereço do link (URL)</Label>
              <input
                value={draft.teamDefaultScheduleUrl}
                onChange={(e) => setDraft((d) => ({ ...d, teamDefaultScheduleUrl: e.target.value }))}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                placeholder={DEFAULT_TEAM_SCHEDULE_URL}
              />
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              As fotos e textos das pessoas na página da equipa vêm da base de dados quando o site está ligado à
              Internet; caso contrário usa-se o conteúdo fixo que veio no site.
            </p>
          </TabsContent>

          <TabsContent value="shop" className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-serif text-xl">Loja</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Os produtos e fotos da loja são geridos na base de dados ou pelo técnico do site. Aqui não há botões para
              mudar produtos — fale com quem mantém o site se precisar de alterar artigos ou imagens.
            </p>

            <div className="mt-8 rounded-2xl border border-border bg-muted/20 p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-foreground">Mensagem «em breve» na página Loja</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Quando está ligada, aparece um aviso acolhedor no centro do ecrã (com o fundo desfocado). A visitante
                    pode esconder o aviso só para ver os produtos naquele momento; se sair da loja, fechar o separador
                    ou voltar mais tarde, o aviso volta a aparecer até desligar aqui. Se deixar o título ou o texto em
                    branco, o site usa as frases que já vêm nas traduções (por idioma).
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Label htmlFor="shop-coming-soon-switch" className="text-sm text-muted-foreground">
                    Mostrar aviso
                  </Label>
                  <Switch
                    id="shop-coming-soon-switch"
                    checked={draft.shopComingSoonEnabled}
                    onCheckedChange={(checked) =>
                      setDraft((d) => ({ ...d, shopComingSoonEnabled: Boolean(checked) }))
                    }
                  />
                </div>
              </div>
              <div className="mt-6 space-y-2">
                <Label htmlFor="shop-coming-soon-title">Título personalizado (opcional)</Label>
                <input
                  id="shop-coming-soon-title"
                  value={draft.shopComingSoonTitle}
                  onChange={(e) => setDraft((d) => ({ ...d, shopComingSoonTitle: e.target.value }))}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  placeholder="Deixe vazio para usar o texto automático do site"
                />
              </div>
              <div className="mt-4 space-y-2">
                <Label htmlFor="shop-coming-soon-msg">Mensagem personalizada (opcional)</Label>
                <textarea
                  id="shop-coming-soon-msg"
                  rows={5}
                  value={draft.shopComingSoonMessage}
                  onChange={(e) => setDraft((d) => ({ ...d, shopComingSoonMessage: e.target.value }))}
                  className="w-full resize-y rounded-xl border border-border bg-background px-3 py-2 text-sm leading-relaxed"
                  placeholder="Deixe vazio para usar o texto automático. Pode usar Enter para parágrafos."
                />
              </div>
            </div>
          </TabsContent>

          {supabaseOk ? (
            <TabsContent value="doulas-db" className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="font-serif text-xl">Equipa (fotos e Stripe)</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Por cada pessoa: pode carregar uma foto e, se o técnico pediu, colar o identificador da conta Stripe.
              </p>
              <div className="mt-6">
                <DoulaSupabaseTab enabled={Boolean(session)} />
              </div>
            </TabsContent>
          ) : null}

          <TabsContent value="stripe" className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-serif text-xl">Pagamentos online</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Cartões e pagamentos seguros são montados pelo técnico do site (Stripe). Se precisar de mudar contas ou
              preços ligados ao dinheiro, peça ajuda a essa pessoa — não é seguro tratar disso só por aqui.
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              O identificador da conta Stripe de cada doula pode ser preenchido no separador <strong>Equipa</strong>,
              quando estiver com sessão iniciada.
            </p>
          </TabsContent>

          <TabsContent value="email" className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-serif text-xl">E-mail automático (Gmail / SMTP)</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              A <strong>senha de aplicação</strong> do Gmail e o e-mail da conta <strong>nunca</strong> devem ser
              guardados neste painel nem no ficheiro JSON — só nas variáveis de ambiente do servidor (ex.: Vercel →
              Settings → Environment Variables). Aqui configura o comportamento do site e testa o envio.
            </p>

            <div className="mt-8 space-y-6 rounded-2xl border border-border bg-muted/15 p-6 text-sm leading-relaxed text-foreground/90">
              <div>
                <h3 className="font-medium text-foreground">1. Segurança na conta Google</h3>
                <p className="mt-2 text-muted-foreground">
                  Em{" "}
                  <a
                    href="https://myaccount.google.com/security"
                    className="text-primary underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Google Account → Security
                  </a>
                  , ative a <strong>verificação em duas etapas</strong>.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-foreground">2. Senha de aplicação</h3>
                <p className="mt-2 text-muted-foreground">
                  Depois abra{" "}
                  <a
                    href="https://myaccount.google.com/apppasswords"
                    className="text-primary underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    App passwords
                  </a>
                  , crie um nome (ex.: «Meu site») e copie a senha de 16 caracteres — <strong>não</strong> use a senha
                  normal do Gmail.
                </p>
              </div>
              <div>
                <h3 className="font-medium text-foreground">3. Variáveis no servidor (Vercel ou .env local)</h3>
                <ul className="mt-2 list-inside list-disc space-y-1 font-mono text-xs text-muted-foreground">
                  <li>
                    <code className="text-foreground">SMTP_USER</code> — o Gmail (ex.:{" "}
                    <code>nome@gmail.com</code>) · alternativa: <code>EMAIL_USER</code>
                  </li>
                  <li>
                    <code className="text-foreground">SMTP_PASS</code> — senha de aplicação · alternativa:{" "}
                    <code>EMAIL_PASS</code>
                  </li>
                  <li>
                    <code className="text-foreground">SMTP_ACTION_SECRET</code> — uma palavra-passe à sua escolha só
                    para desbloquear o «teste» abaixo (não é a senha do Gmail)
                  </li>
                  <li>
                    <code className="text-foreground">SMTP_FROM_NAME</code> — nome no remetente (opcional)
                  </li>
                  <li>
                    <code className="text-foreground">SMTP_NOTIFY_TO</code> — para onde vão as mensagens do formulário
                    de contacto (opcional; se vazio, usa o mesmo que <code>SMTP_USER</code>)
                  </li>
                  <li>
                    <code className="text-foreground">SMTP_HOST</code> (opcional, predefinição{" "}
                    <code>smtp.gmail.com</code>), <code>SMTP_PORT</code> (587), <code>SMTP_SECURE</code> (
                    <code>true</code> só se o servidor exigir SSL na porta dedicada)
                  </li>
                  <li>
                    <code className="text-foreground">DISABLE_SMTP_SENDS=1</code> — desliga todos os envios em
                    emergência
                  </li>
                </ul>
                <p className="mt-3 text-xs text-muted-foreground">
                  Em produção na Vercel o site corre em Node (Nitro); o Nodemailer funciona aí. Num ambiente só
                  Cloudflare Workers o SMTP clássico costuma <strong>não</strong> estar disponível — use Vercel ou
                  outro backend Node para Gmail SMTP.
                </p>
              </div>
            </div>

            <div className="mt-8 rounded-2xl border border-border bg-muted/20 p-5">
              <p className="font-medium text-foreground">Opções guardadas com «Guardar alterações»</p>
              <div className="mt-4 space-y-2">
                <Label htmlFor="email-from-name">Nome no remetente (opcional)</Label>
                <input
                  id="email-from-name"
                  value={draft.emailFromName}
                  onChange={(e) => setDraft((d) => ({ ...d, emailFromName: e.target.value }))}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  placeholder="Ex.: All Things Babies"
                />
                <p className="text-xs text-muted-foreground">
                  Se deixar vazio, usa-se o valor de <code className="font-mono">SMTP_FROM_NAME</code> no servidor.
                </p>
              </div>
              <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    id="email-auto-booking"
                    checked={draft.emailAutomationBooking}
                    onCheckedChange={(checked) =>
                      setDraft((d) => ({ ...d, emailAutomationBooking: Boolean(checked) }))
                    }
                  />
                  <Label htmlFor="email-auto-booking">E-mail após concluir marcação no site</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="email-auto-contact"
                    checked={draft.emailAutomationContact}
                    onCheckedChange={(checked) =>
                      setDraft((d) => ({ ...d, emailAutomationContact: Boolean(checked) }))
                    }
                  />
                  <Label htmlFor="email-auto-contact">Notificar por e-mail o formulário de contactos</Label>
                </div>
              </div>
            </div>

            <div className="mt-8 rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h3 className="font-medium text-foreground">Enviar e-mail de teste</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Use o mesmo valor de <code className="rounded bg-muted px-1 font-mono text-xs">SMTP_ACTION_SECRET</code>{" "}
                que colocou na Vercel (ou no .env local). Isto evita que qualquer visitante dispare e-mails.
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="email-test-to">Destino do teste</Label>
                  <input
                    id="email-test-to"
                    type="email"
                    value={emailTestTo}
                    onChange={(e) => setEmailTestTo(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                    placeholder="o seu e-mail"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="email-test-secret">Chave de ação (SMTP_ACTION_SECRET)</Label>
                  <input
                    id="email-test-secret"
                    type="password"
                    autoComplete="off"
                    value={emailTestSecret}
                    onChange={(e) => setEmailTestSecret(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-mono"
                    placeholder="o valor que definiu no servidor"
                  />
                </div>
              </div>
              <button
                type="button"
                disabled={emailTestBusy || !emailTestTo.trim() || !emailTestSecret.trim()}
                onClick={async () => {
                  setEmailTestBusy(true);
                  try {
                    const r = await sendSmtpTestEmail({
                      data: { to: emailTestTo.trim(), actionSecret: emailTestSecret },
                    });
                    if (r.ok) toast.success("E-mail de teste enviado. Verifique a caixa de entrada (e o spam).");
                    else toast.error(r.error);
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Falha no envio");
                  } finally {
                    setEmailTestBusy(false);
                  }
                }}
                className="mt-4 inline-flex items-center gap-2 rounded-full border border-border bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                <Mail className="h-4 w-4" />
                {emailTestBusy ? "A enviar…" : "Enviar teste"}
              </button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
