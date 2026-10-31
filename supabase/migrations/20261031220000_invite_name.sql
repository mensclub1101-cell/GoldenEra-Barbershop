-- Optional name on an invite (owner invites have no barber seat to name them),
-- so the join page can greet the person: "Welcome, Javi".
alter table public.invites add column invitee_name text check (invitee_name is null or length(trim(invitee_name)) between 1 and 60);
create or replace function public.peek_invite(p_token text)
 returns table(role app_role, display_name text, shop_name text, valid boolean)
 language sql stable security definer set search_path to ''
as $function$
  select i.role,
         coalesce(b.display_name, i.invitee_name),
         s.name,
         (i.used_at is null and i.expires_at > now()
          and (i.role = 'owner' or b.profile_id is null))
  from public.invites i
  left join public.barbers b on b.id = i.barber_id
  left join public.shops s on s.id = b.shop_id
  where i.token = p_token;
$function$;
