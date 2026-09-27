import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { exportToCsv } from "@/lib/prospect";

export const Route = createFileRoute("/_authenticated/listas")({
  head: () => ({
    meta: [
      { title: "Listas — ProspectSite" },
      { name: "description", content: "Organize suas empresas em listas por nicho e cidade." },
      { property: "og:title", content: "Listas — ProspectSite" },
      { property: "og:description", content: "Organize suas empresas em listas por nicho e cidade." },
    ],
  }),
  component: ListsPage,
});

type ListRow = {
  id: string;
  name: string;
  list_companies: Array<{
    id: string;
    company_id: string;
    companies: { name: string; city: string | null; phone: string | null; website: string | null } | null;
  }>;
};

function ListsPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["lists"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lists")
        .select("id, name, list_companies(id, company_id, companies(name, city, phone, website))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ListRow[];
    },
  });

  async function createList() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const { error } = await supabase
      .from("lists")
      .insert({ user_id: userData.user.id, name: trimmed.slice(0, 80) });
    if (error) {
      toast.error("Nao foi possivel criar a lista.");
      return;
    }
    setName("");
    toast.success("Lista criada.");
    queryClient.invalidateQueries({ queryKey: ["lists"] });
  }

  async function removeList(id: string) {
    const { error } = await supabase.from("lists").delete().eq("id", id);
    if (error) {
      toast.error("Nao foi possivel excluir.");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["lists"] });
  }

  const lists = data ?? [];

  return (
    <AppShell title="Listas" description="Agrupe empresas por nicho e cidade">
      <div className="surface-card flex flex-col gap-3 p-4 sm:flex-row">
        <Input
          value={name}
          maxLength={80}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex.: Restaurantes — Imperatriz"
        />
        <Button onClick={createList} disabled={!name.trim()}>
          Criar lista
        </Button>
      </div>

      {isLoading ? (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : lists.length === 0 ? (
        <div className="surface-card mt-6 p-8 text-center text-sm text-muted-foreground">
          Voce ainda nao criou listas.
        </div>
      ) : (
        <div className="mt-6 grid gap-4">
          {lists.map((list) => (
            <div key={list.id} className="surface-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold">{list.name}</h2>
                  <p className="text-xs text-muted-foreground">
                    {list.list_companies.length} empresas
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      exportToCsv(
                        list.list_companies.map((lc) => ({
                          empresa: lc.companies?.name,
                          cidade: lc.companies?.city,
                          telefone: lc.companies?.phone,
                          website: lc.companies?.website,
                        })),
                        list.name,
                      )
                    }
                  >
                    Exportar
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeList(list.id)}
                    aria-label="Excluir lista"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>

              {list.list_companies.length ? (
                <ul className="mt-4 space-y-1 text-sm">
                  {list.list_companies.slice(0, 8).map((lc) => (
                    <li key={lc.id}>
                      <Link to="/empresas/$id" params={{ id: lc.company_id }} className="hover:underline">
                        {lc.companies?.name}
                      </Link>
                      <span className="text-muted-foreground"> · {lc.companies?.city ?? "—"}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">
                  Abra uma empresa e use "Adicionar a lista".
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
