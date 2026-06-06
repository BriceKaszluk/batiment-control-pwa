do $$
begin
  create type public.control_quality_rating as enum (
    'satisfying',
    'acceptable',
    'to_improve',
    'unsatisfying'
  );
exception
  when duplicate_object then null;
end $$;

alter table public.controls
  add column if not exists quality_rating public.control_quality_rating;
