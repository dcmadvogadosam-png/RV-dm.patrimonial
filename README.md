# DM Meet Completo

Sistema web de reuniões online da DM Gestão Patrimonial.

## Cloudflare Pages
Framework: React (Vite)  
Build command: `npm run build`  
Build output directory: `dist`

## Variáveis necessárias no Cloudflare Pages
```env
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_anon_key_do_supabase
VITE_LIVEKIT_URL=wss://rv-dmpatrimonial-patvlt7x.livekit.cloud
LIVEKIT_API_KEY=sua_api_key_livekit
LIVEKIT_API_SECRET=sua_api_secret_livekit
```

`LIVEKIT_API_KEY` e `LIVEKIT_API_SECRET` são secretas. Não coloque dentro do código público.

## SQL opcional no Supabase
```sql
create table if not exists public.dm_meet_rooms (
  id uuid primary key default gen_random_uuid(),
  room_name text not null unique,
  title text not null,
  created_by text,
  created_at timestamptz default now()
);

alter table public.dm_meet_rooms enable row level security;

create policy "Permitir leitura pública dm_meet_rooms"
on public.dm_meet_rooms for select using (true);

create policy "Permitir insert público dm_meet_rooms"
on public.dm_meet_rooms for insert with check (true);
```
