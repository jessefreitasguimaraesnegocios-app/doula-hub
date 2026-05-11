import { createFileRoute, Link } from "@tanstack/react-router";
import type { Session } from "@supabase/supabase-js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArrowLeft, Calendar, ChevronDown, Download, LogOut, Mail, Save, Upload } from "lucide-react";
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
import { AdminBookingsPanel } from "@/components/admin/AdminBookingsPanel";
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
  const { t } = useTranslation();
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
    toast.success(t("admin.toast.stripeSaved"));
    onUpdated();
  };

  const onPhoto = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    const { publicUrl, error: upErr } = await uploadDoulaPhoto(file, row.slug);
    if (upErr || !publicUrl) {
      toast.error(upErr?.message ?? t("admin.toast.uploadFailed"));
      setBusy(false);
      return;
    }
    const { error } = await updateDoulaPhotoUrl(row.id, publicUrl);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("admin.toast.photoSaved"));
    onUpdated();
  };

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4">
      <p className="font-medium text-foreground">{row.slug}</p>
      <p className="text-xs text-muted-foreground">
        {t("admin.doulasDb.kindOrder", { kind: row.kind, order: row.display_order })}
      </p>
      <div className="mt-3 space-y-2">
        <Label>{t("admin.doulasDb.stripeLabel")}</Label>
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
            {t("admin.doulasDb.save")}
          </button>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <Label>{t("admin.doulasDb.photoLabel")}</Label>
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
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: rows, isPending } = useQuery({
    queryKey: ["doulas", "admin"],
    queryFn: fetchAllDoulasForAdmin,
    enabled,
    staleTime: 30_000,
  });

  const onUpdated = () => void qc.invalidateQueries({ queryKey: ["doulas", "admin"] });

  if (!enabled) {
    return <p className="text-sm text-muted-foreground">{t("admin.doulasDb.loginPrompt")}</p>;
  }
  if (isPending && !rows) {
    return <p className="text-sm text-muted-foreground">{t("admin.doulasDb.loading")}</p>;
  }
  if (!rows?.length) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("admin.doulasDb.empty")}
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
  const { t } = useTranslation();
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
      toast.error(t("admin.toast.defineViteAdminPassword"));
      return;
    }
    if (password === envPassword) {
      sessionStorage.setItem(ADMIN_SESSION_KEY, "1");
      setLegacyUnlocked(true);
      setPassword("");
      toast.success(t("admin.toast.sessionStarted"));
    } else {
      toast.error(t("admin.toast.wrongPassword"));
    }
  }, [envPassword, password, t]);

  const trySupabaseLogin = useCallback(async () => {
    const c = getSupabaseBrowserClient();
    if (!c) {
      toast.error(t("admin.toast.supabaseNotConfigured"));
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
    toast.success(t("admin.toast.sessionStarted"));
  }, [email, supabasePassword, t]);

  const logout = useCallback(async () => {
    if (supabaseOk) {
      const c = getSupabaseBrowserClient();
      await c?.auth.signOut();
      setSession(null);
    } else {
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
      setLegacyUnlocked(false);
    }
    toast.message(t("admin.toast.signedOut"));
  }, [supabaseOk, t]);

  const save = useCallback(async () => {
    setSiteCmsToStorage(draft);
    applySiteCmsTheme(draft);
    if (supabaseOk && session) {
      const { error } = await upsertSiteSettingsPayload(draft);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success(t("admin.toast.savedCloud"));
      return;
    }
    toast.success(t("admin.toast.savedLocal"));
  }, [draft, supabaseOk, session, t]);

  const exportJson = useCallback(() => {
    const blob = new Blob([JSON.stringify(draft, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `atb-site-cms-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success(t("admin.toast.exportDownloaded"));
  }, [draft, t]);

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
      toast.success(t("admin.toast.importLoaded"));
    };
    reader.readAsText(file);
  }, [t]);

  if (!unlocked) {
    if (supabaseOk) {
      return (
        <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-20">
          <h1 className="font-serif text-3xl text-foreground">{t("admin.login.title")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("admin.login.supabaseIntro")}
          </p>
          <div className="mt-8 space-y-2">
            <Label htmlFor="admin-email">{t("admin.login.email")}</Label>
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
            <Label htmlFor="admin-supa-pw">{t("admin.login.password")}</Label>
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
            {t("admin.login.submit")}
          </button>
          <Link to="/" className="mt-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> {t("admin.login.backToSite")}
          </Link>
        </div>
      );
    }

    return (
        <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-20">
          <h1 className="font-serif text-3xl text-foreground">{t("admin.login.title")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("admin.login.legacyIntro")}
          </p>
        <div className="mt-8 space-y-2">
          <Label htmlFor="admin-pw">{t("admin.login.password")}</Label>
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
          {t("admin.login.submit")}
        </button>
        <Link to="/" className="mt-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> {t("admin.login.backToSite")}
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
              <h1 className="font-serif text-2xl text-foreground">{t("admin.header.title")}</h1>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {t("admin.header.intro")}{" "}
                <strong className="text-foreground">{t("admin.header.introSave")}</strong>. {t("admin.header.introThen")}{" "}
                <strong className="text-foreground">{t("admin.header.introView")}</strong> {t("admin.header.introEnd")}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {supabaseOk && session
                  ? t("admin.header.footnoteSupabase")
                  : t("admin.header.footnoteLocal")}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => void save()}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
              >
                <Save className="h-4 w-4" /> {t("admin.header.save")}
              </button>
              <Link
                to="/"
                className="inline-flex items-center rounded-full border border-border bg-background px-5 py-2.5 text-sm font-medium hover:bg-muted"
              >
                {t("admin.header.viewSite")}
              </Link>
              <button
                type="button"
                onClick={() => void logout()}
                className="inline-flex items-center gap-2 rounded-full border border-transparent px-4 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <LogOut className="h-4 w-4" /> {t("admin.header.signOut")}
              </button>
            </div>
          </div>

          <details className="group mt-5 border-t border-border pt-4">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-foreground hover:underline [&::-webkit-details-marker]:hidden">
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
              {t("admin.backup.summary")}
            </summary>
            <div className="mt-4 flex flex-col gap-3 rounded-xl border border-border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-lg text-xs leading-relaxed text-muted-foreground">
                {t("admin.backup.body")}
              </p>
              <div className="flex shrink-0 flex-wrap gap-2">
                <button
                  type="button"
                  onClick={exportJson}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm hover:bg-muted"
                >
                  <Download className="h-4 w-4" /> {t("admin.backup.download")}
                </button>
                <button
                  type="button"
                  onClick={() => importRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm hover:bg-muted"
                >
                  <Upload className="h-4 w-4" /> {t("admin.backup.upload")}
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
            <TabsTrigger value="contacts">{t("admin.tabs.contacts")}</TabsTrigger>
            <TabsTrigger value="photos">{t("admin.tabs.photos")}</TabsTrigger>
            <TabsTrigger value="contracted">{t("admin.tabs.contracted")}</TabsTrigger>
            <TabsTrigger value="theme">{t("admin.tabs.theme")}</TabsTrigger>
            <TabsTrigger value="prices">{t("admin.tabs.prices")}</TabsTrigger>
            <TabsTrigger value="team">{t("admin.tabs.team")}</TabsTrigger>
            <TabsTrigger value="shop">{t("admin.tabs.shop")}</TabsTrigger>
            {supabaseOk ? <TabsTrigger value="doulas-db">{t("admin.tabs.teamDb")}</TabsTrigger> : null}
            {supabaseOk ? (
              <TabsTrigger value="bookings" className="gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> {t("admin.tabs.bookings")}
              </TabsTrigger>
            ) : null}
            <TabsTrigger value="stripe">{t("admin.tabs.stripe")}</TabsTrigger>
            <TabsTrigger value="email" className="gap-1.5">
              <Mail className="h-3.5 w-3.5" /> {t("admin.tabs.email")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="photos" className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-serif text-xl">{t("admin.photos.title")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("admin.photos.subtitle")}
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
            <h2 className="font-serif text-xl">{t("admin.tabs.contracted")}</h2>
            <div className="mt-6">
              <AdminContractedDoulasPanel
                list={draft.contractedDoulas}
                onChange={(next) => setDraft((d) => ({ ...d, contractedDoulas: next }))}
                canUpload={canUploadToCloud}
              />
            </div>
          </TabsContent>

          <TabsContent value="contacts" className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-serif text-xl">{t("admin.contacts.title")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("admin.contacts.subtitle")}</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>{t("admin.contacts.email")}</Label>
                <input
                  value={draft.contactEmail}
                  onChange={(e) => setDraft((d) => ({ ...d, contactEmail: e.target.value }))}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label>{t("admin.contacts.phoneDisplay")}</Label>
                <input
                  value={draft.contactPhoneDisplay}
                  onChange={(e) => setDraft((d) => ({ ...d, contactPhoneDisplay: e.target.value }))}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label>{t("admin.contacts.phoneHref")}</Label>
                <input
                  value={draft.contactPhoneHref}
                  onChange={(e) => setDraft((d) => ({ ...d, contactPhoneHref: e.target.value }))}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  placeholder="+13236406640"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>{t("admin.contacts.address")}</Label>
                <input
                  value={draft.addressLine}
                  onChange={(e) => setDraft((d) => ({ ...d, addressLine: e.target.value }))}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>{t("admin.contacts.instagramUrl")}</Label>
                <input
                  value={draft.instagramUrl}
                  onChange={(e) => setDraft((d) => ({ ...d, instagramUrl: e.target.value }))}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>{t("admin.contacts.instagramHandle")}</Label>
                <input
                  value={draft.instagramHandle}
                  onChange={(e) => setDraft((d) => ({ ...d, instagramHandle: e.target.value }))}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="theme" className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-serif text-xl">{t("admin.themeTab.title")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("admin.themeTab.subtitle")}</p>
            <div className="mt-6">
              <AdminThemePanel
                theme={draft.theme}
                onThemeChange={(next) => setDraft((d) => ({ ...d, theme: next }))}
              />
            </div>
          </TabsContent>

          <TabsContent value="prices" className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-serif text-xl">{t("admin.prices.title")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("admin.prices.subtitle")}
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>{t("admin.prices.birth")}</Label>
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
                <Label>{t("admin.prices.postpartum")}</Label>
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
                <Label>{t("admin.prices.lactation")}</Label>
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
            <h2 className="font-serif text-xl">{t("admin.team.title")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("admin.team.subtitle")}
            </p>
            <div className="mt-6 space-y-2">
              <Label>{t("admin.team.urlLabel")}</Label>
              <input
                value={draft.teamDefaultScheduleUrl}
                onChange={(e) => setDraft((d) => ({ ...d, teamDefaultScheduleUrl: e.target.value }))}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                placeholder={DEFAULT_TEAM_SCHEDULE_URL}
              />
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              {t("admin.team.footerNote")}
            </p>
          </TabsContent>

          <TabsContent value="shop" className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-serif text-xl">{t("admin.shop.title")}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("admin.shop.intro")}
            </p>

            <div className="mt-8 rounded-2xl border border-border bg-muted/20 p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-foreground">{t("admin.shop.comingSoonTitle")}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("admin.shop.comingSoonBody")}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Label htmlFor="shop-coming-soon-switch" className="text-sm text-muted-foreground">
                    {t("admin.shop.showNotice")}
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
                <Label htmlFor="shop-coming-soon-title">{t("admin.shop.customTitle")}</Label>
                <input
                  id="shop-coming-soon-title"
                  value={draft.shopComingSoonTitle}
                  onChange={(e) => setDraft((d) => ({ ...d, shopComingSoonTitle: e.target.value }))}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  placeholder={t("admin.shop.customTitlePh")}
                />
              </div>
              <div className="mt-4 space-y-2">
                <Label htmlFor="shop-coming-soon-msg">{t("admin.shop.customMessage")}</Label>
                <textarea
                  id="shop-coming-soon-msg"
                  rows={5}
                  value={draft.shopComingSoonMessage}
                  onChange={(e) => setDraft((d) => ({ ...d, shopComingSoonMessage: e.target.value }))}
                  className="w-full resize-y rounded-xl border border-border bg-background px-3 py-2 text-sm leading-relaxed"
                  placeholder={t("admin.shop.customMessagePh")}
                />
              </div>
            </div>
          </TabsContent>

          {supabaseOk ? (
            <TabsContent value="doulas-db" className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="font-serif text-xl">{t("admin.doulasDb.title")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("admin.doulasDb.subtitle")}
              </p>
              <div className="mt-6">
                <DoulaSupabaseTab enabled={Boolean(session)} />
              </div>
            </TabsContent>
          ) : null}

          {supabaseOk ? (
            <TabsContent value="bookings" className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="font-serif text-xl">{t("admin.bookings.title")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t("admin.bookings.subtitle")}</p>
              <div className="mt-6">
                <AdminBookingsPanel enabled={Boolean(session)} />
              </div>
            </TabsContent>
          ) : null}

          <TabsContent value="stripe" className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-serif text-xl">{t("admin.stripe.title")}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("admin.stripe.p1")}
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              {t("admin.stripe.p2")}
            </p>
          </TabsContent>

          <TabsContent value="email" className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-serif text-xl">{t("admin.email.title")}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("admin.email.intro")}
            </p>

            <div className="mt-8 space-y-6 rounded-2xl border border-border bg-muted/15 p-6 text-sm leading-relaxed text-foreground/90">
              <div>
                <h3 className="font-medium text-foreground">{t("admin.email.step1Title")}</h3>
                <p className="mt-2 text-muted-foreground">
                  {t("admin.email.step1Open")}{" "}
                  <a
                    href="https://myaccount.google.com/security"
                    className="text-primary underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t("admin.email.step1Link")}
                  </a>
                  {t("admin.email.step1AfterLink")}
                </p>
              </div>
              <div>
                <h3 className="font-medium text-foreground">{t("admin.email.step2Title")}</h3>
                <p className="mt-2 text-muted-foreground">
                  {t("admin.email.step2Open")}{" "}
                  <a
                    href="https://myaccount.google.com/apppasswords"
                    className="text-primary underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t("admin.email.step2Link")}
                  </a>
                  {t("admin.email.step2AfterLink")}
                </p>
              </div>
              <div>
                <h3 className="font-medium text-foreground">{t("admin.email.step3Title")}</h3>
                <ul className="mt-2 list-inside list-disc space-y-1 font-mono text-xs text-muted-foreground">
                  <li>
                    <code className="text-foreground">SMTP_USER</code> — {t("admin.email.step3SmtpUser")}
                  </li>
                  <li>
                    <code className="text-foreground">SMTP_PASS</code> — {t("admin.email.step3SmtpPass")}
                  </li>
                  <li>
                    <code className="text-foreground">SMTP_ACTION_SECRET</code> — {t("admin.email.step3ActionSecret")}
                  </li>
                  <li>
                    <code className="text-foreground">SMTP_FROM_NAME</code> — {t("admin.email.step3FromName")}
                  </li>
                  <li>
                    <code className="text-foreground">SMTP_NOTIFY_TO</code> — {t("admin.email.step3NotifyTo")}
                  </li>
                  <li>
                    <code className="text-foreground">SMTP_HOST</code> / <code>SMTP_PORT</code> /{" "}
                    <code>SMTP_SECURE</code> — {t("admin.email.step3HostPort")}
                  </li>
                  <li>
                    <code className="text-foreground">DISABLE_SMTP_SENDS=1</code> — {t("admin.email.step3Disable")}
                  </li>
                </ul>
                <p className="mt-3 text-xs text-muted-foreground">
                  {t("admin.email.step3Foot")}
                </p>
              </div>
            </div>

            <div className="mt-8 rounded-2xl border border-border bg-muted/20 p-5">
              <p className="font-medium text-foreground">{t("admin.email.optionsTitle")}</p>
              <div className="mt-4 space-y-2">
                <Label htmlFor="email-from-name">{t("admin.email.fromName")}</Label>
                <input
                  id="email-from-name"
                  value={draft.emailFromName}
                  onChange={(e) => setDraft((d) => ({ ...d, emailFromName: e.target.value }))}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  placeholder={t("admin.email.fromNamePh")}
                />
                <p className="text-xs text-muted-foreground">
                  {t("admin.email.fromNameHint")}
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
                  <Label htmlFor="email-auto-booking">{t("admin.email.autoBooking")}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="email-auto-contact"
                    checked={draft.emailAutomationContact}
                    onCheckedChange={(checked) =>
                      setDraft((d) => ({ ...d, emailAutomationContact: Boolean(checked) }))
                    }
                  />
                  <Label htmlFor="email-auto-contact">{t("admin.email.autoContact")}</Label>
                </div>
              </div>
            </div>

            <div className="mt-8 rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h3 className="font-medium text-foreground">{t("admin.email.testTitle")}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("admin.email.testIntro")}
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="email-test-to">{t("admin.email.testTo")}</Label>
                  <input
                    id="email-test-to"
                    type="email"
                    value={emailTestTo}
                    onChange={(e) => setEmailTestTo(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                    placeholder={t("admin.email.testToPh")}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="email-test-secret">{t("admin.email.testSecret")}</Label>
                  <input
                    id="email-test-secret"
                    type="password"
                    autoComplete="off"
                    value={emailTestSecret}
                    onChange={(e) => setEmailTestSecret(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-mono"
                    placeholder={t("admin.email.testSecretPh")}
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
                    if (r.ok) toast.success(t("admin.toast.emailTestSent"));
                    else toast.error(r.error);
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : t("admin.toast.emailSendFailed"));
                  } finally {
                    setEmailTestBusy(false);
                  }
                }}
                className="mt-4 inline-flex items-center gap-2 rounded-full border border-border bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                <Mail className="h-4 w-4" />
                {emailTestBusy ? t("admin.email.testSending") : t("admin.email.testButton")}
              </button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
