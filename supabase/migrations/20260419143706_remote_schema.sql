drop extension if exists "pg_net";


  create table "public"."customers" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null default auth.uid(),
    "name" text not null,
    "phone" text,
    "created_at" timestamp with time zone default now(),
    "address" text
      );


alter table "public"."customers" enable row level security;


  create table "public"."product_batches" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null default auth.uid(),
    "product_id" uuid not null,
    "buy_price" numeric not null,
    "sell_price" numeric not null,
    "quantity" bigint not null,
    "remaining_qty" bigint not null,
    "created_at" timestamp with time zone default now(),
    "batch_name" text
      );


alter table "public"."product_batches" enable row level security;


  create table "public"."products" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null default auth.uid(),
    "name" text not null,
    "size" text not null,
    "low_stock_threshold" bigint default 10,
    "last_used_batch_id" uuid,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."products" enable row level security;


  create table "public"."sale_edit_logs" (
    "id" uuid not null default gen_random_uuid(),
    "sale_id" uuid,
    "user_id" uuid not null default auth.uid(),
    "action" text,
    "product_id" uuid,
    "batch_id" uuid,
    "old_qty" integer,
    "new_qty" integer,
    "old_price" numeric,
    "new_price" numeric,
    "old_total" numeric,
    "new_total" numeric,
    "note" text,
    "created_at" timestamp without time zone default now()
      );


alter table "public"."sale_edit_logs" enable row level security;


  create table "public"."sale_items" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null default auth.uid(),
    "sale_id" uuid not null,
    "product_id" uuid not null,
    "batch_id" uuid not null,
    "qty" bigint not null,
    "sell_price" numeric not null,
    "buy_price" numeric not null,
    "created_at" timestamp with time zone default now(),
    "profit" numeric default 0
      );


alter table "public"."sale_items" enable row level security;


  create table "public"."sales" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null default auth.uid(),
    "customer_id" uuid,
    "total_amount" numeric not null,
    "discount" numeric default 0,
    "final_amount" numeric not null,
    "paid_amount" numeric default 0,
    "due_amount" numeric default 0,
    "payment_status" text,
    "total_profit" numeric default 0,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."sales" enable row level security;


  create table "public"."stock_entries" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null default auth.uid(),
    "product_id" uuid not null,
    "batch_id" uuid not null,
    "qty_added" bigint not null,
    "note" text,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."stock_entries" enable row level security;

CREATE UNIQUE INDEX customers_pkey ON public.customers USING btree (id);

CREATE INDEX idx_batches_user ON public.product_batches USING btree (user_id);

CREATE INDEX idx_customers_user ON public.customers USING btree (user_id);

CREATE INDEX idx_products_user ON public.products USING btree (user_id);

CREATE INDEX idx_sale_items_user ON public.sale_items USING btree (user_id);

CREATE INDEX idx_sales_user ON public.sales USING btree (user_id);

CREATE UNIQUE INDEX product_batches_pkey ON public.product_batches USING btree (id);

CREATE UNIQUE INDEX products_pkey ON public.products USING btree (id);

CREATE UNIQUE INDEX products_user_id_name_size_key ON public.products USING btree (user_id, name, size);

CREATE UNIQUE INDEX sale_edit_logs_pkey ON public.sale_edit_logs USING btree (id);

CREATE UNIQUE INDEX sale_items_pkey ON public.sale_items USING btree (id);

CREATE UNIQUE INDEX sales_pkey ON public.sales USING btree (id);

CREATE UNIQUE INDEX stock_entries_pkey ON public.stock_entries USING btree (id);

CREATE UNIQUE INDEX unique_batch_per_product ON public.product_batches USING btree (user_id, product_id, batch_name);

alter table "public"."customers" add constraint "customers_pkey" PRIMARY KEY using index "customers_pkey";

alter table "public"."product_batches" add constraint "product_batches_pkey" PRIMARY KEY using index "product_batches_pkey";

alter table "public"."products" add constraint "products_pkey" PRIMARY KEY using index "products_pkey";

alter table "public"."sale_edit_logs" add constraint "sale_edit_logs_pkey" PRIMARY KEY using index "sale_edit_logs_pkey";

alter table "public"."sale_items" add constraint "sale_items_pkey" PRIMARY KEY using index "sale_items_pkey";

alter table "public"."sales" add constraint "sales_pkey" PRIMARY KEY using index "sales_pkey";

alter table "public"."stock_entries" add constraint "stock_entries_pkey" PRIMARY KEY using index "stock_entries_pkey";

alter table "public"."customers" add constraint "customers_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."customers" validate constraint "customers_user_id_fkey";

alter table "public"."product_batches" add constraint "product_batches_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE not valid;

