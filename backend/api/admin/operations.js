import { listSubscriptions } from '../_lib/subscription-read.js';
import { withClient } from '../_lib/db.js';
import { requireAdmin, permits } from '../_lib/admin-auth.js';
import { getSetting } from '../_lib/entitlements.js';
import { RESOURCES } from './resources.js';
import { groupPlanOffers } from '../_lib/plan-offers.js';
import { compareReleaseContent } from '../_lib/release-comparison.js';

const listUrl = (resource, filter) => `/${resource}?${new URLSearchParams({ filter: JSON.stringify(filter) })}`;
export function mountOperations(router) {
  router.get('/plan-catalog', requireAdmin('billing.read'), async (_req, res, next) => {
    try {
      const plans = (await withClient((c) => c.query('select * from plans order by sort_order, code'))).rows;
      res.json({ offers: groupPlanOffers(plans), variantCount: plans.length });
    } catch (error) { next(error); }
  });

  router.get('/work-queue', requireAdmin('dashboard.read'), async (req, res, next) => {
    try {
      const items = await withClient(async (c) => {
        const out = [];
        const add = async (permission, key, label, sql, to) => {
          if (!permits(req.admin.perms, permission)) return;
          const count = Number((await c.query(sql)).rows[0].n);
          out.push({ key, label, count, to });
        };
        await add('contents.read', 'tips', 'Conseils en brouillon', "select count(*) n from content_tips where status = 'brouillon'", listUrl('tips', { status: 'brouillon' }));
        await add('contents.read', 'events', 'Événements en brouillon', "select count(*) n from content_events where status = 'brouillon'", listUrl('events', { status: 'brouillon' }));
        await add('contents.read', 'pages', 'Pages en brouillon', "select count(*) n from content_pages where status = 'brouillon'", listUrl('pages', { status: 'brouillon' }));
        await add('directory.read', 'clinics', 'Cliniques à valider', "select count(*) n from directory_clinics where status = 'a_valider'", listUrl('clinics', { status: 'a_valider' }));
        await add('referentiels.read', 'releases', 'Versions en attente de publication', "select count(*) n from ref_releases where status = 'draft'", '/releases');
        await add('notifications.read', 'messages', 'Envois échoués (7 jours)', "select count(*) n from message_log where status = 'echec' and created_at >= now() - interval '7 days'", listUrl('messages', { status: 'echec', recent_days: 7 }));
        await add('notifications.read', 'jobs', 'Exécutions échouées (7 jours)', "select count(*) n from job_runs where status = 'echec' and started_at >= now() - interval '7 days'", listUrl('jobs', { status: 'echec', recent_days: 7 }));
        await add('notifications.read', 'jobs-partial', 'Exécutions partielles (7 jours)', "select count(*) n from job_runs where status = 'partial' and started_at >= now() - interval '7 days'", listUrl('jobs', { status: 'partial', recent_days: 7 }));
        if(permits(req.admin.perms,'subscriptions.read')){
          const {counts}=await listSubscriptions(c);
          for(const [view,label] of [['soon','Abonnements à échéance sous 7 jours'],['essai','Essais en cours'],['expire','Périodes expirées'],['prevu','Activations prévues']])out.push({key:'subscriptions-'+view,label,count:counts[view],to:'/subscriptions?view='+view});
          const requests=Number((await c.query("select count(*) n from subscription_requests where status in ('nouveau','en_cours')")).rows[0].n);
          out.push({key:'subscription-requests',label:'Demandes d’abonnement à traiter',count:requests,to:'/subscription-requests?status=open'});
        }
        return out;
      });
      res.json({ items, updatedAt: new Date().toISOString() });
    } catch (error) { next(error); }
  });

  router.get('/releases/:version/comparison', requireAdmin('referentiels.read'), async (req, res, next) => {
    try {
      if (!/^\d+$/.test(req.params.version)) return res.status(400).json({ error: 'Version invalide.' });
      const result = await withClient(async (c) => {
        const draft = (await c.query('select version, status, created_by, note, content from ref_releases where version = $1', [req.params.version])).rows[0];
        if (!draft) return null;
        const published = (await c.query("select version, content from ref_releases where status = 'published' order by version desc limit 1")).rows[0];
        const fourEyes = await getSetting(c, 'four_eyes_publish', false);
        return { version: draft.version, status: draft.status, note: draft.note, baseVersion: published?.version || 0,
          canPublish: draft.status === 'draft' && permits(req.admin.perms, 'referentiels.publish') && !(fourEyes && draft.created_by === req.admin.id),
          ownDraft: fourEyes && draft.created_by === req.admin.id,
          sections: compareReleaseContent(published?.content || {}, draft.content || {}) };
      });
      if (!result) return res.status(404).json({ error: 'Version introuvable.' });
      res.json(result);
    } catch (error) { next(error); }
  });

  router.get('/record-history/:resource/:id', requireAdmin('audit.read'), async (req, res, next) => {
    try {
      const def = Object.hasOwn(RESOURCES, req.params.resource) ? RESOURCES[req.params.resource] : null;
      if (!def || !permits(req.admin.perms, def.perms.read)) return res.status(403).json({ error: 'Accès interdit.' });
      const rows = (await withClient((c) => c.query(
        'select id, action, admin_email, created_at, reason, before, after from admin_audit_log where target_type = $1 and target_id = $2 order by created_at desc, id desc limit 50',
        [req.params.resource, req.params.id]))).rows;
      res.json(rows);
    } catch (error) { next(error); }
  });
}
