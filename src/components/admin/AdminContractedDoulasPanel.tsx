import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, Upload } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { uploadSiteCmsAsset } from "@/lib/supabase/queries";
import type { ContractedDoula, ContractedDoulaStatus, SiteCmsV1 } from "@/lib/site-cms";

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `cd-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

type AdminContractedDoulasPanelProps = {
  list: SiteCmsV1["contractedDoulas"];
  onChange: (next: ContractedDoula[]) => void;
  canUpload: boolean;
};

const emptyForm: Omit<ContractedDoula, "id"> = {
  name: "",
  phone: "",
  email: "",
  monthlyFeeDisplay: "",
  notes: "",
  photoUrl: "",
  status: "active",
  visibleOnSite: false,
};

export function AdminContractedDoulasPanel({ list, onChange, canUpload }: AdminContractedDoulasPanelProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const patch = (id: string, partial: Partial<ContractedDoula>) => {
    onChange(list.map((x) => (x.id === id ? { ...x, ...partial } : x)));
  };

  const save = () => {
    const name = form.name.trim();
    if (!name) {
      toast.error(t("admin.contracted.nameRequired"));
      return;
    }
    if (editingId) {
      onChange(
        list.map((x) =>
          x.id === editingId
            ? {
                ...x,
                name,
                phone: form.phone.trim(),
                email: form.email.trim(),
                monthlyFeeDisplay: form.monthlyFeeDisplay.trim(),
                notes: form.notes.trim(),
                photoUrl: form.photoUrl.trim(),
                status: form.status,
                visibleOnSite: form.visibleOnSite,
              }
            : x,
        ),
      );
      toast.success(t("admin.contracted.updated"));
    } else {
      onChange([
        ...list,
        {
          id: newId(),
          name,
          phone: form.phone.trim(),
          email: form.email.trim(),
          monthlyFeeDisplay: form.monthlyFeeDisplay.trim(),
          notes: form.notes.trim(),
          photoUrl: form.photoUrl.trim(),
          status: form.status,
          visibleOnSite: form.visibleOnSite,
        },
      ]);
      toast.success(t("admin.contracted.added"));
    }
    setForm(emptyForm);
    setEditingId(null);
  };

  const startEdit = (p: ContractedDoula) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      phone: p.phone,
      email: p.email,
      monthlyFeeDisplay: p.monthlyFeeDisplay,
      notes: p.notes,
      photoUrl: p.photoUrl,
      status: p.status,
      visibleOnSite: p.visibleOnSite,
    });
    queueMicrotask(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const confirmDelete = () => {
    if (!deleteId) return;
    onChange(list.filter((x) => x.id !== deleteId));
    if (editingId === deleteId) cancelEdit();
    setDeleteId(null);
    toast.success(t("admin.contracted.removed"));
  };

  const uploadPhotoForForm = async (file: File | undefined) => {
    if (!file || !canUpload) return;
    setPhotoBusy(true);
    const { publicUrl, error } = await uploadSiteCmsAsset(file, "contractors");
    setPhotoBusy(false);
    if (error || !publicUrl) {
      toast.error(error?.message ?? t("admin.photos.uploadFail"));
      return;
    }
    setForm((f) => ({ ...f, photoUrl: publicUrl }));
    toast.success(t("admin.contracted.photoAttachedForm"));
  };

  return (
    <div className="space-y-10">
      <p className="text-sm text-muted-foreground">{t("admin.contracted.intro")}</p>

      <div>
        <h3 className="font-serif text-lg text-foreground">{t("admin.contracted.badgesTitle", { count: list.length })}</h3>
        {list.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{t("admin.contracted.badgesEmpty")}</p>
        ) : (
          <ul className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {list.map((p) => (
              <li
                key={p.id}
                className="flex flex-col items-center rounded-3xl border border-border bg-linear-to-b from-card to-muted/20 px-4 pb-5 pt-6 text-center shadow-sm ring-1 ring-border/60"
              >
                <div className="relative">
                  <div className="mx-auto h-28 w-28 overflow-hidden rounded-full border-4 border-primary/25 bg-muted shadow-md ring-2 ring-background">
                    {p.photoUrl.trim() ? (
                      <img src={p.photoUrl.trim()} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full w-full place-items-center font-serif text-3xl text-primary/40">✦</div>
                    )}
                  </div>
                </div>
                <p className="mt-4 max-w-full truncate px-1 font-serif text-lg text-foreground">{p.name || "—"}</p>
                {p.monthlyFeeDisplay.trim() ? (
                  <p className="mt-1 text-xs font-medium text-primary">{p.monthlyFeeDisplay.trim()}</p>
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground">{t("admin.contracted.noMonthlyFee")}</p>
                )}
                <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
                  <Badge variant={p.status === "active" ? "default" : "secondary"}>
                    {p.status === "active" ? t("admin.contracted.active") : t("admin.contracted.paused")}
                  </Badge>
                  <Badge variant={p.visibleOnSite ? "outline" : "secondary"} className="border-primary/30">
                    {p.visibleOnSite ? t("admin.contracted.visibleOnSite") : t("admin.contracted.panelOnly")}
                  </Badge>
                </div>

                <div className="mt-4 w-full space-y-3 text-left">
                  <div className="flex items-center justify-between gap-2 rounded-xl bg-background/80 px-3 py-2">
                    <Label htmlFor={`vis-${p.id}`} className="text-xs text-muted-foreground">
                      {t("admin.contracted.clientsSee")}
                    </Label>
                    <Switch
                      id={`vis-${p.id}`}
                      checked={p.visibleOnSite}
                      onCheckedChange={(checked) => patch(p.id, { visibleOnSite: Boolean(checked) })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{t("admin.contracted.statusLabel")}</Label>
                    <Select
                      value={p.status}
                      onValueChange={(v) => patch(p.id, { status: v as ContractedDoulaStatus })}
                    >
                      <SelectTrigger className="h-9 rounded-xl text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">{t("admin.contracted.active")}</SelectItem>
                        <SelectItem value="paused">{t("admin.contracted.paused")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="mt-4 flex w-full flex-wrap justify-center gap-2">
                  <Button type="button" variant="outline" size="sm" className="h-8 gap-1 rounded-full text-xs" onClick={() => startEdit(p)}>
                    <Pencil className="h-3 w-3" /> {t("admin.contracted.edit")}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1 rounded-full text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setDeleteId(p.id)}
                  >
                    <Trash2 className="h-3 w-3" /> {t("admin.contracted.delete")}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div ref={formRef} className="rounded-2xl border border-border bg-muted/20 p-5">
        <h3 className="font-serif text-lg text-foreground">{editingId ? t("admin.contracted.editTitle") : t("admin.contracted.addTitle")}</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>{t("admin.contracted.name")}</Label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              placeholder={t("admin.contracted.namePlaceholder")}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("admin.contracted.phone")}</Label>
            <input
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label>{t("admin.contracted.email")}</Label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>{t("admin.contracted.monthly")}</Label>
            <input
              value={form.monthlyFeeDisplay}
              onChange={(e) => setForm((f) => ({ ...f, monthlyFeeDisplay: e.target.value }))}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              placeholder={t("admin.contracted.monthlyPh")}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>{t("admin.contracted.notes")}</Label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              placeholder={t("admin.contracted.notesPh")}
            />
          </div>
          <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-center gap-2">
              <Switch
                id="form-visible"
                checked={form.visibleOnSite}
                onCheckedChange={(checked) => setForm((f) => ({ ...f, visibleOnSite: Boolean(checked) }))}
              />
              <Label htmlFor="form-visible" className="text-sm">
                {t("admin.contracted.visibleLabel")}
              </Label>
            </div>
            <div className="space-y-1.5 sm:w-48">
              <Label className="text-xs">{t("admin.contracted.statusLabel")}</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as ContractedDoulaStatus }))}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t("admin.contracted.active")}</SelectItem>
                  <SelectItem value="paused">{t("admin.contracted.paused")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>{t("admin.contracted.photoUrl")}</Label>
            <input
              value={form.photoUrl}
              onChange={(e) => setForm((f) => ({ ...f, photoUrl: e.target.value }))}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs"
              placeholder={t("admin.photos.urlPlaceholder")}
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <label className="inline-flex cursor-pointer">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  disabled={!canUpload || photoBusy}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    void uploadPhotoForForm(f);
                  }}
                />
                <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50">
                  <Upload className="h-3.5 w-3.5" />
                  {photoBusy ? t("admin.contracted.uploadSending") : t("admin.contracted.uploadPhoto")}
                </span>
              </label>
            </div>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button type="button" className="rounded-full" onClick={save}>
            {editingId ? (
              <>
                <Pencil className="h-4 w-4" /> {t("admin.contracted.savePerson")}
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" /> {t("admin.contracted.addToList")}
              </>
            )}
          </Button>
          {editingId ? (
            <Button type="button" variant="outline" className="rounded-full" onClick={cancelEdit}>
              {t("admin.contracted.cancelEdit")}
            </Button>
          ) : null}
        </div>
      </div>

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.contracted.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.contracted.deleteBody")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("admin.contracted.cancel")}</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={confirmDelete}>
              {t("admin.contracted.confirmDelete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
