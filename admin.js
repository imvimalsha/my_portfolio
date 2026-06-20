// ==========================================================================
// ADMIN DASHBOARD LOGIC (SPA CONTROLLER)
// ==========================================================================

import { dbService } from './firebase.js';

// DOM Elements cache
const portfolioView = document.getElementById('portfolio-view');
const adminView = document.getElementById('admin-view');
const navbar = document.getElementById('navbar');

const adminLoginCard = document.getElementById('admin-login-card');
const adminDashboardContainer = document.getElementById('admin-dashboard-container');
const adminLoginForm = document.getElementById('admin-login-form');
const loginWarning = document.getElementById('login-warning');
const adminUserEmail = document.getElementById('admin-user-email');
const adminLogoutBtn = document.getElementById('admin-logout-btn');

// ==========================================================================
// VIEW ROUTER (SPA HASH NAVIGATOR)
// ==========================================================================
function route() {
  const hash = window.location.hash;
  if (hash === '#admin') {
    // Hide standard homepage elements
    portfolioView.style.display = 'none';
    if (navbar) navbar.style.display = 'none';
    
    // Show admin controls
    adminView.style.display = 'block';
    checkAuthAndLoadDashboard();
  } else {
    // Show standard homepage elements
    adminView.style.display = 'none';
    portfolioView.style.display = 'block';
    if (navbar) navbar.style.display = 'block';
  }
}

window.addEventListener('hashchange', route);
document.addEventListener('DOMContentLoaded', route);

// ==========================================================================
// AUTHENTICATION MANAGEMENT
// ==========================================================================
async function checkAuthAndLoadDashboard() {
  try {
    const user = await dbService.getCurrentUser();
    if (user) {
      // Authenticated: Show dashboard
      adminLoginCard.style.display = 'none';
      adminDashboardContainer.style.display = 'grid';
      adminUserEmail.textContent = user.email || 'Admin User';
      
      // Load panels data
      loadOverviewMetrics();
      loadContactSubmissionsPanel();
      loadResumeDownloadsPanel();
      loadLayoutBuilderPanel();
      loadSettingsPanel();
    } else {
      // Unauthenticated: Show login form
      adminDashboardContainer.style.display = 'none';
      adminLoginCard.style.display = 'flex';
      adminUserEmail.textContent = '';
    }
  } catch (err) {
    console.error("Auth validation failed:", err);
  }
}

if (adminLoginForm) {
  adminLoginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginWarning.style.display = 'none';
    
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const submitBtn = adminLoginForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Authenticating...';
    
    try {
      await dbService.login(email, password);
      adminLoginForm.reset();
      checkAuthAndLoadDashboard();
    } catch (err) {
      loginWarning.textContent = err.message || "Failed to authenticate. Check credentials.";
      loginWarning.style.display = 'block';
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  });
}

if (adminLogoutBtn) {
  adminLogoutBtn.addEventListener('click', async () => {
    await dbService.logout();
    checkAuthAndLoadDashboard();
    window.location.hash = ''; // Return to home page on logout
  });
}

// ==========================================================================
// SIDEBAR NAVIGATION TABS SWITCHER
// ==========================================================================
const sidebarLinks = document.querySelectorAll('.sidebar-link');
const dashboardPanels = document.querySelectorAll('.dashboard-panel');

sidebarLinks.forEach(link => {
  link.addEventListener('click', () => {
    const target = link.getAttribute('data-target');
    
    sidebarLinks.forEach(l => l.classList.remove('active'));
    link.classList.add('active');
    
    dashboardPanels.forEach(panel => {
      panel.classList.remove('active');
      if (panel.getAttribute('id') === target) {
        panel.classList.add('active');
      }
    });
  });
});

// ==========================================================================
// OVERVIEW PANEL: KPI & SVG DATA CHARTS RENDERERS
// ==========================================================================
async function loadOverviewMetrics() {
  try {
    const sessions = await dbService.getSessions();
    const downloads = await dbService.getResumeDownloads();
    const submissions = await dbService.getContactSubmissions();
    
    // Calculate KPIs
    const totalSessions = sessions.length;
    const totalDownloads = downloads.length;
    const totalSubmissions = submissions.length;
    
    let avgDuration = 0;
    if (totalSessions > 0) {
      const totalSeconds = sessions.reduce((acc, curr) => acc + (curr.timeSpent || 0), 0);
      avgDuration = Math.round(totalSeconds / totalSessions);
    }
    
    // Update DOM values
    document.getElementById('kpi-sessions').textContent = totalSessions;
    document.getElementById('kpi-downloads').textContent = totalDownloads;
    document.getElementById('kpi-submissions').textContent = totalSubmissions;
    document.getElementById('kpi-duration').textContent = formatDuration(avgDuration);
    
    // Render dynamic SVG charts
    renderWeeklyTrafficChart(sessions);
    renderDeviceBreakdownChart(sessions);
    
    // Render Geo/Traffic sources in Analytics panel
    renderGeoAnalytics(sessions);
    renderReferrerAnalytics(sessions);
  } catch (err) {
    console.error("Failed to load overview analytics metrics:", err);
  }
}

