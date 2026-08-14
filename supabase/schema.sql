create extension if not exists "pgcrypto";

create table if not exists public.albums (
    id uuid primary key default gen_random_uuid(),
    slug text not null unique,
    title text not null,
    description text,
    location text,
    album_date date,
    year integer,
    camera text,
    film text,
    cover_url text,
    published boolean not null default false,
    sort_order integer not null default 100,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.photos (
    id uuid primary key default gen_random_uuid(),
    album_id uuid not null references public.albums(id) on delete cascade,
    storage_path text not null,
    public_url text,
    alt_text text,
    width integer,
    height integer,
    file_size_bytes bigint,
    sort_order integer not null default 1,
    created_at timestamptz not null default now()
);

create index if not exists photos_album_id_sort_order_idx
    on public.photos (album_id, sort_order);

create index if not exists albums_year_sort_order_created_at_idx
    on public.albums (year desc nulls last, sort_order asc, created_at asc);

alter table public.albums enable row level security;
alter table public.photos enable row level security;

drop policy if exists "Published albums are readable" on public.albums;
create policy "Published albums are readable"
on public.albums for select
using (published = true);

drop policy if exists "Published album photos are readable" on public.photos;
create policy "Published album photos are readable"
on public.photos for select
using (
    exists (
        select 1
        from public.albums
        where albums.id = photos.album_id
        and albums.published = true
    )
);

drop policy if exists "Authenticated users manage albums" on public.albums;
create policy "Authenticated users manage albums"
on public.albums for all
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated users manage photos" on public.photos;
create policy "Authenticated users manage photos"
on public.photos for all
to authenticated
using (true)
with check (true);

drop policy if exists "Public album photos are readable" on storage.objects;
create policy "Public album photos are readable"
on storage.objects for select
using (bucket_id = 'album-photos');

drop policy if exists "Authenticated users upload album photos" on storage.objects;
create policy "Authenticated users upload album photos"
on storage.objects for insert
to authenticated
with check (bucket_id = 'album-photos');

drop policy if exists "Authenticated users update album photos" on storage.objects;
create policy "Authenticated users update album photos"
on storage.objects for update
to authenticated
using (bucket_id = 'album-photos')
with check (bucket_id = 'album-photos');

drop policy if exists "Authenticated users delete album photos" on storage.objects;
create policy "Authenticated users delete album photos"
on storage.objects for delete
to authenticated
using (bucket_id = 'album-photos');
