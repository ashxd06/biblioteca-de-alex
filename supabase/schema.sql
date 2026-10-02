create table progress(user_id uuid references auth.users not null default auth.uid(),book_id text,title text,page int,line int,total int,updated_at timestamptz default now(),primary key(user_id,book_id));
create table notes(id text primary key,user_id uuid references auth.users not null default auth.uid(),text text,book_id text,page int,line int,updated_at timestamptz default now());
create table highlights(id text primary key,user_id uuid references auth.users not null default auth.uid(),book_id text,page int,line int,note text);
alter table progress enable row level security;alter table notes enable row level security;alter table highlights enable row level security;
create policy own on progress for all using(user_id=auth.uid());
create policy own on notes for all using(user_id=auth.uid());
create policy own on highlights for all using(user_id=auth.uid());
