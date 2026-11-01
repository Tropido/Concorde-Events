-- Forgotten passwords by phone (2026-11-01). There is no automatic reset to a phone: the request
-- becomes a ticket, staff check who is asking, then send a link from the client card.

create function private.normal_phone(p text)
returns text
language sql
immutable
set search_path = ''
as $$
  -- Digits only, no international prefix, and a bare Tunisian number gets its country code.
  select case when length(d) = 8 then '216' || d else d end
  from (select regexp_replace(regexp_replace(coalesce(p, ''), '[^0-9]', '', 'g'), '^00', '') as d) x;
$$;

-- The same answer for a known and an unknown identifier: true means "an email may be sent", for
-- every well-formed email under the limits, whether or not an account has it. A phone is always
-- false: if it matches a profile, staff get a ticket, one at a time.
create function public.request_password_help(p_identifier text, p_ip_hash text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id text := lower(trim(coalesce(p_identifier, '')));
  v_key text;
  v_profile public.profiles;
  v_subject constant text := 'Demande de réinitialisation du mot de passe';
begin
  if length(v_id) not between 6 and 254 or length(coalesce(p_ip_hash, '')) <> 64 then
    return false;
  end if;
  v_key := case when position('@' in v_id) > 0 then v_id else private.normal_phone(v_id) end;
  if not private.hit_limit('help-ip:' || p_ip_hash, 10, interval '1 hour')
     or not private.hit_limit('help-id:' || v_key, 3, interval '1 hour') then
    return false;
  end if;
  if position('@' in v_id) > 0 then
    return true;
  end if;
  if length(v_key) >= 11 then
    select * into v_profile from public.profiles where private.normal_phone(phone) = v_key order by created_at limit 1;
    if found and not exists (select 1 from public.messages where profile_id = v_profile.id and subject = v_subject and status <> 'resolved') then
      insert into public.messages (channel, profile_id, name, email, phone, country, subject, body, category)
      values ('whatsapp', v_profile.id, v_profile.full_name, v_profile.email, v_profile.phone, 'TN', v_subject,
              'Vérifiez l''identité de la personne, puis envoyez le lien depuis sa fiche client.', 'other');
    end if;
  end if;
  return false;
end;
$$;

grant execute on function public.request_password_help(text, text) to anon, authenticated, service_role;
