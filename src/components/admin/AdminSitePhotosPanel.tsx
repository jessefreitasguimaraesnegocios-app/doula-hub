import { useState } from "react";
import { toast } from "sonner";
import { ImageIcon, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { uploadSiteCmsAsset } from "@/lib/supabase/queries";
import { type SiteImageKey, type SiteCmsV1 } from "@/lib/site-cms";

const SLOTS: { key: SiteImageKey; title: string; hint: string }[] = [
  { key: "home_hero", title: "Página inicial — foto grande (lado direito)", hint: "Primeira imagem ao abrir o site." },
  { key: "home_promise", title: "Página inicial — secção “promessa”", hint: "Foto ao lado do texto da promessa." },
  { key: "home_cta_newborn", title: "Página inicial — fundo do convite final", hint: "Imagem suave atrás do último bloco." },
  {
    key: "about_founder",
    title: "Sobre — vídeo ou foto principal",
    hint: "Por defeito o site usa o vídeo da pasta do projecto. Aqui pode colar um link https de imagem ou .mp4 para substituir.",
  },
  { key: "about_campus", title: "Sobre — foto dos certificados / campus", hint: "Segunda foto na página Sobre." },
  { key: "team_hero", title: "Equipa — imagem de topo", hint: "Faixa larga no topo da página Equipa." },
  { key: "team_member_founder", title: "Equipa e marcação — foto da fundadora", hint: "Cartão da fundadora e passo “quem” na marcação." },
  { key: "team_member_sofia", title: "Equipa e marcação — Sofia", hint: "Cartão e escolha na marcação." },
  { key: "team_member_elena", title: "Equipa e marcação — Elena", hint: "Cartão e escolha na marcação." },
  { key: "team_member_mei", title: "Equipa e marcação — Mei", hint: "Cartão e escolha na marcação." },
  { key: "shop_hero", title: "Loja — imagem de topo", hint: "Faixa no topo da página Loja." },
  { key: "footer_logo", title: "Rodapé — logótipo", hint: "Ícone pequeno ao lado do nome no rodapé." },
];

type AdminSitePhotosPanelProps = {
  siteImages: SiteCmsV1["siteImages"];
  onChange: (next: SiteCmsV1["siteImages"]) => void;
  canUpload: boolean;
};

export function AdminSitePhotosPanel({ siteImages, onChange, canUpload }: AdminSitePhotosPanelProps) {
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const setUrl = (key: SiteImageKey, url: string) => {
    const trimmed = url.trim();
    const next = { ...siteImages };
    if (!trimmed) delete next[key];
    else next[key] = trimmed;
    onChange(next);
  };

  const onPickFile = async (key: SiteImageKey, file: File | undefined) => {
    if (!file || !canUpload) return;
    setBusyKey(key);
    const { publicUrl, error } = await uploadSiteCmsAsset(file, `cms-${key}`);
    setBusyKey(null);
    if (error || !publicUrl) {
      toast.error(error?.message ?? "Não foi possível enviar a foto.");
      return;
    }
    setUrl(key, publicUrl);
    toast.success("Foto enviada. Toque em Guardar alterações no topo.");
  };

  return (
    <div className="space-y-8">
      <p className="text-sm text-muted-foreground">
        Cole um <strong>endereço de imagem</strong> (começa por https) ou, se o site estiver ligado à Internet, use{" "}
        <strong>Carregar foto</strong>. Deixe em branco para voltar à imagem original do site.
      </p>

      <div className="grid gap-6 md:grid-cols-2">
        {SLOTS.map(({ key, title, hint }) => {
          const value = siteImages[key]?.trim() ?? "";
          return (
            <div key={key} className="rounded-2xl border border-border bg-muted/20 p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-card">
                  {value ? (
                    <img src={value} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-muted-foreground" aria-hidden />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <Label className="text-sm font-semibold text-foreground">{title}</Label>
                  <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
                </div>
              </div>
              <input
                value={value}
                onChange={(e) => setUrl(key, e.target.value)}
                className="mt-3 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs"
                placeholder="https://…"
                inputMode="url"
                autoComplete="off"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <label className="inline-flex cursor-pointer">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
                    className="sr-only"
                    disabled={!canUpload || busyKey === key}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      void onPickFile(key, f);
                    }}
                  />
                  <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50">
                    <Upload className="h-3.5 w-3.5" />
                    {busyKey === key ? "A enviar…" : "Carregar foto"}
                  </span>
                </label>
                {value ? (
                  <Button type="button" variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={() => setUrl(key, "")}>
                    <Trash2 className="h-3.5 w-3.5" /> Tirar foto personalizada
                  </Button>
                ) : null}
              </div>
              {!canUpload ? (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Envio directo do computador só com sessão e Internet ligada ao painel. Pode sempre colar um link https.
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
