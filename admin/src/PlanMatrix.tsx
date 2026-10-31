import React, { useEffect, useState } from 'react';
import { Alert, Button, Checkbox, Input, InputNumber, Modal, Select, Typography, message } from 'antd';
import { api, permits } from './api';
import { useAuth } from './auth';
import { PageHeader, StatusChip } from './ui';

const { Text } = Typography;

// Matrice « formule × fonctionnalité » : case = droit accordé, nombre = quota (vide = illimité). Tout est paramétrable.
// Interrupteur global : tant qu'il est éteint, tout le monde a accès à tout ; allumé, chaque compte sans abonnement est en « gratuit ».
export function Enforcement({ canWrite }: { canWrite: boolean }) {
  const [st, setSt] = useState<any>(null); const [open, setOpen] = useState(false); const [reason, setReason] = useState(''); const [ui, setUi] = useState('lock');
  const load = () => api('/enforcement').then((r) => setSt(r.json)).catch(() => undefined);
  useEffect(() => { load(); }, []);
  useEffect(() => { if (st) setUi(st.gated_ui); }, [st]);
  if (!st) return null;
  const affected = st.over.animals + st.over.photos_count;
  const toggle = async () => {
    try { await api('/enforcement', { method: 'PUT', body: { enabled: !st.enforced, reason, gated_ui: ui } }); message.success(st.enforced ? 'Formules désactivées : tout est ouvert' : 'Formules appliquées'); setOpen(false); setReason(''); load(); }
    catch (e: any) { message.error(e.message); }
  };
  return (
    <div style={{ border: '1px solid var(--ant-color-border)', borderRadius: 6, background: 'var(--ant-color-bg-container)', padding: 16, marginBottom: 20, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: 260 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
          <Text strong style={{ fontSize: 13 }}>Application des formules</Text>
          <StatusChip value={st.enforced ? 'actif' : 'brouillon'} />
          {!st.enforced ? <Text type="secondary" style={{ fontSize: 12 }}>(tout est ouvert)</Text> : null}
        </div>
        <Text type="secondary" style={{ fontSize: 13 }}>
          {st.free_users} compte(s) sans abonnement seraient en formule Gratuit (limites : {st.limits.animals ?? '∞'} animal(aux), {st.limits.photos_count ?? '∞'} photos).
          {affected ? ` ${st.over.animals} dépassent la limite d'animaux, ${st.over.photos_count} celle des photos : leurs données restent visibles, mais ils ne pourront rien ajouter tant qu'ils n'ont pas de formule adaptée.` : ' Aucun compte ne dépasse ces limites.'}
        </Text>
      </div>
      {canWrite ? <Button danger={st.enforced} type={st.enforced ? 'default' : 'primary'} onClick={() => setOpen(true)}>{st.enforced ? 'Désactiver' : 'Appliquer les formules'}</Button> : null}
      <Modal open={open} onCancel={() => setOpen(false)} title={st.enforced ? "Désactiver l'application des formules" : 'Appliquer les formules à tous les utilisateurs'}
        footer={<><Button onClick={() => setOpen(false)}>Annuler</Button><Button type="primary" disabled={reason.trim().length < 5} onClick={toggle}>Confirmer</Button></>}>
        <div style={{ display: 'grid', gap: 12 }}>
          {!st.enforced ? <Alert type={affected ? 'warning' : 'info'} showIcon message={<>Dès l'enregistrement, l'app et le serveur appliquent les droits et quotas de chaque formule. {affected ? `${affected} compte(s) dépassent déjà les limites du plan Gratuit.` : ''}</>} /> : <Alert type="info" showIcon message="Tout redevient accessible à tous, sans limite de formule." />}
          <div>
            <Text style={{ fontSize: 12 }} type="secondary">Fonctionnalités hors formule dans l'app</Text>
            <Select style={{ width: '100%' }} value={ui} onChange={setUi} options={[{ value: 'lock', label: 'Afficher avec un cadenas (recommandé)' }, { value: 'hide', label: 'Masquer' }]} />
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>Cadenas : visibles, un toucher propose de passer à une formule supérieure. Masquées : elles disparaissent des menus.</Text>
          </div>
          <Input.TextArea placeholder="Motif (5 caractères min., journalisé)" value={reason} onChange={(e) => setReason(e.target.value)} autoSize={{ minRows: 2 }} />
        </div>
      </Modal>
    </div>
  );
}

type Cell = { enabled: boolean; quota: number | null };
type MatrixData = { plans: any[]; features: any[]; cells: { plan_code: string; feature_code: string; enabled: boolean; quota: number | null }[] };

const cellKey = (plan: string, feature: string) => `${plan}:${feature}`;

// Grille complète formules (colonnes) × fonctionnalités (lignes) : avant, un sélecteur ne montrait qu'une
// formule à la fois, impossible de comparer "Premium a-t-il ceci que Gratuit n'a pas ?" d'un coup d'œil.
export const PlanMatrix = () => {
  const { permissions } = useAuth();
  const canWrite = permits(permissions, 'billing.plans_write');
  const [data, setData] = useState<MatrixData | null>(null);
  const [grid, setGrid] = useState<Record<string, Cell>>({});
  const [dirtyPlans, setDirtyPlans] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const load = () => api('/plan-matrix').then((r) => {
    setData(r.json);
    const g: Record<string, Cell> = {};
    for (const c of r.json.cells) g[cellKey(c.plan_code, c.feature_code)] = { enabled: !!c.enabled, quota: c.quota };
    setGrid(g);
    setDirtyPlans(new Set());
  }).catch((e) => message.error(e.message));
  useEffect(() => { load(); }, []);

  const set = (plan: string, feature: string, patch: Partial<Cell>) => {
    setGrid((g) => ({ ...g, [cellKey(plan, feature)]: { enabled: false, quota: null, ...g[cellKey(plan, feature)], ...patch } }));
    setDirtyPlans((d) => new Set(d).add(plan));
  };
  const save = async () => {
    if (!data) return;
    setSaving(true);
    try {
      for (const planCode of dirtyPlans) {
        const features = data.features.map((f) => { const c = grid[cellKey(planCode, f.code)] || { enabled: false, quota: null }; return { feature_code: f.code, enabled: c.enabled, quota: c.quota }; });
        await api(`/plans/${planCode}/features`, { method: 'PUT', body: { features } });
      }
      message.success('Matrice enregistrée');
      setDirtyPlans(new Set());
    } catch (e: any) { message.error(e.message); }
    finally { setSaving(false); }
  };

  if (!data) return null;
  const plans = data.plans;
  const colWidth = 108;
  return (
    <div style={{ padding: 24 }}>
      <PageHeader title="Matrice des droits" subtitle="Ce que chaque formule inclut, et ses quotas — colonnes = formules, lignes = fonctionnalités."
        actions={canWrite ? <Button type="primary" disabled={!dirtyPlans.size} loading={saving} onClick={save}>Enregistrer</Button> : null} />
      <Alert type="info" showIcon style={{ marginBottom: 20 }}
        message="L'interrupteur qui applique (ou non) les formules à tous les comptes est désormais dans Réglages, avec le reste de la configuration globale." />
      <div style={{ border: '1px solid var(--ant-color-border)', borderRadius: 6, background: 'var(--ant-color-bg-container)', overflowX: 'auto' }}>
        <div style={{ minWidth: 280 + plans.length * colWidth }}>
          <div style={{ display: 'flex', position: 'sticky', top: 0, background: 'var(--ant-color-fill-tertiary)', borderBottom: '1px solid var(--ant-color-border)', zIndex: 1 }}>
            <div style={{ width: 280, flex: 'none', padding: '10px 16px', fontSize: 11, fontWeight: 650, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--ant-color-text-secondary)' }}>Fonctionnalité</div>
            {plans.map((p) => (
              <div key={p.code} style={{ width: colWidth, flex: 'none', padding: '10px 6px', textAlign: 'center' }}>
                <Text style={{ fontSize: 12, fontWeight: 650 }}>{p.name}{p.archived ? ' (archivée)' : ''}</Text>
                <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>{Number(p.price_mga).toLocaleString('fr-FR')} MGA</Text>
              </div>
            ))}
          </div>
          {data.features.map((f, i) => (
            <React.Fragment key={f.code}>
              {i === 0 || data.features[i - 1].category !== f.category ? (
                <div style={{ padding: '6px 16px', background: 'var(--ant-color-fill-tertiary)', borderBottom: '1px solid var(--ant-color-border)', borderTop: i === 0 ? 'none' : '1px solid var(--ant-color-border)' }}>
                  <span style={{ fontSize: 11, fontWeight: 650, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ant-color-text-secondary)' }}>{f.category || 'Autres'}</span>
                </div>
              ) : null}
              <div style={{ display: 'flex', alignItems: 'center', borderBottom: i < data.features.length - 1 ? '1px solid var(--ant-color-border)' : 'none' }}>
                <div style={{ width: 280, flex: 'none', padding: '8px 16px', minWidth: 0 }}>
                  <Text style={{ fontSize: 13 }}>{f.label}</Text>
                  <Text type="secondary" style={{ fontSize: 11, fontFamily: 'ui-monospace, monospace', display: 'block' }}>{f.code}</Text>
                </div>
                {plans.map((p) => {
                  const c = grid[cellKey(p.code, f.code)] || { enabled: false, quota: null };
                  return (
                    <div key={p.code} style={{ width: colWidth, flex: 'none', padding: '8px 6px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <Checkbox checked={c.enabled} disabled={!canWrite} onChange={(e) => set(p.code, f.code, { enabled: e.target.checked })} />
                      {f.kind === 'quota' && c.enabled
                        ? <InputNumber size="small" disabled={!canWrite} value={c.quota ?? undefined} placeholder="∞" onChange={(v) => set(p.code, f.code, { quota: v ?? null })} style={{ width: 72 }} />
                        : null}
                    </div>
                  );
                })}
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};
