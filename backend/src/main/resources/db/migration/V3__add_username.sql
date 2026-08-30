ALTER TABLE public.users RENAME COLUMN display_name TO username;

ALTER TABLE public.users ADD COLUMN normalized_username character varying(255);
UPDATE public.users SET normalized_username = lower(username);
ALTER TABLE public.users ALTER COLUMN normalized_username SET NOT NULL;

CREATE UNIQUE INDEX users_normalized_username_key ON public.users (normalized_username);
