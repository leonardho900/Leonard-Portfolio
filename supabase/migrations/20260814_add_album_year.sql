alter table public.albums
    add column if not exists year integer;

create index if not exists albums_year_sort_order_created_at_idx
    on public.albums (year desc nulls last, sort_order asc, created_at asc);
