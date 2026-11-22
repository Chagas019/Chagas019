import { getContent } from '@/services/content';
import { getBySlug, listAll, listPublished } from '@/services/properties';
import { listLeads } from '@/services/leads';
import { useQuery } from '@/services/query';

export const useProperties = () => useQuery('properties:published', listPublished);
export const useProperty = (slug: string | undefined) => useQuery(slug ? `properties:slug:${slug}` : null, () => getBySlug(slug!));
export const useAllProperties = () => useQuery('properties:all', listAll);
export const useContent = () => useQuery('content', getContent);
export const useLeads = () => useQuery('leads', listLeads);
