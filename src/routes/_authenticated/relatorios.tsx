import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { AppShell } from "@/components/AppShell";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { LEAD_STATUSES } from "@/lib/niches";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios — ProspectSite" },
      { name: "description", content: "Veja seu funil por status, cidades e oportunidades sem site." },
      { property: "og:title", content: "Relatórios — ProspectSite" },
      { property: "og:description", content: "Veja seu funil por status, cidades e oportunidades sem site." },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["reports"],
    queryFn: async () => {
      const [companies, leads] = await Promise.all([
        supabase.from("companies").select("city, category, has_website"),
        supabase.from("leads").select("status"),
      ]);
      if (companies.error) throw companies.error;
      if (leads.error) throw leads.error;
      return { companies: companies.data ?? [], leads: leads.data ?? [] };
    },
  });

  if (isLoading) {
    return (
      <AppShell title="Relatórios">
        <Skeleton className="h-72 rounded-xl" />
      </AppShell>
    );
  }

  const companies = data?.companies ?? [];
  const leads = data?.leads ?? [];

  const byStatus = LEAD_STATUSES.map((status) => ({
    status,
    count: leads.filter((l) => l.status === status).length,
  }));
  const maxStatus = Math.max(1, ...byStatus.map((s) => s.count));

  const byCity = Object.entries(
    companies.reduce<Record<string, { total: number; semSite: number }>>((acc, c) => {
      const key = c.city ?? "Sem cidade";
      acc[key] ??= { total: 0, semSite: 0 };
      acc[key].total += 1;
      if (!c.has_website) acc[key].semSite += 1;
      return acc;
    }, {}),
  )
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 10);

  return (
    <AppShell title="Relatórios" description="Resumo da sua base e do funil">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="surface-card p-5">
          <h2 className="text-base font-semibold">Funil por status</h2>
          <ul className="mt-4 space-y-3">
            {byStatus.map((s) => (
              <li key={s.status}>
                <div className="flex items-center justify-between text-sm">
                  <span className="capitalize">{s.status}</span>
                  <span className="font-medium">{s.count}</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-muted">
                  <div
                    className="hero-gradient h-2 rounded-full"
                    style={{ width: `${(s.count / maxStatus) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="surface-card p-5">
          <h2 className="text-base font-semibold">Empresas por cidade</h2>
          {byCity.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Sem dados ainda.</p>
          ) : (
            <table className="mt-4 w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="py-2">Cidade</th>
                  <th className="py-2">Total</th>
                  <th className="py-2">Sem site</th>
                </tr>
              </thead>
              <tbody>
                {byCity.map(([city, stats]) => (
                  <tr key={city} className="border-t">
                    <td className="py-2">{city}</td>
                    <td className="py-2">{stats.total}</td>
                    <td className="py-2 font-medium">{stats.semSite}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppShell>
  );
}
