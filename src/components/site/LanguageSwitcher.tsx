import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import { setLangCookie, type SupportedLang } from "@/lib/i18n-locale";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const LANGS = [
  { code: "en", label: "English" },
  { code: "pt", label: "Português" },
  { code: "es", label: "Español" },
  { code: "it", label: "Italiano" },
] as const;

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const current = LANGS.find((l) => l.code === i18n.resolvedLanguage) ?? LANGS[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("language")}
        className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1.5 text-xs font-medium text-foreground/80 backdrop-blur transition hover:border-primary/40 hover:text-foreground"
      >
        <Globe className="h-3.5 w-3.5" />
        <span className="uppercase tracking-wider">{current.code}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[10rem]">
        {LANGS.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => {
              const code = l.code as SupportedLang;
              void i18n.changeLanguage(code);
              setLangCookie(code);
              try {
                localStorage.setItem("i18nextLng", code);
              } catch {
                /* ignore */
              }
            }}
            className={l.code === current.code ? "font-medium text-primary" : ""}
          >
            {l.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}