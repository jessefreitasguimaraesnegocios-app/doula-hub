import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ImageIcon, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { uploadSiteCmsAsset } from "@/lib/supabase/queries";
import { SITE_IMAGE_KEYS, type SiteImageKey, type SiteCmsV1 } from "@/lib/site-cms";

type AdminSitePhotosPanelProps = {
  siteImages: SiteCmsV1["siteImages"];
  onChange: (next: SiteCmsV1["siteImages"]) => void;
  canUpload: boolean;
};

export function AdminSitePhotosPanel({ siteImages, onChange, canUpload }: AdminSitePhotosPanelProps) {
  const { t } = useTranslation();
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
      toast.error(error?.message ?? t("admin.photos.uploadFail"));
      return;
    }
    setUrl(key, publicUrl);
    toast.success(t("admin.photos.toastSaveTop"));
  };

  return (
    <div className="space-y-8">
      <p className="text-sm text-muted-foreground">{t("admin.photos.intro")}</p>

      <div className="grid gap-6 md:grid-cols-2">
        {SITE_IMAGE_KEYS.map((key) => {
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
                  <Label className="text-sm font-semibold text-foreground">
                    {t(`admin.photos.slots.${key}.title`)}
                  </Label>
                  <p className="mt-1 text-xs text-muted-foreground">{t(`admin.photos.slots.${key}.hint`)}</p>
                </div>
              </div>
              <input
                value={value}
                onChange={(e) => setUrl(key, e.target.value)}
                className="mt-3 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs"
                placeholder={t("admin.photos.urlPlaceholder")}
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
                    {busyKey === key ? t("admin.photos.uploadSending") : t("admin.photos.uploadPhoto")}
                  </span>
                </label>
                {value ? (
                  <Button type="button" variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={() => setUrl(key, "")}>
                    <Trash2 className="h-3.5 w-3.5" /> {t("admin.photos.removeCustom")}
                  </Button>
                ) : null}
              </div>
              {!canUpload ? (
                <p className="mt-2 text-[11px] text-muted-foreground">{t("admin.photos.uploadHint")}</p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
