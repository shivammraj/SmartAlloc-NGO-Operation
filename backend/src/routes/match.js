'use strict';
const { Router } = require('express');
const { issues, volunteers } = require('../data/seed');

const router = Router();

// Haversine distance in km
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371, toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// Jaccard similarity
function jaccard(a = [], b = []) {
  const setA = new Set(a), setB = new Set(b);
  const inter = [...setA].filter(x => setB.has(x)).length;
  const union = new Set([...setA, ...setB]).size;
  if (!union) return 0.5;
  return inter / union;
}

// Availability score
function availScore(status) {
  if (status === 'available') return 1.0;
  if (status === 'offline')   return 0.3;
  return 0.0;
}

// GET /v1/match/:issue_id
router.get('/:issue_id', (req, res) => {
  const issue = issues.find(i => i.issue_id === req.params.issue_id);
  if (!issue) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Issue not found' } });

  const topN       = parseInt(req.query.top_n) || 5;
  const maxDistKm  = parseFloat(req.query.max_distance_km) || 20;
  const reqSkills  = issue.required_skills || ['first_aid'];

  const candidates = volunteers
    .filter(v => v.verified && v.active_assignments < 3)
    .map(v => {
      const distKm   = haversine(v.latitude, v.longitude, issue.location.latitude, issue.location.longitude);
      if (distKm > maxDistKm) return null;

      const sm  = jaccard(reqSkills, v.skills);
      const ds  = Math.max(0, 1 - distKm / v.distance_willing_km);
      const avs = availScore(v.availability_status);
      const ws  = Math.max(0, 1 - v.active_assignments / 3);
      const rrs = v.response_rate;

      const raw   = 0.35*sm + 0.25*ds + 0.20*avs + 0.10*ws + 0.10*rrs;
      const final = parseFloat(Math.max(0, Math.min(1, raw)).toFixed(4));

      return {
        volunteer_id:             v.volunteer_id,
        name:                     v.name,
        phone:                    v.phone,
        skills:                   v.skills,
        distance_km:              parseFloat(distKm.toFixed(2)),
        availability_status:      v.availability_status,
        composite_score:          final,
        estimated_arrival_minutes: Math.round((distKm / 25) * 60),
        breakdown: {
          skill_match:   parseFloat(sm.toFixed(4)),
          distance:      parseFloat(ds.toFixed(4)),
          availability:  parseFloat(avs.toFixed(4)),
          workload:      parseFloat(ws.toFixed(4)),
          response_rate: parseFloat(rrs.toFixed(4)),
          geo_penalty:   0,
          fatigue_penalty: 0,
          raw_composite: parseFloat(raw.toFixed(4)),
          final_score:   final,
        },
        match_reasons: [
          sm  > 0.5 ? `skill_match: ${v.skills.join(', ')}` : null,
          `proximity: ${distKm.toFixed(1)}km`,
          `reliability: ${v.reliability_score}`,
        ].filter(Boolean),
        rank: 0,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.composite_score - a.composite_score)
    .slice(0, topN)
    .map((m, i) => ({ ...m, rank: i + 1 }));

  const topScore = candidates[0]?.composite_score ?? 0;
  const policy   = topScore > 0.75 ? 'auto_assign'
                 : topScore > 0.50 ? 'suggest_admin'
                 : 'hard_to_staff';

  return res.json({
    issue_id:   issue.issue_id,
    issue_title: issue.title,
    policy,
    policy_reason: policy === 'auto_assign'   ? `Top score ${topScore} > 0.75. Auto-assign recommended.`
                 : policy === 'suggest_admin' ? `Score ${topScore} — admin confirmation required.`
                 : 'Best score < 0.50 — issue flagged as hard to staff.',
    scored_at: new Date().toISOString(),
    matches: candidates,
  });
});

module.exports = router;
