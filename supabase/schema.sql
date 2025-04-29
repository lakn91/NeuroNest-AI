-- Create schema for NeuroNest AI application

-- Enable RLS (Row Level Security)
alter default privileges revoke execute on functions from public;

-- Create profiles table
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text not null,
  display_name text,
  avatar_url text,
  settings jsonb default '{"theme": "light", "language": "en", "notifications": true, "dialect": "standard"}'::jsonb,
  api_keys jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Create projects table
create table public.projects (
  id uuid default uuid_generate_v4() not null primary key,
  user_id uuid references public.profiles on delete cascade not null,
  title text not null,
  description text,
  type text not null,
  files jsonb default '[]'::jsonb,
  status text default 'active'::text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Create conversations table
create table public.conversations (
  id uuid default uuid_generate_v4() not null primary key,
  user_id uuid references public.profiles on delete cascade not null,
  title text not null,
  description text,
  messages jsonb default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Create agent_memories table
create table public.agent_memories (
  id uuid default uuid_generate_v4() not null primary key,
  user_id uuid references public.profiles on delete cascade not null,
  agent_id text not null,
  content text not null,
  context text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Create RLS policies

-- Profiles policies
create policy "Users can view their own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on profiles for update
  using (auth.uid() = id);

-- Projects policies
create policy "Users can view their own projects"
  on projects for select
  using (auth.uid() = user_id);

create policy "Users can create their own projects"
  on projects for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own projects"
  on projects for update
  using (auth.uid() = user_id);

create policy "Users can delete their own projects"
  on projects for delete
  using (auth.uid() = user_id);

-- Conversations policies
create policy "Users can view their own conversations"
  on conversations for select
  using (auth.uid() = user_id);

create policy "Users can create their own conversations"
  on conversations for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own conversations"
  on conversations for update
  using (auth.uid() = user_id);

create policy "Users can delete their own conversations"
  on conversations for delete
  using (auth.uid() = user_id);

-- Agent memories policies
create policy "Users can view their own agent memories"
  on agent_memories for select
  using (auth.uid() = user_id);

create policy "Users can create their own agent memories"
  on agent_memories for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own agent memories"
  on agent_memories for update
  using (auth.uid() = user_id);

create policy "Users can delete their own agent memories"
  on agent_memories for delete
  using (auth.uid() = user_id);

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.conversations enable row level security;
alter table public.agent_memories enable row level security;

-- Create functions

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function to handle user updates
create or replace function public.handle_user_update()
returns trigger as $$
begin
  update public.profiles
  set
    email = new.email,
    updated_at = now()
  where id = new.id;
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for user updates
create trigger on_auth_user_updated
  after update on auth.users
  for each row execute procedure public.handle_user_update();

-- Function to automatically update the updated_at column
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Triggers for updated_at columns
create trigger update_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.update_updated_at_column();

create trigger update_projects_updated_at
  before update on public.projects
  for each row execute procedure public.update_updated_at_column();

create trigger update_conversations_updated_at
  before update on public.conversations
  for each row execute procedure public.update_updated_at_column();

create trigger update_agent_memories_updated_at
  before update on public.agent_memories
  for each row execute procedure public.update_updated_at_column();