export type Company = {
  id: string;
  name: string;
  category: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  rating: number | null;
  review_count: number | null;
  opening_hours: string | null;
  has_website: boolean;
  opportunity_score: number;
  maps_url: string | null;
  source: string;
  source_id: string | null;
  collected_at: string;
};

export type Lead = {
  id: string;
  company_id: string;
  status: string;
  priority: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export function onlyDigits(phone: string) {
  return phone.replace(/\D/g, "");
}

export function whatsappLink(phone: string, message: string) {
  const digits = onlyDigits(phone);
  const normalized = digits.length <= 11 ? `55${digits}` : digits;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export function buildMessage(params: {
  companyName: string;
  niche: string | null;
  city: string | null;
  myCompany: string;
  hasWebsite: boolean;
}) {
  const { companyName, niche, city, myCompany, hasWebsite } = params;
  const local = city ? ` em ${city}` : "";
  const nicho = niche ? ` do segmento de ${niche}` : "";
  const site = hasWebsite
    ? "Vi que vocês já têm um site e gostaria de apresentar uma proposta de modernização."
    : "Notei que não encontrei um site de vocês e gostaria de apresentar uma proposta de site profissional.";
  return `Olá, tudo bem? Sou da ${myCompany || "[SUA EMPRESA]"}. Encontrei a ${companyName}${nicho}${local} e trabalho com criação de sites para empresas da região. ${site} Posso te mostrar alguns exemplos?`;
}

export function exportToCsv(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]!);
  const escape = (value: unknown) => {
    const text = value === null || value === undefined ? "" : String(value);
    return `"${text.replace(/"/g, '""')}"`;
  };
  const csv = [
    headers.join(","),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(",")),
  ].join("\n");
  downloadBlob(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }), `${filename}.csv`);
}

export function exportToJson(rows: unknown[], filename: string) {
  downloadBlob(
    new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" }),
    `${filename}.json`,
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
