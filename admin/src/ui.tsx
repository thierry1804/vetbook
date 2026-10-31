import React, { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import QRCode from 'qrcode';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/fr';
import { Alert, Button, Modal, Tooltip, Typography } from 'antd';
import { ArrowLeftOutlined, CopyOutlined } from '@ant-design/icons';
import { tone } from './theme';
import { useThemeMode } from './themeMode';
import { RES } from './resources';

dayjs.extend(relativeTime);
dayjs.locale('fr');

// Date relative (« il y a 3 jours ») avec la date et l'heure complètes en infobulle — plus lisible qu'une
// date avec les secondes qui se coupe sur deux lignes dans un tableau dense (ex. journal d'audit).
export function RelativeDate({ value, empty = '—' }: { value?: string | null; empty?: string }) {
  if (!value) return <>{empty}</>;
  const d = dayjs(value);
  return <Tooltip title={d.format('DD/MM/YYYY HH:mm:ss')}>{d.fromNow()}</Tooltip>;
}

// Libellés humains pour les actions du journal d'audit admin — soit "ressource.verbe" (ex. tips.update),
// soit la trace de secours "MÉTHODE /chemin" posée quand aucun audit détaillé n'a été produit. Partagé entre
// le Journal d'audit et les historiques d'actions affichés sur les fiches utilisateur/administrateur.
const ADMIN_VERB_LABELS: Record<string, string> = {
  create: 'Création', update: 'Modification', delete: 'Suppression', login: 'Connexion', login_failed: 'Connexion échouée',
  logout: 'Déconnexion', password_change: 'Changement de mot de passe', enforcement: 'Application des formules',
  features_update: 'Modification des droits', create_draft: 'Brouillon créé', assign: 'Attribution', 'mark-verified': 'Marqué vérifié',
};
const ADMIN_RESOURCE_LABELS: Record<string, string> = {
  auth: 'Authentification', admin: 'Administrateur', billing: 'Facturation', plan: 'Formule', release: 'Version',
  settings: 'Réglages', subscription: 'Abonnement', user: 'Utilisateur',
  ...Object.fromEntries(RES.map((r) => [r.name, r.label])),
};
export function adminActionLabel(action: string) {
  const failed = /fail|échec|echec/i.test(action);
  const method = action.match(/^(GET|POST|PUT|DELETE)\s+(.+)$/);
  if (method) {
    const verb = { POST: 'Création', PUT: 'Modification', DELETE: 'Suppression', GET: 'Consultation' }[method[1]] || method[1];
    const seg = method[2].split('/').filter(Boolean).pop() || method[2];
    return { label: `${verb} — ${ADMIN_RESOURCE_LABELS[seg] || seg}`, failed };
  }
  const [res, ...rest] = action.split('.');
  const verb = rest.join('.');
  return { label: `${ADMIN_RESOURCE_LABELS[res] || res} — ${ADMIN_VERB_LABELS[verb] || verb}`, failed };
}

const { Text, Title } = Typography;

// Vocabulaire d'état fixe (succès / attention / erreur / neutre), dans la palette de la marque — jamais la
// couleur générique d'un composant par défaut. Un badge texte, la même forme partout, jamais de bordure.
const STATE: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
  actif: 'success', publie: 'success', valide: 'success', commercialise: 'success', published: 'success', ok: 'success', success: 'success', envoye: 'success',
  brouillon: 'warning', a_valider: 'warning', essai: 'warning', draft: 'warning', partial: 'warning', console: 'warning',
  suspendu: 'error', en_retard: 'error', failed: 'error', error: 'error', echec: 'error',
  archive: 'neutral', archived: 'neutral', retire: 'neutral', resilie: 'neutral', desactive: 'neutral',
};
export const LABELS: Record<string, string> = {
  actif: 'Actif', publie: 'Publié', valide: 'Validé', commercialise: 'Commercialisé', published: 'Publiée', brouillon: 'Brouillon', a_valider: 'À valider', essai: 'Essai',
  draft: 'Brouillon', suspendu: 'Suspendu', en_retard: 'En retard', archive: 'Archivé', archived: 'Archivée', retire: 'Retiré', resilie: 'Résilié', desactive: 'Désactivé',
  envoye: 'Envoyé', echec: 'Échec', console: 'Simulé (SMTP non configuré)',
  owner: 'Propriétaire', practice: 'Cabinet', boolean: 'Oui/Non', quota: 'Quota',
};

