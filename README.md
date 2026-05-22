# DM Meet Premium

Sistema web de reuniões online da DM Gestão Patrimonial.

## Novidades desta versão

- Layout premium melhorado
- Criar reunião imediata
- Criar reunião agendada com dia e hora
- Código da sala fica bloqueado até o horário agendado
- Histórico de reuniões locais
- Gravação pelo navegador com download em `.webm`
- Sala real com áudio/vídeo/chat/compartilhamento de tela via LiveKit
- Compatível com Cloudflare Pages + GitHub + Supabase

## Cloudflare Pages

Framework: **React (Vite)**  
Build command: `npm run build`  
Build output directory: `dist`

## Variáveis necessárias

Em **Cloudflare Pages → Settings → Variables and Secrets**, configure:

```env
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_anon_key_do_supabase
VITE_LIVEKIT_URL=wss://rv-dmpatrimonial-patvlt7x.livekit.cloud
LIVEKIT_API_KEY=sua_api_key_livekit
LIVEKIT_API_SECRET=sua_api_secret_livekit
```

`LIVEKIT_API_KEY` e `LIVEKIT_API_SECRET` devem ficar como **Secret**.

## SQL recomendado no Supabase

```sql
create table if not exists public.dm_meet_rooms (
  id uuid primary key default gen_random_uuid(),
  room_name text not null unique,
  title text not null,
  created_by text,
  scheduled_at timestamptz,
  created_at timestamptz default now()
);

alter table public.dm_meet_rooms enable row level security;

drop policy if exists "Permitir leitura pública dm_meet_rooms" on public.dm_meet_rooms;
drop policy if exists "Permitir insert público dm_meet_rooms" on public.dm_meet_rooms;

create policy "Permitir leitura pública dm_meet_rooms"
on public.dm_meet_rooms for select using (true);

create policy "Permitir insert público dm_meet_rooms"
on public.dm_meet_rooms for insert with check (true);

create policy "Permitir update público dm_meet_rooms"
on public.dm_meet_rooms for update using (true);
```

## Sobre a gravação

Esta versão grava pelo próprio navegador de quem iniciou a gravação. Ao finalizar, o arquivo `.webm` é baixado automaticamente.

Para gravar a reunião inteira, clique em **Iniciar gravação** e selecione a aba/tela da reunião quando o navegador pedir permissão.
