import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

export function useCreate(resource: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => withId((await api(base(resource), { method: 'POST', body: data })).json),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['list', resource] }),
  });
}

export function useUpdate(resource: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string | number; data: any }) =>
      withId((await api(`${base(resource)}/${encodeURIComponent(String(id))}`, { method: 'PUT', body: data })).json),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['list', resource] });
      qc.invalidateQueries({ queryKey: ['one', resource, vars.id] });
    },
  });
}

export function useUpdateMany(resource: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, data }: { ids: (string | number)[]; data: any }) => {
      for (const id of ids) await api(`${base(resource)}/${encodeURIComponent(String(id))}`, { method: 'PUT', body: data });
      return ids;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['list', resource] }),
  });
}

// Le motif est journalisé (obligatoire pour certaines ressources) : `reason` sinon un motif générique.
export function useDeleteOne(resource: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string | number; reason?: string }) => {
      await api(`${base(resource)}/${encodeURIComponent(String(id))}`, { method: 'DELETE', body: { reason: reason || 'Suppression depuis le backoffice' } });
      return id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['list', resource] }),
  });
}