export function StatusChip({ value }: { value?: string }) {
  const { mode } = useThemeMode();
  if (!value) return null;
  const t = tone[mode];
  const state = STATE[value] || 'neutral';
  const colors = { success: [t.success, t.successSoft], warning: [t.warning, t.warningSoft], error: [t.error, t.errorSoft], neutral: [t.textSecondary, t.neutralSoft] }[state];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px', borderRadius: 6, background: colors[1], color: colors[0], fontSize: 12, fontWeight: 650, lineHeight: 1.6, whiteSpace: 'nowrap' }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', flex: 'none' }} />
      {LABELS[value] || value}
    </span>
  );
}

// Étiquette catégorielle neutre (rôle, code technique…) : même forme que StatusChip, teinte neutre fixe.
export function Pill({ label }: { label: React.ReactNode }) {
  const { mode } = useThemeMode();
  const t = tone[mode];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 6, background: t.neutralSoft, color: t.text, fontSize: 12, fontWeight: 650, lineHeight: 1.6, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  );
}

export const copy = (text: string) => { try { navigator.clipboard.writeText(text); } catch { /* presse-papiers indisponible */ } };

// Identifiants générés (mot de passe provisoire + secret TOTP) : affichés une seule fois, QR code à scanner.
export function CredentialsDialog({ creds, email, title, onClose }: { creds: { password: string; totp_secret: string; otpauth_url: string } | null; email: string; title: string; onClose: () => void }) {
  const [qr, setQr] = useState('');
  useEffect(() => { setQr(''); if (creds) QRCode.toDataURL(creds.otpauth_url, { margin: 1, width: 200 }).then(setQr).catch(() => setQr('')); }, [creds]);
  if (!creds) return null;
  const Row = ({ label, value }: { label: string; value: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 10, border: '1px solid var(--ant-color-border)', borderRadius: 6 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>{label}</Text>
        <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 13, wordBreak: 'break-all' }}>{value}</div>
      </div>
      <Tooltip title="Copier"><Button type="text" size="small" icon={<CopyOutlined />} onClick={() => copy(value)} aria-label={`Copier ${label}`} /></Tooltip>
    </div>
  );
  return (
    <Modal open onCancel={() => undefined} closable={false} footer={<Button type="primary" onClick={onClose}>J'ai noté ces informations</Button>} title={title} width={520}>
      <div style={{ display: 'grid', gap: 12 }}>
        <Alert type="warning" showIcon message="Ces informations ne seront plus affichées. Transmets-les par un canal sûr ; le mot de passe provisoire peut être changé depuis « Mon profil »." />
        <Text>Compte : <b>{email}</b></Text>
        <Row label="Mot de passe provisoire" value={creds.password} />
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          {qr ? <img src={qr} width={152} height={152} alt="QR code à scanner avec l'application d'authentification" style={{ borderRadius: 6, border: '1px solid var(--ant-color-border)' }} /> : null}
          <div style={{ flex: 1, minWidth: 220 }}><Row label="Secret TOTP (si le QR ne se scanne pas)" value={creds.totp_secret} /></div>
        </div>
      </div>
    </Modal>
  );
}

// `back` : fil d'Ariane minimal sur les écrans de fiche/formulaire — nulle part ailleurs un moyen de
// revenir à la liste sans le bouton retour du navigateur.
export const PageHeader = ({ title, subtitle, actions, back }: { title: string; subtitle?: string; actions?: React.ReactNode; back?: { label: string; to: string } }) => (
  <div style={{ marginBottom: 20 }}>
    {back ? (
      <RouterLink to={back.to} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: 'var(--ant-color-text-secondary)', marginBottom: 6 }}>
        <ArrowLeftOutlined style={{ fontSize: 11 }} /> {back.label}
      </RouterLink>
    ) : null}
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: 240 }}>
        <Title level={4} style={{ margin: 0 }}>{title}</Title>
        {subtitle ? <Text type="secondary" style={{ display: 'block', marginTop: 2, fontSize: 13 }}>{subtitle}</Text> : null}
      </div>
      {actions}
    </div>
  </div>
);