function formatDuration(seconds) {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

// 1. Draw smooth weekly SVG line chart
function renderWeeklyTrafficChart(sessions) {
  const container = document.getElementById('traffic-chart-container');
  if (!container) return;
  
  // Aggregate sessions for last 7 days
  const countsByDay = {};
  const days = [];
  const oneDay = 24 * 60 * 60 * 1000;
  
  for (let i = 6; i >= 0; i--) {
    const dateObj = new Date(Date.now() - i * oneDay);
    const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    days.push(dateStr);
    countsByDay[dateStr] = 0;
  }
  
  sessions.forEach(s => {
    const dateStr = new Date(s.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (countsByDay[dateStr] !== undefined) {
      countsByDay[dateStr]++;
    }
  });
  
  const dataPoints = days.map(d => countsByDay[d]);
  const maxVal = Math.max(...dataPoints, 5); // Ensure scale height
  
  // Create premium SVG code
  const width = 500;
  const height = 200;
  const paddingLeft = 35;
  const paddingRight = 15;
  const paddingTop = 20;
  const paddingBottom = 30;
  
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;
  
  // Generate points coordinates
  const stepX = chartWidth / 6;
  const coords = dataPoints.map((val, idx) => {
    const x = paddingLeft + idx * stepX;
    const y = paddingTop + chartHeight - (val / maxVal) * chartHeight;
    return { x, y };
  });
  
  // Generate line path and area under line
  let linePath = `M ${coords[0].x} ${coords[0].y}`;
  let areaPath = `M ${coords[0].x} ${paddingTop + chartHeight} L ${coords[0].x} ${coords[0].y}`;
  
  for (let i = 1; i < coords.length; i++) {
    // Smooth bezier curve control points
    const cpX1 = coords[i-1].x + stepX / 2;
    const cpY1 = coords[i-1].y;
    const cpX2 = coords[i].x - stepX / 2;
    const cpY2 = coords[i].y;
    
    linePath += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${coords[i].x} ${coords[i].y}`;
    areaPath += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${coords[i].x} ${coords[i].y}`;
  }
  
  areaPath += ` L ${coords[coords.length - 1].x} ${paddingTop + chartHeight} Z`;
  
  let gridLines = '';
  // Horizontal grid lines
  for (let i = 0; i <= 4; i++) {
    const y = paddingTop + (chartHeight / 4) * i;
    const val = Math.round(maxVal - (maxVal / 4) * i);
    gridLines += `
      <line x1="${paddingLeft}" y1="${y}" x2="${width - paddingRight}" y2="${y}" class="svg-chart-grid" />
      <text x="${paddingLeft - 8}" y="${y + 4}" text-anchor="end" class="svg-chart-axis-text">${val}</text>
    `;
  }
  
  // X axis labels
  let xLabels = '';
  coords.forEach((c, idx) => {
    xLabels += `
      <text x="${c.x}" y="${height - 10}" text-anchor="middle" class="svg-chart-axis-text">${days[idx]}</text>
      <circle cx="${c.x}" cy="${c.y}" r="4.5" class="svg-chart-dot" />
    `;
  });
  
  const isAllZero = dataPoints.every(v => v === 0);
  const noteBanner = isAllZero ? `
    <rect x="${paddingLeft + 20}" y="${paddingTop + 10}" width="${chartWidth - 40}" height="32" rx="8" fill="rgba(8, 145, 178, 0.1)" stroke="rgba(8,145,178,0.2)" />
    <text x="${width/2}" y="${paddingTop + 30}" text-anchor="middle" fill="var(--accent-alt)" font-size="11" font-weight="600">Simulated - Waiting for traffic data</text>
  ` : '';
  
  container.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" style="width: 100%; height: 100%;">
      <defs>
        <linearGradient id="line-grad-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--accent-color)" stop-opacity="0.3"/>
          <stop offset="100%" stop-color="var(--accent-color)" stop-opacity="0"/>
        </linearGradient>
      </defs>
      ${gridLines}
      <path d="${areaPath}" class="svg-chart-fill" />
      <path d="${linePath}" class="svg-chart-line" />
      ${xLabels}
      ${noteBanner}
    </svg>
  `;
}

// 2. Draw Donut SVG chart for devices
function renderDeviceBreakdownChart(sessions) {
  const container = document.getElementById('device-chart-container');
  if (!container) return;
  
  const counts = { Desktop: 0, Mobile: 0, Tablet: 0 };
  sessions.forEach(s => {
    if (counts[s.deviceType] !== undefined) {
      counts[s.deviceType]++;
    } else {
      counts.Desktop++; // fallback default
    }
  });
  
  const total = sessions.length || 1;
  const pctDesktop = Math.round((counts.Desktop / total) * 100);
  const pctMobile = Math.round((counts.Mobile / total) * 100);
  const pctTablet = 100 - pctDesktop - pctMobile;
  
  // Semicircular / donut values
  const radius = 50;
  const strokeWidth = 12;
  const circumference = 2 * Math.PI * radius; // 314.16
  
  // Calculate segments
  const offsetDesktop = circumference;
  const lenDesktop = (pctDesktop / 100) * circumference;
  
  const offsetMobile = circumference - lenDesktop;
  const lenMobile = (pctMobile / 100) * circumference;
  
  const offsetTablet = circumference - lenDesktop - lenMobile;
  const lenTablet = (pctTablet / 100) * circumference;
  
  container.innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%;">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r="${radius}" fill="none" stroke="var(--border-color)" stroke-width="${strokeWidth}" />
        
        <!-- Desktop segment (Indigo) -->
        <circle cx="70" cy="70" r="${radius}" class="donut-segment" stroke="var(--accent-color)" 
          stroke-dasharray="${lenDesktop} ${circumference - lenDesktop}" 
          stroke-dashoffset="${offsetDesktop}" transform="rotate(-90 70 70)" />
          
        <!-- Mobile segment (Teal) -->
        <circle cx="70" cy="70" r="${radius}" class="donut-segment" stroke="var(--accent-alt)" 
          stroke-dasharray="${lenMobile} ${circumference - lenMobile}" 
          stroke-dashoffset="${offsetMobile}" transform="rotate(-90 70 70)" />
          
        <!-- Tablet segment (Pink) -->
        <circle cx="70" cy="70" r="${radius}" class="donut-segment" stroke="#ec4899" 
          stroke-dasharray="${lenTablet} ${circumference - lenTablet}" 
          stroke-dashoffset="${offsetTablet}" transform="rotate(-90 70 70)" />
          
        <text x="70" y="73" class="donut-center-label">${sessions.length}</text>
        <text x="70" y="88" class="donut-center-sublabel">Sessions</text>
      </svg>
      
      <div class="chart-legend">
        <div class="legend-item">
          <div class="legend-color-label">
            <span class="legend-dot" style="background: var(--accent-color);"></span>
            <span>Desktop</span>
          </div>
          <span class="legend-percentage">${pctDesktop}% (${counts.Desktop})</span>
        </div>
        <div class="legend-item">
          <div class="legend-color-label">
            <span class="legend-dot" style="background: var(--accent-alt);"></span>
            <span>Mobile</span>
          </div>
          <span class="legend-percentage">${pctMobile}% (${counts.Mobile})</span>
        </div>
        <div class="legend-item">
          <div class="legend-color-label">
            <span class="legend-dot" style="background: #ec4899;"></span>
            <span>Tablet</span>
          </div>
          <span class="legend-percentage">${pctTablet}% (${counts.Tablet})</span>
        </div>
      </div>
    </div>
  `;
}

// ==========================================================================
// VISITOR ANALYTICS PANEL: GEOGRAPHIC & REFERRERS
// ==========================================================================
function renderGeoAnalytics(sessions) {
  const tbody = document.getElementById('analytics-geo-table-body');
  if (!tbody) return;
  
  const geoCounts = {};
  sessions.forEach(s => {
    const loc = s.location || 'Unknown Location';
    if (!geoCounts[loc]) {
      geoCounts[loc] = { unique: 0, views: 0 };
    }
    geoCounts[loc].unique++;
    // Pages visited is an array, length counts page views
    geoCounts[loc].views += s.pagesVisited ? s.pagesVisited.length : 1;
  });
  
  const sortedGeo = Object.keys(geoCounts).map(k => ({
    loc: k,
    unique: geoCounts[k].unique,
    views: geoCounts[k].views
  })).sort((a, b) => b.unique - a.unique).slice(0, 10);
  
  if (sortedGeo.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" class="text-center" style="color:var(--text-secondary); padding:20px;">No geolocation logs captured yet.</td></tr>`;
    return;
  }
  
  tbody.innerHTML = sortedGeo.map(g => `
    <tr>
      <td style="font-weight: 500;">📍 ${g.loc}</td>
      <td>${g.unique}</td>
      <td>${g.views}</td>
    </tr>
  `).join('');
}

function renderReferrerAnalytics(sessions) {
  const tbody = document.getElementById('analytics-source-table-body');
  if (!tbody) return;
  
  const refCounts = {};
  sessions.forEach(s => {
    const ref = s.referrer || 'Direct';
    refCounts[ref] = (refCounts[ref] || 0) + 1;
  });
  
  const sortedRef = Object.keys(refCounts).map(k => ({
    source: k,
    count: refCounts[k]
  })).sort((a, b) => b.count - a.count).slice(0, 10);
  
  if (sortedRef.length === 0) {
    tbody.innerHTML = `<tr><td colspan="2" class="text-center" style="color:var(--text-secondary); padding:20px;">No source referrals logged yet.</td></tr>`;
    return;
  }
  
  tbody.innerHTML = sortedRef.map(r => `
    <tr>
      <td style="font-weight: 500;">🌐 ${r.source}</td>
      <td>${r.count}</td>
    </tr>
  `).join('');
}

// ==========================================================================
// RESUME DOWNLOADS CAPTURE PANEL
// ==========================================================================
let allDownloadsList = [];

async function loadResumeDownloadsPanel() {
  const tbody = document.getElementById('downloads-table-body');
  if (!tbody) return;
  
  try {
    allDownloadsList = await dbService.getResumeDownloads();
    renderDownloadsTable(allDownloadsList);
  } catch (err) {
    console.error("Downloads logs load fail:", err);
  }
}

function renderDownloadsTable(list) {
  const tbody = document.getElementById('downloads-table-body');
  if (!tbody) return;
  
  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="color:var(--text-secondary); padding: 30px;">No resume capture requests logged yet.</td></tr>`;
    return;
  }
  
  tbody.innerHTML = list.map(d => {
    const dateStr = new Date(d.timestamp).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' });
    return `
      <tr>
        <td style="white-space: nowrap; color: var(--text-secondary); font-size:13px;">${dateStr}</td>
        <td style="font-weight: 600;">${escapeHTML(d.name)}</td>
        <td><a href="mailto:${escapeHTML(d.email)}" class="gradient-text-alt" style="font-weight: 500;">${escapeHTML(d.email)}</a></td>
        <td>${escapeHTML(d.company)}</td>
        <td style="max-width: 250px; font-size:13px; color: var(--text-secondary);">${escapeHTML(d.message)}</td>
        <td style="font-size:13px;">${escapeHTML(d.ip)}</td>
      </tr>
    `;
  }).join('');
}

// Downloads Logs Search filter
const downloadsSearch = document.getElementById('downloads-search');
if (downloadsSearch) {
  downloadsSearch.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase().trim();
    if (!term) {
      renderDownloadsTable(allDownloadsList);
      return;
    }
    
    const filtered = allDownloadsList.filter(d => 
      d.name.toLowerCase().includes(term) ||
      d.email.toLowerCase().includes(term) ||
      d.company.toLowerCase().includes(term) ||
      d.message.toLowerCase().includes(term) ||
      d.ip.toLowerCase().includes(term)
    );
    renderDownloadsTable(filtered);
  });
}

// Export CSV for Resume Downloads
const exportDownloadsBtn = document.getElementById('export-downloads-csv');
if (exportDownloadsBtn) {
  exportDownloadsBtn.addEventListener('click', () => {
    if (allDownloadsList.length === 0) return;
    
    const headers = ['Timestamp', 'Full Name', 'Email Address', 'Company', 'Message/Notes', 'IP/Geolocation'];
    const rows = allDownloadsList.map(d => [
      new Date(d.timestamp).toISOString(),
      d.name,
      d.email,
      d.company,
      d.message,
      d.ip
    ]);
    
    downloadCSV('resume_downloads_export.csv', headers, rows);
  });
}

// ==========================================================================
// CONTACT SUBMISSIONS (MESSAGES) PANEL
// ==========================================================================
let allSubmissionsList = [];

async function loadContactSubmissionsPanel() {
  const tbody = document.getElementById('submissions-table-body');
  if (!tbody) return;
  
  try {
    allSubmissionsList = await dbService.getContactSubmissions();
    renderSubmissionsTable(allSubmissionsList);
  } catch (err) {
    console.error("Messages load fail:", err);
  }
}

function renderSubmissionsTable(list) {
  const tbody = document.getElementById('submissions-table-body');
  if (!tbody) return;
  
  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="color:var(--text-secondary); padding: 30px;">No inbound contact messages logged yet.</td></tr>`;
    return;
  }
  
  tbody.innerHTML = list.map(s => {
    const dateStr = new Date(s.timestamp).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' });
    const isUnread = s.status === 'unread';
    const statusBadge = `<span class="badge-status ${isUnread ? 'unread' : 'read'}">${isUnread ? 'New' : 'Read'}</span>`;
    
    return `
      <tr style="${isUnread ? 'background: rgba(8,145,178,0.02);' : ''}">
        <td style="white-space: nowrap; color: var(--text-secondary); font-size:13px;">${dateStr}</td>
        <td style="font-weight: 600; display:flex; align-items:center; gap:8px;">${statusBadge} ${escapeHTML(s.name)}</td>
        <td><a href="mailto:${escapeHTML(s.email)}" class="gradient-text" style="font-weight:500;">${escapeHTML(s.email)}</a></td>
        <td style="font-weight:500;">${escapeHTML(s.subject)}</td>
        <td style="max-width: 300px; font-size:13px; color: var(--text-secondary);">${escapeHTML(s.message)}</td>
        <td>
          ${isUnread ? `<button class="btn-secondary mark-read-btn" data-id="${s.id}" style="padding:6px 10px; font-size:11px; cursor:pointer;">Mark Read</button>` : `<span style="color:var(--text-secondary); font-size:12px;">Archived</span>`}
        </td>
      </tr>
    `;
  }).join('');
  
  // Attach listeners to Mark Read buttons
  const markReadButtons = tbody.querySelectorAll('.mark-read-btn');
  markReadButtons.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = btn.getAttribute('data-id');
      await dbService.updateContactSubmissionStatus(id, 'read');
      loadContactSubmissionsPanel();
      loadOverviewMetrics(); // update KPI count
    });
  });
}

