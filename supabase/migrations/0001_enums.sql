-- Enumerations shared across the gia pha schema (data-model.md "Enumerations")

create type person_gender as enum ('male', 'female', 'unknown');
create type date_precision as enum ('day', 'month', 'year', 'unknown');
create type relationship_type as enum ('parent_child', 'spouse', 'sibling');
create type user_role as enum ('admin', 'editor', 'viewer');
create type import_row_status as enum ('succeeded', 'failed', 'duplicate');
