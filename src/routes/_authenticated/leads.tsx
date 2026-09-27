import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { LEAD_STATUSES } from "@/lib/niches";

export const Route = createFileRoute("/_authenticated/leads")({
  head: () => ({
    meta: [
      { title: "Leads — ProspectSite" },
      { name: "description", content: "Acompanhe o funil de prospecção do primeiro contato até o cliente." },
      { property: "og:title", content: "Leads — ProspectSite" },
      { property: "og:description", content: "Acompanhe o funil de prospecção do primeiro contato até o cliente." },
    ],
  }),
  component: LeadsPage,
});

type LeadRow = {
  id: string;
  status: string;
  notes: string | null;
  company_id: string;
  companies: { id: string; name: string; city: string | null; phone: string | null; has_website: boolean } | null;
};

function LeadsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("todos");

  const { data, isLoading } = useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("id, status, notes, company_id, companies(id, name, city, phone, has_website)")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as LeadRow[];
    },
  });

  const leads = data ?? [];
  const filtered = useMemo(
    () => (statusFilter === "todos" ? leads : leads.filter((l) => l.status === statusFilter)),
    [leads, statusFilter],
  );

  async function updateStatus(leadId: string, status: string) {
    const { error } = await supabase.from("leads").update({ status }).eq("id", leadId);
    if (error) {
      toast.error("Não foi possível atualizar.");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["leads"] });
    toast.success("Status atualizado.");
  }

  async function removeLead(leadId: string) {
    const { error } = await supabase.from("leads").delete().eq("id", leadId);
    if (error) {
      toast.error("Não foi possível remover.");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["leads"] });
    queryClient.invalidateQueries({ queryKey: ["companies"] });
    toast.success("Lead removido.");
  }

  return (
    <AppShell
      title="Leads"
      description={`${filtered.length} leads no funil`}
      actions={
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {LEAD_STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
    >
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="surface-card p-8 text-center">
          <p className="text-sm text-muted-foreground">Nenhum lead ainda.</p>
          <Button asChild className="mt-4">
            <Link to="/empresas">Escolher empresas</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((lead) => (
            <div key={lead.id} className="surface-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Link
                  to="/empresas/$id"
                  params={{ id: lead.company_id }}
                  className="font-semibold hover:underline"
                >
                  {lead.companies?.name ?? "Empresa"}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {[lead.companies?.city, lead.companies?.phone].filter(Boolean).join(" · ") || "—"}
                </p>
                {lead.companies && !lead.companies.has_website ? (
                  <Badge variant="destructive" className="mt-2">Sem site</Badge>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <Select value={lead.status} onValueChange={(v) => updateStatus(lead.id, v)}>
                  <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LEAD_STATUSES.map((s) => (
                      <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="icon" onClick={() => removeLead(lead.id)} aria-label="Remover lead">
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