// Panneau de chiffres dense (tableau de bord) : une rangée de nombres séparés par des filets, comme un relevé —
// plutôt que des cartes icône + libellé + nombre, toutes de la même taille, qui n'ajoutent rien à la lecture.
export function MetricStrip({ items }: { items: { label: string; value: React.ReactNode; hint?: string }[] }) {
  return (
    <div style={{ border: '1px solid var(--ant-color-border)', borderRadius: 6, background: 'var(--ant-color-bg-container)', overflow: 'hidden' }}>
      <div className="metric-strip-mobile">
        {items.map((it, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, padding: '10px 16px', borderBottom: i < items.length - 1 ? '1px solid var(--ant-color-border)' : 'none' }}>
            <Text type="secondary" style={{ fontSize: 13 }}>{it.label}</Text>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 17, fontWeight: 650, fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>{it.value}</div>
              {it.hint ? <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>{it.hint}</Text> : null}
            </div>
          </div>
        ))}
      </div>
      <div className="metric-strip-desktop" style={{ display: 'none', flexWrap: 'wrap' }}>
        {items.map((it, i) => (
          <div key={i} style={{ flex: '1 1 180px', minWidth: 160, padding: 16, borderRight: i < items.length - 1 ? '1px solid var(--ant-color-border)' : 'none', borderBottom: '1px solid var(--ant-color-border)' }}>
            <Text type="secondary" style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>{it.label}</Text>
            <div style={{ fontSize: 22, fontWeight: 650, fontVariantNumeric: 'tabular-nums', lineHeight: 1.15 }}>{it.value}</div>
            {it.hint ? <Text type="secondary" style={{ display: 'block', marginTop: 2, fontSize: 12 }}>{it.hint}</Text> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

// Liste de barres en ligne (répartition) : libellé — barre — valeur, une seule couleur d'accent.
export function BarList({ title, rows, action }: { title: string; rows: { label: string; n: number }[]; action?: React.ReactNode }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  return (
    <div style={{ border: '1px solid var(--ant-color-border)', borderRadius: 6, background: 'var(--ant-color-bg-container)', padding: 16, height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <Text strong style={{ fontSize: 13 }}>{title}</Text>
        {action}
      </div>
      {rows.length ? (
        <div style={{ display: 'grid', gap: 9 }}>
          {rows.map((r) => (
            <div key={r.label} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 44px', alignItems: 'center', columnGap: 12, rowGap: 3 }}>
              <Text style={{ fontSize: 13 }} ellipsis title={r.label}>{r.label}</Text>
              <Text strong style={{ fontSize: 13, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{r.n}</Text>
              <div style={{ gridColumn: '1 / -1', height: 5, borderRadius: 3, background: 'var(--ant-color-fill-tertiary)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(r.n / max) * 100}%`, background: 'var(--ant-color-primary)', borderRadius: 3 }} />
              </div>
            </div>
          ))}
        </div>
      ) : <Text type="secondary" style={{ fontSize: 13 }}>Pas encore de données.</Text>}
    </div>
  );
}

// Mini histogramme (évolution sur N jours) : chaque barre = un jour, infobulle native au survol. Remplace
// un classement à égalité (toutes les valeurs à 1) qui ne dit rien — une tendance dans le temps, même plate,
// reste lisible.
export function TrendChart({ title, data, hint }: { title: string; data: { day: string; n: number }[]; hint?: string }) {
  const max = Math.max(1, ...data.map((d) => d.n));
  const total = data.reduce((s, d) => s + d.n, 0);
  const fmt = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  return (
    <div style={{ border: '1px solid var(--ant-color-border)', borderRadius: 6, background: 'var(--ant-color-bg-container)', padding: 16, height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
        <Text strong style={{ fontSize: 13 }}>{title}</Text>
        <Text type="secondary" style={{ fontSize: 12 }}>{total} au total{hint ? ` · ${hint}` : ''}</Text>
      </div>
      {total ? (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 110 }}>
          {data.map((d) => (
            <div key={d.day} title={`${fmt(d.day)} : ${d.n}`} style={{ flex: 1, height: '100%', display: 'flex', alignItems: 'flex-end' }}>
              <div style={{ width: '100%', height: `${Math.max(3, (d.n / max) * 100)}%`, background: d.n ? 'var(--ant-color-primary)' : 'var(--ant-color-fill-tertiary)', borderRadius: 2 }} />
            </div>
          ))}
        </div>
      ) : <Text type="secondary" style={{ fontSize: 13 }}>Pas encore de données.</Text>}
      {total ? (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
          <Text type="secondary" style={{ fontSize: 11 }}>{fmt(data[0].day)}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>{fmt(data[data.length - 1].day)}</Text>
        </div>
      ) : null}
    </div>
  );
}

// Liste blanche identique à celle de l'app (aperçu fidèle) : rien d'autre que du texte mis en forme n'est inséré.
const RICH_TAGS = new Set(['P', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'S', 'UL', 'OL', 'LI', 'H2', 'H3', 'H4', 'BLOCKQUOTE', 'CODE', 'PRE', 'HR', 'A']);
export function sanitizeRich(html: string): string {
  const doc = new DOMParser().parseFromString('<body>' + (html || '') + '</body>', 'text/html');
  const walk = (node: Node, out: HTMLElement) => {
    node.childNodes.forEach((n) => {
      if (n.nodeType === 3) { out.appendChild(document.createTextNode(n.nodeValue || '')); return; }
      if (n.nodeType !== 1) return;
      const el = n as HTMLElement;
      if (!RICH_TAGS.has(el.tagName)) { walk(el, out); return; }
      const copyEl = document.createElement(el.tagName.toLowerCase());
      if (el.tagName === 'A') { const href = (el.getAttribute('href') || '').trim(); if (/^(https?:|mailto:|tel:)/i.test(href)) copyEl.setAttribute('href', href); }
      walk(el, copyEl); out.appendChild(copyEl);
    });
  };
  const box = document.createElement('div'); walk(doc.body, box); return box.innerHTML;
}
export const textOf = (html: string) => new DOMParser().parseFromString(html || '', 'text/html').body.textContent?.replace(/\s+/g, ' ').trim() || '';

// Panneau de faits : étiquette à gauche, valeur à droite — pas un tableau complet pour une fiche simple.
export function FactPanel({ title, rows, action }: { title: string; rows: [React.ReactNode, React.ReactNode][]; action?: React.ReactNode }) {
  return (
    <div style={{ border: '1px solid var(--ant-color-border)', borderRadius: 6, background: 'var(--ant-color-bg-container)', overflow: 'hidden' }}>
      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--ant-color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text strong style={{ fontSize: 13 }}>{title}</Text>{action}
      </div>
      <div style={{ padding: '0 16px' }}>
        {rows.map(([k, v], i) => (
          <div key={i} style={{ display: 'flex', gap: 16, padding: '8px 0', borderBottom: i < rows.length - 1 ? '1px solid var(--ant-color-border)' : 'none' }}>
            <Text type="secondary" style={{ fontSize: 13, minWidth: 160, flex: 'none' }}>{k}</Text>
            <Text style={{ fontSize: 13, minWidth: 0, overflowWrap: 'anywhere' }}>{v}</Text>
          </div>
        ))}
      </div>
    </div>
  );
}

// Liste de lignes dans un panneau titré (sessions, historique…) : une ligne par élément, pas un tableau complet.
export function RowList({ title, count, rows, empty }: { title: string; count: number; rows: React.ReactNode[]; empty: string }) {
  return (
    <div style={{ border: '1px solid var(--ant-color-border)', borderRadius: 6, background: 'var(--ant-color-bg-container)', overflow: 'hidden', height: '100%' }}>
      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--ant-color-border)' }}><Text strong style={{ fontSize: 13 }}>{title} ({count})</Text></div>
      <div style={{ padding: '0 16px' }}>
        {rows.length ? rows.map((r, i) => <div key={i} style={{ padding: '8px 0', borderBottom: i < rows.length - 1 ? '1px solid var(--ant-color-border)' : 'none' }}>{r}</div>)
          : <Text type="secondary" style={{ display: 'block', padding: '12px 0', fontSize: 13 }}>{empty}</Text>}
      </div>
    </div>
  );
}