// Export CSV for contact submissions
const exportSubmissionsBtn = document.getElementById('export-messages-csv');
if (exportSubmissionsBtn) {
  exportSubmissionsBtn.addEventListener('click', () => {
    if (allSubmissionsList.length === 0) return;
    
    const headers = ['Timestamp', 'Status', 'Name', 'Email', 'Subject', 'Message'];
    const rows = allSubmissionsList.map(s => [
      new Date(s.timestamp).toISOString(),
      s.status,
      s.name,
      s.email,
      s.subject,
      s.message
    ]);
    
    downloadCSV('inbox_messages_export.csv', headers, rows);
  });
}

// ==========================================================================
// PAGE LAYOUT & SECTION BUILDER CMS
// ==========================================================================
let allSectionsList = [];
let currentSelectedHeroImageBase64 = '';
let modalSkillsState = { lang: [], risk: [], ai: [] };

// Declare globally so it can be called by project submit handlers
let renderModalProjectsList = async () => {
  const pListContainer = document.getElementById('modal-projects-list');
  if (!pListContainer) return;
  try {
    const projects = await dbService.getProjects();
    if (projects.length === 0) {
      pListContainer.innerHTML = `<span style="color:var(--text-secondary); font-style:italic; grid-column: 1/-1;">No projects in database. Click Add to insert.</span>`;
      return;
    }
    pListContainer.innerHTML = projects.map(p => `
      <div class="project-editor-card glass-card" style="padding: 12px; border-radius: 12px; border: 1px solid var(--border-color);">
        <div style="background-image: url(${p.image || 'profile.jpg'}); background-size:cover; background-position:center; height: 80px; border-radius:8px;"></div>
        <h5 style="font-size:14px; margin-top:8px; font-weight:600;">${escapeHTML(p.title)}</h5>
        <div class="proj-card-actions" style="margin-top: 10px; display:flex; gap:8px;">
          <button type="button" class="btn-secondary modal-edit-proj-btn" data-id="${p.id}" style="padding:4px 8px; font-size:11px; cursor:pointer;">Edit</button>
          <button type="button" class="btn-secondary modal-delete-proj-btn" data-id="${p.id}" style="padding:4px 8px; font-size:11px; cursor:pointer; color:var(--red-val);">Delete</button>
        </div>
      </div>
    `).join('');
    
    // Wire buttons
    pListContainer.querySelectorAll('.modal-edit-proj-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const projId = btn.getAttribute('data-id');
        openProjectModalForEdit(projId);
      });
    });
    pListContainer.querySelectorAll('.modal-delete-proj-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const projId = btn.getAttribute('data-id');
        if (confirm("Are you sure you want to delete this project?")) {
          await dbService.deleteProject(projId);
          renderModalProjectsList();
        }
      });
    });
  } catch (err) {
    console.error("Modal projects load fail:", err);
  }
};

async function loadLayoutBuilderPanel() {
  const tbody = document.getElementById('layout-sections-table-body');
  if (!tbody) return;
  
  try {
    allSectionsList = await dbService.getSections();
    renderLayoutBuilderTable(allSectionsList);
  } catch (err) {
    console.error("Failed to load layout sections:", err);
  }
}

function renderLayoutBuilderTable(sections) {
  const tbody = document.getElementById('layout-sections-table-body');
  if (!tbody) return;
  
  if (sections.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="color:var(--text-secondary); padding: 30px;">No sections found. Click Add to create one.</td></tr>`;
    return;
  }
  
  tbody.innerHTML = sections.map((sec, idx) => {
    const isFirst = idx === 0;
    const isLast = idx === sections.length - 1;
    const visibilityBadge = sec.visible 
      ? `<span class="badge-status success toggle-vis-btn" data-id="${sec.id}" style="cursor:pointer;">🟢 Visible</span>` 
      : `<span class="badge-status failed toggle-vis-btn" data-id="${sec.id}" style="cursor:pointer;">🔴 Hidden</span>`;
      
    return `
      <tr>
        <td style="font-weight: 600; color: var(--accent-color);">${sec.order !== undefined ? sec.order : idx}</td>
        <td style="font-weight: 600;">${escapeHTML(sec.title || 'Untitled Section')}</td>
        <td style="text-transform: capitalize; font-size: 13px; color: var(--text-secondary);">${sec.type}</td>
        <td>${visibilityBadge}</td>
        <td>
          <div style="display: flex; gap: 4px;">
            <button type="button" class="btn-secondary reorder-btn" data-id="${sec.id}" data-dir="up" ${isFirst ? 'disabled style="opacity:0.3; cursor:not-allowed;"' : ''} style="padding: 4px 8px; font-size:11px;">▲</button>
            <button type="button" class="btn-secondary reorder-btn" data-id="${sec.id}" data-dir="down" ${isLast ? 'disabled style="opacity:0.3; cursor:not-allowed;"' : ''} style="padding: 4px 8px; font-size:11px;">▼</button>
          </div>
        </td>
        <td>
          <div style="display: flex; gap: 8px;">
            <button type="button" class="btn-secondary edit-section-btn" data-id="${sec.id}" style="padding: 6px 12px; font-size:12px; cursor:pointer;">Edit</button>
            <button type="button" class="btn-secondary delete-section-btn" data-id="${sec.id}" style="padding: 6px 12px; font-size:12px; cursor:pointer; color:var(--red-val);">Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
  
  // Attach Event Listeners
  tbody.querySelectorAll('.toggle-vis-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const sec = sections.find(s => s.id === id);
      if (sec) {
        sec.visible = !sec.visible;
        await dbService.saveSection(sec);
        loadLayoutBuilderPanel();
      }
    });
  });
  
  tbody.querySelectorAll('.reorder-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      const dir = btn.getAttribute('data-dir');
      const curIdx = sections.findIndex(s => s.id === id);
      if (curIdx === -1) return;
      
      const targetIdx = dir === 'up' ? curIdx - 1 : curIdx + 1;
      if (targetIdx < 0 || targetIdx >= sections.length) return;
      
      const tempOrder = sections[curIdx].order !== undefined ? sections[curIdx].order : curIdx;
      sections[curIdx].order = sections[targetIdx].order !== undefined ? sections[targetIdx].order : targetIdx;
      sections[targetIdx].order = tempOrder;
      
      await dbService.saveSection(sections[curIdx]);
      await dbService.saveSection(sections[targetIdx]);
      
      loadLayoutBuilderPanel();
    });
  });
  
  tbody.querySelectorAll('.edit-section-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      openSectionEditorModal(id);
    });
  });
  
  tbody.querySelectorAll('.delete-section-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id');
      if (confirm("Are you sure you want to delete this section? This will remove it from your homepage.")) {
        await dbService.deleteSection(id);
        loadLayoutBuilderPanel();
      }
    });
  });
}

// HELPER GETTERS FOR DYNAMIC SECTION EDITOR MODAL
function getMetricsFromDOM() {
  const cards = [];
  document.querySelectorAll('.metric-editor-card').forEach(card => {
    cards.push({
      icon: card.querySelector('.metric-icon-input').value.trim() || '📊',
      value: card.querySelector('.metric-val-input').value.trim(),
      description: card.querySelector('.metric-desc-input').value.trim()
    });
  });
  return cards;
}

function getExperienceFromDOM() {
  const items = [];
  document.querySelectorAll('.experience-editor-item').forEach(el => {
    const bullets = [];
    el.querySelectorAll('.exp-bullet-input').forEach(bInput => {
      bullets.push(bInput.value.trim());
    });
    items.push({
      date: el.querySelector('.exp-date-input').value.trim(),
      role: el.querySelector('.exp-role-input').value.trim(),
      company: el.querySelector('.exp-company-input').value.trim(),
      bullets: bullets
    });
  });
  return items;
}

function getEduFromDOM() {
  const list = [];
  document.querySelectorAll('.edu-editor-item').forEach(el => {
    list.push({
      period: el.querySelector('.edu-period-input').value.trim(),
      degree: el.querySelector('.edu-degree-input').value.trim(),
      school: el.querySelector('.edu-school-input').value.trim(),
      description: el.querySelector('.edu-desc-input').value.trim()
    });
  });
  return list;
}

function getCertFromDOM() {
  const list = [];
  document.querySelectorAll('.cert-editor-item').forEach(el => {
    list.push({
      icon: el.querySelector('.cert-icon-input').value.trim() || '🎖️',
      name: el.querySelector('.cert-name-input').value.trim(),
      issuer: el.querySelector('.cert-issuer-input').value.trim()
    });
  });
  return list;
}

