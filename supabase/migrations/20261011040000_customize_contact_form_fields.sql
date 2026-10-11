alter table public.contact_submissions
  alter column name drop not null,
  alter column phone_number drop not null,
  alter column email drop not null,
  alter column details drop not null;

alter table public.contact_submissions
  drop constraint if exists contact_submissions_name_check,
  drop constraint if exists contact_submissions_phone_number_check,
  drop constraint if exists contact_submissions_email_check,
  drop constraint if exists contact_submissions_details_check;

alter table public.contact_submissions
  add constraint contact_submissions_name_check
    check (name is null or char_length(btrim(name)) between 1 and 120),
  add constraint contact_submissions_phone_number_check
    check (phone_number is null or char_length(btrim(phone_number)) between 7 and 30),
  add constraint contact_submissions_email_check
    check (email is null or (char_length(btrim(email)) between 3 and 254 and position('@' in email) > 1)),
  add constraint contact_submissions_details_check
    check (details is null or char_length(btrim(details)) between 1 and 5000);

alter table public.contact_submissions
  add column if not exists responses jsonb not null default '[]'::jsonb;
