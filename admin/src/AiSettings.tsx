import React, { useEffect, useState } from 'react';
import { Alert, Button, Input, Modal, Space, Switch, Typography, message } from 'antd';
import { api } from './api';
import { PageHeader } from './ui';

const { Text, Link } = Typography;

// Réglages de l'assistant IA (conseil santé/bien-être animal, OpenRouter) — clé API chiffrée côté
// serveur, jamais renvoyée : un champ laissé vide conserve la clé déjà enregistrée.
export const AiSettings = () => {
  const [st, setSt] = useState<any>(null);
  const [enabled, setEnabled] = useState(false);
  const [model, setModel] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => api('/ai-settings').then((r) => {
    setSt(r.json); setEnabled(r.json.enabled); setModel(r.json.model); setSystemPrompt(r.json.systemPrompt);
  }).catch((e) => message.error(e.message));
  useEffect(() => { load(); }, []);

  const test = async () => {
    setTesting(true); setTestResult(null);
    try {
      const r = await api('/ai-settings/test', { method: 'POST', body: { model: model || undefined, systemPrompt: systemPrompt || undefined, apiKey: apiKey || undefined } });
      setTestResult({ ok: true, text: r.json.reply });
    } catch (e: any) { setTestResult({ ok: false, text: e.message || 'Échec du test.' }); }
    finally { setTesting(false); }
  };

  const save = async () => {
    setSaving(true);
    try {
      await api('/ai-settings', { method: 'PUT', body: { enabled, model, systemPrompt, apiKey: apiKey || undefined, reason } });
      message.success('Réglages enregistrés'); setSaveOpen(false); setReason(''); setApiKey(''); load();
    } catch (e: any) { message.error(e.message); }
    finally { setSaving(false); }
  };

  if (!st) return null;

  return (
    <div style={{ padding: 24, maxWidth: 760 }}>
      <PageHeader title="Assistant IA" />
      <Text type="secondary" style={{ display: 'block', marginBottom: 20 }}>
        Compagnon de conseil sur la santé et le bien-être animal, intégré à l'app — réservé aux formules payantes (Matrice des droits, fonctionnalité « Assistant IA »).
        Appelle <Link href="https://openrouter.ai" target="_blank">OpenRouter</Link> avec ta propre clé. Les modèles se terminant par <code>:free</code> sont gratuits
        mais plafonnés à 20 requêtes/minute, par compte — partagées entre tous les utilisateurs de l'app.
      </Text>

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
          <Text style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Clé API OpenRouter</Text>
          <Input.Password value={apiKey} onChange={(e) => setApiKey(e.target.value)}
            placeholder={st.hasApiKey ? 'Clé déjà enregistrée — laisser vide pour la conserver' : 'sk-or-v1-…'} />
        </div>

        <div>
          <Text style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>Message système (persona)</Text>
          <Input.TextArea value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} autoSize={{ minRows: 4 }} />
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
            Un rappel de sécurité est toujours ajouté après ce texte (jamais de diagnostic, toujours orienter vers un vétérinaire) — non modifiable ici.
          </Text>
        </div>

        <Space>
          <Button onClick={test} loading={testing}>Tester</Button>
          <Button type="primary" onClick={() => setSaveOpen(true)}>Enregistrer</Button>
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
