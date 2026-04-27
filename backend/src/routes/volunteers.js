'use strict';
const { Router } = require('express');
const { v4: uuid } = require('uuid');
const { volunteers } = require('../data/seed');

const router = Router();

// POST /v1/volunteers
router.post('/', (req, res) => {
  const { name, phone, skills, languages, location } = req.body;
  if (!name || !phone || !skills || !location)
    return res.status(400).json({ error: { code: 'MISSING_FIELDS', message: 'name, phone, skills, location required' } });
  if (volunteers.find(v => v.phone === phone))
    return res.status(409).json({ error: { code: 'DUPLICATE_PHONE', message: 'Phone already registered' } });

  const vol = {
    volunteer_id: uuid(), ngo_id: 'NGO001', name, phone, skills, languages: languages || ['hindi'],
    availability_status: 'available', active_assignments: 0, completed_assignments: 0,
    response_rate: 0.5, reliability_score: 0.5, distance_willing_km: 10,
    latitude: location.latitude, longitude: location.longitude,
    location_label: `${location.latitude}, ${location.longitude}`,
    verified: false, hours_per_week: 10, hours_worked_this_week: 0, volunteer_fatigue_score: 0,
    created_at: new Date().toISOString(),
  };
  volunteers.push(vol);
  return res.status(201).json({ ...vol, message: 'Volunteer registered. Pending admin verification.' });
});

// GET /v1/volunteers
router.get('/', (req, res) => {
  const { skill, availability, page_size = 50 } = req.query;
  let list = [...volunteers];
  if (skill)        list = list.filter(v => v.skills.includes(skill));
  if (availability) list = list.filter(v => v.availability_status === availability);
  return res.json({ volunteers: list.slice(0, parseInt(page_size)), total: list.length });
});

// GET /v1/volunteers/:id
router.get('/:id', (req, res) => {
  const vol = volunteers.find(v => v.volunteer_id === req.params.id);
  if (!vol) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Volunteer not found' } });
  return res.json(vol);
});

// PATCH /v1/volunteers/:id
router.patch('/:id', (req, res) => {
  const idx = volunteers.findIndex(v => v.volunteer_id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Volunteer not found' } });
  volunteers[idx] = { ...volunteers[idx], ...req.body };
  return res.json(volunteers[idx]);
});

module.exports = router;
