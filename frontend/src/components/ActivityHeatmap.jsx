import React, { useState, useMemo, useRef, useEffect } from 'react';
import '../styles/heatmap.css';

/**
 * GitHub-style contribution heatmap for the last 365 days.
 */
export function ActivityHeatmap({ activities = [], solvedProblems = [] }) {
  const [selectedRange, setSelectedRange] = useState('past12');
  const [selectedTheme, setSelectedTheme] = useState('emerald');
  const [tooltip, setTooltip] = useState({ visible: false, text: '', x: 0, y: 0 });
  const containerRef = useRef(null);

  // Aggregate activity counts by YYYY-MM-DD key
  const activityMap = useMemo(() => {
    const map = {};

    // 1. Process explicit activities array
    if (Array.isArray(activities)) {
      activities.forEach(act => {
        if (!act) return;
        const ts = act.timestamp || act.createdAt || act.date;
        if (!ts) return;
        const d = new Date(ts);
        if (isNaN(d.getTime())) return;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        map[key] = (map[key] || 0) + 1;
      });
    }

    // 2. Process solved problems if timestamps available or attach to activities
    if (Array.isArray(solvedProblems)) {
      solvedProblems.forEach(sp => {
        if (typeof sp === 'object' && sp.solvedAt) {
          const d = new Date(sp.solvedAt);
          if (!isNaN(d.getTime())) {
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            map[key] = (map[key] || 0) + 1;
          }
        }
      });
    }

    return map;
  }, [activities, solvedProblems]);

  // Build Grid (Weeks x 7 Days)
  const { weeks, monthLabels } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let startDate;
    let endDate;

    if (selectedRange === '2026') {
      startDate = new Date(2026, 0, 1);
      endDate = new Date(2026, 11, 31);
    } else {
      endDate = new Date(today);
      startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 364);
    }

    // Align to full calendar weeks so columns are weeks and rows are Sun-Sat.
    const gridStart = new Date(startDate);
    gridStart.setDate(gridStart.getDate() - gridStart.getDay());
    gridStart.setHours(0, 0, 0, 0);

    const gridEnd = new Date(endDate);
    gridEnd.setDate(gridEnd.getDate() + (6 - gridEnd.getDay()));
    gridEnd.setHours(23, 59, 59, 999);

    const weeksArr = [];
    let curr = new Date(gridStart);

    while (curr <= gridEnd) {
      const weekDays = [];
      for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
        const d = new Date(curr);
        const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

        const isOutOfRange = d < startDate || d > endDate;
        const count = isOutOfRange ? 0 : activityMap[dateKey] || 0;

        weekDays.push({
          date: d,
          dateKey,
          month: d.getMonth(),
          year: d.getFullYear(),
          isOutOfRange,
          count
        });
        curr.setDate(curr.getDate() + 1);
      }
      weeksArr.push(weekDays);
    }

    // Label each month at the week column containing the first visible day
    // of that month inside the selected range.
    const months = [];
    const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;
    let monthCursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    monthCursor.setHours(0, 0, 0, 0);

    while (monthCursor <= endDate) {
      const visibleMonthStart = monthCursor < startDate ? startDate : monthCursor;
      const colIdx = Math.floor((visibleMonthStart.getTime() - gridStart.getTime()) / MS_PER_WEEK);

      if (colIdx >= 0 && colIdx < weeksArr.length) {
        months.push({
          colIdx,
          label: monthCursor.toLocaleString('en-US', { month: 'short' })
        });
      }

      monthCursor = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1);
      monthCursor.setHours(0, 0, 0, 0);
    }

    return { weeks: weeksArr, monthLabels: months };
  }, [activityMap, selectedRange]);

  // Intensity level calculation (0 to 4)
  const getLevel = (count) => {
    if (!count || count <= 0) return 0;
    if (count <= 2) return 1;
    if (count <= 5) return 2;
    if (count <= 9) return 3;
    return 4;
  };

  const formatTooltip = (count, date) => {
    const month = date.toLocaleString('en-US', { month: 'long' });
    const dateText = `${month} ${date.getDate()}, ${date.getFullYear()}`;
    if (count === 0) return `No contributions on ${dateText}.`;
    const contributionText = `${count} ${count === 1 ? 'contribution' : 'contributions'}`;
    return `${contributionText} on ${dateText}.`;
  };

  // Auto-scroll heatmap to the far right on mount.
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollLeft = containerRef.current.scrollWidth;
    }
  }, [weeks]);

  return (
    <div className={`activity-heatmap-wrapper theme-${selectedTheme}`}>
      <div className="heatmap-range-row">
        <select
          value={selectedRange}
          onChange={(event) => setSelectedRange(event.target.value)}
          aria-label="Heatmap date range"
        >
          <option value="past12">Past 12 months</option>
          <option value="2026">2026</option>
        </select>

        <select
          value={selectedTheme}
          onChange={(event) => setSelectedTheme(event.target.value)}
          aria-label="Heatmap color theme"
          className="heatmap-theme-select"
        >
          <option value="emerald">Green theme</option>
          <option value="cyber">Blue theme</option>
          <option value="flame">Orange theme</option>
        </select>
      </div>

      {/* HEATMAP MAIN GRID */}
      <div className="heatmap-main-layout">
        {/* WEEKDAY LABELS (Mon, Wed, Fri) */}
        <div className="heatmap-weekdays">
          <span className="weekday-blank">Sun</span>
          <span className="weekday-label">Mon</span>
          <span className="weekday-blank">Tue</span>
          <span className="weekday-label">Wed</span>
          <span className="weekday-blank">Thu</span>
          <span className="weekday-label">Fri</span>
          <span className="weekday-blank">Sat</span>
        </div>

        {/* SCROLLABLE GRID AREA */}
        <div className="heatmap-scroll-container" ref={containerRef}>
          {/* MONTH LABELS ROW */}
          <div
            className="heatmap-months-row"
            style={{ gridTemplateColumns: `repeat(${weeks.length}, 12px)` }}
          >
            {monthLabels.map((m, idx) => (
              <div
                key={idx}
                className="heatmap-month-label"
                style={{ gridColumnStart: m.colIdx + 1 }}
              >
                {m.label}
              </div>
            ))}
          </div>

          {/* CELL GRID (7 Rows x N Weeks) */}
          <div
            className="heatmap-grid"
            style={{ gridTemplateColumns: `repeat(${weeks.length}, 12px)` }}
          >
            {weeks.map((week, colIdx) =>
              week.map((day, rowIdx) => {
                if (day.isOutOfRange) {
                  return (
                    <div
                      key={`${colIdx}-${rowIdx}`}
                      className="heatmap-cell level-empty out-of-range"
                    />
                  );
                }

                const level = getLevel(day.count);
                return (
                  <div
                    key={`${colIdx}-${rowIdx}`}
                    className={`heatmap-cell level-${level}`}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setTooltip({
                        visible: true,
                        text: formatTooltip(day.count, day.date),
                        x: rect.left + rect.width / 2,
                        y: rect.top - 14
                      });
                    }}
                    onMouseLeave={() => setTooltip(prev => ({ ...prev, visible: false }))}
                  />
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* HEATMAP FOOTER & LEGEND */}
      <div className="heatmap-footer">
        <span className="heatmap-help-text">Learn how we count contributions</span>

        <div className="heatmap-legend">
          <span className="legend-text">Less</span>
          <div className="legend-cells">
            <div className="heatmap-cell level-0 legend-box" title="0 activities" />
            <div className="heatmap-cell level-1 legend-box" title="1-2 contributions" />
            <div className="heatmap-cell level-2 legend-box" title="3-5 contributions" />
            <div className="heatmap-cell level-3 legend-box" title="6-9 contributions" />
            <div className="heatmap-cell level-4 legend-box" title="10+ contributions" />
          </div>
          <span className="legend-text">More</span>
        </div>
      </div>

      {/* FLOATING TOOLTIP */}
      {tooltip.visible && (
        <div
          className="heatmap-tooltip"
          style={{
            top: tooltip.y,
            left: tooltip.x,
          }}
        >
          <div className="tooltip-count">{tooltip.text}</div>
          <div className="tooltip-arrow" />
        </div>
      )}
    </div>
  );
}
