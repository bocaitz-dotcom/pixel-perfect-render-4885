import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Download, Globe, MapPin, Phone, Plus } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { exportToCsv, exportToJson, type Company } from "@/lib/prospect";

export const Route = createFileRoute("/_authenticated/empresas/")({
  head: () => ({
    meta: [
      { title: "Empresas encontradas — ProspectSite" },
      { name: "description", content: "Filtre empresas sem site, com telefone e adicione ao seu CRM." },
      { property: "og:title", content: "Empresas encontradas — ProspectSite" },
      { property: "og:description", content: "Filtre empresas sem site, com telefone e adicione ao seu CRM." },
    ],
  }),
  component: CompaniesPage,
});

const PAGE_SIZE = 20;

function CompaniesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [siteFilter, setSiteFilter] = useState("todos");
  const [phoneFilter, setPhoneFilter] = useState("todos");
  const [cityFilter, setCityFilter] = useState("todas");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const [companies, leads] = await Promise.all([
        supabase.from("companies").select("*").order("opportunity_score", { ascending: false }),
        supabase.from("leads").select("company_id"),
      ]);
      if (companies.error) throw companies.error;
      if (leads.error) throw leads.error;
      return {
        companies: (companies.data ?? []) as unknown as Company[],
        leadIds: new Set((leads.data ?? []).map((l) => l.company_id)),
      };
    },
  });

  const companies = data?.companies ?? [];
  const leadIds = data?.leadIds ?? new Set<string>();

  const cities = useMemo(
    () => Array.from(new Set(companies.map((c) => c.city).filter(Boolean) as string[])).sort(),
    [companies],
  );

  const filtered = useMemo(() => {
    return companies.filter((c) => {
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (siteFilter === "sem" && c.has_website) return false;
      if (siteFilter === "com" && !c.has_website) return false;
      if (phoneFilter === "com" && !c.phone) return false;
      if (cityFilter !== "todas" && c.city !== cityFilter) return false;
      return true;
    });
  }, [companies, search, siteFilter, phoneFilter, cityFilter]);

  const visible = filtered.slice(0, page * PAGE_SIZE);

  async function addToCrm(company: Company) {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const { error } = await supabase
      .from("leads")
      .insert({ user_id: userData.user.id, company_id: company.id, status: "novo" });
    if (error) {
      toast.error("Essa empresa já está no seu CRM.");
      return;
    }
    toast.success(`${company.name} adicionada ao CRM.`);
    queryClient.invalidateQueries({ queryKey: ["companies"] });
    queryClient.invalidateQueries({ queryKey: ["leads"] });
  }

  function exportData(format: "csv" | "json") {
    const rows = filtered.map((c) => ({
      empresa: c.name,
      categoria: c.category,
      telefone: c.phone,
      website: c.website,
      endereco: c.address,
      cidade: c.city,
      estado: c.state,
      pais: c.country,
      avaliacao: c.rating,
      quantidade_avaliacoes: c.review_count,
      latitude: c.latitude,
      longitude: c.longitude,
      data_coleta: c.collected_at,
      fonte: c.source,
    }));
    if (!rows.length) {
      toast.error("Nada para exportar.");
      return;
    }
    if (format === "csv") exportToCsv(rows, "empresas");
    else exportToJson(rows, "empresas");
  }

  return (
    <AppShell
      title="Empresas encontradas"
      description={`${filtered.length} empresas no filtro atual`}
      actions={
        <>
          <Button variant="outline" onClick={() => exportData("csv")}>
            <Download className="size-4" /> CSV
          </Button>
          <Button variant="outline" onClick={() => exportData("json")}>
            JSON
          </Button>
          <Button asChild>
            <Link to="/pesquisar">Nova pesquisa</Link>
          </Button>
        </>
      }
    >
      <div className="surface-card grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
        <Input
          placeholder="Buscar por nome"
          value={search}
          maxLength={80}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <Select value={siteFilter} onValueChange={(v) => { setSiteFilter(v); setPage(1); }}>
          <SelectTrigger><SelectValue placeholder="Website" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="sem">Sem website</SelectItem>
            <SelectItem value="com">Com website</SelectItem>
          </SelectContent>
        </Select>
        <Select value={phoneFilter} onValueChange={(v) => { setPhoneFilter(v); setPage(1); }}>
          <SelectTrigger><SelectValue placeholder="Telefone" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="com">Com telefone</SelectItem>
          </SelectContent>
        </Select>
        <Select value={cityFilter} onValueChange={(v) => { setCityFilter(v); setPage(1); }}>
          <SelectTrigger><SelectValue placeholder="Cidade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as cidades</SelectItem>
            {cities.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="surface-card mt-6 p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Nenhuma empresa por aqui ainda. Faça uma pesquisa para começar.
          </p>
          <Button asChild className="mt-4">
            <Link to="/pesquisar">Pesquisar empresas</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-3 lg:hidden">
            {visible.map((c) => (
              <CompanyCard key={c.id} company={c} inCrm={leadIds.has(c.id)} onAdd={addToCrm} />
            ))}
          </div>

          <div className="surface-card mt-6 hidden overflow-hidden lg:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Empresa</th>
                  <th className="px-4 py-3">Cidade</th>
                  <th className="px-4 py-3">Telefone</th>
                  <th className="px-4 py-3">Site</th>
                  <th className="px-4 py-3">Oportunidade</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {visible.map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="px-4 py-3">
                      <Link to="/empresas/$id" params={{ id: c.id }} className="font-medium hover:underline">
                        {c.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">{c.category}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{c.city ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.phone ?? "—"}</td>
                    <td className="px-4 py-3">
                      {c.has_website ? (
                        <Badge variant="secondary">Com site</Badge>
                      ) : (
                        <Badge variant="destructive">Sem site</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium">{c.opportunity_score}</td>
                    <td className="px-4 py-3 text-right">
                      {leadIds.has(c.id) ? (
                        <Badge variant="outline">No CRM</Badge>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => addToCrm(c)}>
                          <Plus className="size-3.5" /> CRM
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {visible.length < filtered.length ? (
            <div className="mt-4 flex justify-center">
              <Button variant="outline" onClick={() => setPage((p) => p + 1)}>
                Carregar mais ({filtered.length - visible.length} restantes)
              </Button>
            </div>
          ) : null}
        </>
      )}
    </AppShell>
  );
}

function CompanyCard({
  company,
  inCrm,
  onAdd,
}: {
  company: Company;
  inCrm: boolean;
  onAdd: (c: Company) => void;
}) {
  return (
    <div className="surface-card p-4">
      <div className="flex items-start justify-between gap-2">
        <Link to="/empresas/$id" params={{ id: company.id }} className="font-semibold hover:underline">
          {company.name}
        </Link>
        {company.has_website ? (
          <Badge variant="secondary">Com site</Badge>
        ) : (
          <Badge variant="destructive">Sem site</Badge>
        )}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{company.category}</p>
      <div className="mt-3 space-y-1 text-sm text-muted-foreground">
        {company.city ? (
          <p className="flex items-center gap-2"><MapPin className="size-3.5" /> {company.city}</p>
        ) : null}
        {company.phone ? (
          <p className="flex items-center gap-2"><Phone className="size-3.5" /> {company.phone}</p>
        ) : null}
        {company.website ? (
          <p className="flex items-center gap-2 truncate"><Globe className="size-3.5" /> {company.website}</p>
        ) : null}
      </div>
      <div className="mt-4 flex gap-2">
        {inCrm ? (
          <Badge variant="outline">No CRM</Badge>
        ) : (
          <Button size="sm" variant="outline" onClick={() => onAdd(company)}>
            <Plus className="size-3.5" /> Adicionar ao CRM
          </Button>
        )}
      </div>
    </div>
  );
}