alter table "public"."product_batches" validate constraint "product_batches_product_id_fkey";

alter table "public"."product_batches" add constraint "product_batches_remaining_qty_check" CHECK ((remaining_qty >= 0)) not valid;

alter table "public"."product_batches" validate constraint "product_batches_remaining_qty_check";

alter table "public"."product_batches" add constraint "product_batches_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."product_batches" validate constraint "product_batches_user_id_fkey";

alter table "public"."product_batches" add constraint "unique_batch_per_product" UNIQUE using index "unique_batch_per_product";

alter table "public"."products" add constraint "products_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."products" validate constraint "products_user_id_fkey";

alter table "public"."products" add constraint "products_user_id_name_size_key" UNIQUE using index "products_user_id_name_size_key";

alter table "public"."sale_items" add constraint "sale_items_batch_id_fkey" FOREIGN KEY (batch_id) REFERENCES public.product_batches(id) ON DELETE CASCADE not valid;

alter table "public"."sale_items" validate constraint "sale_items_batch_id_fkey";

alter table "public"."sale_items" add constraint "sale_items_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE not valid;

alter table "public"."sale_items" validate constraint "sale_items_product_id_fkey";

alter table "public"."sale_items" add constraint "sale_items_sale_id_fkey" FOREIGN KEY (sale_id) REFERENCES public.sales(id) ON DELETE CASCADE not valid;

alter table "public"."sale_items" validate constraint "sale_items_sale_id_fkey";

alter table "public"."sale_items" add constraint "sale_items_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."sale_items" validate constraint "sale_items_user_id_fkey";

alter table "public"."sales" add constraint "sales_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL not valid;

alter table "public"."sales" validate constraint "sales_customer_id_fkey";

alter table "public"."sales" add constraint "sales_payment_status_check" CHECK ((payment_status = ANY (ARRAY['PAID'::text, 'PARTIAL'::text, 'DUE'::text]))) not valid;

alter table "public"."sales" validate constraint "sales_payment_status_check";

alter table "public"."sales" add constraint "sales_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."sales" validate constraint "sales_user_id_fkey";

alter table "public"."stock_entries" add constraint "fk_batch" FOREIGN KEY (batch_id) REFERENCES public.product_batches(id) ON DELETE CASCADE not valid;

alter table "public"."stock_entries" validate constraint "fk_batch";

alter table "public"."stock_entries" add constraint "fk_product" FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE not valid;

alter table "public"."stock_entries" validate constraint "fk_product";

alter table "public"."stock_entries" add constraint "stock_entries_batch_id_fkey" FOREIGN KEY (batch_id) REFERENCES public.product_batches(id) ON DELETE CASCADE not valid;

alter table "public"."stock_entries" validate constraint "stock_entries_batch_id_fkey";

alter table "public"."stock_entries" add constraint "stock_entries_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE not valid;

alter table "public"."stock_entries" validate constraint "stock_entries_product_id_fkey";

alter table "public"."stock_entries" add constraint "stock_entries_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."stock_entries" validate constraint "stock_entries_user_id_fkey";

grant delete on table "public"."customers" to "anon";

grant insert on table "public"."customers" to "anon";

grant references on table "public"."customers" to "anon";

grant select on table "public"."customers" to "anon";

grant trigger on table "public"."customers" to "anon";

grant truncate on table "public"."customers" to "anon";

grant update on table "public"."customers" to "anon";

grant delete on table "public"."customers" to "authenticated";

grant insert on table "public"."customers" to "authenticated";

grant references on table "public"."customers" to "authenticated";

grant select on table "public"."customers" to "authenticated";

grant trigger on table "public"."customers" to "authenticated";

grant truncate on table "public"."customers" to "authenticated";

grant update on table "public"."customers" to "authenticated";

grant delete on table "public"."customers" to "service_role";

grant insert on table "public"."customers" to "service_role";

grant references on table "public"."customers" to "service_role";

grant select on table "public"."customers" to "service_role";

grant trigger on table "public"."customers" to "service_role";

grant truncate on table "public"."customers" to "service_role";

grant update on table "public"."customers" to "service_role";

grant delete on table "public"."product_batches" to "anon";

grant insert on table "public"."product_batches" to "anon";

grant references on table "public"."product_batches" to "anon";

grant select on table "public"."product_batches" to "anon";

grant trigger on table "public"."product_batches" to "anon";

grant truncate on table "public"."product_batches" to "anon";

grant update on table "public"."product_batches" to "anon";

grant delete on table "public"."product_batches" to "authenticated";

grant insert on table "public"."product_batches" to "authenticated";

grant references on table "public"."product_batches" to "authenticated";

