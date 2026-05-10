import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Download, LogOut, Save, Upload } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import {
  DEFAULT_SITE_CMS,
  DEFAULT_TEAM_SCHEDULE_URL,
  applySiteCmsTheme,
  getSiteCmsFromStorage,
  parseSiteCmsJson,
  setSiteCmsToStorage,
  type SiteCmsV1,
} from "@/lib/site-cms";

const ADMIN_SESSION_KEY = "atb-admin-session";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ name: "robots", content: "noindex, nofollow" }],
  }),
  component: Admin,
});

function Admin() {
  const envPassword = import.meta.env.VITE_ADMIN_PASSWORD as string | undefined;
  const [unlocked, setUnlocked] = useState(() =>
    typeof sessionStorage !== "undefined" ? sessionStorage.getItem(ADMIN_SESSION_KEY) === "1" : false,
  );
  const [password, setPassword] = useState("");
  const [draft, setDraft] = useState<SiteCmsV1>(() => ({ ...getSiteCmsFromStorage() }));
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (unlocked) setDraft({ ...getSiteCmsFromStorage() });
  }, [unlocked]);

  const tryLogin = useCallback(() => {
    if (!envPassword?.trim()) {
      toast.error("Defina VITE_ADMIN_PASSWORD no .env (local) ou na Vercel. Reinicie o dev server após alterar.");
      return;
    }
    if (password === envPassword) {
      sessionStorage.setItem(ADMIN_SESSION_KEY, "1");
      setUnlocked(true);
      setPassword("");
      toast.success("Sessão iniciada.");
    } else {
      toast.error("Senha incorreta.");
    }
  }, [envPassword, password]);

  const logout = useCallback(() => {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    setUnlocked(false);
    toast.message("Sessão encerrada.");
  }, []);

  const save = useCallback(() => {
    setSiteCmsToStorage(draft);
    applySiteCmsTheme(draft);
    toast.success("Alterações guardadas neste navegador.");
  }, [draft]);

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
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-20">
        <h1 className="font-serif text-3xl text-foreground">Painel admin</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Acesso protegido por senha. Em produção, troque por login seguro (ex.: Supabase Auth). A senha{" "}
          <code className="rounded bg-muted px-1">VITE_ADMIN_PASSWORD</code> fica no bundle do cliente — use só para
          desenvolvimento ou staging.
        </p>
        <div className="mt-8 space-y-2">
          <Label htmlFor="admin-pw">Senha</Label>
          <input
            id="admin-pw"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && tryLogin()}
            className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={tryLogin}
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
            <p className="text-xs text-muted-foreground">Alterações guardadas no navegador (localStorage). Use exportar/importar JSON.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={save}
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
              onClick={logout}
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
              <strong>Próximo passo:</strong> CRUD de doulas com fotos e textos por idioma pede base de dados (ex. Supabase)
              + armazenamento de ficheiros. Podemos ligar esta UI aos mesmos campos quando estiver pronto.
            </p>
          </TabsContent>

          <TabsContent value="shop" className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-serif text-xl">Loja</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Os produtos estão em <code className="rounded bg-muted px-1">src/data/shop-products.ts</code> e imagens em{" "}
              <code className="rounded bg-muted px-1">src/assets/shop/</code>. Para editar preços/nomes no browser sem
              deploy, o próximo passo é mover esta lista para Supabase (ou CMS) e consumir na rota Shop.
            </p>
          </TabsContent>

          <TabsContent value="stripe" className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-serif text-xl">Stripe & carteiras</h2>
            <ul className="mt-4 list-inside list-disc space-y-2 text-sm text-muted-foreground">
              <li>Contas Connect (Standard ou Express) por doula — requer backend seguro e webhooks Stripe.</li>
              <li>Guardar só <code className="rounded bg-muted px-1">stripe_account_id</code> por profissional na base de dados.</li>
              <li>Nunca colocar chaves secretas no front; usar variáveis de ambiente na Vercel e funções serverless.</li>
            </ul>
            <p className="mt-4 text-sm text-foreground">Quando quiser, seguimos com Supabase + Stripe Connect passo a passo.</p>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