function getHonorFromDOM() {
  const list = [];
  document.querySelectorAll('.honor-editor-item').forEach(el => {
    list.push({
      icon: el.querySelector('.honor-icon-input').value.trim() || '🏆',
      title: el.querySelector('.honor-title-input').value.trim(),
      description: el.querySelector('.honor-desc-input').value.trim()
    });
  });
  return list;
}

function getCustomCardsFromDOM() {
  const list = [];
  document.querySelectorAll('.custom-card-item').forEach(el => {
    list.push({
      icon: el.querySelector('.card-icon-input').value.trim() || '🚀',
      title: el.querySelector('.card-title-input').value.trim(),
      text: el.querySelector('.card-text-input').value.trim()
    });
  });
  return list;
}

const sectionEditorModal = document.getElementById('section-editor-modal');
const closeSectionModalBtn = document.getElementById('close-section-modal');
const sectionEditorForm = document.getElementById('section-editor-form');

if (closeSectionModalBtn && sectionEditorModal) {
  closeSectionModalBtn.addEventListener('click', () => {
    sectionEditorModal.style.display = 'none';
    sectionEditorModal.classList.remove('active');
  });
}

async function openSectionEditorModal(id) {
  try {
    const sections = await dbService.getSections();
    const sec = sections.find(s => s.id === id);
    if (!sec) return;
    
    document.getElementById('section-edit-id').value = sec.id;
    document.getElementById('section-edit-type').value = sec.type;
    document.getElementById('section-title-input').value = sec.title || '';
    document.getElementById('section-subtitle-input').value = sec.subtitle || '';
    
    const subtitleGroup = document.getElementById('section-subtitle-group');
    if (subtitleGroup) {
      subtitleGroup.style.display = 'block';
    }
    
    const dynamicFieldsContainer = document.getElementById('dynamic-section-fields');
    dynamicFieldsContainer.innerHTML = '';
    
    const content = sec.content || {};
    
    switch (sec.type) {
      case 'hero':
        currentSelectedHeroImageBase64 = content.profileImg || '';
        dynamicFieldsContainer.innerHTML = `
          <div class="form-row">
            <div class="form-group">
              <label for="hero-badge-text">Badge Text</label>
              <input type="text" id="hero-badge-text" value="${escapeHTML(content.badgeText || '')}">
            </div>
            <div class="form-group">
              <label for="hero-avatar-name">Avatar Name</label>
              <input type="text" id="hero-avatar-name" value="${escapeHTML(content.avatarName || '')}">
            </div>
          </div>
          <div class="form-group">
            <label for="hero-tagline">Tagline</label>
            <textarea id="hero-tagline" rows="3" required>${escapeHTML(content.tagline || '')}</textarea>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="hero-cta-primary-text">Primary Button Text</label>
              <input type="text" id="hero-cta-primary-text" value="${escapeHTML(content.ctaPrimaryText || '')}">
            </div>
            <div class="form-group">
              <label for="hero-cta-primary-link">Primary Button Link</label>
              <input type="text" id="hero-cta-primary-link" value="${escapeHTML(content.ctaPrimaryLink || '')}">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="hero-cta-secondary-text">Secondary Button Text</label>
              <input type="text" id="hero-cta-secondary-text" value="${escapeHTML(content.ctaSecondaryText || '')}">
            </div>
            <div class="form-group">
              <label for="hero-cta-secondary-link">Secondary Button Link</label>
              <input type="text" id="hero-cta-secondary-link" value="${escapeHTML(content.ctaSecondaryLink || '')}">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="hero-cta-resume-text">Resume Button Text</label>
              <input type="text" id="hero-cta-resume-text" value="${escapeHTML(content.ctaResumeText || '')}">
            </div>
            <div class="form-group">
              <label for="hero-typewriter-words">Typewriter Keywords (comma-separated)</label>
              <input type="text" id="hero-typewriter-words" value="${escapeHTML((content.typewriterWords || []).join(', '))}">
            </div>
          </div>
          <div class="form-group">
            <label for="hero-profile-img-upload">Upload Profile Image (JPG/PNG)</label>
            <input type="file" id="hero-profile-img-upload" accept="image/*">
            <div id="hero-profile-img-preview" class="proj-img-preview-box">
              ${content.profileImg ? `<img src="${content.profileImg}" alt="Preview">` : '<span style="color:var(--text-secondary); font-size:13px;">No image uploaded</span>'}
            </div>
          </div>
        `;
        
        const heroImgInput = document.getElementById('hero-profile-img-upload');
        const heroImgPreview = document.getElementById('hero-profile-img-preview');
        if (heroImgInput) {
          heroImgInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
              const reader = new FileReader();
              reader.onload = (event) => {
                currentSelectedHeroImageBase64 = event.target.result;
                if (heroImgPreview) {
                  heroImgPreview.innerHTML = `<img src="${currentSelectedHeroImageBase64}" alt="Preview">`;
                }
              };
              reader.readAsDataURL(file);
            }
          });
        }
        break;
        
      case 'metrics':
        dynamicFieldsContainer.innerHTML = `
          <div id="metrics-cards-list"></div>
          <button type="button" class="btn-secondary small-btn" id="add-metric-card-btn" style="margin-top:12px;">+ Add Metric Card</button>
        `;
        
        const metricsContainer = document.getElementById('metrics-cards-list');
        const renderMetricCards = (cards) => {
          metricsContainer.innerHTML = cards.map((c, index) => `
            <div class="metric-editor-card glass-card" data-idx="${index}" style="padding:16px; margin-bottom:12px; position:relative; border-radius:12px; border:1px solid var(--border-color);">
              <button type="button" class="delete-metric-card-btn" data-idx="${index}" style="position:absolute; right:10px; top:10px; background:none; border:none; color:var(--red-val); cursor:pointer; font-size:18px; font-weight:bold;">&times;</button>
              <div class="form-row">
                <div class="form-group" style="flex:0.15; min-width:60px;">
                  <label>Icon</label>
                  <input type="text" class="metric-icon-input" value="${escapeHTML(c.icon || '')}" style="text-align:center;">
                </div>
                <div class="form-group" style="flex:0.25;">
                  <label>Value</label>
                  <input type="text" class="metric-val-input" value="${escapeHTML(c.value || '')}" required>
                </div>
                <div class="form-group" style="flex:0.6;">
                  <label>Description</label>
                  <input type="text" class="metric-desc-input" value="${escapeHTML(c.description || '')}" required>
                </div>
              </div>
            </div>
          `).join('');
          
          metricsContainer.querySelectorAll('.delete-metric-card-btn').forEach(btn => {
            btn.addEventListener('click', () => {
              const idx = parseInt(btn.getAttribute('data-idx'));
              const currentCards = getMetricsFromDOM();
              currentCards.splice(idx, 1);
              renderMetricCards(currentCards);
            });
          });
        };
        
        renderMetricCards(content.cards || []);
        
        document.getElementById('add-metric-card-btn').addEventListener('click', () => {
          const currentCards = getMetricsFromDOM();
          currentCards.push({ icon: '📊', value: '100%', description: 'New operational improvement statistic.' });
          renderMetricCards(currentCards);
        });
        break;
        
      case 'about':
        dynamicFieldsContainer.innerHTML = `
          <div class="form-row">
            <div class="form-group">
              <label for="about-avatar-name">Avatar Name</label>
              <input type="text" id="about-avatar-name" value="${escapeHTML(content.avatarName || '')}">
            </div>
            <div class="form-group">
              <label for="about-avatar-sub">Avatar Subtitle</label>
              <input type="text" id="about-avatar-sub" value="${escapeHTML(content.avatarSub || '')}">
            </div>
          </div>
          <div class="form-group">
            <label for="about-para1">Bio Paragraph 1</label>
            <textarea id="about-para1" rows="3" required>${escapeHTML(content.para1 || '')}</textarea>
          </div>
          <div class="form-group">
            <label for="about-para2">Bio Paragraph 2</label>
            <textarea id="about-para2" rows="3">${escapeHTML(content.para2 || '')}</textarea>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="about-philosophy">Philosophy Statement</label>
              <input type="text" id="about-philosophy" value="${escapeHTML(content.philosophy || '')}">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="about-education">Education Summary</label>
              <input type="text" id="about-education" value="${escapeHTML(content.education || '')}">
            </div>
            <div class="form-group">
              <label for="about-certifications">Certifications Summary</label>
              <input type="text" id="about-certifications" value="${escapeHTML(content.certifications || '')}">
            </div>
          </div>
        `;
        break;
        
      case 'skills':
        modalSkillsState = {
          lang: [...(content.lang || [])],
          risk: [...(content.risk || [])],
          ai: [...(content.ai || [])]
        };
        
        dynamicFieldsContainer.innerHTML = `
          <div style="display:flex; flex-direction:column; gap:20px;">
            <div>
              <h4 style="margin-bottom:8px; font-size:14px; font-weight:600; color:var(--accent-color);">Languages & Engineering Skills</h4>
              <div class="skills-manager-chips" id="modal-skills-lang-container"></div>
              <div class="add-chip-row">
                <input type="text" id="modal-add-skill-lang-input" class="admin-search-input" placeholder="e.g. Python (Pandas)">
                <button type="button" class="btn-primary add-modal-chip-btn" data-category="lang" style="padding:10px 16px;">+</button>
              </div>
            </div>
            <div>
              <h4 style="margin-bottom:8px; font-size:14px; font-weight:600; color:var(--accent-color);">Risk & Compliance Skills</h4>
              <div class="skills-manager-chips" id="modal-skills-risk-container"></div>
              <div class="add-chip-row">
                <input type="text" id="modal-add-skill-risk-input" class="admin-search-input" placeholder="e.g. Anti-Money Laundering">
                <button type="button" class="btn-primary add-modal-chip-btn" data-category="risk" style="padding:10px 16px;">+</button>
              </div>
            </div>
            <div>
              <h4 style="margin-bottom:8px; font-size:14px; font-weight:600; color:var(--accent-color);">AI & Innovation Skills</h4>
              <div class="skills-manager-chips" id="modal-skills-ai-container"></div>
              <div class="add-chip-row">
                <input type="text" id="modal-add-skill-ai-input" class="admin-search-input" placeholder="e.g. Prompt Engineering">
                <button type="button" class="btn-primary add-modal-chip-btn" data-category="ai" style="padding:10px 16px;">+</button>
              </div>
            </div>
          </div>
        `;
        
        const renderModalSkillsChips = () => {
          const categories = ['lang', 'risk', 'ai'];
          categories.forEach(cat => {
            const container = document.getElementById(`modal-skills-${cat}-container`);
            if (!container) return;
            const list = modalSkillsState[cat] || [];
            if (list.length === 0) {
              container.innerHTML = `<span style="color:var(--text-secondary); font-size:13px; font-style:italic;">No skills loaded. Add some below.</span>`;
              return;
            }
            container.innerHTML = list.map((skill, idx) => `
              <span class="skill-chip">
                ${escapeHTML(skill)}
                <button type="button" class="skill-chip-delete modal-skill-delete" data-category="${cat}" data-idx="${idx}">&times;</button>
              </span>
            `).join('');
            
            container.querySelectorAll('.modal-skill-delete').forEach(btn => {
              btn.addEventListener('click', () => {
                const category = btn.getAttribute('data-category');
                const idx = parseInt(btn.getAttribute('data-idx'));
                modalSkillsState[category].splice(idx, 1);
                renderModalSkillsChips();
              });
            });
          });
        };
        
        renderModalSkillsChips();
        
        dynamicFieldsContainer.querySelectorAll('.add-modal-chip-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const cat = btn.getAttribute('data-category');
            const input = document.getElementById(`modal-add-skill-${cat}-input`);
            const val = input.value.trim();
            if (val) {
              if (!modalSkillsState[cat].includes(val)) {
                modalSkillsState[cat].push(val);
                renderModalSkillsChips();
              }
              input.value = '';
            }
          });
        });
        break;
        
      case 'experience':
        dynamicFieldsContainer.innerHTML = `
          <div id="experience-items-list"></div>
          <button type="button" class="btn-secondary small-btn" id="add-experience-item-btn" style="margin-top:12px;">+ Add Work Experience</button>
        `;
        
        const expContainer = document.getElementById('experience-items-list');
        const renderExperienceList = (items) => {
          expContainer.innerHTML = items.map((item, index) => {
            const bulletsHtml = (item.bullets || []).map((b, bIdx) => `
              <div class="bullet-row" data-bidx="${bIdx}" style="display:flex; gap:8px; margin-bottom:6px; align-items:center;">
                <input type="text" class="exp-bullet-input" style="flex:1;" value="${escapeHTML(b)}" required>
                <button type="button" class="delete-bullet-btn" data-bidx="${bIdx}" style="background:none; border:none; color:var(--red-val); cursor:pointer; font-size:18px; font-weight:bold;">&times;</button>
              </div>
            `).join('');
            
            return `
              <div class="experience-editor-item glass-card" data-idx="${index}" style="padding:20px; margin-bottom:16px; position:relative; border-radius:16px; border:1px solid var(--border-color);">
                <button type="button" class="delete-experience-item-btn" data-idx="${index}" style="position:absolute; right:15px; top:15px; background:none; border:none; color:var(--red-val); cursor:pointer; font-size:20px; font-weight:bold;">&times;</button>
                <div class="form-row">
                  <div class="form-group" style="flex:0.3;">
                    <label>Period (Date)</label>
                    <input type="text" class="exp-date-input" value="${escapeHTML(item.date || '')}" placeholder="e.g. May 2025 – Present" required>
                  </div>
                  <div class="form-group" style="flex:0.35;">
                    <label>Role</label>
                    <input type="text" class="exp-role-input" value="${escapeHTML(item.role || '')}" required>
                  </div>
                  <div class="form-group" style="flex:0.35;">
                    <label>Company</label>
                    <input type="text" class="exp-company-input" value="${escapeHTML(item.company || '')}" required>
                  </div>
                </div>
                <div style="margin-top:12px;">
                  <label style="font-size:13px; font-weight:600;">Job bullets (Supports HTML/Strong tags)</label>
                  <div class="exp-bullets-list" style="margin-top:6px;">
                    ${bulletsHtml}
                  </div>
                  <button type="button" class="btn-secondary small-btn add-exp-bullet-btn" data-idx="${index}" style="margin-top:8px; font-size:11px; padding:4px 10px;">+ Add Bullet</button>
                </div>
              </div>
            `;
          }).join('');
          
          expContainer.querySelectorAll('.delete-experience-item-btn').forEach(btn => {
            btn.addEventListener('click', () => {
              const idx = parseInt(btn.getAttribute('data-idx'));
              const currentItems = getExperienceFromDOM();
              currentItems.splice(idx, 1);
              renderExperienceList(currentItems);
            });
          });
          
          expContainer.querySelectorAll('.delete-bullet-btn').forEach(btn => {
            btn.addEventListener('click', () => {
              const card = btn.closest('.experience-editor-item');
              const idx = parseInt(card.getAttribute('data-idx'));
              const bIdx = parseInt(btn.getAttribute('data-bidx'));
              const currentItems = getExperienceFromDOM();
              currentItems[idx].bullets.splice(bIdx, 1);
              renderExperienceList(currentItems);
            });
          });
          
          expContainer.querySelectorAll('.add-exp-bullet-btn').forEach(btn => {
            btn.addEventListener('click', () => {
              const idx = parseInt(btn.getAttribute('data-idx'));
              const currentItems = getExperienceFromDOM();
              if (!currentItems[idx].bullets) currentItems[idx].bullets = [];
              currentItems[idx].bullets.push('New key milestone description details.');
              renderExperienceList(currentItems);
            });
          });
        };
        
        renderExperienceList(content.items || []);
        
        document.getElementById('add-experience-item-btn').addEventListener('click', () => {
          const currentItems = getExperienceFromDOM();
          currentItems.push({
            date: 'Jun 2026 – Present',
            role: 'Product Risk Specialist',
            company: 'HSBC, Bangalore',
            bullets: ['Spearheaded regulatory risk analysis for new product introductions.']
          });
          renderExperienceList(currentItems);
        });
        break;
        
      case 'credentials':
        dynamicFieldsContainer.innerHTML = `
          <div style="display:flex; flex-direction:column; gap:24px;">
            <div class="form-row">
              <div class="form-group">
                <label for="cred-tab1-title">Academic Tab Title</label>
                <input type="text" id="cred-tab1-title" value="${escapeHTML(content.tab1Title || 'Academic Journey')}" required>
              </div>
              <div class="form-group">
                <label for="cred-tab2-title">Certifications Tab Title</label>
                <input type="text" id="cred-tab2-title" value="${escapeHTML(content.tab2Title || 'Certifications')}" required>
              </div>
              <div class="form-group">
                <label for="cred-tab3-title">Honors Tab Title</label>
                <input type="text" id="cred-tab3-title" value="${escapeHTML(content.tab3Title || 'Honors & Achievements')}" required>
              </div>
            </div>
            
            <div class="glass-card" style="padding:16px; border-radius:12px; border:1px solid var(--border-color);">
              <h4 style="margin-bottom:12px; font-weight:600; color:var(--accent-color);">Academic Journey Items</h4>
              <div id="cred-edu-list"></div>
              <button type="button" class="btn-secondary small-btn" id="add-cred-edu-btn" style="margin-top:8px;">+ Add Education Entry</button>
            </div>
            
            <div class="glass-card" style="padding:16px; border-radius:12px; border:1px solid var(--border-color);">
              <h4 style="margin-bottom:12px; font-weight:600; color:var(--accent-color);">Certifications Showcase</h4>
              <div id="cred-cert-list"></div>
              <button type="button" class="btn-secondary small-btn" id="add-cred-cert-btn" style="margin-top:8px;">+ Add Certification</button>
            </div>
            
            <div class="glass-card" style="padding:16px; border-radius:12px; border:1px solid var(--border-color);">
              <h4 style="margin-bottom:12px; font-weight:600; color:var(--accent-color);">Honors & Achievements</h4>
              <div id="cred-honor-list"></div>
              <button type="button" class="btn-secondary small-btn" id="add-cred-honor-btn" style="margin-top:8px;">+ Add Honor Entry</button>
            </div>
          </div>
        `;
        
        const renderEduList = (items) => {
          const list = document.getElementById('cred-edu-list');
          list.innerHTML = items.map((item, idx) => `
            <div class="edu-editor-item" data-idx="${idx}" style="display:flex; flex-direction:column; gap:8px; border-bottom:1px dashed var(--border-color); padding-bottom:12px; margin-bottom:12px; position:relative;">
              <button type="button" class="delete-cred-edu-btn" data-idx="${idx}" style="position:absolute; right:0; top:0; background:none; border:none; color:var(--red-val); cursor:pointer; font-size:16px;">&times;</button>
              <div class="form-row">
                <div class="form-group" style="flex:0.25;">
                  <label>Period</label>
                  <input type="text" class="edu-period-input" value="${escapeHTML(item.period || '')}" required>
                </div>
                <div class="form-group" style="flex:0.4;">
                  <label>Degree</label>
                  <input type="text" class="edu-degree-input" value="${escapeHTML(item.degree || '')}" required>
                </div>
                <div class="form-group" style="flex:0.35;">
                  <label>School</label>
                  <input type="text" class="edu-school-input" value="${escapeHTML(item.school || '')}" required>
                </div>
              </div>
              <div class="form-group" style="margin:0;">
                <label>Description</label>
                <input type="text" class="edu-desc-input" value="${escapeHTML(item.description || '')}">
              </div>
            </div>
          `).join('');
          
          list.querySelectorAll('.delete-cred-edu-btn').forEach(btn => {
            btn.addEventListener('click', () => {
              const idx = parseInt(btn.getAttribute('data-idx'));
              const current = getEduFromDOM();
              current.splice(idx, 1);
              renderEduList(current);
            });
          });
        };
        
        const renderCertList = (items) => {
          const list = document.getElementById('cred-cert-list');
          list.innerHTML = items.map((item, idx) => `
            <div class="cert-editor-item" data-idx="${idx}" style="display:flex; gap:12px; border-bottom:1px dashed var(--border-color); padding-bottom:12px; margin-bottom:12px; align-items:center; position:relative;">
              <button type="button" class="delete-cred-cert-btn" data-idx="${idx}" style="position:absolute; right:0; top:5px; background:none; border:none; color:var(--red-val); cursor:pointer; font-size:16px;">&times;</button>
              <div class="form-group" style="flex:0.1; min-width:40px; margin:0;">
                <label>Icon</label>
                <input type="text" class="cert-icon-input" value="${escapeHTML(item.icon || '🎖️')}" style="text-align:center;">
              </div>
              <div class="form-group" style="flex:0.5; margin:0;">
                <label>Name</label>
                <input type="text" class="cert-name-input" value="${escapeHTML(item.name || '')}" required>
              </div>
              <div class="form-group" style="flex:0.4; margin:0;">
                <label>Issuer</label>
                <input type="text" class="cert-issuer-input" value="${escapeHTML(item.issuer || '')}" required>
              </div>
            </div>
          `).join('');
          
          list.querySelectorAll('.delete-cred-cert-btn').forEach(btn => {
            btn.addEventListener('click', () => {
              const idx = parseInt(btn.getAttribute('data-idx'));
              const current = getCertFromDOM();
              current.splice(idx, 1);
              renderCertList(current);
            });
          });
        };
        
        const renderHonorList = (items) => {
          const list = document.getElementById('cred-honor-list');
          list.innerHTML = items.map((item, idx) => `
            <div class="honor-editor-item" data-idx="${idx}" style="display:flex; flex-direction:column; gap:8px; border-bottom:1px dashed var(--border-color); padding-bottom:12px; margin-bottom:12px; position:relative;">
              <button type="button" class="delete-cred-honor-btn" data-idx="${idx}" style="position:absolute; right:0; top:0; background:none; border:none; color:var(--red-val); cursor:pointer; font-size:16px;">&times;</button>
              <div class="form-row">
                <div class="form-group" style="flex:0.15; min-width:50px;">
                  <label>Icon</label>
                  <input type="text" class="honor-icon-input" value="${escapeHTML(item.icon || '🏆')}" style="text-align:center;">
                </div>
                <div class="form-group" style="flex:0.85;">
                  <label>Title</label>
                  <input type="text" class="honor-title-input" value="${escapeHTML(item.title || '')}" required>
                </div>
              </div>
              <div class="form-group" style="margin:0;">
                <label>Description</label>
                <input type="text" class="honor-desc-input" value="${escapeHTML(item.description || '')}" required>
              </div>
            </div>
          `).join('');
          
          list.querySelectorAll('.delete-cred-honor-btn').forEach(btn => {
            btn.addEventListener('click', () => {
              const idx = parseInt(btn.getAttribute('data-idx'));
              const current = getHonorFromDOM();
              current.splice(idx, 1);
              renderHonorList(current);
            });
          });
        };
        
        renderEduList(content.eduItems || []);
        renderCertList(content.certItems || []);
        renderHonorList(content.honorItems || []);
        
        document.getElementById('add-cred-edu-btn').addEventListener('click', () => {
          const current = getEduFromDOM();
          current.push({ period: '2026', degree: 'Degree Name', school: 'School Name', description: 'Academic description details.' });
          renderEduList(current);
        });
        document.getElementById('add-cred-cert-btn').addEventListener('click', () => {
          const current = getCertFromDOM();
          current.push({ icon: '🧠', name: 'New Certification Title', issuer: 'Issuer Name' });
          renderCertList(current);
        });
        document.getElementById('add-cred-honor-btn').addEventListener('click', () => {
          const current = getHonorFromDOM();
          current.push({ icon: '🥇', title: 'Achievement Title', description: 'Description of the award details.' });
          renderHonorList(current);
        });
        break;
        
      case 'projects':
        dynamicFieldsContainer.innerHTML = `
          <div class="project-editor-header">
            <h4 style="font-weight:600; color:var(--accent-color);">Featured Projects Cards</h4>
            <button type="button" class="btn-primary small-btn" id="modal-add-project-btn" style="cursor:pointer; padding:6px 12px; font-size:12px;">+ Add New Project</button>
          </div>
          <div class="editor-projects-manager-grid" id="modal-projects-list" style="margin-top: 16px; display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px;">
            <!-- Dynamic Projects inside Modal -->
          </div>
        `;
        
        renderModalProjectsList();
        
        document.getElementById('modal-add-project-btn').addEventListener('click', () => {
          document.getElementById('project-modal-title').textContent = "Add Project";
          projectEditorForm.reset();
          document.getElementById('proj-edit-id').value = '';
          currentSelectedProjectImageBase64 = '';
          if (projImagePreview) projImagePreview.innerHTML = '<span style="color:var(--text-secondary); font-size:13px;">No image uploaded</span>';
          projectFormModal.style.display = 'flex';
        });
        break;
        
      case 'contact':
        dynamicFieldsContainer.innerHTML = `
          <div class="form-group">
            <label for="contact-description">Contact Section Description</label>
            <textarea id="contact-description" rows="2" required>${escapeHTML(content.description || '')}</textarea>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="contact-email">Email Address</label>
              <input type="email" id="contact-email" value="${escapeHTML(content.email || '')}" required>
            </div>
            <div class="form-group">
              <label for="contact-phone">Phone Number</label>
              <input type="text" id="contact-phone" value="${escapeHTML(content.phone || '')}" required>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="contact-topmate">Topmate URL</label>
              <input type="text" id="contact-topmate" value="${escapeHTML(content.topmate || '')}">
            </div>
            <div class="form-group">
              <label for="contact-location">Location</label>
              <input type="text" id="contact-location" value="${escapeHTML(content.location || '')}" required>
            </div>
          </div>
        `;
        break;
        
      case 'custom':
        dynamicFieldsContainer.innerHTML = `
          <div class="form-group">
            <label for="custom-layout-select">Section Layout Style</label>
            <select id="custom-layout-select" style="padding: 10px 16px; border-radius: 12px; border: 1px solid var(--border-color); background: var(--bg-secondary); color: var(--text-main); font-size: 14px; width:100%;">
              <option value="cards" ${content.layout === 'cards' ? 'selected' : ''}>Grid of Cards</option>
              <option value="html" ${content.layout === 'html' ? 'selected' : ''}>Custom HTML Block</option>
            </select>
          </div>
          
          <div id="custom-layout-cards-area" style="display:none; margin-top:16px;">
            <h4 style="font-weight:600; color:var(--accent-color); margin-bottom:12px;">Cards Items Grid</h4>
            <div id="custom-cards-list"></div>
            <button type="button" class="btn-secondary small-btn" id="add-custom-card-btn" style="margin-top:8px;">+ Add Card</button>
          </div>
          
          <div id="custom-layout-html-area" style="display:none; margin-top:16px;">
            <div class="form-group">
              <label for="custom-html-textarea">Raw HTML Code (Use standard tailwind/css blocks)</label>
              <textarea id="custom-html-textarea" rows="12" style="font-family:monospace; font-size:13px; width: 100%; border: 1px solid var(--border-color); border-radius:12px; padding:16px; background:var(--bg-secondary); color:var(--text-main);">${escapeHTML(content.html || '')}</textarea>
            </div>
          </div>
        `;
        
        const layoutSelect = document.getElementById('custom-layout-select');
        const cardsArea = document.getElementById('custom-layout-cards-area');
        const htmlArea = document.getElementById('custom-layout-html-area');
        
        const toggleLayoutAreas = () => {
          if (layoutSelect.value === 'cards') {
            cardsArea.style.display = 'block';
            htmlArea.style.display = 'none';
          } else {
            cardsArea.style.display = 'none';
            htmlArea.style.display = 'block';
          }
        };
        
        layoutSelect.addEventListener('change', toggleLayoutAreas);
        
        const renderCustomCardsList = (items) => {
          const list = document.getElementById('custom-cards-list');
          list.innerHTML = items.map((item, idx) => `
            <div class="custom-card-item glass-card" data-idx="${idx}" style="padding:16px; border-radius:12px; border:1px solid var(--border-color); margin-bottom:12px; position:relative;">
              <button type="button" class="delete-custom-card-btn" data-idx="${idx}" style="position:absolute; right:10px; top:10px; background:none; border:none; color:var(--red-val); cursor:pointer; font-size:18px;">&times;</button>
              <div class="form-row">
                <div class="form-group" style="flex:0.15; min-width:50px;">
                  <label>Icon</label>
                  <input type="text" class="card-icon-input" value="${escapeHTML(item.icon || '🚀')}" style="text-align:center;">
                </div>
                <div class="form-group" style="flex:0.85;">
                  <label>Card Title</label>
                  <input type="text" class="card-title-input" value="${escapeHTML(item.title || '')}" required>
                </div>
              </div>
              <div class="form-group" style="margin:0;">
                <label>Card Description Text</label>
                <textarea class="card-text-input" rows="2" required>${escapeHTML(item.text || '')}</textarea>
              </div>
            </div>
          `).join('');
          
          list.querySelectorAll('.delete-custom-card-btn').forEach(btn => {
            btn.addEventListener('click', () => {
              const idx = parseInt(btn.getAttribute('data-idx'));
              const current = getCustomCardsFromDOM();
              current.splice(idx, 1);
              renderCustomCardsList(current);
            });
          });
        };
        
        renderCustomCardsList(content.items || []);
        toggleLayoutAreas();
        
        document.getElementById('add-custom-card-btn').addEventListener('click', () => {
          const current = getCustomCardsFromDOM();
          current.push({ icon: '🌟', title: 'New Feature Card', text: 'This is description text for the custom card.' });
          renderCustomCardsList(current);
        });
        break;
    }
    
    sectionEditorModal.style.display = 'flex';
    sectionEditorModal.classList.add('active');
  } catch (err) {
    console.error("Open section editor modal failed:", err);
  }
}

