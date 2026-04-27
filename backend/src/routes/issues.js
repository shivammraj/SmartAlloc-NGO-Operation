'use strict';
const { Router } = require('express');
const { v4: uuid } = require('uuid');
const { issues } = require('../data/seed');

const router = Router();

// POST /v1/issues
router.post('/', (req, res) => {
  const { title, description, category, severity, affected_count, location, offline_created = false } = req.body;
  if (!title || !category || !location)
    return res.status(400).json({ error: { code: 'MISSING_FIELDS', message: 'title, category, location required' } });

  const newIssue = {
    issue_id: uuid(), ngo_id: 'NGO001', reported_by: 'VOL001',
    title, description, category, severity: severity || 3,
    status: 'pending', priority_score: 50.0, priority_tier: 'Medium', priority_rank: 99,
    affected_count: affected_count || 1, location,
    location_label: `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`,
    offline_created, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  };
  issues.unshift(newIssue);
  return res.status(201).json({ ...newIssue, message: 'Issue submitted. Volunteers being matched.' });
});

// GET /v1/issues
router.get('/', (req, res) => {
  const { status, priority_min = 0, category, page_size = 20, page_token } = req.query;
  let list = [...issues];
  if (status)   list = list.filter(i => i.status === status);
  if (category) list = list.filter(i => i.category === category);
  list = list.filter(i => i.priority_score >= parseFloat(priority_min));
  list.sort((a, b) => b.priority_score - a.priority_score);

  const size  = Math.min(parseInt(page_size), 100);
  const start = page_token ? parseInt(Buffer.from(page_token, 'base64').toString()) : 0;
  const slice = list.slice(start, start + size);
  const next  = start + size < list.length ? Buffer.from(String(start + size)).toString('base64') : null;

  return res.json({ issues: slice, total_count: list.length, next_page_token: next });
});

// GET /v1/issues/:id
router.get('/:id', (req, res) => {
  const issue = issues.find(i => i.issue_id === req.params.id);
  if (!issue) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Issue not found' } });
  return res.json({
    issue: { ...issue, priority_components: { severity: issue.severity || 3, frequency: 2.1, urgency: 1.5, recency_decay: 0.87 } },
  });
});

// PATCH /v1/issues/:id
router.patch('/:id', (req, res) => {
  const idx = issues.findIndex(i => i.issue_id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Issue not found' } });
  issues[idx] = { ...issues[idx], ...req.body, updated_at: new Date().toISOString() };
  return res.json(issues[idx]);
});

module.exports = router;
