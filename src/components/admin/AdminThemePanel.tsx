import { useEffect, useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SiteCmsV1 } from "@/lib/site-cms";

type ThemeTone = "pastel" | "neutral" | "vivid" | "earth";

type PalettePreset = {
  id: string;
  label: string;
  primary: string;
  primaryForeground: string;
};

const TONE_LABELS: Record<ThemeTone, string> = {
  pastel: "Pastéis",
  neutral: "Neutros",
  vivid: "Cromas vivas",
  earth: "Terra & natureza",
};

/** Pré-visualização rápida de cada família (só visual). */
const TONE_PREVIEW: Record<ThemeTone, [string, string, string]> = {
  pastel: ["oklch(0.88 0.06 25)", "oklch(0.88 0.05 230)", "oklch(0.9 0.05 165)"],
  neutral: ["oklch(0.42 0.02 260)", "oklch(0.58 0.02 95)", "oklch(0.72 0.015 85)"],
  vivid: ["oklch(0.55 0.2 25)", "oklch(0.52 0.19 265)", "oklch(0.52 0.14 160)"],
  earth: ["oklch(0.55 0.05 145)", "oklch(0.58 0.12 38)", "oklch(0.48 0.08 135)"],
};

const PALETTES: Record<ThemeTone, PalettePreset[]> = {
  pastel: [
    { id: "p-blush", label: "Blush", primary: "oklch(0.82 0.06 25)", primaryForeground: "oklch(0.22 0.03 25)" },
    { id: "p-sage", label: "Sage suave", primary: "oklch(0.86 0.05 145)", primaryForeground: "oklch(0.22 0.03 50)" },
    { id: "p-sky", label: "Céu", primary: "oklch(0.88 0.05 230)", primaryForeground: "oklch(0.2 0.02 250)" },
    { id: "p-lilac", label: "Lilás", primary: "oklch(0.85 0.07 300)", primaryForeground: "oklch(0.2 0.04 300)" },
    { id: "p-peach", label: "Pêssego", primary: "oklch(0.88 0.06 55)", primaryForeground: "oklch(0.25 0.03 55)" },
    { id: "p-mint", label: "Menta", primary: "oklch(0.9 0.05 165)", primaryForeground: "oklch(0.2 0.03 165)" },
  ],
  neutral: [
    { id: "n-graphite", label: "Grafite", primary: "oklch(0.38 0.02 260)", primaryForeground: "oklch(0.97 0.005 260)" },
    { id: "n-warm", label: "Pedra quente", primary: "oklch(0.52 0.02 75)", primaryForeground: "oklch(0.98 0.01 85)" },
    { id: "n-cool", label: "Cinzento frio", primary: "oklch(0.48 0.02 250)", primaryForeground: "oklch(0.98 0.005 250)" },
    { id: "n-soft", label: "Preto suave", primary: "oklch(0.28 0.02 270)", primaryForeground: "oklch(0.97 0.01 270)" },
    { id: "n-greige", label: "Greige", primary: "oklch(0.58 0.02 95)", primaryForeground: "oklch(0.12 0.02 95)" },
    { id: "n-sand", label: "Areia escura", primary: "oklch(0.62 0.03 85)", primaryForeground: "oklch(0.18 0.02 85)" },
  ],
  vivid: [
    { id: "v-jade", label: "Jade", primary: "oklch(0.52 0.14 160)", primaryForeground: "oklch(0.98 0.01 160)" },
    { id: "v-magenta", label: "Magenta", primary: "oklch(0.55 0.22 330)", primaryForeground: "oklch(0.98 0.02 330)" },
    { id: "v-cobalt", label: "Cobalto", primary: "oklch(0.52 0.19 265)", primaryForeground: "oklch(0.97 0.02 265)" },
    { id: "v-tangerine", label: "Tangerina", primary: "oklch(0.68 0.2 55)", primaryForeground: "oklch(0.15 0.02 55)" },
    { id: "v-teal", label: "Teal", primary: "oklch(0.55 0.14 200)", primaryForeground: "oklch(0.98 0.01 200)" },
    { id: "v-ruby", label: "Rubi", primary: "oklch(0.52 0.2 25)", primaryForeground: "oklch(0.98 0.01 25)" },
  ],
  earth: [
    { id: "e-sage", label: "Sage (marca)", primary: "oklch(0.55 0.05 145)", primaryForeground: "oklch(0.975 0.012 85)" },
    { id: "e-clay", label: "Terracota", primary: "oklch(0.58 0.12 38)", primaryForeground: "oklch(0.98 0.01 85)" },
    { id: "e-moss", label: "Musgo", primary: "oklch(0.48 0.08 135)", primaryForeground: "oklch(0.97 0.012 85)" },
    { id: "e-cocoa", label: "Cacau", primary: "oklch(0.45 0.06 55)", primaryForeground: "oklch(0.97 0.01 85)" },
    { id: "e-forest", label: "Floresta", primary: "oklch(0.42 0.09 145)", primaryForeground: "oklch(0.97 0.012 85)" },
    { id: "e-dusty", label: "Rosa empoeirado", primary: "oklch(0.58 0.1 15)", primaryForeground: "oklch(0.98 0.01 85)" },
  ],
};

