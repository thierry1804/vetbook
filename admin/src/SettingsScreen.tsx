import { SettingsNavigation, useSettingsSection } from './SettingsNavigation';
import { QueryFeedback } from './QueryFeedback';
import { useUnsavedChanges } from './interaction';
import React, { useEffect, useState } from 'react';
import { Button, Input, InputNumber, Modal, Select, Space, Switch, Typography, message } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { api } from './api';
import { PageHeader } from './ui';
import { Enforcement } from './PlanMatrix';

const { Text } = Typography;

function Section({ title, help, children }: { title: string; help?: string; children: React.ReactNode }) {
  const section = useSettingsSection(title);
  return (
    <div id={`settings-${section.id}`} hidden={!section.visible} style={{ display: section.visible ? undefined : 'none', scrollMarginTop: 20, border: '1px solid var(--ant-color-border)', borderRadius: 6, background: 'var(--ant-color-bg-container)', padding: 20, marginBottom: 16 }}>
      <Text strong style={{ fontSize: 14, display: 'block', marginBottom: help ? 2 : 16 }}>{title}</Text>
      {help ? <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 16 }}>{help}</Text> : null}
      <Space direction="vertical" size={16} style={{ width: '100%' }}>{children}</Space>
    </div>
  );
}
function Field({ label, help, children }: { label: string; help?: string; children: React.ReactNode }) {
  return (
    <div>
      <Text style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>{label}</Text>
      {children}
      {help ? <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>{help}</Text> : null}
    </div>
  );
}