if (sectionEditorForm) {
  sectionEditorForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = sectionEditorForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving Section Content...';
    
    const secId = document.getElementById('section-edit-id').value;
    const secType = document.getElementById('section-edit-type').value;
    const titleVal = document.getElementById('section-title-input').value.trim();
    const subtitleVal = document.getElementById('section-subtitle-input').value.trim();
    
    try {
      const sections = await dbService.getSections();
      const existingSec = sections.find(s => s.id === secId);
      if (!existingSec) throw new Error("Section not found in database.");
      
      const content = {};
      
      switch (secType) {
        case 'hero':
          content.badgeText = document.getElementById('hero-badge-text').value.trim();
          content.avatarName = document.getElementById('hero-avatar-name').value.trim();
          content.tagline = document.getElementById('hero-tagline').value.trim();
          content.ctaPrimaryText = document.getElementById('hero-cta-primary-text').value.trim();
          content.ctaPrimaryLink = document.getElementById('hero-cta-primary-link').value.trim();
          content.ctaSecondaryText = document.getElementById('hero-cta-secondary-text').value.trim();
          content.ctaSecondaryLink = document.getElementById('hero-cta-secondary-link').value.trim();
          content.ctaResumeText = document.getElementById('hero-cta-resume-text').value.trim();
          content.typewriterWords = document.getElementById('hero-typewriter-words').value
            .split(',')
            .map(w => w.trim())
            .filter(w => w.length > 0);
          content.profileImg = currentSelectedHeroImageBase64;
          break;
          
        case 'metrics':
          content.cards = getMetricsFromDOM();
          break;
          
        case 'about':
          content.avatarName = document.getElementById('about-avatar-name').value.trim();
          content.avatarSub = document.getElementById('about-avatar-sub').value.trim();
          content.para1 = document.getElementById('about-para1').value.trim();
          content.para2 = document.getElementById('about-para2').value.trim();
          content.philosophy = document.getElementById('about-philosophy').value.trim();
          content.education = document.getElementById('about-education').value.trim();
          content.certifications = document.getElementById('about-certifications').value.trim();
          break;
          
        case 'skills':
          content.lang = modalSkillsState.lang;
          content.risk = modalSkillsState.risk;
          content.ai = modalSkillsState.ai;
          break;
          
        case 'experience':
          content.items = getExperienceFromDOM();
          break;
          
        case 'credentials':
          content.tab1Title = document.getElementById('cred-tab1-title').value.trim();
          content.tab2Title = document.getElementById('cred-tab2-title').value.trim();
          content.tab3Title = document.getElementById('cred-tab3-title').value.trim();
          content.eduItems = getEduFromDOM();
          content.certItems = getCertFromDOM();
          content.honorItems = getHonorFromDOM();
          break;
          
        case 'projects':
          content.dummy = true;
          break;
          
        case 'contact':
          content.description = document.getElementById('contact-description').value.trim();
          content.email = document.getElementById('contact-email').value.trim();
          content.phone = document.getElementById('contact-phone').value.trim();
          content.topmate = document.getElementById('contact-topmate').value.trim();
          content.location = document.getElementById('contact-location').value.trim();
          break;
          
        case 'custom':
          content.layout = document.getElementById('custom-layout-select').value;
          content.items = getCustomCardsFromDOM();
          content.html = document.getElementById('custom-html-textarea').value;
          break;
      }
      
      const updatedSection = {
        ...existingSec,
        title: titleVal,
        subtitle: subtitleVal,
        content: content
      };
      
      await dbService.saveSection(updatedSection);
      sectionEditorModal.style.display = 'none';
      sectionEditorModal.classList.remove('active');
      alert("Section saved successfully!");
      
      loadLayoutBuilderPanel();
    } catch (err) {
      alert("Save failed: " + err.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Save Section Content';
    }
  });
}

