-- KOINONIA — 0001: extensões e tipos enumerados
-- Convenção: tudo em public, com RLS obrigatório em todas as tabelas.

create extension if not exists pgcrypto;
create extension if not exists citext;
create extension if not exists pg_trgm;

create type public.platform_role as enum ('moderator', 'admin');
create type public.profile_visibility as enum ('public', 'members', 'private');
create type public.message_permission as enum ('everyone', 'verified_communities', 'nobody');
create type public.availability_slot as enum ('weekdays', 'weekends', 'evenings', 'flexible');
create type public.skill_level as enum ('beginner', 'intermediate', 'expert');

create type public.community_kind as enum ('parish', 'community', 'movement', 'diocese', 'religious_order', 'other');
create type public.community_status as enum ('pending', 'verified', 'rejected', 'suspended');
create type public.member_role as enum ('owner', 'admin', 'member');
create type public.verification_status as enum ('pending', 'approved', 'rejected');

create type public.opportunity_mode as enum ('onsite', 'remote', 'hybrid');
create type public.opportunity_status as enum ('draft', 'open', 'closed', 'cancelled');
create type public.application_status as enum ('pending', 'accepted', 'rejected', 'withdrawn', 'completed');

create type public.resource_kind as enum ('equipment', 'material', 'space', 'other');
create type public.resource_status as enum ('available', 'unavailable');
create type public.resource_request_status as enum ('pending', 'approved', 'declined', 'returned', 'cancelled');

create type public.report_target as enum ('profile', 'community', 'opportunity', 'message', 'resource', 'review');
create type public.report_status as enum ('open', 'reviewing', 'resolved', 'dismissed');
