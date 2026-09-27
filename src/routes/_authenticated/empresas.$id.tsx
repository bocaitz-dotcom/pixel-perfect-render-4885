import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ExternalLink, MapPin, MessageCircle, Phone, Plus } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { INTERACTION_TYPES, LEAD_STATUSES } from "@/lib/niches";
import { buildMessage, whatsappLink, type Company, type Lead } from "@/lib/prospect";

export const Route = createFileRoute("/_authenticated/empresas/$id")({
  head: () => ({
    meta: [
      { title: "Detalhes da empresa — ProspectSite" },
      { name: "description", content: "Dados da empresa, status do lead e histórico de contato." },
      { property: "og:title", content: "Detalhes da empresa — ProspectSite" },
      { property: "og:description", content: "Dados da empresa, status do lead e histórico de contato." },
    ],
  }),
  component: CompanyDetail,
});

function CompanyDetail() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [interactionType, setInteractionType] = useState(INTERACTION_TYPES[0]!);
  const [interactionText, setInteractionText] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["company", id],
    queryFn: async () => {
      const [company, lead, profile] = await Promise.all([
        supabase.from("companies").select("*").eq("id", id).maybeSingle(),
        supabase.from("leads").select("*").eq("company_id", id).maybeSingle(),
        supabase.from("profiles").select("company_name").maybeSingle(),
      ]);
      if (company.error) throw company.error;
      const leadRow = (lead.data ?? null) as unknown as Lead | null;
      let interactions: Array<{ id: string; type: string; description: string | null; created_at: string }> = [];
      if (leadRow) {
        const res = await supabase
          .from("interactions")
          .select("*")
          .eq("lead_id", leadRow.id)
          .order("created_at", { ascending: false });
        interactions = res.data ?? [];
      }
      return {
        company: (company.data ?? null) as unknown as Company | null,
        lead: leadRow,
        interactions,
        myCompany: profile.data?.company_name ?? "",
      };
    },
  });

  const company = data?.company ?? null;
  const lead = data?.lead ?? null;

  useEffect(() => {
    if (company && !message) {
      setMessage(
        buildMessage({
          companyName: company.name,
          niche: company.category,
          city: company.city,
          myCompany: data?.myCompany ?? "",
          hasWebsite: company.has_website,
        }),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company]);

  async function addToCrm() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user || !company) return;
    const { error } = await supabase
      .from("leads")
      .insert({ user_id: userData.user.id, company_id: company.id, status: "novo" });
    if (error) {
      toast.error("Não foi possível adicionar ao CRM.");
      return;
    }
    toast.success("Adicionada ao CRM.");
    queryClient.invalidateQueries({ queryKey: ["company", id] });
  }

  async function updateStatus(status: string) {
    if (!lead) return;
    const { error } = await supabase.from("leads").update({ status }).eq("id", lead.id);
    if (error) {
      toast.error("Não foi possível atualizar o status.");
      return;
    }
    toast.success("Status atualizado.");
    queryClient.invalidateQueries({ queryKey: ["company", id] });
    queryClient.invalidateQueries({ queryKey: ["leads"] });
  }

  async function saveNotes(notes: string) {
    if (!lead) return;
    await supabase.from("leads").update({ notes }).eq("id", lead.id);
    toast.success("Observações salvas.");
    queryClient.invalidateQueries({ queryKey: ["company", id] });
  }

  async function addInteraction() {
    if (!lead || !interactionText.trim()) return;
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const { error } = await supabase.from("interactions").insert({
      user_id: userData.user.id,
      lead_id: lead.id,
      type: interactionType,
      description: interactionText.trim().slice(0, 1000),
    });
    if (error) {
      toast.error("Não foi possível registrar.");
      return;
    }
    setInteractionText("");
    toast.success("Interação registrada.");
    queryClient.invalidateQueries({ queryKey: ["company", id] });
  }

  if (isLoading) {
    return (
      <AppShell title="Empresa">
        <Skeleton className="h-64 rounded-xl" />
      </AppShell>
    );
  }

  if (!company) {
    return (
      <AppShell title="Empresa não encontrada">
        <div className="surface-card p-8 text-center">
          <p className="text-sm text-muted-foreground">Esta empresa não está na sua base.</p>
          <Button asChild className="mt-4">
            <Link to="/empresas">Voltar para empresas</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={company.name}
      description={[company.category, company.city, company.state].filter(Boolean).join(" · ")}
      actions={
        lead ? (
          <Select value={lead.status} onValueChange={updateStatus}>
            <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
            <SelectContent>
              {LEAD_STATUSES.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Button onClick={addToCrm}>
            <Plus className="size-4" /> Adicionar ao CRM
          </Button>
        )
      }
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="surface-card p-5">
            <div className="flex flex-wrap items-center gap-2">
              {company.has_website ? (
                <Badge variant="secondary">Com site</Badge>
              ) : (
                <Badge variant="destructive">🔴 Sem site</Badge>
              )}
              <Badge variant="outline">Oportunidade {company.opportunity_score}</Badge>
              <Badge variant="outline">Fonte: {company.source}</Badge>
            </div>

            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Endereço" value={company.address} />
              <Field label="Cidade / Estado" value={[company.city, company.state].filter(Boolean).join(" / ")} />
              <Field label="País" value={company.country} />
              <Field label="Telefone" value={company.phone} />
              <Field label="Website" value={company.website} />
              <Field label="Horário" value={company.opening_hours} />
              <Field label="Avaliação" value={company.rating ? String(company.rating) : null} />
              <Field
                label="Coordenadas"
                value={
                  company.latitude && company.longitude
                    ? `${company.latitude.toFixed(5)}, ${company.longitude.toFixed(5)}`
                    : null
                }
              />
              <Field label="Data da coleta" value={new Date(company.collected_at).toLocaleString("pt-BR")} />
            </dl>

            <div className="mt-5 flex flex-wrap gap-2">
              {company.phone ? (
                <Button asChild variant="outline">
                  <a href={`tel:${company.phone}`}><Phone className="size-4" /> Ligar</a>
                </Button>
              ) : null}
              {company.phone ? (
                <Button asChild variant="outline">
                  <a href={whatsappLink(company.phone, message)} target="_blank" rel="noreferrer">
                    <MessageCircle className="size-4" /> WhatsApp
                  </a>
                </Button>
              ) : null}
              {company.website ? (
                <Button asChild variant="outline">
                  <a href={company.website} target="_blank" rel="noreferrer">
                    <ExternalLink className="size-4" /> Abrir site
                  </a>
                </Button>
              ) : null}
              {company.maps_url ? (
                <Button asChild variant="outline">
                  <a href={company.maps_url} target="_blank" rel="noreferrer">
                    <MapPin className="size-4" /> Abrir mapa
                  </a>
                </Button>
              ) : null}
            </div>
          </div>

          <div className="surface-card p-5">
            <h2 className="text-base font-semibold">Mensagem de prospecção</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Revise o texto antes de enviar. Nada é enviado automaticamente.
            </p>
            <Textarea
              className="mt-3 min-h-32"
              value={message}
              maxLength={1000}
              onChange={(e) => setMessage(e.target.value)}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(message);
                  toast.success("Mensagem copiada.");
                }}
              >
                Copiar mensagem
              </Button>
              {company.phone ? (
                <Button asChild>
                  <a href={whatsappLink(company.phone, message)} target="_blank" rel="noreferrer">
                    Abrir no WhatsApp
                  </a>
                </Button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="surface-card p-5">
            <h2 className="text-base font-semibold">Observações</h2>
            <Textarea
              className="mt-3 min-h-24"
              defaultValue={lead?.notes ?? ""}
              maxLength={1000}
              disabled={!lead}
              onBlur={(e) => lead && saveNotes(e.target.value)}
              placeholder={lead ? "Anote detalhes do contato" : "Adicione ao CRM para anotar"}
            />
          </div>

          <div className="surface-card p-5">
            <h2 className="text-base font-semibold">Histórico de contato</h2>
            {lead ? (
              <>
                <div className="mt-3 space-y-2">
                  <Select value={interactionType} onValueChange={setInteractionType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {INTERACTION_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Textarea
                    value={interactionText}
                    maxLength={500}
                    onChange={(e) => setInteractionText(e.target.value)}
                    placeholder="O que aconteceu?"
                  />
                  <Button className="w-full" onClick={addInteraction} disabled={!interactionText.trim()}>
                    Registrar
                  </Button>
                </div>
                <ul className="mt-5 space-y-3">
                  {(data?.interactions ?? []).map((i) => (
                    <li key={i.id} className="border-l-2 border-primary/40 pl-3">
                      <p className="text-xs text-muted-foreground">
                        {new Date(i.created_at).toLocaleString("pt-BR")} · {i.type}
                      </p>
                      <p className="text-sm">{i.description}</p>
                    </li>
                  ))}
                  {(data?.interactions ?? []).length === 0 ? (
                    <li className="text-sm text-muted-foreground">Nenhuma interação registrada.</li>
                  ) : null}
                </ul>
              </>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                Adicione a empresa ao CRM para registrar contatos.
              </p>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-words text-sm">{value && value.length ? value : "—"}</dd>
    </div>
  );
}
