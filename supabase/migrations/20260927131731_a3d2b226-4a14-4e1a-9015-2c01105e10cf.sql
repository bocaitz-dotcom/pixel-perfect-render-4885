
UPDATE public.companies SET source_id = '' WHERE source_id IS NULL;
ALTER TABLE public.companies ALTER COLUMN source_id SET DEFAULT '';
ALTER TABLE public.companies ALTER COLUMN source_id SET NOT NULL;
DROP INDEX IF EXISTS public.companies_user_source_uniq;
CREATE UNIQUE INDEX companies_user_source_uniq ON public.companies (user_id, source, source_id);
