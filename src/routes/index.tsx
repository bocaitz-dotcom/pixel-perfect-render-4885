import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, MessageSquareText, Search, Target } from "lucide-react";

import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ProspectSite — encontre empresas sem site para prospectar" },
      {
        name: "description",
        content:
          "Pesquise empresas por nicho e cidade, descubra quem ainda não tem site e organize sua prospecção em um CRM simples.",
      },
      { property: "og:title", content: "ProspectSite — prospecção para criação de sites" },
      {
        property: "og:description",
        content:
          "Pesquise empresas por nicho e cidade, descubra quem ainda não tem site e organize sua prospecção.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: Search,
    title: "Pesquisa por nicho e cidade",
    text: "Restaurantes em Imperatriz, clínicas no Maranhão — em segundos.",
  },
  {
    icon: Building2,
    title: "Quem não tem site",
    text: "Cada empresa recebe uma pontuação de oportunidade com critérios objetivos.",
  },
  {
    icon: MessageSquareText,
    title: "Mensagem pronta",
    text: "Gere uma mensagem comercial personalizada e revise antes de enviar.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6">
        <div className="flex items-center gap-2">
          <span className="hero-gradient flex size-9 items-center justify-center rounded-lg text-primary-foreground">
            <Target className="size-5" />
          </span>
          <span className="font-display text-lg font-semibold">ProspectSite</span>
        </div>
        <Button asChild variant="outline">
          <Link to="/auth">Entrar</Link>
        </Button>
      </header>

      <section className="mx-auto max-w-6xl px-5 pb-16 pt-10 sm:pt-16">
        <div className="max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-wider text-primary">
            Prospecção para criação de sites
          </p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight sm:text-5xl">
            Encontre empresas que ainda não têm site.
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Pesquise por nicho e localidade, filtre quem está sem presença online e
            acompanhe cada contato até virar cliente.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/auth">Começar agora</Link>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Dados empresariais públicos do OpenStreetMap. Sem coleta de dados pessoais.
          </p>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-3">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="surface-card p-5">
                <Icon className="size-5 text-primary" />
                <h2 className="mt-3 text-base font-semibold">{f.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
