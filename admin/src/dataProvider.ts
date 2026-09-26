import type { DataProvider } from 'react-admin';
import { api } from './api';

// Ressources servies par des routes dédiées ; toutes les autres passent par /r/<ressource> (CRUD générique).
const DEDICATED = new Set(['users', 'audit', 'releases']);
const base = (resource: string) => (DEDICATED.has(resource) ? `/${resource}` : `/r/${resource}`);
const withId = (row: any) => ({ ...row, id: row.id ?? row.code ?? row.key });

export const dataProvider: DataProvider = {
  getList: async (resource, { pagination, sort, filter }) => {
    const { page, perPage } = pagination;
    const from = (page - 1) * perPage;
    const qs = new URLSearchParams({
      range: JSON.stringify([from, from + perPage - 1]),
      sort: JSON.stringify([sort.field, sort.order]),
      filter: JSON.stringify(filter || {}),
    });
    const { json, headers } = await api<any[]>(`${base(resource)}?${qs}`);
    const range = headers.get('Content-Range') || '';
    const total = Number(range.split('/')[1]);
    return { data: json.map(withId), total: Number.isFinite(total) ? total : json.length };
  },
  getOne: async (resource, { id }) => ({ data: withId((await api(`${base(resource)}/${encodeURIComponent(String(id))}`)).json) }),
  getMany: async (resource, { ids }) => ({ data: (await Promise.all(ids.map((id) => api(`${base(resource)}/${encodeURIComponent(String(id))}`)))).map((r) => withId(r.json)) }),
  getManyReference: async () => ({ data: [], total: 0 }),
  create: async (resource, { data }) => ({ data: withId((await api(base(resource), { method: 'POST', body: data })).json) }),
  update: async (resource, { id, data }) => ({ data: withId((await api(`${base(resource)}/${encodeURIComponent(String(id))}`, { method: 'PUT', body: data })).json) }),
  updateMany: async () => ({ data: [] }),
  // Le motif est journalisé (obligatoire pour certaines ressources) : `meta.reason` sinon un motif générique.
  delete: async (resource, { id, meta }) => {
    await api(`${base(resource)}/${encodeURIComponent(String(id))}`, { method: 'DELETE', body: { reason: meta?.reason || 'Suppression depuis le backoffice' } });
    return { data: { id } as any };
  },
  deleteMany: async (resource, { ids, meta }) => {
    for (const id of ids) await api(`${base(resource)}/${encodeURIComponent(String(id))}`, { method: 'DELETE', body: { reason: meta?.reason || 'Suppression depuis le backoffice' } });
    return { data: ids };
  },
};
