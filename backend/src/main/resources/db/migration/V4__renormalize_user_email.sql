-- Старые аккаунты могли остаться с пустым или устаревшим normalized_email,
-- тогда вход по email (без учёта регистра) их не находил. Пересчитываем из email.
UPDATE public.users
SET normalized_email = lower(trim(email))
WHERE email IS NOT NULL
  AND normalized_email IS DISTINCT FROM lower(trim(email));
