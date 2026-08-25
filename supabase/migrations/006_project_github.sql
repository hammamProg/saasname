-- GitHub repository linked during setup step 1
alter table public.projects
  add column if not exists github_repo_url text,
  add column if not exists github_repo_full_name text;

create index if not exists projects_github_repo_idx
  on public.projects (github_repo_full_name)
  where github_repo_full_name is not null;
