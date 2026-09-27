import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — ProspectSite" },
      { name: "description", content: "Defina seu nome e o nome da sua empresa usados nas mensagens." },
      { property: "og:title", content: "Configurações — ProspectSite" },
      { property: "og:description", content: "Defina seu nome e o nome da sua empresa usados nas mensagens." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [saving, setSaving] = useState(false);

  const { data } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, company_name")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (data) {
      setFullName(data.full_name ?? "");
      setCompanyName(data.company_name ?? "");
    }
  }, [data]);

  async function save() {
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const { error } = await supabase.from("profiles").upsert({
      id: userData.user.id,
      full_name: fullName.trim().slice(0, 80),
      company_name: companyName.trim().slice(0, 80),
    });
    setSaving(false);
    if (error) {
      toast.error("Não foi possível salvar.");
      return;
    }
    toast.success("Configurações salvas.");
    queryClient.invalidateQueries({ queryKey: ["profile"] });
  }

  return (
    <AppShell title="Configurações" description="Dados usados nas mensagens de prospecção">
      <div className="surface-card max-w-xl space-y-4 p-5">
        <div className="space-y-2">
          <Label htmlFor="fullName">Seu nome</Label>
          <Input id="fullName" value={fullName} maxLength={80} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="companyName">Nome da sua empresa</Label>
          <Input
            id="companyName"
            value={companyName}
            maxLength={80}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Aparece nas mensagens enviadas"
          />
        </div>
        <Button onClick={save} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
      </div>

      <div className="surface-card mt-6 max-w-xl p-5">
        <h2 className="text-base font-semibold">Fonte de dados</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          As pesquisas usam o OpenStreetMap, gratuito e com dados comerciais públicos.
          A integração com o Google Maps pode ser ativada depois, se você tiver uma chave.
        </p>
      </div>
    </AppShell>
  );
}