grant select on table "public"."product_batches" to "authenticated";

grant trigger on table "public"."product_batches" to "authenticated";

grant truncate on table "public"."product_batches" to "authenticated";

grant update on table "public"."product_batches" to "authenticated";

grant delete on table "public"."product_batches" to "service_role";

grant insert on table "public"."product_batches" to "service_role";

grant references on table "public"."product_batches" to "service_role";

grant select on table "public"."product_batches" to "service_role";

grant trigger on table "public"."product_batches" to "service_role";

grant truncate on table "public"."product_batches" to "service_role";

grant update on table "public"."product_batches" to "service_role";

grant delete on table "public"."products" to "anon";

grant insert on table "public"."products" to "anon";

grant references on table "public"."products" to "anon";

grant select on table "public"."products" to "anon";

grant trigger on table "public"."products" to "anon";

grant truncate on table "public"."products" to "anon";

grant update on table "public"."products" to "anon";

grant delete on table "public"."products" to "authenticated";

grant insert on table "public"."products" to "authenticated";

grant references on table "public"."products" to "authenticated";

grant select on table "public"."products" to "authenticated";

grant trigger on table "public"."products" to "authenticated";

grant truncate on table "public"."products" to "authenticated";

grant update on table "public"."products" to "authenticated";

grant delete on table "public"."products" to "service_role";

grant insert on table "public"."products" to "service_role";

grant references on table "public"."products" to "service_role";

grant select on table "public"."products" to "service_role";

grant trigger on table "public"."products" to "service_role";

grant truncate on table "public"."products" to "service_role";

grant update on table "public"."products" to "service_role";

grant delete on table "public"."sale_edit_logs" to "anon";

grant insert on table "public"."sale_edit_logs" to "anon";

grant references on table "public"."sale_edit_logs" to "anon";

grant select on table "public"."sale_edit_logs" to "anon";

grant trigger on table "public"."sale_edit_logs" to "anon";

grant truncate on table "public"."sale_edit_logs" to "anon";

grant update on table "public"."sale_edit_logs" to "anon";

grant delete on table "public"."sale_edit_logs" to "authenticated";

grant insert on table "public"."sale_edit_logs" to "authenticated";

grant references on table "public"."sale_edit_logs" to "authenticated";

grant select on table "public"."sale_edit_logs" to "authenticated";

grant trigger on table "public"."sale_edit_logs" to "authenticated";

grant truncate on table "public"."sale_edit_logs" to "authenticated";

grant update on table "public"."sale_edit_logs" to "authenticated";

grant delete on table "public"."sale_edit_logs" to "service_role";

grant insert on table "public"."sale_edit_logs" to "service_role";

grant references on table "public"."sale_edit_logs" to "service_role";

grant select on table "public"."sale_edit_logs" to "service_role";

grant trigger on table "public"."sale_edit_logs" to "service_role";

grant truncate on table "public"."sale_edit_logs" to "service_role";

grant update on table "public"."sale_edit_logs" to "service_role";

grant delete on table "public"."sale_items" to "anon";

grant insert on table "public"."sale_items" to "anon";

grant references on table "public"."sale_items" to "anon";

grant select on table "public"."sale_items" to "anon";

grant trigger on table "public"."sale_items" to "anon";

grant truncate on table "public"."sale_items" to "anon";

grant update on table "public"."sale_items" to "anon";

grant delete on table "public"."sale_items" to "authenticated";

grant insert on table "public"."sale_items" to "authenticated";

grant references on table "public"."sale_items" to "authenticated";

grant select on table "public"."sale_items" to "authenticated";

grant trigger on table "public"."sale_items" to "authenticated";

grant truncate on table "public"."sale_items" to "authenticated";

grant update on table "public"."sale_items" to "authenticated";

grant delete on table "public"."sale_items" to "service_role";

grant insert on table "public"."sale_items" to "service_role";

grant references on table "public"."sale_items" to "service_role";

grant select on table "public"."sale_items" to "service_role";

grant trigger on table "public"."sale_items" to "service_role";

grant truncate on table "public"."sale_items" to "service_role";

grant update on table "public"."sale_items" to "service_role";

grant delete on table "public"."sales" to "anon";

grant insert on table "public"."sales" to "anon";

grant references on table "public"."sales" to "anon";

grant select on table "public"."sales" to "anon";

grant trigger on table "public"."sales" to "anon";

grant truncate on table "public"."sales" to "anon";

grant update on table "public"."sales" to "anon";

grant delete on table "public"."sales" to "authenticated";

grant insert on table "public"."sales" to "authenticated";

grant references on table "public"."sales" to "authenticated";

