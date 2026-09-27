export type Niche = {
  label: string;
  /** Overpass tag filters, applied as OR */
  filters: string[];
};

export const NICHES: Niche[] = [
  { label: "Restaurantes", filters: ['["amenity"="restaurant"]'] },
  { label: "Lanchonetes", filters: ['["amenity"="fast_food"]'] },
  { label: "Cafeterias", filters: ['["amenity"="cafe"]'] },
  { label: "Padarias", filters: ['["shop"="bakery"]'] },
  { label: "Clínicas", filters: ['["amenity"="clinic"]', '["healthcare"="clinic"]'] },
  { label: "Dentistas", filters: ['["amenity"="dentist"]', '["healthcare"="dentist"]'] },
  { label: "Academias", filters: ['["leisure"="fitness_centre"]'] },
  { label: "Salões de beleza", filters: ['["shop"="hairdresser"]', '["shop"="beauty"]'] },
  { label: "Oficinas", filters: ['["shop"="car_repair"]'] },
  { label: "Imobiliárias", filters: ['["office"="estate_agent"]'] },
  { label: "Hotéis", filters: ['["tourism"="hotel"]', '["tourism"="guest_house"]'] },
  { label: "Lojas", filters: ['["shop"="clothes"]', '["shop"="shoes"]', '["shop"="gift"]'] },
  { label: "Contadores", filters: ['["office"="accountant"]'] },
  { label: "Advogados", filters: ['["office"="lawyer"]'] },
  { label: "Empresas de transporte", filters: ['["office"="logistics"]', '["shop"="trade"]'] },
  { label: "Escolas", filters: ['["amenity"="school"]', '["amenity"="language_school"]'] },
  { label: "Supermercados", filters: ['["shop"="supermarket"]', '["shop"="convenience"]'] },
  { label: "Farmácias", filters: ['["amenity"="pharmacy"]'] },
  { label: "Pet shops", filters: ['["shop"="pet"]', '["shop"="pet_grooming"]'] },
  { label: "Veterinários", filters: ['["amenity"="veterinary"]'] },
];

export const RADIUS_OPTIONS = [1, 5, 10, 25, 50];

export const LEAD_STATUSES = [
  "novo",
  "pesquisar",
  "primeiro contato",
  "aguardando resposta",
  "respondeu",
  "reunião",
  "proposta enviada",
  "cliente",
  "sem interesse",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const INTERACTION_TYPES = ["WhatsApp", "Ligação", "E-mail", "Visita", "Outro"];