// Remplace l'ancienne grille clé/valeur où « value » était un champ JSON brut édité à la main — une
// faute de syntaxe y cassait l'app en direct. Un contrôle typé par réglage, tout passe par /app-settings
// (validation + motif + journal d'audit en une seule écriture atomique), les clés seed_* internes
// (verrous de migration ponctuels) ne sont pas exposées ici.
export const SettingsScreen = () => {
  const [st, setSt] = useState<any>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [original, setOriginal] = useState<any>(null);
  const changedKeys = st && original ? Object.keys(st).filter((key) => JSON.stringify(st[key]) !== JSON.stringify(original[key])) : [];
  const dirty = changedKeys.length > 0;
  const guard = useUnsavedChanges(dirty);

  const load = () => { setLoadError(null); return api('/app-settings').then((r) => { setSt(r.json); setOriginal(r.json); }).catch(setLoadError); };
  useEffect(() => { load(); }, []);
  const set = (patch: any) => setSt((s: any) => ({ ...s, ...patch }));

  const save = async () => {
    setSaving(true);
    try {
      await api('/app-settings', { method: 'PUT', body: { ...st, reason } });
      setOriginal(st); message.success('Réglages enregistrés'); setSaveOpen(false); setReason(''); load();
    } catch (e: any) { message.error(e.message); }
    finally { setSaving(false); }
  };

  if (!st || loadError) return <QueryFeedback loading={!st && !loadError} error={loadError} retry={load} />;
  const countryOptions = st.open_countries.map((c: any) => ({ value: c.code, label: `${c.label} (${c.code})` }));

  return (
    <div style={{ padding: 24 }}>
      {guard.dialog}
      <PageHeader title="Réglages" subtitle="Configuration globale de l'application." actions={<Button type="primary" disabled={!dirty} onClick={() => setSaveOpen(true)}>Enregistrer</Button>} />

      {dirty ? <Text type="warning" style={{ display: 'block', marginBottom: 16 }}>{changedKeys.length} réglage(s) modifié(s), non enregistré(s).</Text> : null}
      <SettingsNavigation changedKeys={changedKeys}>
      <Section title="Maintenance">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Switch checked={st.maintenance.enabled} onChange={(v) => set({ maintenance: { ...st.maintenance, enabled: v } })} />
          <Text strong={st.maintenance.enabled} type={st.maintenance.enabled ? undefined : 'secondary'}>
            {st.maintenance.enabled ? 'Application fermée aux utilisateurs' : 'Application ouverte'}
          </Text>
        </div>
        {st.maintenance.enabled ? (
          <Field label="Message affiché aux utilisateurs" help="Requis pendant la maintenance (5 caractères min.).">
            <Input.TextArea value={st.maintenance.message} onChange={(e) => set({ maintenance: { ...st.maintenance, message: e.target.value } })} autoSize={{ minRows: 2 }} />
          </Field>
        ) : null}
      </Section>

      <Section title="Formules" help="Ce qui est appliqué à tous les comptes, et comment les fonctionnalités hors formule apparaissent dans l'app. Cette section possède sa propre confirmation.">
        <Field label="Fuseau de gestion des abonnements" help="Les échéances sont calculées et affichées dans ce fuseau ; les instants sont stockés en UTC.">
          <Select showSearch style={{width:'100%'}} value={st.subscription_timezone||'UTC'} onChange={(value)=>set({subscription_timezone:value})} options={['UTC','Africa/Antananarivo','Europe/Paris','Indian/Reunion','Africa/Nairobi'].map((value)=>({value,label:value}))} />
        </Field>
        <Enforcement canWrite />
      </Section>

      <Section title="Pays" help="Pays dans lesquels l'app est ouverte, et pays par défaut proposé à l'inscription.">
        <Field label="Pays ouverts">
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            {st.open_countries.map((c: any, i: number) => (
              <Space key={i} wrap>
                <Input value={c.code} maxLength={2} style={{ width: 70, textTransform: 'uppercase' }} placeholder="MG"
                  onChange={(e) => set({ open_countries: st.open_countries.map((x: any, j: number) => (j === i ? { ...x, code: e.target.value.toUpperCase() } : x)) })} />
                <Input value={c.label} style={{ width: 220 }} placeholder="Madagascar"
                  onChange={(e) => set({ open_countries: st.open_countries.map((x: any, j: number) => (j === i ? { ...x, label: e.target.value } : x)) })} />
                <Button type="text" danger icon={<DeleteOutlined />} disabled={st.open_countries.length <= 1}
                  onClick={() => set({ open_countries: st.open_countries.filter((_: any, j: number) => j !== i) })} />
              </Space>
            ))}
            <Button size="small" icon={<PlusOutlined />} onClick={() => set({ open_countries: [...st.open_countries, { code: '', label: '' }] })}>Ajouter un pays</Button>
          </Space>
        </Field>
        <Field label="Pays par défaut à l'inscription">
          <Select style={{ width: 280 }} value={st.default_country} onChange={(v) => set({ default_country: v })} options={countryOptions} />
        </Field>
      </Section>

      <Section title="Contact & abonnement" help="Affiché aux utilisateurs pour nous contacter ou souscrire (paiement manuel hors app).">
        <Space wrap size={16}>
          <Field label="E-mail"><Input style={{ width: 240 }} value={st.contact.email} onChange={(e) => set({ contact: { ...st.contact, email: e.target.value } })} /></Field>
          <Field label="Téléphone"><Input style={{ width: 180 }} value={st.contact.phone} onChange={(e) => set({ contact: { ...st.contact, phone: e.target.value } })} /></Field>
          <Field label="WhatsApp"><Input style={{ width: 180 }} value={st.contact.whatsapp} onChange={(e) => set({ contact: { ...st.contact, whatsapp: e.target.value } })} /></Field>
        </Space>
        <Field label="Instructions de souscription" help="Marche à suivre affichée dans l'app pour passer à une formule payante.">
          <Input.TextArea value={st.contact.subscribe_instructions} onChange={(e) => set({ contact: { ...st.contact, subscribe_instructions: e.target.value } })} autoSize={{ minRows: 3 }} />
        </Field>
      </Section>

      <Section title="Limites">
        <Space wrap size={24}>
          <Field label="Membres du foyer (max)"><InputNumber min={1} max={50} value={st.max_household_members} onChange={(v) => set({ max_household_members: v })} /></Field>
          <Field label="Lien vétérinaire — durée (jours)"><InputNumber min={1} max={3650} value={st.max_share_days} onChange={(v) => set({ max_share_days: v })} /></Field>
          <Field label="Taille max par photo (Mo)"><InputNumber min={1} max={200} value={st.max_upload_mb} onChange={(v) => set({ max_upload_mb: v })} /></Field>
          <Field label="Quota de stockage global (Mo)" help="Vide = pas de plafond global.">
            <InputNumber min={1} value={st.storage_quota_mb ?? undefined} placeholder="Illimité" onChange={(v) => set({ storage_quota_mb: v ?? null })} />
          </Field>
        </Space>
      </Section>

      <Section title="Publication">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Switch checked={st.four_eyes_publish} onChange={(v) => set({ four_eyes_publish: v })} />
          <Text>Principe des quatre yeux (un autre administrateur doit publier qu'on a préparé)</Text>
        </div>
        <Field label="Version minimale de l'app" help="Vide = aucune contrainte. Les versions antérieures seront bloquées.">
          <Input style={{ width: 160 }} value={st.min_client_version || ''} onChange={(e) => set({ min_client_version: e.target.value || null })} placeholder="ex. 2.4.0" />
        </Field>
      </Section>

      </SettingsNavigation>
      <Modal open={saveOpen} onCancel={() => setSaveOpen(false)} title="Enregistrer les réglages"
        footer={<><Button onClick={() => setSaveOpen(false)}>Annuler</Button><Button type="primary" loading={saving} disabled={reason.trim().length < 5} onClick={save}>Confirmer</Button></>}>
        <Text strong>Modifications à enregistrer</Text>
        <ul>{changedKeys.map((key) => <li key={key}>{({ subscription_timezone: 'Fuseau des abonnements', maintenance: 'Maintenance', open_countries: 'Pays ouverts', default_country: 'Pays par défaut', contact: 'Coordonnées et instructions de souscription', max_household_members: 'Nombre de membres du foyer', max_share_days: 'Durée des liens vétérinaires', max_upload_mb: 'Taille maximale des photos', storage_quota_mb: 'Quota de stockage', four_eyes_publish: 'Validation à quatre yeux', min_client_version: 'Version minimale' } as Record<string, string>)[key] || key}</li>)}</ul>
        <Input.TextArea placeholder="Motif (5 caractères min., journalisé)" value={reason} onChange={(e) => setReason(e.target.value)} autoSize={{ minRows: 2 }} />
      </Modal>
    </div>
  );
};
