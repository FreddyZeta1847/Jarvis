import React, { useState, useMemo } from 'react';
import { ResponsivePie } from '@nivo/pie';
import { ResponsiveBar } from '@nivo/bar';
import './ExpensesDashboard.css';

const PERIODS = [
  { key: '1W', days: 7 },
  { key: '1M', days: 30 },
  { key: '3M', days: 90 },
  { key: 'YTD', days: null },
];

const NIVO_THEME = {
  text: { fill: '#94a3b8', fontSize: 11 },
  axis: {
    ticks: { text: { fill: '#475569', fontSize: 10 } },
    legend: { text: { fill: '#94a3b8', fontSize: 12 } },
  },
  grid: { line: { stroke: 'rgba(255,255,255,0.06)', strokeWidth: 1 } },
  tooltip: {
    container: {
      background: 'rgba(16, 24, 48, 0.95)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '8px',
      color: '#f1f5f9',
      fontSize: '12px',
      padding: '8px 12px',
      backdropFilter: 'blur(12px)',
    },
  },
};

function getDateRange(periodKey) {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let start;

  if (periodKey === 'YTD') {
    start = new Date(now.getFullYear(), 0, 1);
  } else {
    const config = PERIODS.find(p => p.key === periodKey);
    start = new Date(end);
    start.setDate(start.getDate() - config.days + 1);
  }

  return { start, end };
}

function formatDate(d) {
  return d.toISOString().split('T')[0];
}

