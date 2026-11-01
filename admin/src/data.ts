import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';

// Ressources servies par des routes dédiées ; toutes les autres passent par /r/<ressource> (CRUD générique).
const DEDICATED = new Set(['users', 'audit', 'access-log', 'releases', 'admins']);
const base = (resource: string) => (DEDICATED.has(resource) ? `/${resource}` : `/r/${resource}`);
const withId = (row: any) => ({ ...row, id: row.id ?? row.code ?? row.key });

export type Sort = { field: string; order: 'ASC' | 'DESC' };
export type ListParams = { page: number; perPage: number; sort: Sort; filter?: Record<string, any> };

async function fetchList(resource: string, { page, perPage, sort, filter }: ListParams) {
  const from = (page - 1) * perPage;
  const qs = new URLSearchParams({
    range: JSON.stringify([from, from + perPage - 1]),
    sort: JSON.stringify([sort.field, sort.order]),
    filter: JSON.stringify(filter || {}),
  });
  const { json, headers } = await api<any[]>(`${base(resource)}?${qs}`);
  const range = headers.get('Content-Range') || '';
  const total = Number(range.split('/')[1]);
  return { data: (json || []).map(withId), total: Number.isFinite(total) ? total : (json || []).length };
}

export function useResourceList(resource: string, params: ListParams, enabled = true) {
  return useQuery({
    queryKey: ['list', resource, params],
    queryFn: () => fetchList(resource, params),
    enabled,
    placeholderData: (prev) => prev,
  });
}

export function useResourceOne(resource: string, id?: string | number) {
  return useQuery({
    queryKey: ['one', resource, id],
    queryFn: async () => withId((await api(`${base(resource)}/${encodeURIComponent(String(id))}`)).json),
    enabled: id !== undefined && id !== null,
  });
}

export function invalidateResource(qc: QueryClient, resource: string, id?: string | number) {
  qc.invalidateQueries({ queryKey: ['list', resource] });
  qc.invalidateQueries({ queryKey: ['counts', resource] });
  qc.invalidateQueries({ queryKey: ['work-queue'] });
  if (resource === 'species') qc.invalidateQueries({ queryKey: ['species-usage'] });
  if (resource === 'plans') qc.invalidateQueries({ queryKey: ['plan-catalog'] });
  if (id !== undefined) {
    qc.invalidateQueries({ queryKey: ['one', resource, id] });
    qc.invalidateQueries({ queryKey: ['record-history', resource, id] });
  }
}

export function useCreate(resource: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => withId((await api(base(resource), { method: 'POST', body: data })).json),
    onSuccess: () => invalidateResource(qc, resource),
  });
}

export function useUpdate(resource: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string | number; data: any }) =>
      withId((await api(`${base(resource)}/${encodeURIComponent(String(id))}`, { method: 'PUT', body: data })).json),
    onSuccess: (_data, vars) => invalidateResource(qc, resource, vars.id),
  });
}

export function useUpdateMany(resource: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, data }: { ids: (string | number)[]; data: any }) => {
      for (const id of ids) await api(`${base(resource)}/${encodeURIComponent(String(id))}`, { method: 'PUT', body: data });
      return ids;
    },
    // A later row can fail after earlier rows succeeded; counts must still refresh.
    onSettled: () => invalidateResource(qc, resource),
  });
}

export function useDeleteOne(resource: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string | number; reason?: string }) => {
      await api(`${base(resource)}/${encodeURIComponent(String(id))}`, { method: 'DELETE', body: { reason: reason || 'Suppression depuis le backoffice' } });
      return id;
    },
    onSuccess: () => invalidateResource(qc, resource),
  });
}

export function useStatusCounts(resource: string, filter: Record<string, any>, enabled = true) {
  const otherFilters = { ...filter }; delete otherFilters.status;
  return useQuery<{ total: number; counts: Record<string, number> }>({
    queryKey: ['counts', resource, otherFilters], enabled,
    queryFn: async () => (await api(`/r/${resource}/counts?${new URLSearchParams({ filter: JSON.stringify(otherFilters) })}`)).json,
  });
}
