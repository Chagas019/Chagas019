/**
 * Tipos do banco (subconjunto usado pela aplicação), espelhando supabase/migrations.
 * Para regenerar automaticamente: `npx supabase gen types typescript --local > src/types/database.generated.ts`.
 */
export type Locale = "pt-BR" | "en" | "es";
export type ProfileVisibility = "public" | "members" | "private";
export type MessagePermission = "everyone" | "verified_communities" | "nobody";
export type AvailabilitySlot = "weekdays" | "weekends" | "evenings" | "flexible";
export type SkillLevel = "beginner" | "intermediate" | "expert";
export type CommunityKind = "parish" | "community" | "movement" | "diocese" | "religious_order" | "other";
export type CommunityStatus = "pending" | "verified" | "rejected" | "suspended";
export type MemberRole = "owner" | "admin" | "member";
export type VerificationStatus = "pending" | "approved" | "rejected";
export type OpportunityMode = "onsite" | "remote" | "hybrid";
export type OpportunityStatus = "draft" | "open" | "closed" | "cancelled";
export type ApplicationStatus = "pending" | "accepted" | "rejected" | "withdrawn" | "completed";
export type ReportTarget = "profile" | "community" | "opportunity" | "message" | "resource" | "review";

export type LocalizedNames = { "pt-BR": string; en?: string; es?: string };

export interface Profile {
  id: string;
  username: string | null;
  display_name: string;
  bio: string;
  avatar_url: string | null;
  country_code: string | null;
  city: string | null;
  languages: string[];
  availability: AvailabilitySlot[];
  hours_per_week: number | null;
  service_modes: OpportunityMode[];
  visibility: ProfileVisibility;
  message_permission: MessagePermission;
  preferred_locale: Locale;
  onboarded_at: string | null;
  terms_accepted_at: string | null;
  privacy_accepted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfilePrivate {
  user_id: string;
  phone: string | null;
  contact_email: string | null;
  marketing_opt_in: boolean;
}

export interface SkillCategory { id: number; slug: string; names: LocalizedNames; icon: string; sort_order: number }
export interface Skill { id: number; category_id: number; slug: string; names: LocalizedNames }

export interface PortfolioItem { id: string; profile_id: string; title: string; description: string; url: string | null; created_at: string }

export interface Community {
  id: string;
  slug: string;
  name: string;
  kind: CommunityKind;
  description: string;
  country_code: string;
  city: string;
  diocese: string | null;
  website: string | null;
  logo_url: string | null;
  languages: string[];
  focus_categories: number[];
  needs: string;
  status: CommunityStatus;
  verified_at: string | null;
  created_by: string;
  created_at: string;
}

export interface CommunityVerification {
  id: string;
  community_id: string;
  requested_by: string;
  evidence: string;
  status: VerificationStatus;
  review_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
}

export interface Opportunity {
  id: string;
  community_id: string;
  created_by: string;
  title: string;
  description: string;
  mode: OpportunityMode;
  status: OpportunityStatus;
  country_code: string | null;
  city: string | null;
  languages: string[];
  availability: AvailabilitySlot[];
  slots: number | null;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
}

export interface Application {
  id: string;
  opportunity_id: string;
  applicant_id: string;
  message: string;
  status: ApplicationStatus;
  created_at: string;
  decided_at: string | null;
  completed_at: string | null;
}

export interface Notification {
  id: string;
  kind: string;
  payload: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

export interface VolunteerSearchRow {
  id: string;
  username: string | null;
  display_name: string;
  bio: string;
  avatar_url: string | null;
  country_code: string | null;
  city: string | null;
  languages: string[];
  availability: AvailabilitySlot[];
  service_modes: OpportunityMode[];
  skill_names: LocalizedNames[];
}
