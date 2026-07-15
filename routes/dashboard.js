const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const Client = require('../models/clients');
const User = require('../models/users');
const Task = require('../models/tasks');
const Payment = require('../models/payments');

// GET /dashboard
router.get('/dashboard', requireAuth, async (req, res) => {
  try {
    if (req.session.role === 'admin') {
      // 1. Parse selected month filter
      let selectedYear, selectedMonth, selectedMonthStr;
      if (req.query.month) {
        const parts = req.query.month.split('-');
        selectedYear = parseInt(parts[0]);
        selectedMonth = parseInt(parts[1]);
        selectedMonthStr = req.query.month;
      } else {
        const d = new Date();
        selectedYear = d.getFullYear();
        selectedMonth = d.getMonth() + 1;
        selectedMonthStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
      }

      // 2. Fetch admin stats
      const monthlyRevenue = await Payment.getRevenueForMonth(selectedYear, selectedMonth);
      const pendingSummary = await Payment.getPendingPaymentsSummary();
      const upcomingPayments = await Payment.getUpcomingPaymentsList();
      const clientStats = await Client.getAdminStats();
      const taskStats = await Task.getCountsByStatus();
      
      const teamList = await User.getAllWithTaskCount();
      const totalTeamMembers = teamList.filter(u => u.role === 'team_member').length;

      // 3. Generate 6-month revenue trend
      const rawTrend = await Payment.getSixMonthRevenueTrend();
      
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const today = new Date();
      const chartData = [];
      
      for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        chartData.push({
          year: d.getFullYear(),
          month: d.getMonth() + 1,
          label: `${monthNames[d.getMonth()]} ${d.getFullYear()}`,
          revenue: 0
        });
      }

      rawTrend.forEach(p => {
        const pDate = new Date(p.payment_date);
        const pYear = pDate.getFullYear();
        const pMonth = pDate.getMonth() + 1;
        const match = chartData.find(m => m.year === pYear && m.month === pMonth);
        if (match) {
          match.revenue += parseFloat(p.amount);
        }
      });

      res.render('dashboard/admin', {
        selectedMonth: selectedMonthStr,
        monthlyRevenue,
        pendingSummary,
        upcomingPayments,
        clientStats,
        taskStats,
        totalTeamMembers,
        chartLabels: chartData.map(c => c.label),
        chartValues: chartData.map(c => c.revenue)
      });
      
    } else {
      // Team Member dashboard
      const teamMemberId = req.session.userId;
      
      const taskStats = await Task.getCountsByStatus(teamMemberId);
      const recentClients = await Client.getRecentClientsForTeam(teamMemberId);
      
      res.render('dashboard/team', {
        taskStats,
        recentClients
      });
    }
  } catch (err) {
    console.error('Dashboard Load Error:', err);
    req.flash('error', 'Failed to load dashboard data.');
    res.render('dashboard/admin', {
      selectedMonth: '',
      monthlyRevenue: 0,
      pendingSummary: { amount: 0, count: 0 },
      upcomingPayments: [],
      clientStats: { total_clients: 0, lead_count: 0, ongoing_count: 0, completed_count: 0, on_hold_count: 0 },
      taskStats: { total: 0, not_started: 0, in_progress: 0, under_review: 0, completed: 0 },
      totalTeamMembers: 0,
      chartLabels: [],
      chartValues: []
    });
  }
});

module.exports = router;
