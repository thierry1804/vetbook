import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Tooltip, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

const TONES: Record<string, 'success' | 'warning' | 'error' | 'default' | 'info'> = {
  actif: 'success', publie: 'success', valide: 'success', commercialise: 'success', published: 'success', ok: 'success', success: 'success',
  brouillon: 'warning', a_valider: 'warning', essai: 'warning', draft: 'warning', partial: 'warning',
  suspendu: 'error', en_retard: 'error', failed: 'error', error: 'error', echec: 'error',
  archive: 'default', archived: 'default', retire: 'default', resilie: 'default', desactive: 'default',
};
export const LABELS: Record<string, string> = {
  actif: 'Actif', publie: 'Publié', valide: 'Validé', commercialise: 'Commercialisé', published: 'Publiée', brouillon: 'Brouillon', a_valider: 'À valider', essai: 'Essai',
  draft: 'Brouillon', suspendu: 'Suspendu', en_retard: 'En retard', archive: 'Archivé', archived: 'Archivée', retire: 'Retiré', resilie: 'Résilié', desactive: 'Désactivé',
};
export const StatusChip = ({ value }: { value?: string }) => (value ? <Chip size="small" variant="outlined" color={TONES[value] || 'default'} label={LABELS[value] || value} sx={{ fontWeight: 600 }} /> : null);

export const copy = (text: string) => { try { navigator.clipboard.writeText(text); } catch { /* presse-papiers indisponible */ } };

// Identifiants générés (mot de passe provisoire + secret TOTP) : affichés une seule fois, QR code à scanner.
export function CredentialsDialog({ creds, email, title, onClose }: { creds: { password: string; totp_secret: string; otpauth_url: string } | null; email: string; title: string; onClose: () => void }) {
  const [qr, setQr] = useState('');
  useEffect(() => { setQr(''); if (creds) QRCode.toDataURL(creds.otpauth_url, { margin: 1, width: 200 }).then(setQr).catch(() => setQr('')); }, [creds]);
  if (!creds) return null;
  const Row = ({ label, value }: { label: string; value: string }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.25, border: 1, borderColor: 'divider', borderRadius: 2 }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography sx={{ fontFamily: 'ui-monospace, monospace', wordBreak: 'break-all' }}>{value}</Typography>
      </Box>
      <Tooltip title="Copier"><IconButton onClick={() => copy(value)} aria-label={`Copier ${label}`}><ContentCopyIcon fontSize="small" /></IconButton></Tooltip>
    </Box>
  );
  return (
    <Dialog open onClose={() => undefined} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 1.5 }}>
        <Alert severity="warning">Ces informations ne seront plus affichées. Transmets-les par un canal sûr ; le mot de passe provisoire peut être changé depuis « Mon profil ».</Alert>
        <Typography variant="body2">Compte : <b>{email}</b></Typography>
        <Row label="Mot de passe provisoire" value={creds.password} />
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          {qr ? <img src={qr} width={160} height={160} alt="QR code à scanner avec l'application d'authentification" style={{ borderRadius: 8, border: '1px solid rgba(128,128,128,.3)' }} /> : null}
          <Box sx={{ flex: 1, minWidth: 220 }}><Row label="Secret TOTP (si le QR ne se scanne pas)" value={creds.totp_secret} /></Box>
        </Box>
      </DialogContent>
      <DialogActions><Button variant="contained" onClick={onClose}>J'ai noté ces informations</Button></DialogActions>
    </Dialog>
  );
}

export const PageHeader = ({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) => (
  <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 2, flexWrap: 'wrap', mb: 2 }}>
    <Box sx={{ flex: 1, minWidth: 240 }}>
      <Typography variant="h5">{title}</Typography>
      {subtitle ? <Typography variant="body2" color="text.secondary">{subtitle}</Typography> : null}
    </Box>
    {actions}
  </Box>
);

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
