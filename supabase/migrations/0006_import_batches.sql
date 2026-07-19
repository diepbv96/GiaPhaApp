-- import_batches / import_row_results: bulk .xlsx import bookkeeping (FR-013-FR-015, FR-025)

create table public.import_batches (
  id uuid primary key default gen_random_uuid(),
  family_tree_id uuid not null references public.family_trees (id) on delete cascade,
  uploaded_by uuid not null references public.profiles (id),
  file_name text,
  total_rows integer not null default 0,
  succeeded_rows integer not null default 0,
  failed_rows integer not null default 0,
  duplicate_rows integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.import_row_results (
  id uuid primary key default gen_random_uuid(),
  import_batch_id uuid not null references public.import_batches (id) on delete cascade,
  row_number integer not null,
  status import_row_status not null,
  error_message text,
  individual_id uuid references public.individuals (id)
);

create index import_row_results_batch_id_idx on public.import_row_results (import_batch_id);
