import { AiUsage } from './AiUsage';
import { useQueryClient } from '@tanstack/react-query';
import { QueryFeedback } from './QueryFeedback';
import { useUnsavedChanges } from './interaction';
import React, { useEffect, useState } from 'react';
import { Alert, Button, Input, Modal, Space, Switch, Typography, message } from 'antd';
import { api } from './api';
import { PageHeader } from './ui';

const { Text, Link } = Typography;

// Réglages de l'assistant IA (conseil santé/bien-être animal, OpenRouter) — clé API chiffrée côté
// serveur, jamais renvoyée : un champ laissé vide conserve la clé déjà enregistrée.
export const AiSettings = () => {
  const queryClient = useQueryClient();
  const [st, setSt] = useState<any>(null);
  const [enabled, setEnabled] = useState(false);
  const [model, setModel] = useState('');
  const [visionModel, setVisionModel] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<unknown>(null);
  const dirty = !!st && (enabled !== st.enabled || model !== st.model || visionModel !== st.visionModel || systemPrompt !== st.systemPrompt || !!apiKey);
  const guard = useUnsavedChanges(dirty);

  const load = () => { setLoadError(null); return api('/ai-settings').then((r) => {
    setSt(r.json); setEnabled(r.json.enabled); setModel(r.json.model); setVisionModel(r.json.visionModel); setSystemPrompt(r.json.systemPrompt);
  }).catch(setLoadError); };
  useEffect(() => { load(); }, []);

  const test = async (vision = false) => {
    setTesting(true); setTestResult(null);
    try {
      const body = vision ? { vision: true, visionModel: visionModel || undefined, apiKey: apiKey || undefined }
        : { model: model || undefined, systemPrompt: systemPrompt || undefined, apiKey: apiKey || undefined };
      const r = await api('/ai-settings/test', { method: 'POST', body });
      setTestResult({ ok: true, text: r.json.reply });
    } catch (e: any) { setTestResult({ ok: false, text: e.message || 'Échec du test.' }); }
    finally { setTesting(false); queryClient.invalidateQueries({ queryKey: ['ai-usage'] }); }
  };

  const save = async () => {
    setSaving(true);
    try {
      await api('/ai-settings', { method: 'PUT', body: { enabled, model, visionModel, systemPrompt, apiKey: apiKey || undefined, reason } });
      message.success('Réglages enregistrés'); setSaveOpen(false); setReason(''); setApiKey(''); load();
    } catch (e: any) { message.error(e.message); }
    finally { setSaving(false); }
  };

  if (!st || loadError) return <QueryFeedback loading={!st && !loadError} error={loadError} retry={load} />;

  return (
    <div style={{ padding: 24 }}>
      {guard.dialog}
      <PageHeader title="Assistant IA" />
      <Text type="secondary" style={{ display: 'block', marginBottom: 20 }}>
        Compagnon de conseil sur la santé et le bien-être animal, intégré à l'app — réservé aux formules payantes (Matrice des droits, fonctionnalité « Assistant IA »).
        Appelle <Link href="https://openrouter.ai" target="_blank">OpenRouter</Link> avec ta propre clé. Les modèles se terminant par <code>:free</code> sont gratuits
        et restent soumis aux limites du fournisseur. Le budget local ci-dessous est partagé par les utilisateurs et les tests administrateur.
      </Text>

      <div style={{ marginBottom: 20 }}><AiUsage /></div>
      <Space direction="vertical" size={20} style={{ width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Switch checked={enabled} onChange={setEnabled} />
          <Text strong={enabled}>{enabled ? 'Activé pour les utilisateurs éligibles' : 'Désactivé'}</Text>
        </div>

        <div>
          <Text style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Modèle OpenRouter</Text>
          <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder={st.defaultModel} />
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
            Identifiant exact tel qu'affiché sur OpenRouter (ex. <code>{st.defaultModel}</code>). La liste des modèles gratuits change souvent —
            si l'assistant cesse de répondre, vérifie d'abord que ce modèle est toujours disponible.
          </Text>
        </div>

        <div>
          <Text style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Modèle de lecture du carnet</Text>
          <Input value={visionModel} onChange={(e) => setVisionModel(e.target.value)} placeholder={st.defaultVisionModel} aria-label="Modèle de lecture du carnet" />
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
            Doit lire les images (modèle multimodal). Sert à la lecture du carnet de santé par photo — fonctionnalité « Lecture du carnet par photo » de la Matrice des droits.
          </Text>
        </div>

        <div>
          <Text style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Clé API OpenRouter</Text>
          <Input.Password value={apiKey} onChange={(e) => setApiKey(e.target.value)}
            placeholder={st.hasApiKey ? 'Clé déjà enregistrée — laisser vide pour la conserver' : 'sk-or-v1-…'} />
        </div>

        <div>
          <Text style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Message système (persona)</Text>
          <Input.TextArea value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} autoSize={{ minRows: 4 }} showCount maxLength={4000} status={systemPrompt.length >= 3800 ? 'error' : undefined} aria-label="Message système" />
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
            Un rappel de sécurité est toujours ajouté après ce texte (jamais de diagnostic, toujours orienter vers un vétérinaire) — non modifiable ici.
          </Text>
        </div>

        <Space wrap>
          <Button onClick={() => { setModel(st.defaultModel); setVisionModel(st.defaultVisionModel); setSystemPrompt(st.defaultSystemPrompt); setTestResult(null); }} disabled={saving || testing}>Rétablir par défaut</Button>
          <Button onClick={() => test()} loading={testing}>Tester</Button>
          <Button onClick={() => test(true)} loading={testing}>Tester la lecture d'image</Button>
          <Button type="primary" disabled={!dirty} onClick={() => setSaveOpen(true)}>Enregistrer</Button>
        </Space>

        {testResult ? <Alert type={testResult.ok ? 'success' : 'error'} showIcon message={testResult.ok ? 'Réponse reçue' : 'Échec du test'} description={testResult.text} /> : null}
      </Space>

      <Modal open={saveOpen} onCancel={() => setSaveOpen(false)} title="Enregistrer les réglages de l'assistant IA"
        footer={<><Button onClick={() => setSaveOpen(false)}>Annuler</Button><Button type="primary" loading={saving} disabled={reason.trim().length < 5} onClick={save}>Confirmer</Button></>}>
        <Input.TextArea placeholder="Motif (5 caractères min., journalisé)" value={reason} onChange={(e) => setReason(e.target.value)} autoSize={{ minRows: 2 }} />
      </Modal>
    </div>
  );
};
