import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { uploadSiteCmsAsset } from "@/lib/supabase/queries";
import type { ContractedDoula, SiteCmsV1 } from "@/lib/site-cms";

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
};

export function AdminContractedDoulasPanel({ list, onChange, canUpload }: AdminContractedDoulasPanelProps) {
  const [form, setForm] = useState(emptyForm);
  const [photoBusy, setPhotoBusy] = useState(false);

  const add = () => {
    const name = form.name.trim();
    if (!name) {
      toast.error("Escreva pelo menos o nome.");
      return;
    }
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
      },
    ]);
    setForm(emptyForm);
    toast.success("Pessoa adicionada à lista. Toque em Guardar alterações no topo.");
  };

  const remove = (id: string) => {
    onChange(list.filter((x) => x.id !== id));
  };

  const uploadPhotoForForm = async (file: File | undefined) => {
    if (!file || !canUpload) return;
    setPhotoBusy(true);
    const { publicUrl, error } = await uploadSiteCmsAsset(file, "contractors");
    setPhotoBusy(false);
    if (error || !publicUrl) {
      toast.error(error?.message ?? "Não foi possível enviar a foto.");
      return;
    }
    setForm((f) => ({ ...f, photoUrl: publicUrl }));
    toast.success("Foto anexada ao formulário.");
  };

  return (
    <div className="space-y-8">
      <p className="text-sm text-muted-foreground">
        Lista <strong>privada</strong>: para anotar quem trabalha consigo, contacto, valor mensal e foto.{" "}
        <strong>Não aparece</strong> no site público — só vê aqui no painel (e na cópia das definições, se exportar).
      </p>

      <div className="rounded-2xl border border-border bg-muted/20 p-5">
        <h3 className="font-serif text-lg text-foreground">Adicionar pessoa</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Nome *</Label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              placeholder="Nome completo"
            />
          </div>
          <div className="space-y-2">
            <Label>Telefone</Label>
            <input
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label>E-mail</Label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Valor mensal (texto livre)</Label>
            <input
              value={form.monthlyFeeDisplay}
              onChange={(e) => setForm((f) => ({ ...f, monthlyFeeDisplay: e.target.value }))}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              placeholder="Ex.: US$ 500 / mês"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Notas</Label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              placeholder="Horário, funções, etc."
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Foto (link ou ficheiro)</Label>
            <input
              value={form.photoUrl}
              onChange={(e) => setForm((f) => ({ ...f, photoUrl: e.target.value }))}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs"
              placeholder="https://…"
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
                  {photoBusy ? "A enviar…" : "Carregar foto"}
                </span>
              </label>
            </div>
          </div>
        </div>
        <Button type="button" className="mt-5 rounded-full" onClick={add}>
          <Plus className="h-4 w-4" /> Adicionar à lista
        </Button>
      </div>

      <div className="space-y-3">
        <h3 className="font-serif text-lg text-foreground">Lista ({list.length})</h3>
        {list.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ainda não há ninguém na lista.</p>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {list.map((p) => (
              <li key={p.id} className="flex gap-3 rounded-2xl border border-border bg-card p-4">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
                  {p.photoUrl.trim() ? (
                    <img src={p.photoUrl.trim()} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-xs text-muted-foreground">Sem foto</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">{p.name}</p>
                  {p.monthlyFeeDisplay.trim() ? (
                    <p className="mt-1 text-sm text-primary">{p.monthlyFeeDisplay.trim()}</p>
                  ) : null}
                  {p.phone.trim() ? <p className="mt-1 text-xs text-muted-foreground">{p.phone}</p> : null}
                  {p.email.trim() ? <p className="mt-1 text-xs text-muted-foreground">{p.email}</p> : null}
                  {p.notes.trim() ? <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{p.notes}</p> : null}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-2 h-8 gap-1 px-2 text-xs text-destructive hover:text-destructive"
                    onClick={() => remove(p.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Retirar da lista
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
