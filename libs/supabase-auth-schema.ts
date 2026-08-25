export type SupabaseAuthSchemaOptionId = "leads" | "profiles";

export type SupabaseAuthSchemaOptions = Record<SupabaseAuthSchemaOptionId, boolean>;

export type SupabaseAuthSchemaApplied = Partial<Record<SupabaseAuthSchemaOptionId, boolean>>;

export const DEFAULT_SUPABASE_AUTH_SCHEMA_OPTIONS: SupabaseAuthSchemaOptions = {
  leads: true,
  profiles: true,
};

export const SUPABASE_AUTH_SCHEMA_OPTION_META: Record<
  SupabaseAuthSchemaOptionId,
  { label: string; description: string }
> = {
  leads: {
    label: "Waitlist / leads table",
    description:
      "Creates public.leads for email capture via /api/lead (service role writes, no public RLS).",
  },
  profiles: {
    label: "Profiles + email sign-in",
    description:
      "Creates public.profiles linked to auth.users with RLS and an auto-profile trigger on signup.",
  },
};

export function normalizeSupabaseAuthSchemaOptions(
  value: unknown
): SupabaseAuthSchemaOptions {
  if (typeof value !== "object" || value === null) {
    return { ...DEFAULT_SUPABASE_AUTH_SCHEMA_OPTIONS };
  }
  const obj = value as Record<string, unknown>;
  return {
    leads: obj.leads !== false,
    profiles: obj.profiles !== false,
  };
}

export function normalizeSupabaseAuthSchemaApplied(
  value: unknown
): SupabaseAuthSchemaApplied {
  if (typeof value !== "object" || value === null) {
    return {};
  }
  const obj = value as Record<string, unknown>;
  const applied: SupabaseAuthSchemaApplied = {};
  if (obj.leads === true) applied.leads = true;
  if (obj.profiles === true) applied.profiles = true;
  return applied;
}

export function selectedSchemaOptionIds(
  options: SupabaseAuthSchemaOptions
): SupabaseAuthSchemaOptionId[] {
  return (Object.keys(SUPABASE_AUTH_SCHEMA_OPTION_META) as SupabaseAuthSchemaOptionId[]).filter(
    (id) => options[id]
  );
}

/** SQL from supabase/migrations/001_leads.sql */
export const LEADS_TABLE_SQL = `
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists leads_created_at_idx on public.leads (created_at desc);

alter table public.leads enable row level security;
`.trim();

/** SQL from supabase/migrations/003_profiles.sql */
export const PROFILES_AUTH_SQL = `
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_updated_at_idx on public.profiles (updated_at desc);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
`.trim();

export function sqlForSchemaOption(id: SupabaseAuthSchemaOptionId): string {
  if (id === "leads") return LEADS_TABLE_SQL;
  return PROFILES_AUTH_SQL;
}
