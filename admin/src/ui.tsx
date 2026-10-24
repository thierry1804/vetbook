import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Stack, Tooltip, Typography, useTheme } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { tone } from './theme';

// Vocabulaire d'état fixe (succès / attention / erreur / neutre), dans la palette de la marque — jamais la
// couleur générique de MUI. Un badge texte, pas un Chip Material : la même forme partout, jamais de bordure.
const STATE: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
  actif: 'success', publie: 'success', valide: 'success', commercialise: 'success', published: 'success', ok: 'success', success: 'success',
  brouillon: 'warning', a_valider: 'warning', essai: 'warning', draft: 'warning', partial: 'warning',
  suspendu: 'error', en_retard: 'error', failed: 'error', error: 'error', echec: 'error',
  archive: 'neutral', archived: 'neutral', retire: 'neutral', resilie: 'neutral', desactive: 'neutral',
};
export const LABELS: Record<string, string> = {
  actif: 'Actif', publie: 'Publié', valide: 'Validé', commercialise: 'Commercialisé', published: 'Publiée', brouillon: 'Brouillon', a_valider: 'À valider', essai: 'Essai',
  draft: 'Brouillon', suspendu: 'Suspendu', en_retard: 'En retard', archive: 'Archivé', archived: 'Archivée', retire: 'Retiré', resilie: 'Résilié', desactive: 'Désactivé',
};

export function StatusChip({ value }: { value?: string }) {
  const { palette } = useTheme();
  if (!value) return null;
  const t = tone[palette.mode];
  const state = STATE[value] || 'neutral';
  const colors = { success: [t.success, t.successSoft], warning: [t.warning, t.warningSoft], error: [t.error, t.errorSoft], neutral: [t.textSecondary, t.neutralSoft] }[state];
  return (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: .625, px: 1, py: .25, borderRadius: '6px', bgcolor: colors[1], color: colors[0], fontSize: '0.75rem', fontWeight: 650, lineHeight: 1.6, whiteSpace: 'nowrap' }}>
      <Box component="span" sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'currentColor', flex: 'none' }} />
      {LABELS[value] || value}
    </Box>
  );
}

export const copy = (text: string) => { try { navigator.clipboard.writeText(text); } catch { /* presse-papiers indisponible */ } };

// Identifiants générés (mot de passe provisoire + secret TOTP) : affichés une seule fois, QR code à scanner.
export function CredentialsDialog({ creds, email, title, onClose }: { creds: { password: string; totp_secret: string; otpauth_url: string } | null; email: string; title: string; onClose: () => void }) {
  const [qr, setQr] = useState('');
  useEffect(() => { setQr(''); if (creds) QRCode.toDataURL(creds.otpauth_url, { margin: 1, width: 200 }).then(setQr).catch(() => setQr('')); }, [creds]);
  if (!creds) return null;
  const Row = ({ label, value }: { label: string; value: string }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.25, border: 1, borderColor: 'divider', borderRadius: 2, bgcolor: 'action.hover' }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography sx={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.8125rem', wordBreak: 'break-all' }}>{value}</Typography>
      </Box>
      <Tooltip title="Copier"><IconButton size="small" onClick={() => copy(value)} aria-label={`Copier ${label}`}><ContentCopyIcon fontSize="small" /></IconButton></Tooltip>
    </Box>
  );
  return (
    <Dialog open onClose={() => undefined} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 1.5 }}>
        <Alert severity="warning" variant="outlined">Ces informations ne seront plus affichées. Transmets-les par un canal sûr ; le mot de passe provisoire peut être changé depuis « Mon profil ».</Alert>
        <Typography variant="body2">Compte : <b>{email}</b></Typography>
        <Row label="Mot de passe provisoire" value={creds.password} />
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          {qr ? <Box component="img" src={qr} width={152} height={152} alt="QR code à scanner avec l'application d'authentification" sx={{ borderRadius: 2, border: 1, borderColor: 'divider' }} /> : null}
          <Box sx={{ flex: 1, minWidth: 220 }}><Row label="Secret TOTP (si le QR ne se scanne pas)" value={creds.totp_secret} /></Box>
        </Box>
      </DialogContent>
      <DialogActions><Button variant="contained" onClick={onClose}>J'ai noté ces informations</Button></DialogActions>
    </Dialog>
  );
}

export const PageHeader = ({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) => (
  <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 2, flexWrap: 'wrap', mb: 2.5 }}>
    <Box sx={{ flex: 1, minWidth: 240 }}>
      <Typography variant="h5">{title}</Typography>
      {subtitle ? <Typography variant="body2" color="text.secondary" sx={{ mt: .25 }}>{subtitle}</Typography> : null}
    </Box>
    {actions}
  </Box>
);

