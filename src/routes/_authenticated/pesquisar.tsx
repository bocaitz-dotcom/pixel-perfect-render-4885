import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Globe, MapPin, Phone, Search } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { searchCompanies, type SearchResult } from "@/lib/search.functions";
import { NICHES, RADIUS_OPTIONS } from "@/lib/niches";

export const Route = createFileRoute("/_authenticated/pesquisar")({
  head: () => ({
    meta: [
      { title: "Pesquisar empresas — ProspectSite" },
      { name: "description", content: "Encontre empresas por nicho, cidade, estado e raio de distância." },
      { property: "og:title", content: "Pesquisar empresas — ProspectSite" },
      { property: "og:description", content: "Encontre empresas por nicho, cidade, estado e raio de distância." },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const navigate = useNavigate();
  const runSearch = useServerFn(searchCompanies);

  const [niche, setNiche] = useState("Restaurantes");
  const [country, setCountry] = useState("Brasil");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [radiusKm, setRadiusKm] = useState(10);
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [onlyWithPhone, setOnlyWithPhone] = useState(false);

  const visibleResults = results
    ? onlyWithPhone
      ? results.filter((r) => r.phone)
      : results
    : null;

  const search = useMutation({
    mutationFn: async () =>
      runSearch({
        data: { niche, country, state, city, district, radiusKm, limit: 120 },
      }),
    onSuccess: async (res) => {
      if (!res.ok) {
        toast.error(res.error ?? "Não foi possível pesquisar.");
        setResults([]);
        return;
      }
      setResults(res.results);
      toast.success(`Encontradas ${res.results.length} empresas`);
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        await supabase.from("searches").insert({
          user_id: userData.user.id,
          niche,
          city,
          state: state || null,
          country,
          radius: radiusKm,
          results_count: res.results.length,
        });
      }
    },
    onError: () => toast.error("Falha ao pesquisar. Tente novamente."),
  });

  async function saveAll() {
    if (!results?.length) return;
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Sessão expirada");

      const rows = results.map((r) => ({
        user_id: userId,
        source: r.source,
        source_id: r.source_id,
        name: r.name,
        category: r.category,
        phone: r.phone,
        website: r.website,
        address: r.address,
        city: r.city,
        state: r.state,
        country: r.country,
        latitude: r.latitude,
        longitude: r.longitude,
        opening_hours: r.opening_hours,
        maps_url: r.maps_url,
        has_website: r.has_website,
        opportunity_score: r.opportunity_score,
      }));

      const { error } = await supabase
        .from("companies")
        .upsert(rows, { onConflict: "user_id,source,source_id", ignoreDuplicates: true });
      if (error) throw error;
      toast.success("Empresas salvas na sua base.");
      navigate({ to: "/empresas" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell title="Encontrar empresas" description="Pesquise por nicho e localidade">
      <div className="surface-card p-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="space-y-2">
            <Label>Nicho</Label>
            <Input
              list="nichos"
              value={niche}
              maxLength={60}
              onChange={(e) => setNiche(e.target.value)}
              placeholder="Ex.: Restaurantes"
            />
            <datalist id="nichos">
              {NICHES.map((n) => (
                <option key={n.label} value={n.label} />
              ))}
            </datalist>
          </div>
          <div className="space-y-2">
            <Label>País</Label>
            <Input value={country} maxLength={60} onChange={(e) => setCountry(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Estado</Label>
            <Input
              value={state}
              maxLength={60}
              onChange={(e) => setState(e.target.value)}
              placeholder="Ex.: Maranhão"
            />
          </div>
          <div className="space-y-2">
            <Label>Cidade</Label>
            <Input
              value={city}
              maxLength={80}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Ex.: Imperatriz"
            />
          </div>
          <div className="space-y-2">
            <Label>Bairro (opcional)</Label>
            <Input value={district} maxLength={80} onChange={(e) => setDistrict(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Raio</Label>
            <Select value={String(radiusKm)} onValueChange={(v) => setRadiusKm(Number(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RADIUS_OPTIONS.map((r) => (
                  <SelectItem key={r} value={String(r)}>
                    {r} km
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          className="mt-5 w-full sm:w-auto"
          disabled={search.isPending || !city.trim()}
          onClick={() => search.mutate()}
        >
          <Search className="size-4" />
          {search.isPending ? "Procurando..." : "Encontrar empresas"}
        </Button>
        <p className="mt-3 text-xs text-muted-foreground">
          Fonte: OpenStreetMap — apenas dados comerciais públicos.
        </p>
      </div>

      {search.isPending ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      ) : null}

      {results && !search.isPending ? (
        <div className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Encontradas {results.length} empresas · {results.filter((r) => !r.has_website).length} sem site
            </p>
            {results.length > 0 ? (
              <Button onClick={saveAll} disabled={saving}>
                {saving ? "Salvando..." : "Salvar na minha base"}
              </Button>
            ) : null}
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {results.map((r) => (
              <div key={r.source_id} className="surface-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold leading-tight">{r.name}</h3>
                  {r.has_website ? (
                    <Badge variant="secondary">Com site</Badge>
                  ) : (
                    <Badge variant="destructive">Sem site</Badge>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{r.category}</p>
                <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                  {r.address ? (
                    <p className="flex items-center gap-2">
                      <MapPin className="size-3.5" /> {r.address}
                    </p>
                  ) : null}
                  {r.phone ? (
                    <p className="flex items-center gap-2">
                      <Phone className="size-3.5" /> {r.phone}
                    </p>
                  ) : null}
                  {r.website ? (
                    <p className="flex items-center gap-2 truncate">
                      <Globe className="size-3.5" /> {r.website}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          {results.length === 0 ? (
            <div className="surface-card mt-4 p-8 text-center text-sm text-muted-foreground">
              Nenhuma empresa encontrada para esse nicho e localidade. Tente aumentar o raio.
            </div>
          ) : null}
        </div>
      ) : null}
    </AppShell>
  );
}
