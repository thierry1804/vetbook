import { useEffect, useRef } from 'react';
import { useBlocker, useLocation, useSearchParams } from 'react-router-dom';
import { Button, Modal } from 'antd';
import type { Sort } from './data';

// Keep the current list URL for returns from a record, including filters and pagination.
export function useListReturn(path: string) {
  const location = useLocation();
  useEffect(() => {
    if (path && location.pathname === path) sessionStorage.setItem(`admin-list:${path}`, location.search);
  }, [location.pathname, location.search, path]);
  return path + (sessionStorage.getItem(`admin-list:${path}`) || '');
}

export function useListState(defaultSort: Sort, prefix = '') {
  const [params, setParams] = useSearchParams();
  const read = (key: string) => { try { return JSON.parse(params.get(prefix + key) || 'null'); } catch { return null; } };
  const rawPage = read('page');
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const rawSize = read('size');
  const pageSize = [25, 50, 100].includes(rawSize) ? rawSize : 25;
  const rawSort = read('sort');
  const sort: Sort = rawSort && typeof rawSort.field === 'string' && ['ASC', 'DESC'].includes(rawSort.order) ? rawSort : defaultSort;
  const rawFilter = read('filter');
  const filter: Record<string, any> = rawFilter && typeof rawFilter === 'object' && !Array.isArray(rawFilter) ? rawFilter : {};
  // Each handler updates filters and page together; multiple setSearchParams calls are not queued.
  return { page, pageSize, sort, filter,
    setSort: (value: Sort) => setParams((previous) => {
      const next = new URLSearchParams(previous); next.set(prefix + 'sort', JSON.stringify(value)); next.delete(prefix + 'page'); return next;
    }, { replace: true }),
    setFilter: (value: Record<string, any>) => setParams((previous) => {
      const next = new URLSearchParams(previous); next.set(prefix + 'filter', JSON.stringify(value)); next.delete(prefix + 'page'); return next;
    }, { replace: true }),
    paginate: (value: number, size: number) => setParams((previous) => {
      const next = new URLSearchParams(previous); next.set(prefix + 'page', JSON.stringify(size === pageSize ? value : 1)); next.set(prefix + 'size', JSON.stringify(size)); return next;
    }, { replace: true }),
  };
}

export function useUnsavedChanges(dirty: boolean) {
  const bypass = useRef(false);
  const blocker = useBlocker(() => dirty && !bypass.current);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty && !bypass.current) { event.preventDefault(); event.returnValue = ''; }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  return { allowNavigation: () => { bypass.current = true; }, dialog: (
    <Modal open={blocker.state === 'blocked'} title="Modifications non enregistrées" onCancel={() => blocker.reset?.()}
      footer={<><Button onClick={() => blocker.reset?.()}>Continuer à modifier</Button><Button danger onClick={() => blocker.proceed?.()}>Quitter sans enregistrer</Button></>}>
      Les modifications seront perdues si tu quittes cet écran.
    </Modal>
  ) };
}
