-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.budget_alerts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  budget_id uuid NOT NULL,
  current_spent numeric NOT NULL,
  budget_amount numeric NOT NULL,
  percentage_used numeric NOT NULL CHECK (percentage_used >= 0::numeric AND percentage_used <= 100::numeric),
  alert_type character varying NOT NULL CHECK (alert_type::text = ANY (ARRAY['threshold'::character varying, 'exceeded'::character varying, 'warning'::character varying]::text[])),
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT budget_alerts_pkey PRIMARY KEY (id),
  CONSTRAINT budget_alerts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT budget_alerts_budget_id_fkey FOREIGN KEY (budget_id) REFERENCES public.budgets(id)
);
CREATE TABLE public.budgets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category_id uuid NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0::numeric),
  period_type character varying NOT NULL CHECK (period_type::text = ANY (ARRAY['mensual'::character varying, 'semanal'::character varying, 'anual'::character varying]::text[])),
  period_start date NOT NULL,
  period_end date NOT NULL,
  alert_threshold numeric DEFAULT 80.00 CHECK (alert_threshold >= 0::numeric AND alert_threshold <= 100::numeric),
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT budgets_pkey PRIMARY KEY (id),
  CONSTRAINT budgets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT budgets_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id)
);
CREATE TABLE public.categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  icon character varying,
  color character varying CHECK (color IS NULL OR validate_hex_color(color)),
  is_system boolean DEFAULT false,
  user_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT categories_pkey PRIMARY KEY (id),
  CONSTRAINT categories_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.categorization_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category_id uuid NOT NULL,
  rule_type character varying NOT NULL CHECK (rule_type::text = ANY (ARRAY['contains'::character varying, 'starts_with'::character varying, 'ends_with'::character varying, 'regex'::character varying, 'exact_match'::character varying]::text[])),
  pattern text NOT NULL,
  is_case_sensitive boolean DEFAULT false,
  priority integer DEFAULT 100 CHECK (priority >= 0),
  is_active boolean DEFAULT true,
  match_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT categorization_rules_pkey PRIMARY KEY (id),
  CONSTRAINT categorization_rules_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT categorization_rules_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id)
);
CREATE TABLE public.transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  amount numeric NOT NULL CHECK (amount <> 0::numeric),
  description text NOT NULL,
  date timestamp with time zone NOT NULL,
  category text,
  bank text NOT NULL,
  source character varying NOT NULL DEFAULT 'BBVA'::character varying CHECK (source::text = ANY (ARRAY['Mercado Pago'::character varying, 'NU'::character varying, 'Plata Card'::character varying, 'BBVA'::character varying]::text[])),
  transaction_type character varying DEFAULT 'compra'::character varying CHECK (transaction_type::text = ANY (ARRAY['compra'::character varying, 'ingreso'::character varying, 'transferencia'::character varying, 'retiro'::character varying, 'otro'::character varying]::text[])),
  email_id character varying,
  email_subject text,
  needs_categorization boolean DEFAULT false,
  expense_detail text,
  created_at timestamp with time zone DEFAULT now(),
  processed_at timestamp with time zone DEFAULT now(),
  user_id uuid NOT NULL,
  category_id uuid,
  CONSTRAINT transactions_pkey PRIMARY KEY (id),
  CONSTRAINT transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT transactions_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id)
);