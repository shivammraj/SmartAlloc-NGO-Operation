'use strict';
const { Router } = require('express');
const { issues } = require('../data/seed');
const router = Router();

// GET /v1/analytics/heatmap
router.get('/heatmap', (req, res) => {
  const { category, days = 7 } = req.query;
  let list = issues.filter(i => i.status !== 'resolved');
  if (category && category !== 'all') list = list.filter(i => i.category === category);

  const points = list.map(i => ({
    lat:    i.location.latitude  + (Math.random() - 0.5) * 0.005,
    lng:    i.location.longitude + (Math.random() - 0.5) * 0.005,
    weight: parseFloat((i.priority_score * (i.affected_count / 10)).toFixed(2)),
  }));

  return res.json({ category: category || 'all', days: parseInt(days), point_count: points.length, points });
});

// GET /v1/analytics/trends
router.get('/trends', (req, res) => {
  const categories = ['water','health','infrastructure','food','sanitation','education','safety'];
  const trends = categories.map(cat => {
    const thisWeek = Math.floor(Math.random() * 10) + 2;
    const lastWeek = Math.floor(Math.random() * 8) + 1;
    const ratio    = lastWeek === 0 ? 1 : thisWeek / lastWeek;
    return {
      category: cat,
      district: 'Pune',
      trend_direction: ratio >= 1.5 ? 'Rising' : ratio <= 0.67 ? 'Falling' : 'Stable',
      this_week_count: thisWeek,
      last_week_count: lastWeek,
      percent_change:  parseFloat(((ratio - 1) * 100).toFixed(1)),
      sparkline_data:  Array.from({ length: 14 }, () => Math.floor(Math.random() * 6)),
    };
  });

  // Build chart data for 30 days
  const chartData = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (29 - i));
    const entry = { date: d.toISOString().slice(5,10) };
    categories.forEach(c => { entry[c] = Math.floor(Math.random() * 8); });
    return entry;
  });

  const topCat = trends.sort((a,b) => b.this_week_count - a.this_week_count)[0];
  const rising = trends.filter(t => t.trend_direction === 'Rising')[0];

  return res.json({
    trends,
    chartData,
    summary: {
      sentence_1: `This week, ${topCat.category} is the most urgent issue with ${topCat.this_week_count} reports in Pune (avg priority: 78/100).`,
      sentence_2: rising
        ? `Reports are rising sharply — up ${rising.percent_change}% compared to last week.`
        : `Report volume has remained stable compared to last week.`,
      sentence_3: 'Deploy specialised volunteer teams and coordinate with district authorities immediately.',
    },
  });
});

// GET /v1/analytics/resolution
router.get('/resolution', (req, res) => {
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (7 - i) * 7);
    return {
      week:     `W${i+1}`,
      resolved: Math.floor(Math.random() * 15) + 5,
      open:     Math.floor(Math.random() * 10) + 2,
    };
  });
  return res.json({ weeks });
});

module.exports = router;