// Panneau de chiffres dense (tableau de bord) : une rangée de nombres séparés par des filets, comme un relevé —
// plutôt que des cartes icône + libellé + nombre, toutes de la même taille, qui n'ajoutent rien à la lecture.
export function MetricStrip({ items }: { items: { label: string; value: React.ReactNode; hint?: string }[] }) {
  return (
    <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, bgcolor: 'background.paper', overflow: 'hidden' }}>
      {/* Sous sm : relevé à une colonne, un filet horizontal par ligne — jamais des cartes empilées. */}
      <Box sx={{ display: { xs: 'block', sm: 'none' } }}>
        {items.map((it, i) => (
          <Box key={i} sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 2, px: 2, py: 1.25, borderBottom: (t) => (i < items.length - 1 ? `1px solid ${t.palette.divider}` : 'none') }}>
            <Typography variant="body2" color="text.secondary">{it.label}</Typography>
            <Box sx={{ textAlign: 'right' }}>
              <Typography sx={{ fontSize: '1.0625rem', fontWeight: 650, fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>{it.value}</Typography>
              {it.hint ? <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{it.hint}</Typography> : null}
            </Box>
          </Box>
        ))}
      </Box>
      {/* À partir de sm : bande dense, filets verticaux et horizontaux — le relevé promis. */}
      <Box sx={{ display: { xs: 'none', sm: 'flex' }, flexWrap: 'wrap' }}>
        {items.map((it, i) => (
          <Box key={i} sx={{
            flex: '1 1 180px', minWidth: 160, p: 2,
            borderRight: (t) => (i < items.length - 1 ? `1px solid ${t.palette.divider}` : 'none'),
            borderBottom: (t) => `1px solid ${t.palette.divider}`,
          }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: .5 }}>{it.label}</Typography>
            <Typography sx={{ fontSize: '1.375rem', fontWeight: 650, fontVariantNumeric: 'tabular-nums', lineHeight: 1.15 }}>{it.value}</Typography>
            {it.hint ? <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: .25 }}>{it.hint}</Typography> : null}
          </Box>
        ))}
      </Box>
    </Box>
  );
}

// Liste de barres en ligne (répartition) : libellé — barre — valeur, une seule couleur d'accent, pas de pastille
// par entrée. Remplace les cartes à `LinearProgress` arrondi du kit par défaut.
export function BarList({ title, rows, action }: { title: string; rows: { label: string; n: number }[]; action?: React.ReactNode }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  return (
    <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, bgcolor: 'background.paper', p: 2, height: '100%' }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
        <Typography variant="subtitle2">{title}</Typography>
        {action}
      </Stack>
      {rows.length ? (
        <Stack spacing={1.1}>
          {rows.map((r) => (
            <Box key={r.label} sx={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 44px', alignItems: 'center', columnGap: 1.5, rowGap: .375 }}>
              <Typography variant="body2" noWrap title={r.label}>{r.label}</Typography>
              <Typography variant="body2" fontWeight={650} sx={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{r.n}</Typography>
              <Box sx={{ gridColumn: '1 / -1', height: 5, borderRadius: 3, bgcolor: 'action.hover', overflow: 'hidden' }}>
                <Box sx={{ height: '100%', width: `${(r.n / max) * 100}%`, bgcolor: 'primary.main', borderRadius: 3 }} />
              </Box>
            </Box>
          ))}
        </Stack>
      ) : <Typography variant="body2" color="text.secondary">Pas encore de données.</Typography>}
    </Box>
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
      const copy = document.createElement(el.tagName.toLowerCase());
      if (el.tagName === 'A') { const href = (el.getAttribute('href') || '').trim(); if (/^(https?:|mailto:|tel:)/i.test(href)) copy.setAttribute('href', href); }
      walk(el, copy); out.appendChild(copy);
    });
  };
  const box = document.createElement('div'); walk(doc.body, box); return box.innerHTML;
}
export const textOf = (html: string) => new DOMParser().parseFromString(html || '', 'text/html').body.textContent?.replace(/\s+/g, ' ').trim() || '';

// Panneau de faits : étiquette à gauche, valeur à droite — pas un tableau HTML complet pour une fiche simple.
export function FactPanel({ title, rows, action }: { title: string; rows: [React.ReactNode, React.ReactNode][]; action?: React.ReactNode }) {
  return (
    <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, bgcolor: 'background.paper', overflow: 'hidden' }}>
      <Box sx={{ px: 2, py: 1.25, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="subtitle2">{title}</Typography>{action}
      </Box>
      <Box sx={{ px: 2, py: .5 }}>
        {rows.map(([k, v], i) => (
          <Box key={i} sx={{ display: 'flex', gap: 2, py: 1, borderBottom: i < rows.length - 1 ? 1 : 0, borderColor: 'divider' }}>
            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 160, flex: 'none' }}>{k}</Typography>
            <Typography variant="body2" sx={{ minWidth: 0, overflowWrap: 'anywhere' }}>{v}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

// Liste de lignes dans un panneau titré (sessions, historique…) : une ligne par élément, pas un tableau complet.
export function RowList({ title, count, rows, empty }: { title: string; count: number; rows: React.ReactNode[]; empty: string }) {
  return (
    <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, bgcolor: 'background.paper', overflow: 'hidden', height: '100%' }}>
      <Box sx={{ px: 2, py: 1.25, borderBottom: 1, borderColor: 'divider' }}><Typography variant="subtitle2">{title} ({count})</Typography></Box>
      <Box sx={{ px: 2, py: .5 }}>
        {rows.length ? rows.map((r, i) => <Box key={i} sx={{ py: 1, borderBottom: i < rows.length - 1 ? 1 : 0, borderColor: 'divider' }}>{r}</Box>)
          : <Typography variant="body2" color="text.secondary" sx={{ py: 1.5 }}>{empty}</Typography>}
      </Box>
    </Box>
  );
}

// Étiquette catégorielle neutre (rôle, code technique…) : même forme que StatusChip, teinte neutre fixe —
// jamais la couleur "primary" générique de MUI réservée aux actions et à la sélection.
export function Pill({ label }: { label: React.ReactNode }) {
  const { palette } = useTheme();
  const t = tone[palette.mode];
  return (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', px: 1, py: .25, borderRadius: '6px', bgcolor: t.neutralSoft, color: t.text, fontSize: '0.75rem', fontWeight: 650, lineHeight: 1.6, whiteSpace: 'nowrap' }}>
      {label}
    </Box>
  );
}