const addNewSectionBtn = document.getElementById('add-new-section-btn');
const addSectionModal = document.getElementById('add-section-modal');
const closeAddSectionModalBtn = document.getElementById('close-add-section-modal');
const confirmAddSectionBtn = document.getElementById('confirm-add-section-btn');

if (addNewSectionBtn && addSectionModal) {
  addNewSectionBtn.addEventListener('click', () => {
    document.getElementById('new-section-title').value = '';
    document.getElementById('new-section-type').value = 'experience';
    addSectionModal.style.display = 'flex';
    addSectionModal.classList.add('active');
  });
}

if (closeAddSectionModalBtn && addSectionModal) {
  closeAddSectionModalBtn.addEventListener('click', () => {
    addSectionModal.style.display = 'none';
    addSectionModal.classList.remove('active');
  });
  
  // Close on background click
  addSectionModal.addEventListener('click', (e) => {
    if (e.target === addSectionModal) {
      addSectionModal.style.display = 'none';
      addSectionModal.classList.remove('active');
    }
  });
}

if (confirmAddSectionBtn && addSectionModal) {
  confirmAddSectionBtn.addEventListener('click', async () => {
    try {
      const type = document.getElementById('new-section-type').value;
      let title = document.getElementById('new-section-title').value.trim();
      
      const sections = await dbService.getSections();
      const maxOrder = sections.reduce((max, s) => Math.max(max, s.order !== undefined ? s.order : -1), -1);
      
      let defaultContent = {};
      
      switch(type) {
        case 'hero':
          title = title || 'Hero Section';
          defaultContent = {
            badgeText: '',
            title: "Hi, I'm Vimal Sharma",
            tagline: "Expert in PySpark, Python, and Agentic AI building anomaly detection, network-based transaction monitoring, and GenAI compliance tools at scale.",
            ctaPrimaryText: 'View Case Studies',
            ctaPrimaryLink: '#projects',
            ctaSecondaryText: '',
            ctaSecondaryLink: '',
            ctaResumeText: 'Download Resume',
            profileImg: 'profile.jpg',
            typewriterWords: ["Analytical Modelling Specialist", "Product Builder", "Pragmatic Problem Solver", "AI-First Vibe Coder", "Agentic AI Architect"]
          };
          break;
        case 'metrics':
          title = title || 'Key Metrics';
          defaultContent = {
            cards: [
              { icon: '🛡️', value: '$240K+', description: 'Annual operational savings achieved by deploying rule-based and behavioral anomaly detection models.' },
              { icon: '📈', value: '26%', description: 'Overall reduction in false-positive compliance alerts across transactional monitoring systems.' }
            ]
          };
          break;
        case 'about':
          title = title || 'About Me';
          defaultContent = {
            avatarName: "Vimal Sharma",
            avatarSub: "Analytical Modelling Manager",
            title: "Bridging Data Engineering & Product Strategy",
            para1: "I am an Analytical Modelling Manager with over 3 years of experience at HSBC in AML and financial crime risk.",
            para2: "By combining deep technical skills in data engineering with strategic product thinking...",
            philosophy: "Bridge data pipelines with strategic compliance.",
            education: "MBA in Finance (Christ University) | BA in Economics",
            certifications: "CFA Level 1 | ICA | ISO 20022 | Lean Six Sigma Yellow Belt"
          };
          break;
        case 'skills':
          title = title || 'Core Skills';
          defaultContent = {
            lang: ["Python (Pandas, NumPy)", "PySpark & Big Data", "SQL & Database Modeling"],
            risk: ["Anti-Money Laundering (AML)", "Transaction Monitoring Systems"],
            ai: ["Prompt Engineering", "Generative AI & LLMs"]
          };
          break;
        case 'experience':
          title = title || 'Work Experience';
          defaultContent = {
            items: [
              {
                date: "May 2025 – Present",
                role: "Manager - Financial Crime Detection",
                company: "HSBC, Bangalore",
                bullets: ["Saved $240K annually and reduced alerts by 26% by deploying rule-based models."]
              }
            ]
          };
          break;
        case 'credentials':
          title = title || 'Education & Credentials';
          defaultContent = {
            tab1Title: "Academic Journey",
            tab2Title: "Certifications",
            tab3Title: "Honors & Achievements",
            eduItems: [{ period: "2021 – 2023", degree: "MBA", school: "Christ University", description: "Specialized in finance." }],
            certItems: [{ icon: "🎖️", name: "CFA Program Level I", issuer: "CFA Institute" }],
            honorItems: [{ icon: "🏆", title: "Chrizellenz Finance Winner", description: "First place in postgraduate competition." }]
          };
          break;
        case 'projects':
          title = title || 'Featured Projects';
          defaultContent = {};
          break;
        case 'contact':
          title = title || "Let's connect";
          defaultContent = {
            description: "If you need assistance in analyzing product risks, modeling transaction fraud pipelines, setting up compliant launch strategies, or auditing system metrics—reach out!",
            email: "vimal2017sharma@gmail.com",
            phone: "9205714199",
            topmate: "https://topmate.io/imvimalsha",
            location: "Bangalore, India"
          };
          break;
        case 'custom':
        default:
          title = title || 'Custom Section';
          defaultContent = {
            layout: 'cards',
            items: [
              { icon: '🚀', title: 'Example Card', text: 'This is an example card description. You can edit this in the section editor.' }
            ],
            html: '<div class="text-center" style="padding:20px;"><h3>Custom Layout Block</h3><p>Edit this HTML block in the section editor.</p></div>'
          };
          break;
      }
      
      const newSec = {
        id: 'sec_' + type + '_' + Date.now(),
        type: type,
        title: title,
        subtitle: '',
        visible: true,
        order: maxOrder + 1,
        content: defaultContent
      };
      
      await dbService.saveSection(newSec);
      addSectionModal.style.display = 'none';
      addSectionModal.classList.remove('active');
      loadLayoutBuilderPanel();
      openSectionEditorModal(newSec.id);
    } catch (err) {
      console.error("Failed to add section:", err);
      alert("Failed to add section: " + err.message);
    }
  });
}