function hexToRgb(hex: string): [number, number, number] | null {
  const h = hex.replace(/^#/, "").trim();
  if (h.length === 3) {
    const r = parseInt(h[0] + h[0], 16);
    const g = parseInt(h[1] + h[1], 16);
    const b = parseInt(h[2] + h[2], 16);
    if ([r, g, b].some((n) => Number.isNaN(n))) return null;
    return [r, g, b];
  }
  if (h.length === 6) {
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    if ([r, g, b].some((n) => Number.isNaN(n))) return null;
    return [r, g, b];
  }
  return null;
}

function linearize(v: number): number {
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

/** Relative luminance 0–1 (sRGB). */
function relLuminance(hex: string): number | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const [r, g, b] = rgb.map((x) => linearize(x / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function foregroundForHexBg(hex: string): string {
  const L = relLuminance(hex);
  if (L == null) return "oklch(0.98 0.005 85)";
  return L > 0.45 ? "oklch(0.18 0.02 265)" : "oklch(0.98 0.005 85)";
}

function normalizeCssColor(s: string): string {
  return s.trim().replace(/\s+/g, " ");
}

function presetMatchesDraft(p: PalettePreset, primary: string, primaryFg: string): boolean {
  return normalizeCssColor(primary) === normalizeCssColor(p.primary) && normalizeCssColor(primaryFg) === normalizeCssColor(p.primaryForeground);
}

type ForegroundSwatch = { id: string; label: string; css: string };

/** Texto sobre botões/cor primária — só clique, sem editar oklch na mão. */
const FOREGROUND_SWATCHES: ForegroundSwatch[] = [
  { id: "fg-cream", label: "Creme", css: "oklch(0.975 0.012 85)" },
  { id: "fg-white", label: "Branco", css: "oklch(0.99 0 0)" },
  { id: "fg-ivory", label: "Marfim", css: "oklch(0.96 0.01 85)" },
  { id: "fg-snow", label: "Neve fria", css: "oklch(0.98 0.005 250)" },
  { id: "fg-charcoal", label: "Carvão", css: "oklch(0.22 0.03 50)" },
  { id: "fg-ink", label: "Tinta", css: "oklch(0.15 0.02 265)" },
  { id: "fg-espresso", label: "Expresso", css: "oklch(0.2 0.02 25)" },
  { id: "fg-slate", label: "Ardósia", css: "oklch(0.25 0.02 260)" },
];

type AdminThemePanelProps = {
  theme: SiteCmsV1["theme"];
  onThemeChange: (theme: SiteCmsV1["theme"]) => void;
};

export function AdminThemePanel({ theme, onThemeChange }: AdminThemePanelProps) {
  const [tone, setTone] = useState<ThemeTone>("earth");
  const [customHex, setCustomHex] = useState("#5f8a68");
  const [customFgHex, setCustomFgHex] = useState("#f5f2eb");

  useEffect(() => {
    const t = theme.primary.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(t)) setCustomHex(t.toLowerCase());
  }, [theme.primary]);

  useEffect(() => {
    const t = theme.primaryForeground.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(t)) setCustomFgHex(t.toLowerCase());
  }, [theme.primaryForeground]);

  const list = PALETTES[tone];

  const isProjectDefault = !theme.primary.trim() && !theme.primaryForeground.trim();

  const activePresetId = useMemo(() => {
    for (const presets of Object.values(PALETTES)) {
      for (const p of presets) {
        if (presetMatchesDraft(p, theme.primary, theme.primaryForeground)) return p.id;
      }
    }
    return null;
  }, [theme.primary, theme.primaryForeground]);

  const applyPreset = (p: PalettePreset) => {
    onThemeChange({ primary: p.primary, primaryForeground: p.primaryForeground });
  };

  const clearToProjectCss = () => {
    onThemeChange({ primary: "", primaryForeground: "" });
  };

  const applyCustomHex = (hex: string) => {
    const normalized = hex.startsWith("#") ? hex : `#${hex}`;
    const rgb = hexToRgb(normalized);
    if (!rgb) return;
    onThemeChange({
      primary: normalized.toLowerCase(),
      primaryForeground: foregroundForHexBg(normalized),
    });
  };

  const applyForegroundOnly = (css: string) => {
    onThemeChange({ ...theme, primaryForeground: css });
  };

  const applyCustomFgHex = (hex: string) => {
    const normalized = hex.startsWith("#") ? hex : `#${hex}`;
    if (!hexToRgb(normalized)) return;
    onThemeChange({ ...theme, primaryForeground: normalized.toLowerCase() });
  };

  const activeFgSwatchId = useMemo(() => {
    const cur = normalizeCssColor(theme.primaryForeground);
    const found = FOREGROUND_SWATCHES.find((s) => normalizeCssColor(s.css) === cur);
    return found?.id ?? null;
  }, [theme.primaryForeground]);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-muted-foreground">
          Toque nas caixas de cor. No fim, use <strong>Guardar alterações</strong> no topo da página.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={clearToProjectCss}>
            Voltar às cores originais do site
          </Button>
          {isProjectDefault ? (
            <span className="text-xs text-muted-foreground">Está a usar as cores que o site já trazia de fábrica.</span>
          ) : null}
        </div>
      </div>

      <div className="space-y-3">
        <Label className="text-foreground">Estilo geral</Label>
        <p className="text-xs text-muted-foreground">Primeiro escolha um estilo; depois escolha uma cor concreta nas paletas em baixo.</p>
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(Object.keys(TONE_LABELS) as ThemeTone[]).map((t) => {
            const active = tone === t;
            const chips = TONE_PREVIEW[t];
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTone(t)}
                className={cn(
                  "flex flex-col gap-2 rounded-2xl border border-border bg-card p-3 text-left transition hover:border-primary/60",
                  active && "border-primary ring-2 ring-primary/25 ring-offset-2 ring-offset-card",
                )}
              >
                <div className="flex gap-1">
                  {chips.map((c, i) => (
                    <div
                      key={i}
                      className="h-8 min-w-0 flex-1 rounded-lg ring-1 ring-black/10"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <span className="text-xs font-semibold text-foreground">{TONE_LABELS[t]}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <Label className="text-foreground">Cores prontas</Label>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {list.map((p) => {
            const active = activePresetId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p)}
                className={cn(
                  "rounded-2xl border border-border bg-muted/20 p-2 text-left transition hover:border-primary/60 hover:shadow-md",
                  active && "border-primary ring-2 ring-primary/25 ring-offset-2 ring-offset-card",
                )}
              >
                <div
                  className="h-14 w-full rounded-xl shadow-inner ring-1 ring-black/5"
                  style={{ backgroundColor: p.primary }}
                  title={p.label}
                />
                <p className="mt-2 truncate text-xs font-medium text-foreground">{p.label}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-muted/20 p-4">
        <Label className="text-base text-foreground">Escolher outra cor à mão</Label>
        <p className="mt-1 text-xs text-muted-foreground">
          Toque no quadrado colorido — abre a janela de cores do seu computador ou telemóvel. A cor do texto dos botões
          ajusta-se sozinha; se quiser, mude na secção seguinte.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Cor principal dos botões</Label>
            <input
              type="color"
              value={customHex}
              onChange={(e) => {
                const v = e.target.value;
                setCustomHex(v);
                applyCustomHex(v);
              }}
              className="h-14 w-20 min-w-20 cursor-pointer rounded-xl border border-border bg-background p-1"
              aria-label="Cor primária personalizada"
            />
          </div>
          <div
            className="flex h-14 min-w-36 flex-1 items-center justify-center rounded-xl border border-border px-3 text-center text-xs font-medium shadow-inner sm:min-w-44"
            style={{
              backgroundColor: theme.primary.trim() || "var(--primary)",
              color: theme.primaryForeground.trim() || "var(--primary-foreground)",
            }}
          >
            Exemplo de botão
          </div>
        </div>
      </div>

      <div className="space-y-3 border-t border-border pt-6">
        <Label className="text-foreground">Cor da letra em cima dos botões</Label>
        <p className="text-xs text-muted-foreground">
          Só muda a letra (para ler bem em cima da cor que escolheu). Toque numa amostra ou use o quadrado à direita.
        </p>
        <div className="mt-3 flex flex-wrap items-stretch gap-3">
          <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-4 md:max-w-xl">
            {FOREGROUND_SWATCHES.map((s) => {
              const active = activeFgSwatchId === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => applyForegroundOnly(s.css)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card p-2 transition hover:border-primary/60",
                    active && "border-primary ring-2 ring-primary/25 ring-offset-2 ring-offset-card",
                  )}
                >
                  <div
                    className="h-9 w-full rounded-lg ring-1 ring-black/10"
                    style={{ backgroundColor: s.css }}
                    title={s.label}
                  />
                  <span className="line-clamp-2 text-center text-[10px] font-medium leading-tight text-foreground">{s.label}</span>
                </button>
              );
            })}
          </div>
          <div className="flex shrink-0 flex-col justify-end gap-2 rounded-xl border border-border bg-background p-3">
            <Label className="text-xs text-muted-foreground">Outra cor para a letra</Label>
            <input
              type="color"
              value={customFgHex}
              onChange={(e) => {
                const v = e.target.value;
                setCustomFgHex(v);
                applyCustomFgHex(v);
              }}
              className="h-12 w-full min-w-20 cursor-pointer rounded-lg border border-border p-1"
              aria-label="Cor do texto sobre primária"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
