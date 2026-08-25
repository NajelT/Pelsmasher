CREATE TABLE public.auth_tokens (
    id character varying(255) NOT NULL,
    created_at timestamp(6) with time zone NOT NULL,
    expires_at timestamp(6) with time zone NOT NULL,
    revoked boolean NOT NULL,
    token_hash character varying(255) NOT NULL,
    user_id character varying(255) NOT NULL
);

CREATE TABLE public.exercises (
    id character varying(255) NOT NULL,
    archived boolean NOT NULL,
    created_at timestamp(6) with time zone NOT NULL,
    name character varying(255) NOT NULL,
    normalized_name character varying(255) NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL,
    user_id character varying(255)
);

CREATE TABLE public.logged_sets (
    id character varying(255) NOT NULL,
    exercise_id character varying(255) NOT NULL,
    exercise_name character varying(255) NOT NULL,
    performed_at timestamp(6) with time zone NOT NULL,
    reps integer NOT NULL,
    set_number integer NOT NULL,
    weight numeric(6,2) NOT NULL,
    workout_session_id character varying(255) NOT NULL
);

CREATE TABLE public.muscle_groups (
    id character varying(255) NOT NULL,
    archived boolean NOT NULL,
    created_at timestamp(6) with time zone NOT NULL,
    image_src character varying(255),
    muscle_key character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    preset boolean NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL,
    user_id character varying(255),
    CONSTRAINT muscle_groups_muscle_key_check CHECK (((muscle_key)::text = ANY ((ARRAY['CHEST'::character varying, 'BACK'::character varying, 'SHOULDERS'::character varying, 'BICEPS'::character varying, 'TRICEPS'::character varying, 'FOREARMS'::character varying, 'LEGS'::character varying, 'CALVES'::character varying, 'ABS'::character varying, 'GLUTES'::character varying, 'CUSTOM'::character varying])::text[])))
);

CREATE TABLE public.training_option_exercises (
    id character varying(255) NOT NULL,
    "position" integer NOT NULL,
    exercise_id character varying(255) NOT NULL,
    training_option_id character varying(255) NOT NULL
);

CREATE TABLE public.training_options (
    id character varying(255) NOT NULL,
    archived boolean NOT NULL,
    created_at timestamp(6) with time zone NOT NULL,
    default_option boolean NOT NULL,
    muscle_group_id character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL,
    user_id character varying(255)
);

CREATE TABLE public.users (
    id character varying(255) NOT NULL,
    created_at timestamp(6) with time zone NOT NULL,
    display_name character varying(255) NOT NULL,
    email character varying(255),
    normalized_email character varying(255),
    password_hash character varying(255),
    updated_at timestamp(6) with time zone NOT NULL
);

CREATE TABLE public.workout_sessions (
    id character varying(255) NOT NULL,
    completed_at timestamp(6) with time zone NOT NULL,
    duration_seconds integer NOT NULL,
    muscle_group_id character varying(255) NOT NULL,
    started_at timestamp(6) with time zone NOT NULL,
    total_sets integer NOT NULL,
    training_option_id character varying(255) NOT NULL,
    training_option_name character varying(255) NOT NULL,
    user_id character varying(255)
);

ALTER TABLE ONLY public.auth_tokens
    ADD CONSTRAINT auth_tokens_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.exercises
    ADD CONSTRAINT exercises_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.logged_sets
    ADD CONSTRAINT logged_sets_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.muscle_groups
    ADD CONSTRAINT muscle_groups_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.training_option_exercises
    ADD CONSTRAINT training_option_exercises_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.training_options
    ADD CONSTRAINT training_options_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.auth_tokens
    ADD CONSTRAINT uk3wqaabxbp24ko89s7lkjxch2v UNIQUE (token_hash);

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.workout_sessions
    ADD CONSTRAINT workout_sessions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.logged_sets
    ADD CONSTRAINT fk1ke6ro53np26ncqlg74vbqcr7 FOREIGN KEY (workout_session_id) REFERENCES public.workout_sessions(id);

ALTER TABLE ONLY public.muscle_groups
    ADD CONSTRAINT fk25ihvd74labuqkyueatkk6bqw FOREIGN KEY (user_id) REFERENCES public.users(id);

ALTER TABLE ONLY public.training_options
    ADD CONSTRAINT fk6w81u0hkmokltm2ld3u8dxo76 FOREIGN KEY (user_id) REFERENCES public.users(id);

ALTER TABLE ONLY public.training_options
    ADD CONSTRAINT fk7caxq3420wf0s52ador5upyjx FOREIGN KEY (muscle_group_id) REFERENCES public.muscle_groups(id);

ALTER TABLE ONLY public.logged_sets
    ADD CONSTRAINT fk99vvjqoq1v8nutp6hxif5jfxh FOREIGN KEY (exercise_id) REFERENCES public.exercises(id);

ALTER TABLE ONLY public.workout_sessions
    ADD CONSTRAINT fkcvno9l846fnvaldyjqps96063 FOREIGN KEY (muscle_group_id) REFERENCES public.muscle_groups(id);

ALTER TABLE ONLY public.workout_sessions
    ADD CONSTRAINT fkfwqciawyjntpphp080wpa37ge FOREIGN KEY (user_id) REFERENCES public.users(id);

ALTER TABLE ONLY public.auth_tokens
    ADD CONSTRAINT fkkhs4tpy3l5krnk87ykkmafeic FOREIGN KEY (user_id) REFERENCES public.users(id);

ALTER TABLE ONLY public.exercises
    ADD CONSTRAINT fkkiftckymv693t6yxogsb50n4y FOREIGN KEY (user_id) REFERENCES public.users(id);

ALTER TABLE ONLY public.workout_sessions
    ADD CONSTRAINT fkllobifje2re044mokmkkgtxb FOREIGN KEY (training_option_id) REFERENCES public.training_options(id);

ALTER TABLE ONLY public.training_option_exercises
    ADD CONSTRAINT fkogrpw8a39rg74i5vtlrbfj60x FOREIGN KEY (training_option_id) REFERENCES public.training_options(id);

ALTER TABLE ONLY public.training_option_exercises
    ADD CONSTRAINT fks2hmlhtlc45haeyeehb7wx1i7 FOREIGN KEY (exercise_id) REFERENCES public.exercises(id);
