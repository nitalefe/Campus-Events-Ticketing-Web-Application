// ------------------------------
// AdminEventDashboard.js
// Admin view: shows ALL events across all schools with filters and CSV export
// ------------------------------

import { collection, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import { auth, db } from "../../Shared/firebase-config.js";

const windowTitle = document.getElementById("pageTitle");

// Register datalabels plugin if available (improves bar label rendering)
if (typeof window !== 'undefined' && window.Chart && window.ChartDataLabels) {
  try { Chart.register(window.ChartDataLabels); } catch (e) { console.warn('Could not register ChartDataLabels plugin', e); }
}

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

function formatDate(date) {
  if (!date) return "No date";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function displayEvents(events) {
  const eventsList = document.getElementById("eventsList");
  eventsList.innerHTML = "";

  if (!events || events.length === 0) {
    eventsList.innerHTML = `
      <div class="status info">
        No events found.<br>
      </div>`;
    return;
  }

  events.forEach((event) => {
    const capacity = event.capacity || 0;
    const sold = event.ticketsSold || 0;
    const available = Math.max(0, capacity - sold);
    const fillRate = capacity > 0 ? ((sold / capacity) * 100).toFixed(1) : 0;

    const div = document.createElement("div");
    div.className = "event-card";
    div.style.marginBottom = "1.5rem";
    div.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:8px;">
        <h3 class="event-title">${event.eventName || "Unnamed Event"}</h3>
        <div class="event-meta">${event.eventCategory || "N/A"} • ${event.school || "No school specified"} • ${formatDate(event.eventDateTime)}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;align-items:start;">
          <div class="event-summary">
            <span class="summary-trunc">${(event.eventDescription && event.eventDescription.slice ? event.eventDescription.slice(0, 160) : '') || ''}</span>
            <span class="summary-full" style="display:none;">${(event.eventDescription) || ''}</span>
            ${event.eventDescription && event.eventDescription.length > 160 ? '<div style="margin-top:6px;"><button class="show-more-btn" aria-expanded="false">Show more</button></div>' : ''}
          </div>
          <div style="text-align:right;">
            <p style="margin:0 0 6px 0"><strong>Location:</strong> ${event.eventLocation || "N/A"}</p>
            <p style="margin:0 0 6px 0"><strong>Organizer:</strong> ${event.createdBy || "Unknown"}</p>
            <p style="margin:0"><strong>Price:</strong> $${(event.ticketPrice || 0).toFixed(2)}</p>
          </div>
        </div>
      </div>
      <div class="event-stats">
        <div class="stat-box"><div class="stat-value">${capacity}</div><div class="stat-label">Total Capacity</div></div>
        <div class="stat-box"><div class="stat-value">${sold}</div><div class="stat-label">Tickets Sold</div></div>
        <div class="stat-box"><div class="stat-value">${available}</div><div class="stat-label">Available</div></div>
        <div class="stat-box"><div class="stat-value">${fillRate}%</div><div class="stat-label">Fill Rate</div></div>
      </div>
    `;

    eventsList.appendChild(div);
    // Attach show-more toggle if present
    const showBtn = div.querySelector('.show-more-btn');
    if (showBtn) {
      showBtn.addEventListener('click', () => {
        const trunc = div.querySelector('.summary-trunc');
        const full = div.querySelector('.summary-full');
        const expanded = showBtn.getAttribute('aria-expanded') === 'true';
        if (expanded) {
          // collapse
          if (full) full.style.display = 'none';
          if (trunc) trunc.style.display = '';
          showBtn.textContent = 'Show more';
          showBtn.setAttribute('aria-expanded', 'false');
        } else {
          // expand
          if (full) full.style.display = '';
          if (trunc) trunc.style.display = 'none';
          showBtn.textContent = 'Show less';
          showBtn.setAttribute('aria-expanded', 'true');
        }
      });
    }
  });
}

// Client-side filter implementation: filter the events array according to UI
function filterEvents(events) {
  const category = document.getElementById("eventFilter")?.value || "all";
  const school = document.getElementById("schoolFilter")?.value || "all";
  const from = document.getElementById("dateFrom")?.value;
  const to = document.getElementById("dateTo")?.value;

  return events.filter((evt) => {
    if (category !== "all" && (evt.eventCategory || "").toString() !== category) return false;
    if (school !== "all" && (evt.school || "").toString().toLowerCase() !== school.toString().toLowerCase()) return false;

    if (from) {
      const fromDate = new Date(from);
      if (!evt.eventDateTime || new Date(evt.eventDateTime) < fromDate) return false;
    }
    if (to) {
      const toDate = new Date(to);
      // include entire 'to' day
      toDate.setHours(23, 59, 59, 999);
      if (!evt.eventDateTime || new Date(evt.eventDateTime) > toDate) return false;
    }

    return true;
  });
}

async function applyFilters(user) {
  const status = document.getElementById("eventsStatus");
  status.textContent = "Loading event analytics...";
  status.className = "status info";

  try {
  // Load ALL events (admins can see everything)
  const qSnapshot = await getDocs(collection(db, "events"));
  console.log('[AdminEventDashboard] getDocs snapshot size:', qSnapshot.size, ' empty:', qSnapshot.empty);
  if (!qSnapshot.empty) console.log('[AdminEventDashboard] doc ids:', qSnapshot.docs.map(d => d.id));
  let events = qSnapshot.docs.map((d) => ({ id: d.id, ...d.data(), eventDateTime: d.data().eventDateTime?.toDate() }));

    // Store full set globally for export
    window.currentFilteredEventsAll = events;

    // Apply UI filters
    const filtered = filterEvents(events);

    if (filtered.length === 0) {
      status.textContent = "No events found.";
      status.className = "status info";
    } else {
      status.textContent = `Showing ${filtered.length} events`;
      status.className = "status success";
    }

    window.currentFilteredEvents = filtered;
    displayEvents(filtered);
    // Render top-events chart after rendering list
    try {
      renderTopEventsChart(window.currentFilteredEvents || filtered);
      // Render fill-rate distribution chart as well
      try { renderFillRateChart(window.currentFilteredEvents || filtered); } catch (e) { console.warn('Could not render fill-rate chart:', e); }
    } catch (e) {
      console.warn('Could not render top events chart:', e);
    }
    // Notify listeners that admin events have finished loading (successful fetch & initial render)
    try { document.dispatchEvent(new CustomEvent('adminEventsLoaded')); } catch (e) { /* ignore if environment doesn't support CustomEvent */ }
  } catch (err) {
      console.error("Admin analytics load error:", err);
      // Show actionable message for Firestore permission errors
      if (err && err.code === 'permission-denied') {
        status.textContent = "Permission denied when reading 'events' collection. Check your Firestore rules or sign in with an account that has read access.";
        status.className = "status error";
      } else {
        status.textContent = "Error: " + (err.message || err);
        status.className = "status error";
      }
      // Also expose the raw error for debugging
      window.adminAnalyticsLastError = err;
  }
}

function exportToCSV() {
  const events = window.currentFilteredEvents || [];
  const status = document.getElementById("eventsStatus");

  if (events.length === 0) {
    status.textContent = "No data to export";
    status.className = "status error";
    return;
  }

  const fields = [
    "eventName",
    "eventCategory",
    "eventLocation",
    "school",
    "createdBy",
    "ticketPrice",
    "capacity",
    "ticketsSold",
    "eventDateTime",
  ];

  let csv = fields.join(",") + "\n";

  events.forEach((event) => {
    const row = fields.map((field) => {
      let value = event[field];
      if (field === "eventDateTime") value = formatDate(value);
      else if (field === "ticketPrice") value = (value || 0).toFixed(2);
      else if (value === undefined || value === null) value = "";
      value = String(value).replace(/"/g, '""');
      if (value.includes(",") || value.includes('"') || value.includes("\n")) {
        value = `"${value}"`;
      }
      return value;
    });
    csv += row.join(",") + "\n";
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `admin_event_analytics_${new Date().toISOString().split("T")[0]}.csv`;
  link.click();

  status.textContent = "CSV file exported successfully";
  status.className = "status success";
}

// Require admin role to view this page
onAuthStateChanged(auth, async (user) => {
  const status = document.getElementById("eventsStatus");
  if (!user) {
    alert("Please sign in to view admin analytics.");
    window.location.href = "../../website/Registration/SignIn.html";
    return;
  }

  // Check role
  try {
    const usersRef = await import("https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js");
  } catch (e) {
    // no-op; simple import guard
  }

  // Attempt to read user's role from Firestore
  try {
    const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js");
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (!userDoc.exists()) {
      status.textContent = "Access denied: user record not found.";
      status.className = "status error";
      return;
    }
    // New admin check: expect a boolean `isAdmin: true` on the users document
    const isAdmin = !!userDoc.data().isAdmin;

    if (!isAdmin) {
      // Access denied for non-admin users; redirect to sign in page
      status.textContent = "Access denied: admin privileges required.";
      status.className = "status error";
      // Redirect to sign-in; preserve return path if needed
      window.location.href = "../../website/Registration/SignIn.html";
      return;
    }

    // Authorized admin — load events
    applyFilters(user);
  } catch (err) {
    console.error("Role check failed:", err);
    status.textContent = "Error checking user role: " + (err.message || err);
    status.className = "status error";
  }
});

// Expose for UI
window.applyFilters = () => applyFilters();
window.exportToCSV = exportToCSV;

console.log("[AdminEventDashboard] ready");

// --- Top events chart implementation ---
let topEventsChart = null;
function computeTopEvents(events, metric = 'revenue', topN = 10) {
  const map = new Map();
  events.forEach((e) => {
    const id = e.id || '(unknown)';
    const name = e.eventName || `(${id})`;
    const price = Number(e.ticketPrice) || 0;
    const sold = Number(e.ticketsSold) || 0;
    const revenue = price * sold;
    const current = map.get(id) || { id, name, revenue: 0, ticketsSold: 0 };
    current.revenue += revenue;
    current.ticketsSold += sold;
    map.set(id, current);
  });

  const arr = Array.from(map.values());
  arr.sort((a, b) => b[metric] - a[metric]);
  return arr.slice(0, topN);
}

function renderTopEventsChart(events, metric = null, topN = null) {
  if (!events) return;
  const metricSel = document.getElementById('topMetric');
  const topNSel = document.getElementById('topN');
  metric = metric || (metricSel ? metricSel.value : 'revenue');
  topN = topN || (topNSel ? Number(topNSel.value) : 10);

  const top = computeTopEvents(events, metric, topN);
  // Truncate long labels for layout, keep full name available in tooltip
  const MAX_LABEL_LEN = 60;
  const labelsFull = top.map(t => t.name || `(${t.id})`);
  const labels = labelsFull.map(l => (l.length > MAX_LABEL_LEN ? l.slice(0, MAX_LABEL_LEN - 1) + '…' : l));
  const data = top.map(t => t[metric]);
  const ids = top.map(t => t.id);

  const canvas = document.getElementById('topEventsChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (topEventsChart) {
    topEventsChart.destroy();
    topEventsChart = null;
  }

  topEventsChart = new Chart(ctx, {
    type: 'bar',
      data: {
      labels: labels,
      datasets: [{
        label: metric === 'revenue' ? 'Revenue (USD)' : 'Tickets Sold',
        data: data,
        backgroundColor: 'rgba(54, 162, 235, 0.7)',
        borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1,
          maxBarThickness: 48,
          eventIds: ids // custom field to map bars to event ids
      }]
    },
    options: {
      indexAxis: 'y', // horizontal bars
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { left: 8, right: 16, top: 8, bottom: 8 } },
      plugins: {
        title: {
          display: true,
          text: metric === 'revenue' ? 'Top Events by Revenue' : 'Top Events by Tickets Sold',
          font: { size: 16, weight: '700' }
        },
        legend: { display: false },
        tooltip: {
          mode: 'nearest',
          callbacks: {
            title: function(items) {
              if (!items || !items.length) return '';
              const idx = items[0].dataIndex;
              return labelsFull[idx] || '';
            },
            label: function (ctx) {
              const v = ctx.raw;
              return metric === 'revenue' ? currencyFormatter.format(v) : v + ' tickets';
            }
          }
        },
        datalabels: {
          anchor: 'end',
          align: 'end',
          clamp: true,
          formatter: function (value) {
            return metric === 'revenue' ? currencyFormatter.format(value) : value;
          },
          color: function(ctx) {
            // If bar is large enough (relative), show white text inside, otherwise dark outside
            const v = ctx.raw;
            const max = Math.max(...data, 0);
            return (max > 0 && v / max > 0.12) ? '#ffffff' : '#042a66';
          },
          font: { weight: '600' }
        }
      },
      scales: {
        x: { beginAtZero: true, ticks: { callback: function(val){ return metric === 'revenue' ? currencyFormatter.format(val) : val; } } },
        y: { ticks: { autoSkip: false } }
      },
      onClick: (evt, elements) => {
        // elements contains active elements for the click
        if (elements && elements.length) {
          const el = elements[0];
          const idx = el.index;
          const ds = topEventsChart.data.datasets[el.datasetIndex];
          const eventId = ds.eventIds ? ds.eventIds[idx] : null;
          if (eventId) {
            window.open(`../Organizer/eventPage.html?id=${eventId}`, '_blank');
          }
        }
      }
    }
  });
}

// Wire refresh button
document.addEventListener('DOMContentLoaded', () => {
  const refresh = document.getElementById('refreshTop');
  if (refresh) refresh.addEventListener('click', () => renderTopEventsChart(window.currentFilteredEvents || window.currentFilteredEventsAll));
  // Also re-render when metric or topN change
  const metricSel = document.getElementById('topMetric');
  const topNSel = document.getElementById('topN');
  if (metricSel) metricSel.addEventListener('change', () => renderTopEventsChart(window.currentFilteredEvents || window.currentFilteredEventsAll));
  if (topNSel) topNSel.addEventListener('change', () => renderTopEventsChart(window.currentFilteredEvents || window.currentFilteredEventsAll));
});

// --- Fill-rate distribution (histogram) ---
let fillRateChart = null;
window.currentFillRateFilter = null;

function computeFillRates(events) {
  if (!events || !events.length) return [];
  return events.map((e, idx) => {
    const cap = Number(e.capacity) || 0;
    const sold = Number(e.ticketsSold) || 0;
    const fill = cap > 0 ? (sold / cap) * 100 : null; // percent or null when capacity missing/zero
    return { idx, id: e.id, fillRate: fill };
  }).filter(x => x.fillRate !== null && !Number.isNaN(x.fillRate));
}

function createBins(values, binCount = 10) {
  // values: array of numeric fillRates (0-100)
  const bins = [];
  const min = 0;
  const max = 100;
  const size = (max - min) / binCount;
  for (let i = 0; i < binCount; i++) {
    const bmin = Math.round((min + i * size) * 10) / 10;
    const bmax = Math.round((min + (i + 1) * size) * 10) / 10;
    bins.push({ min: bmin, max: bmax, count: 0, items: [] });
  }
  values.forEach((v) => {
    // place in bin, but ensure 100 goes into last bin
    const pct = Math.max(0, Math.min(100, v.fillRate));
    let idx = Math.floor((pct - min) / size);
    if (idx >= binCount) idx = binCount - 1;
    if (idx < 0) idx = 0;
    bins[idx].count++;
    bins[idx].items.push(v);
  });
  return bins;
}

function renderFillRateChart(events) {
  const canvas = document.getElementById('fillRateChart');
  if (!canvas) return;
  const binCountInput = document.getElementById('fillBins');
  const binCount = binCountInput ? Math.max(4, Math.min(50, Number(binCountInput.value) || 10)) : 10;

  const rates = computeFillRates(events || []);
  const bins = createBins(rates, binCount);

  const labels = bins.map(b => `${b.min}% - ${b.max}%`);
  const data = bins.map(b => b.count);

  const ctx = canvas.getContext('2d');
  // destroy existing
  if (fillRateChart) { try { fillRateChart.destroy(); } catch (e) { /*ignore*/ } fillRateChart = null; }

  fillRateChart = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{ label: 'Events', data, backgroundColor: 'rgba(16,185,129,0.8)', borderColor: 'rgba(16,185,129,1)', borderWidth: 1 }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { 
        title: { display: true, text: 'Fill-rate Distribution', font: { size: 16, weight: '700' } },
        legend: { display: false }, tooltip: { callbacks: { label: (ctx) => `${ctx.raw} events` } } },
      scales: { x: { title: { display: true, text: 'Fill rate (%)' } }, y: { beginAtZero: true, title: { display: true, text: 'Number of events' } } },
      onClick: (evt, elements) => {
        if (elements && elements.length) {
          const el = elements[0];
          const idx = el.index;
          const bin = bins[idx];
          if (bin) {
            // apply filter on currentFilteredEvents
            applyFillRateFilter(bin.min, bin.max);
          }
        }
      }
    }
  });
}

function applyFillRateFilter(min, max) {
  window.currentFillRateFilter = { min, max };
  const base = window.currentFilteredEvents || window.currentFilteredEventsAll || [];
  const filtered = base.filter(e => {
    const cap = Number(e.capacity) || 0;
    if (cap <= 0) return false;
    const sold = Number(e.ticketsSold) || 0;
    const fill = (sold / cap) * 100;
    // include max in last bin
    return fill >= min && fill <= max;
  });

  // update display and other charts based on this narrower set
  displayEvents(filtered);
  try { renderTopEventsChart(filtered); } catch (e) { console.warn('renderTopEventsChart after fill filter failed', e); }
  const status = document.getElementById('eventsStatus');
  if (status) { status.textContent = `Showing ${filtered.length} events (fill rate ${min}% - ${max}%)`; status.className = 'status success'; }
}

function clearFillRateFilter() {
  window.currentFillRateFilter = null;
  const base = window.currentFilteredEvents || window.currentFilteredEventsAll || [];
  displayEvents(base);
  try { renderTopEventsChart(base); } catch (e) { console.warn('renderTopEventsChart after clear fill filter failed', e); }
  const status = document.getElementById('eventsStatus');
  if (status) { status.textContent = `Showing ${base.length} events`; status.className = 'status success'; }
}

// Wire fill-rate controls after DOM ready
document.addEventListener('DOMContentLoaded', () => {
  const binsInput = document.getElementById('fillBins');
  if (binsInput) binsInput.addEventListener('change', () => renderFillRateChart(window.currentFilteredEvents || window.currentFilteredEventsAll));
  const clearBtn = document.getElementById('clearFillFilter');
  if (clearBtn) clearBtn.addEventListener('click', () => { clearFillRateFilter(); renderFillRateChart(window.currentFilteredEvents || window.currentFilteredEventsAll); });
});

// --- Events per Organizer (top organizers by revenue or event count) ---
let organizersChart = null;

function computeOrganizers(events, metric = 'revenue', topN = 10) {
  const map = new Map();
  (events || []).forEach(e => {
    const key = e.createdBy || '(unknown)';
    const price = Number(e.ticketPrice) || 0;
    const sold = Number(e.ticketsSold) || 0;
    const revenue = price * sold;
    const current = map.get(key) || { organizer: key, revenue: 0, eventsCount: 0 };
    current.revenue += revenue;
    current.eventsCount += 1;
    map.set(key, current);
  });

  const arr = Array.from(map.values());
  arr.sort((a, b) => b[metric] - a[metric]);
  return arr.slice(0, topN);
}

function renderOrganizersChart(events, metric = null, topN = null) {
  if (!events) return;
  const metricSel = document.getElementById('orgMetric');
  const topNSel = document.getElementById('orgTopN');
  metric = metric || (metricSel ? metricSel.value : 'revenue');
  topN = topN || (topNSel ? Number(topNSel.value) : 10);

  const top = computeOrganizers(events, metric, topN);
  const labelsFull = top.map(t => t.organizer || '(unknown)');
  const MAX_LABEL_LEN = 60;
  const labels = labelsFull.map(l => (l.length > MAX_LABEL_LEN ? l.slice(0, MAX_LABEL_LEN - 1) + '…' : l));
  const data = top.map(t => t[metric]);

  const canvas = document.getElementById('organizersChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (organizersChart) { try { organizersChart.destroy(); } catch (e) {} organizersChart = null; }

  organizersChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: metric === 'revenue' ? 'Revenue (USD)' : 'Events',
        data: data,
        backgroundColor: 'rgba(236,72,153,0.8)',
        borderColor: 'rgba(236,72,153,1)',
        borderWidth: 1
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: { display: true, text: metric === 'revenue' ? 'Top Organizers by Revenue' : 'Top Organizers by Events Count', font: { size: 16, weight: '700' } },
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items) => labelsFull[items[0].dataIndex] || '',
            label: (ctx) => metric === 'revenue' ? currencyFormatter.format(ctx.raw) : `${ctx.raw} events`
          }
        }
      },
      scales: {
        x: { beginAtZero: true, ticks: { callback: function(val){ return metric === 'revenue' ? currencyFormatter.format(val) : val; } } },
        y: { ticks: { autoSkip: false } }
      },
      onClick: (evt, elements) => {
        if (elements && elements.length) {
          const el = elements[0];
          const idx = el.index;
          const organizer = top[idx] && top[idx].organizer;
          if (organizer) applyOrganizerFilter(organizer);
        }
      }
    }
  });
}

function applyOrganizerFilter(organizer) {
  // filter events whose createdBy matches organizer exactly
  const base = window.currentFilteredEventsAll || [];
  const filtered = base.filter(e => (e.createdBy || '') === organizer);
  displayEvents(filtered);
  try { renderTopEventsChart(filtered); } catch (e) { console.warn('renderTopEventsChart after organizer filter failed', e); }
  try { renderFillRateChart(filtered); } catch (e) { /* ignore */ }
  const status = document.getElementById('eventsStatus');
  if (status) { status.textContent = `Showing ${filtered.length} events (organizer: ${organizer})`; status.className = 'status success'; }
}

function clearOrganizerFilter() {
  const base = window.currentFilteredEvents || window.currentFilteredEventsAll || [];
  displayEvents(base);
  try { renderTopEventsChart(base); } catch (e) { console.warn('renderTopEventsChart after clear organizer filter failed', e); }
  try { renderFillRateChart(base); } catch (e) { /* ignore */ }
  const status = document.getElementById('eventsStatus');
  if (status) { status.textContent = `Showing ${base.length} events`; status.className = 'status success'; }
}

// Wire organizer controls
document.addEventListener('DOMContentLoaded', () => {
  const refresh = document.getElementById('refreshOrg');
  if (refresh) refresh.addEventListener('click', () => renderOrganizersChart(window.currentFilteredEvents || window.currentFilteredEventsAll));
  const metricSel = document.getElementById('orgMetric');
  const topNSel = document.getElementById('orgTopN');
  if (metricSel) metricSel.addEventListener('change', () => renderOrganizersChart(window.currentFilteredEvents || window.currentFilteredEventsAll));
  if (topNSel) topNSel.addEventListener('change', () => renderOrganizersChart(window.currentFilteredEvents || window.currentFilteredEventsAll));
  const clearBtn = document.getElementById('clearOrganizerFilter');
  if (clearBtn) clearBtn.addEventListener('click', () => { clearOrganizerFilter(); renderOrganizersChart(window.currentFilteredEvents || window.currentFilteredEventsAll); });
});

// On initial page load, trigger all buttons marked with data-auto-refresh so charts render immediately
document.addEventListener('DOMContentLoaded', () => {
  try {
    let didRun = false;
    const doRefresh = () => {
      if (didRun) return;
      didRun = true;
      try {
        document.querySelectorAll('[data-auto-refresh]').forEach((btn) => {
          try { btn.click(); } catch (e) { /* ignore individual click errors */ }
        });
      } catch (err) {
        try { document.getElementById('refreshTop')?.click(); } catch (e) {}
        try { document.getElementById('refreshOrg')?.click(); } catch (e) {}
      }

      // Ensure charts rendered even if clicks didn't trigger handlers
      try { renderTopEventsChart(window.currentFilteredEvents || window.currentFilteredEventsAll); } catch (e) { /*ignore*/ }
      try { renderOrganizersChart(window.currentFilteredEvents || window.currentFilteredEventsAll); } catch (e) { /*ignore*/ }
      try { renderFillRateChart(window.currentFilteredEvents || window.currentFilteredEventsAll); } catch (e) { /*ignore*/ }
    };

    // If event fires indicating data-load finished, refresh then; otherwise fallback after timeout
    const onLoaded = () => { doRefresh(); document.removeEventListener('adminEventsLoaded', onLoaded); clearTimeout(fallback); };
    document.addEventListener('adminEventsLoaded', onLoaded);

    // Fallback after 2s in case adminEventsLoaded doesn't fire (ensures resilience)
    const fallback = setTimeout(() => { doRefresh(); document.removeEventListener('adminEventsLoaded', onLoaded); }, 2000);
  } catch (e) {
    console.warn('Auto-refresh on load failed', e);
  }
});