// Project Add/Edit Modal triggers
const projectFormModal = document.getElementById('project-form-modal');
const addNewProjectBtn = document.getElementById('add-new-project-btn');
const closeProjectModalBtn = document.getElementById('close-project-modal');
const projectEditorForm = document.getElementById('project-editor-form');
const projImagePreview = document.getElementById('proj-image-preview');
const fileInput = document.getElementById('proj-image');

if (addNewProjectBtn && projectFormModal) {
  addNewProjectBtn.addEventListener('click', () => {
    document.getElementById('project-modal-title').textContent = "Add Project";
    projectEditorForm.reset();
    document.getElementById('proj-edit-id').value = '';
    document.getElementById('proj-detail-html').value = '';
    currentSelectedProjectImageBase64 = '';
    if (projImagePreview) projImagePreview.innerHTML = '<span style="color:var(--text-secondary); font-size:13px;">No image uploaded</span>';
    projectFormModal.style.display = 'flex';
    projectFormModal.classList.add('active');
  });
}

if (closeProjectModalBtn && projectFormModal) {
  closeProjectModalBtn.addEventListener('click', () => {
    projectFormModal.style.display = 'none';
    projectFormModal.classList.remove('active');
  });
}

// Convert project image upload to base64
if (fileInput) {
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      // Compress slightly by loading into image and canvas if needed, or simply read as data URL.
      // Standard reader is clean:
      const reader = new FileReader();
      reader.onload = (event) => {
        currentSelectedProjectImageBase64 = event.target.result;
        if (projImagePreview) {
          projImagePreview.innerHTML = `<img src="${currentSelectedProjectImageBase64}" alt="Preview">`;
        }
      };
      reader.readAsDataURL(file);
    }
  });
}