grant select on table "public"."sales" to "authenticated";

grant trigger on table "public"."sales" to "authenticated";

grant truncate on table "public"."sales" to "authenticated";

grant update on table "public"."sales" to "authenticated";

grant delete on table "public"."sales" to "service_role";

grant insert on table "public"."sales" to "service_role";

grant references on table "public"."sales" to "service_role";

grant select on table "public"."sales" to "service_role";

grant trigger on table "public"."sales" to "service_role";

grant truncate on table "public"."sales" to "service_role";

grant update on table "public"."sales" to "service_role";

grant delete on table "public"."stock_entries" to "anon";

grant insert on table "public"."stock_entries" to "anon";

grant references on table "public"."stock_entries" to "anon";

grant select on table "public"."stock_entries" to "anon";

grant trigger on table "public"."stock_entries" to "anon";

grant truncate on table "public"."stock_entries" to "anon";

grant update on table "public"."stock_entries" to "anon";

grant delete on table "public"."stock_entries" to "authenticated";

grant insert on table "public"."stock_entries" to "authenticated";

grant references on table "public"."stock_entries" to "authenticated";

grant select on table "public"."stock_entries" to "authenticated";

grant trigger on table "public"."stock_entries" to "authenticated";

grant truncate on table "public"."stock_entries" to "authenticated";

grant update on table "public"."stock_entries" to "authenticated";

grant delete on table "public"."stock_entries" to "service_role";

grant insert on table "public"."stock_entries" to "service_role";

grant references on table "public"."stock_entries" to "service_role";

grant select on table "public"."stock_entries" to "service_role";

grant trigger on table "public"."stock_entries" to "service_role";

grant truncate on table "public"."stock_entries" to "service_role";

grant update on table "public"."stock_entries" to "service_role";


  create policy "customers owner access"
  on "public"."customers"
  as permissive
  for all
  to public
using ((user_id = auth.uid()))
with check ((user_id = auth.uid()));



  create policy "customers_owner"
  on "public"."customers"
  as permissive
  for all
  to public
using ((user_id = auth.uid()))
with check ((user_id = auth.uid()));



  create policy "batches owner access"
  on "public"."product_batches"
  as permissive
  for all
  to public
using ((user_id = auth.uid()))
with check ((user_id = auth.uid()));



  create policy "product_batches_owner"
  on "public"."product_batches"
  as permissive
  for all
  to public
using ((user_id = auth.uid()))
with check ((user_id = auth.uid()));



  create policy "products owner access"
  on "public"."products"
  as permissive
  for all
  to public
using ((user_id = auth.uid()))
with check ((user_id = auth.uid()));



  create policy "products_owner"
  on "public"."products"
  as permissive
  for all
  to public
using ((user_id = auth.uid()))
with check ((user_id = auth.uid()));



  create policy "delete_own_logs"
  on "public"."sale_edit_logs"
  as permissive
  for delete
  to public
using ((user_id = auth.uid()));



  create policy "insert_own_logs"
  on "public"."sale_edit_logs"
  as permissive
  for insert
  to public
with check ((user_id = auth.uid()));



  create policy "sale_edit_logs_owner"
  on "public"."sale_edit_logs"
  as permissive
  for all
  to public
using ((user_id = auth.uid()))
with check ((user_id = auth.uid()));



  create policy "select_own_logs"
  on "public"."sale_edit_logs"
  as permissive
  for select
  to public
using ((user_id = auth.uid()));



  create policy "update_own_logs"
  on "public"."sale_edit_logs"
  as permissive
  for update
  to public
using ((user_id = auth.uid()))
with check ((user_id = auth.uid()));



  create policy "sale_items owner access"
  on "public"."sale_items"
  as permissive
  for all
  to public
using ((user_id = auth.uid()))
with check ((user_id = auth.uid()));



  create policy "sale_items_owner"
  on "public"."sale_items"
  as permissive
  for all
  to public
using ((user_id = auth.uid()))
with check ((user_id = auth.uid()));



  create policy "sales owner access"
  on "public"."sales"
  as permissive
  for all
  to public
using ((user_id = auth.uid()))
with check ((user_id = auth.uid()));



  create policy "sales_owner"
  on "public"."sales"
  as permissive
  for all
  to public
using ((user_id = auth.uid()))
with check ((user_id = auth.uid()));



  create policy "stock owner access"
  on "public"."stock_entries"
  as permissive
  for all
  to public
using ((user_id = auth.uid()))
with check ((user_id = auth.uid()));



  create policy "stock_entries_owner"
  on "public"."stock_entries"
  as permissive
  for all
  to public
using ((user_id = auth.uid()))
with check ((user_id = auth.uid()));



