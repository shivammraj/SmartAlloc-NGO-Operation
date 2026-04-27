'use strict';
const { Router } = require('express');
const { v4: uuid } = require('uuid');
const { assignments, issues, volunteers } = require('../data/seed');

const router = Router();

// POST /v1/assignments
router.post('/', (req, res) => {
  const { issue_id, volunteer_id, notes = '', response_deadline_minutes = 30, source = 'admin' } = req.body;
  if (!issue_id || !volunteer_id)
    return res.status(400).json({ error: { code: 'MISSING_FIELDS', message: 'issue_id and volunteer_id required' } });

  const issue = issues.find(i => i.issue_id === issue_id);
  const vol   = volunteers.find(v => v.volunteer_id === volunteer_id);
  if (!issue) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Issue not found' } });
  if (!vol)   return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Volunteer not found' } });
  if (vol.active_assignments >= 3)
    return res.status(409).json({ error: { code: 'VOLUNTEER_AT_CAPACITY', message: 'Volunteer already has 3 active assignments' } });
  if (assignments.find(a => a.issue_id === issue_id && ['proposed','accepted','in_progress'].includes(a.status)))
    return res.status(409).json({ error: { code: 'ISSUE_ALREADY_ASSIGNED', message: 'Issue already has an active assignment' } });

  const deadline = new Date(Date.now() + response_deadline_minutes * 60_000).toISOString();
  const asgn = {
    assignment_id: uuid(), issue_id, volunteer_id, ngo_id: 'NGO001',
    assigned_by: source === 'system' ? 'system' : 'ADMIN001',
    status: 'proposed', match_score: 0.85, rank_at_assignment: 1,
    estimated_arrival_minutes: 10, notes,
    response_deadline: deadline, created_at: new Date().toISOString(),
  };
  assignments.push(asgn);

  // Update issue status and volunteer workload
  const iIdx = issues.findIndex(i => i.issue_id === issue_id);
  if (iIdx !== -1) issues[iIdx].status = 'assigned';
  const vIdx = volunteers.findIndex(v => v.volunteer_id === volunteer_id);
  if (vIdx !== -1) volunteers[vIdx].active_assignments++;

  return res.status(201).json({
    ...asgn,
    volunteer_name: vol.name,
    issue_title: issue.title,
    notifications_sent: ['fcm', 'sms'],
    message: `Assignment created. ${vol.name} notified.`,
  });
});

// GET /v1/assignments
router.get('/', (req, res) => {
  const { status, volunteer_id } = req.query;
  let list = [...assignments];
  if (status)       list = list.filter(a => a.status === status);
  if (volunteer_id) list = list.filter(a => a.volunteer_id === volunteer_id);

  const enriched = list.map(a => ({
    ...a,
    volunteer_name: volunteers.find(v => v.volunteer_id === a.volunteer_id)?.name || 'Unknown',
    issue_title:    issues.find(i => i.issue_id === a.issue_id)?.title || 'Unknown',
    issue_category: issues.find(i => i.issue_id === a.issue_id)?.category || '',
    issue_tier:     issues.find(i => i.issue_id === a.issue_id)?.priority_tier || '',
  }));

  return res.json({ assignments: enriched, total: enriched.length });
});

// PATCH /v1/assignments/:id  — state transitions
router.patch('/:id', (req, res) => {
  const idx = assignments.findIndex(a => a.assignment_id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Assignment not found' } });

  const allowed = {
    proposed:    ['accepted','declined','expired'],
    accepted:    ['in_progress','declined'],
    in_progress: ['completed','expired'],
  };
  const { status, declined_reason } = req.body;
  const curr = assignments[idx].status;

  if (status && !(allowed[curr] || []).includes(status))
    return res.status(422).json({ error: { code: 'INVALID_TRANSITION', message: `Cannot transition ${curr} → ${status}` } });

  const ts = new Date().toISOString();
  assignments[idx] = {
    ...assignments[idx], ...req.body,
    ...(status === 'accepted'    ? { accepted_at: ts }     : {}),
    ...(status === 'in_progress' ? { in_progress_at: ts }  : {}),
    ...(status === 'completed'   ? { completed_at: ts }    : {}),
    ...(declined_reason          ? { declined_reason }      : {}),
  };

  // Mirror to issue + volunteer
  if (status === 'completed') {
    const iIdx = issues.findIndex(i => i.issue_id === assignments[idx].issue_id);
    if (iIdx !== -1) { issues[iIdx].status = 'resolved'; issues[iIdx].resolved_at = ts; }
    const vIdx = volunteers.findIndex(v => v.volunteer_id === assignments[idx].volunteer_id);
    if (vIdx !== -1) { volunteers[vIdx].active_assignments = Math.max(0, volunteers[vIdx].active_assignments - 1); volunteers[vIdx].completed_assignments++; }
  }

  return res.json(assignments[idx]);
});

module.exports = router;