async function openProjectModalForEdit(id) {
  try {
    const projects = await dbService.getProjects();
    const p = projects.find(proj => proj.id === id);
    if (!p) return;
    
    document.getElementById('project-modal-title').textContent = "Edit Project";
    document.getElementById('proj-edit-id').value = p.id;
    document.getElementById('proj-title').value = p.title;
    document.getElementById('proj-tag').value = p.primaryTag || '';
    document.getElementById('proj-tag2').value = p.secondaryTag || '';
    document.getElementById('proj-order').value = p.order || 0;
    document.getElementById('proj-desc').value = p.description || '';
    document.getElementById('proj-metric-val').value = p.metric1Val || '';
    document.getElementById('proj-metric-lbl').value = p.metric1Lbl || '';
    document.getElementById('proj-metric-val2').value = p.metric2Val || '';
    document.getElementById('proj-metric-lbl2').value = p.metric2Lbl || '';
    document.getElementById('proj-tech').value = p.tech || '';
    document.getElementById('proj-detail-html').value = p.detailHtml || '';
    
    currentSelectedProjectImageBase64 = p.image || '';
    if (projImagePreview) {
      projImagePreview.innerHTML = p.image ? `<img src="${p.image}" alt="Preview">` : '<span style="color:var(--text-secondary); font-size:13px;">No image uploaded</span>';
    }
    
    projectFormModal.style.display = 'flex';
    projectFormModal.classList.add('active');
  } catch (err) {
    console.error("Open project edit dialog fail:", err);
  }
}

// Project Form submit listener
if (projectEditorForm) {
  projectEditorForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = projectEditorForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';
    
    const editId = document.getElementById('proj-edit-id').value;
    const projectData = {
      title: document.getElementById('proj-title').value,
      primaryTag: document.getElementById('proj-tag').value,
      secondaryTag: document.getElementById('proj-tag2').value,
      order: parseInt(document.getElementById('proj-order').value) || 0,
      description: document.getElementById('proj-desc').value,
      metric1Val: document.getElementById('proj-metric-val').value,
      metric1Lbl: document.getElementById('proj-metric-lbl').value,
      metric2Val: document.getElementById('proj-metric-val2').value,
      metric2Lbl: document.getElementById('proj-metric-lbl2').value,
      tech: document.getElementById('proj-tech').value,
      detailHtml: document.getElementById('proj-detail-html').value,
      image: currentSelectedProjectImageBase64
    };
    
    if (editId) {
      projectData.id = editId;
    }
    
    try {
      await dbService.saveProject(projectData);
      projectFormModal.style.display = 'none';
      projectFormModal.classList.remove('active');
      if (typeof renderModalProjectsList === 'function') {
        renderModalProjectsList();
      }
      alert("Project saved successfully!");
    } catch (err) {
      alert("Project save failed: " + err.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Save Project';
    }
  });
}

// ==========================================================================
// SYSTEM SETTINGS & PASSWORD CONTROLS
// ==========================================================================
async function loadSettingsPanel() {
  const tbody = document.getElementById('settings-login-history-body');
  if (!tbody) return;
  
  try {
    const logs = await dbService.getLoginHistory();
    if (logs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" class="text-center" style="color:var(--text-secondary); padding:15px;">No login history logged yet.</td></tr>`;
      return;
    }
    
    tbody.innerHTML = logs.map(l => {
      const dateStr = new Date(l.timestamp).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' });
      const isSuccess = l.status === 'success';
      const statusBadge = `<span class="badge-status ${isSuccess ? 'success' : 'failed'}">${isSuccess ? 'Success' : 'Failed'}</span>`;
      return `
        <tr>
          <td style="color: var(--text-secondary); font-size:12px; white-space:nowrap;">${dateStr}</td>
          <td style="font-weight: 500;">${escapeHTML(l.email)}</td>
          <td>${statusBadge}</td>
          <td style="font-size:12px; color:var(--text-secondary); max-width:120px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${escapeHTML(l.browser)}">${escapeHTML(l.browser)}</td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error("Login history load failed:", err);
  }
}

const changePasswordForm = document.getElementById('change-password-form');
const pwFeedback = document.getElementById('pw-change-feedback');
if (changePasswordForm) {
  changePasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    pwFeedback.style.display = 'none';
    
    const newPw = document.getElementById('new-password').value;
    const confirmPw = document.getElementById('confirm-password').value;
    
    if (newPw !== confirmPw) {
      pwFeedback.textContent = "Passwords do not match!";
      pwFeedback.className = "form-feedback-message error";
      pwFeedback.style.display = 'block';
      return;
    }
    
    const submitBtn = changePasswordForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Updating...';
    
    try {
      await dbService.changePassword(newPw);
      pwFeedback.textContent = "Password updated successfully!";
      pwFeedback.className = "form-feedback-message success";
      pwFeedback.style.display = 'block';
      changePasswordForm.reset();
      loadSettingsPanel(); // refresh login logs
    } catch (err) {
      pwFeedback.textContent = "Password update failed: " + err.message;
      pwFeedback.className = "form-feedback-message error";
      pwFeedback.style.display = 'block';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Update Password';
    }
  });
}

// ==========================================================================
// SYSTEM UTILITIES (CSV EXPORT & HTML ESCAPING)
// ==========================================================================
function downloadCSV(filename, headers, rows) {
  const escapeCsvVal = (val) => {
    if (val === null || val === undefined) return '';
    let str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      str = '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  };
  
  const csvContent = [
    headers.map(escapeCsvVal).join(','),
    ...rows.map(row => row.map(escapeCsvVal).join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}