function generateAllDates(start, end) {
  const dates = [];
  const current = new Date(start);
  while (current <= end) {
    dates.push(formatDate(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

function CenteredMetric({ centerX, centerY, total }) {
  return (
    <text
      x={centerX}
      y={centerY}
      textAnchor="middle"
      dominantBaseline="central"
      style={{ pointerEvents: 'none' }}
    >
      <tspan x={centerX} dy="-0.4em" style={{ fontSize: '1.1rem', fontWeight: 700, fill: '#f1f5f9' }}>
        {total.toFixed(0)}
      </tspan>
      <tspan x={centerX} dy="1.4em" style={{ fontSize: '0.65rem', fontWeight: 500, fill: '#475569' }}>
        EUR
      </tspan>
    </text>
  );
}

function ExpensesDashboard({ expenses, categories }) {
  const [period, setPeriod] = useState('1M');
  const [selectedDay, setSelectedDay] = useState(null);

  const { start, end } = useMemo(() => getDateRange(period), [period]);

  // Filter expenses by selected period
  const filteredExpenses = useMemo(() => {
    const startStr = formatDate(start);
    const endStr = formatDate(end);
    return expenses.filter(e => e.date >= startStr && e.date <= endStr);
  }, [expenses, start, end]);

  const total = useMemo(
    () => filteredExpenses.reduce((sum, e) => sum + e.amount, 0),
    [filteredExpenses]
  );

  // Donut chart data
  const donutData = useMemo(() => {
    const totals = {};
    filteredExpenses.forEach(e => {
      const cat = (e.category || 'other').toLowerCase();
      totals[cat] = (totals[cat] || 0) + e.amount;
    });
    return Object.entries(totals)
      .sort(([, a], [, b]) => b - a)
      .map(([id, value]) => ({
        id,
        label: categories[id]?.label || id,
        value: Math.round(value * 100) / 100,
        color: categories[id]?.color || '#64748b',
      }));
  }, [filteredExpenses, categories]);

  // Bar chart data
  const barData = useMemo(() => {
    const dailyTotals = {};
    filteredExpenses.forEach(e => {
      dailyTotals[e.date] = (dailyTotals[e.date] || 0) + e.amount;
    });

    const allDates = generateAllDates(start, end);
    return allDates.map(date => ({
      date,
      day: parseInt(date.slice(8), 10).toString(),
      amount: Math.round((dailyTotals[date] || 0) * 100) / 100,
    }));
  }, [filteredExpenses, start, end]);

  // Determine which tick labels to show on x-axis
  const barTickValues = useMemo(() => {
    const len = barData.length;
    if (len <= 10) return barData.map(d => d.date);
    const step = Math.ceil(len / 6);
    return barData
      .filter((_, i) => i === 0 || i === len - 1 || i % step === 0)
      .map(d => d.date);
  }, [barData]);

  // Format tick label to show day number
  const formatTick = (value) => {
    const day = parseInt(value.slice(8), 10);
    const month = parseInt(value.slice(5, 7), 10);
    return barData.length > 35 ? `${day}/${month}` : day.toString();
  };

  // Expenses for selected day popup
  const dayExpenses = useMemo(() => {
    if (!selectedDay) return [];
    return filteredExpenses
      .filter(e => e.date === selectedDay)
      .sort((a, b) => b.amount - a.amount);
  }, [filteredExpenses, selectedDay]);

  const handleBarClick = (bar) => {
    if (bar.data.amount > 0) {
      setSelectedDay(prev => prev === bar.data.date ? null : bar.data.date);
    }
  };

  const formatSelectedDate = (dateStr) => {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  if (filteredExpenses.length === 0) {
    return (
      <div className="dashboard-container">
        <div className="period-filter-bar">
          {PERIODS.map(p => (
            <button
              key={p.key}
              className={`period-pill ${period === p.key ? 'active' : ''}`}
              onClick={() => setPeriod(p.key)}
            >
              {p.key}
            </button>
          ))}
        </div>
        <div className="dashboard-empty">
          <p>No expenses for this period</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Period filter */}
      <div className="period-filter-bar">
        {PERIODS.map(p => (
          <button
            key={p.key}
            className={`period-pill ${period === p.key ? 'active' : ''}`}
            onClick={() => { setPeriod(p.key); setSelectedDay(null); }}
          >
            {p.key}
          </button>
        ))}
      </div>

      {/* Category donut chart */}
      <div className="dashboard-card">
        <div className="dashboard-card-header">
          <span className="dashboard-card-title">By Category</span>
          <span className="dashboard-card-subtitle">
            {filteredExpenses.length} expense{filteredExpenses.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="donut-chart-container">
          <ResponsivePie
            data={donutData}
            colors={d => d.data.color}
            margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
            innerRadius={0.62}
            padAngle={2}
            cornerRadius={4}
            activeOuterRadiusOffset={4}
            enableArcLabels={false}
            enableArcLinkLabels={false}
            theme={NIVO_THEME}
            tooltip={({ datum }) => (
              <div style={NIVO_THEME.tooltip.container}>
                <strong>{datum.label}</strong>: {datum.value.toFixed(2)} EUR
              </div>
            )}
            layers={[
              'arcs',
              'arcLabels',
              'arcLinkLabels',
              'legends',
              (props) => <CenteredMetric {...props} total={total} />,
            ]}
          />
        </div>
        <div className="donut-legend">
          {donutData.map(d => (
            <div key={d.id} className="donut-legend-item">
              <span className="donut-legend-dot" style={{ background: d.color }} />
              <span className="donut-legend-label">{d.label}</span>
              <span className="donut-legend-value">{d.value.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Daily bar chart */}
      <div className="dashboard-card">
        <div className="dashboard-card-header">
          <span className="dashboard-card-title">Daily Spend</span>
          <span className="dashboard-card-subtitle">
            Avg {(total / barData.length).toFixed(1)}/day
          </span>
        </div>
        <div className="bar-chart-container">
          <ResponsiveBar
            data={barData}
            keys={['amount']}
            indexBy="date"
            margin={{ top: 8, right: 8, bottom: 28, left: 40 }}
            padding={barData.length > 60 ? 0.15 : 0.3}
            colors={() => 'var(--accent)'}
            borderRadius={3}
            enableLabel={false}
            enableGridX={false}
            gridYValues={3}
            theme={NIVO_THEME}
            axisBottom={{
              tickValues: barTickValues,
              format: formatTick,
              tickSize: 0,
              tickPadding: 6,
            }}
            axisLeft={{
              tickSize: 0,
              tickPadding: 8,
              tickValues: 3,
              format: v => v > 0 ? `${v}` : '',
            }}
            tooltip={({ data }) => (
              <div style={NIVO_THEME.tooltip.container}>
                <strong>{formatSelectedDate(data.date)}</strong>
                <br />
                {data.amount.toFixed(2)} EUR
              </div>
            )}
            onClick={handleBarClick}
            role="application"
            ariaLabel="Daily expenses chart"
          />
        </div>
      </div>

      {/* Day detail popup */}
      {selectedDay && dayExpenses.length > 0 && (
        <div className="day-detail-overlay" onClick={() => setSelectedDay(null)}>
          <div className="day-detail-sheet" onClick={e => e.stopPropagation()}>
            <div className="day-detail-handle" />
            <div className="day-detail-header">
              <span className="day-detail-date">{formatSelectedDate(selectedDay)}</span>
              <span className="day-detail-total">
                {dayExpenses.reduce((s, e) => s + e.amount, 0).toFixed(2)} EUR
              </span>
            </div>
            <div className="day-detail-list">
              {dayExpenses.map(e => (
                <div key={e.id} className="day-detail-item">
                  <span
                    className="day-detail-dot"
                    style={{ background: categories[(e.category || '').toLowerCase()]?.color || '#64748b' }}
                  />
                  <div className="day-detail-info">
                    <span className="day-detail-desc">{e.description}</span>
                    <span className="day-detail-cat">
                      {categories[(e.category || '').toLowerCase()]?.label || e.category}
                    </span>
                  </div>
                  <span className="day-detail-amount">{e.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExpensesDashboard;
