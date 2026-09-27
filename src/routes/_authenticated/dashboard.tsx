import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Building2, CheckCircle2, MessageCircle, Target, TrendingUp, XCircle } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — ProspectSite" },
      { name: "description", content: "Acompanhe empresas encontradas, leads e clientes conquistados." },
      { property: "og:title", content: "Dashboard — ProspectSite" },
      { property: "og:description", content: "Acompanhe empresas encontradas, leads e clientes conquistados." },
    ],
  }),
  component: Dashboard,
});

const CONTACTED = ["primeiro contato", "aguardando resposta", "respondeu", "reunião", "proposta enviada", "cliente"];

function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [companies, leads] = await Promise.all([
        supabase.from("companies").select("id, has_website, city, category"),
        supabase.from("leads").select("id, status"),
      ]);
      if (companies.error) throw companies.error;
      if (leads.error) throw leads.error;
      return { companies: companies.data ?? [], leads: leads.data ?? [] };
    },
  });

  const companies = data?.companies ?? [];
  const leads = data?.leads ?? [];

  const stats = [
    { label: "Empresas encontradas", value: companies.length, icon: Building2 },
    { label: "Empresas sem site", value: companies.filter((c) => !c.has_website).length, icon: XCircle },
    { label: "Leads no CRM", value: leads.length, icon: Target },
    {
      label: "Contatadas",
      value: leads.filter((l) => CONTACTED.includes(l.status)).length,
      icon: MessageCircle,
    },
    { label: "Respostas", value: leads.filter((l) => l.status === "respondeu").length, icon: TrendingUp },
    { label: "Clientes", value: leads.filter((l) => l.status === "cliente").length, icon: CheckCircle2 },
  ];

  return (
    <AppShell
      title="Dashboard"
      description="Visão geral da sua prospecção"
      actions={
        <Button asChild>
          <Link to="/pesquisar">Encontrar empresas</Link>
        </Button>
      }
    >
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {stats.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="surface-card p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">{s.label}</p>
                    <Icon className="size-4 text-primary" />
                  </div>
                  <p className="mt-3 font-display text-3xl font-semibold">{s.value}</p>
                </div>
              );
            })}
          </div>

          {companies.length === 0 ? (
            <div className="surface-card mt-6 p-8 text-center">
              <h2 className="text-lg font-semibold">Comece pela primeira pesquisa</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Escolha um nicho e uma cidade para encontrar empresas para prospectar.
              </p>
              <Button asChild className="mt-4">
                <Link to="/pesquisar">Pesquisar empresas</Link>
              </Button>
            </div>
          ) : null}
        </>
      )}
    </AppShell>
  );
}
