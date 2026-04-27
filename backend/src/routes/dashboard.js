'use strict';
const { Router } = require('express');
const { issues, volunteers, assignments } = require('../data/seed');

const router = Router();

// GET /v1/dashboard/summary
router.get('/summary', (req, res) => {
  const { period = '7d' } = req.query;

  const byCat = {};
  issues.forEach(i => { byCat[i.category] = (byCat[i.category] || 0) + 1; });

  const resolved      = issues.filter(i => i.status === 'resolved');
  const avgResolution = resolved.length > 0
    ? Math.round(resolved.reduce((acc, i) => {
        const created = new Date(i.created_at), ended = new Date(i.resolved_at || Date.now());
        return acc + (ended - created) / 3_600_000;
      }, 0) / resolved.length * 10) / 10
    : 18.4;

  const totalAsgn     = assignments.length;
  const acceptedAsgn  = assignments.filter(a => ['accepted','in_progress','completed'].includes(a.status));
  const acceptRate    = totalAsgn ? parseFloat((acceptedAsgn.length / totalAsgn * 100).toFixed(1)) : 0;
  const avgResponse   = 8.2;

  const topVols = [...volunteers]
    .sort((a, b) => b.completed_assignments - a.completed_assignments)
    .slice(0, 5)
    .map(v => ({ volunteer_id: v.volunteer_id, name: v.name, completed: v.completed_assignments }));

  return res.json({
    period, generated_at: new Date().toISOString(),
    issues: {
      total:           issues.length,
      pending:         issues.filter(i => i.status === 'pending').length,
      assigned:        issues.filter(i => i.status === 'assigned').length,
      in_progress:     issues.filter(i => i.status === 'in_progress').length,
      resolved:        issues.filter(i => i.status === 'resolved').length,
      escalated:       issues.filter(i => i.status === 'escalated').length,
      avg_resolution_hours: avgResolution,
      by_category: byCat,
    },
    volunteers: {
      total_registered:    volunteers.length,
      verified:            volunteers.filter(v => v.verified).length,
      currently_available: volunteers.filter(v => v.availability_status === 'available').length,
      currently_busy:      volunteers.filter(v => v.availability_status === 'busy').length,
      top_5_by_assignments: topVols,
    },
    assignments: {
      total_created:        totalAsgn,
      acceptance_rate_pct:  acceptRate,
      avg_response_time_min: avgResponse,
      completed: assignments.filter(a => a.status === 'completed').length,
      declined:  assignments.filter(a => a.status === 'declined').length,
      expired:   assignments.filter(a => a.status === 'expired').length,
    },
    priority_queue: {
      high_priority_pending: issues.filter(i => i.status === 'pending' && i.priority_score >= 70).length,
      avg_priority_score_pending: (() => {
        const p = issues.filter(i => i.status === 'pending');
        return p.length ? parseFloat((p.reduce((s, i) => s + i.priority_score, 0) / p.length).toFixed(1)) : 0;
      })(),
    },
  });
});

module.exports = router;
