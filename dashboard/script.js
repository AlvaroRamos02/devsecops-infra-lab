// State management
const state = {
    sast: { data: [], filtered: [], page: 1, pageSize: 10, sort: { col: 'severity', asc: false } },
    scaFs: { data: [], filtered: [], page: 1, pageSize: 10, sort: { col: 'severity', asc: false } },
    scaImage: { data: [], filtered: [], page: 1, pageSize: 10, sort: { col: 'severity', asc: false } },
    dismissed: JSON.parse(localStorage.getItem('dismissedFindings') || '[]'),
    showDismissed: false,
    selected: [], // Store UUIDs of selected items
    viewMode: 'list', // 'list' or 'modules'
    moduleDepth: 2, // Default depth for module grouping
    activeModule: null, // Current module filter for drill-down
    overviewFilter: 'ALL' // 'ALL', 'SAST', 'SCA'
};

const SEVERITY_WEIGHTS = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1, 'UNKNOWN': 0 };

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('scan-date').textContent = new Date().toLocaleString();

    Promise.all([
        fetch('data/semgrep-report.json').then(res => res.ok ? res.json() : { results: [] }).catch(() => ({ results: [] })),
        fetch('data/trivy-fs-report.json').then(res => res.ok ? res.json() : { Results: [] }).catch(() => ({ Results: [] })),
        fetch('data/trivy-image-report.json').then(res => res.ok ? res.json() : { Results: [] }).catch(() => ({ Results: [] }))
    ]).then(([semgrepData, trivyFsData, trivyImageData]) => {
        state.sast.data = processSemgrep(semgrepData);
        state.scaFs.data = processTrivy(trivyFsData);
        state.scaImage.data = processTrivy(trivyImageData);

        applyFilters('sast');
        applyFilters('scaFs');
        applyFilters('scaImage');

        updateOverview();
    });
});

function updateOverview() {
    const allFindings = [...state.sast.data, ...state.scaFs.data, ...state.scaImage.data];
    let filteredFindings = allFindings;

    if (state.overviewFilter === 'SAST') {
        filteredFindings = state.sast.data;
    } else if (state.overviewFilter === 'SCA') {
        filteredFindings = [...state.scaFs.data, ...state.scaImage.data];
    }

    updateSummary(filteredFindings);
    renderCharts(filteredFindings);
    renderTopIssues(filteredFindings);
}

function filterOverview(type, btn) {
    state.overviewFilter = type;

    // Update buttons
    const container = btn.parentElement;
    container.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    updateOverview();
}

// --- Navigation ---
function navigateTo(viewId) {
    // Update Sidebar
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = Array.from(document.querySelectorAll('.nav-btn')).find(b => b.getAttribute('onclick').includes(viewId));
    if (activeBtn) activeBtn.classList.add('active');

    // Update Views
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
    document.getElementById(`${viewId}-view`).classList.add('active');

    // Update Page Title
    const titles = {
        'overview': 'Dashboard Overview',
        'sast': 'SAST - Code Analysis',
        'sca-fs': 'SCA - Repository Dependencies',
        'sca-image': 'SCA - Container Images'
    };
    document.getElementById('page-title').textContent = titles[viewId] || 'Dashboard';
}

// --- View Mode & Depth Control ---

function switchViewMode(mode) {
    state.viewMode = mode;

    // Reset module filter when switching to module view to show all modules
    if (mode === 'modules') {
        state.sast.activeModule = null;
        applyFilters('sast');
    }

    // Update buttons
    document.getElementById('view-list-btn').classList.toggle('active', mode === 'list');
    document.getElementById('view-modules-btn').classList.toggle('active', mode === 'modules');

    // Show/Hide Depth Control
    const depthControl = document.getElementById('module-depth-control');
    if (mode === 'modules') {
        depthControl.style.display = 'flex';
    } else {
        depthControl.style.display = 'none';
    }

    // Re-render current view (SAST only for now)
    renderList('sast');
}

function updateModuleDepth(depth) {
    state.moduleDepth = parseInt(depth);
    state.sast.activeModule = null; // Reset filter when changing depth
    document.getElementById('depth-value').textContent = depth;
    applyFilters('sast'); // Re-apply filters with new depth logic
    renderList('sast');
}

// --- Data Processing ---

function normalizeSeverity(severity) {
    const s = (severity || 'UNKNOWN').toUpperCase();
    if (s === 'ERROR') return 'HIGH';
    if (s === 'WARNING') return 'MEDIUM';
    if (s === 'INFO') return 'LOW';
    return s;
}

function processSemgrep(data) {
    if (!data.results) return [];
    return data.results.map((item, index) => {
        const metadata = item.extra.metadata || {};
        let category = metadata.category || 'Security';
        if (!metadata.category && item.check_id) {
            const parts = item.check_id.split('.');
            if (parts.length > 2) {
                category = parts.find(p => ['injection', 'xss', 'cryptography', 'auth', 'audit'].includes(p)) || 'Security';
            }
        }

        return {
            uuid: `sast-${index}`,
            type: 'SAST',
            severity: normalizeSeverity(item.extra.severity),
            id: item.check_id,
            message: item.extra.message,
            location: `${item.path}:${item.start.line}`,
            category: category,
            cwe: metadata.cwe || [],
            owasp: metadata.owasp || [],
            code: item.extra.lines,
            remediation: generateSastRemediation(item),
            raw: item
        };
    });
}

function generateSastRemediation(item) {
    if (item.extra.fix) return `Apply the following fix:\n\n${item.extra.fix}`;
    const msg = item.extra.message || '';
    if (msg.toLowerCase().includes('xss')) return "Sanitize all user inputs before rendering them in the browser. Use context-aware encoding.";
    if (msg.toLowerCase().includes('sql injection')) return "Use parameterized queries or prepared statements. Avoid string concatenation for SQL queries.";
    if (msg.toLowerCase().includes('hardcoded')) return "Move secrets to environment variables or a secrets manager. Do not commit secrets to version control.";
    return "Review the code snippet and ensure it adheres to secure coding practices. Consult the OWASP guidelines linked below.";
}

function processTrivy(data) {
    if (!data.Results) return [];
    let vulnerabilities = [];
    let idx = 0;
    data.Results.forEach(target => {
        if (target.Vulnerabilities) {
            target.Vulnerabilities.forEach(vuln => {
                vulnerabilities.push({
                    uuid: `sca-${idx++}`,
                    type: 'SCA',
                    severity: normalizeSeverity(vuln.Severity),
                    id: vuln.VulnerabilityID,
                    package: vuln.PkgName,
                    installed: vuln.InstalledVersion,
                    fixed: vuln.FixedVersion || 'N/A',
                    message: vuln.Title || vuln.Description,
                    remediation: vuln.FixedVersion ? `Upgrade ${vuln.PkgName} to version ${vuln.FixedVersion} or later.` : "No fixed version available. Monitor for updates or consider replacing the package.",
                    raw: vuln
                });
            });
        }
    });
    return vulnerabilities;
}

// --- Grouping Logic for SCA ---
function groupScaFindings(findings) {
    const groups = {};
    findings.forEach(f => {
        if (!groups[f.package]) {
            groups[f.package] = {
                package: f.package,
                installed: f.installed,
                findings: [],
                maxSeverityVal: -1,
                maxSeverity: 'UNKNOWN'
            };
        }
        groups[f.package].findings.push(f);
        const weight = SEVERITY_WEIGHTS[f.severity];
        if (weight > groups[f.package].maxSeverityVal) {
            groups[f.package].maxSeverityVal = weight;
            groups[f.package].maxSeverity = f.severity;
        }
    });
    return Object.values(groups);
}

// --- Module Grouping Logic ---

function getModuleFromPath(path, depth) {
    if (!path) return 'Root';
    const parts = path.split('/');
    // Filter out empty parts (e.g. leading slash)
    const cleanParts = parts.filter(p => p && p !== '.');

    if (cleanParts.length === 0) return 'Root';

    // Take up to 'depth' parts
    const moduleParts = cleanParts.slice(0, depth);
    return moduleParts.join('/');
}

function groupFindingsByModule(findings, depth) {
    const modules = {};

    findings.forEach(f => {
        let path = '';
        if (f.type === 'SAST') {
            // Use file location, remove line number
            path = f.location.split(':')[0];
        } else {
            // Use target file path (e.g. package-lock.json location)
            // If raw.Target is not available, try to guess or use 'Unknown'
            // For Trivy, 'Target' is usually at the top level, but we flattened it.
            // We need to pass the target info down or infer it.
            // In our processTrivy, we didn't save the Target path explicitly in a 'path' field,
            // but we can assume 'location' might be added or we use a fallback.
            // Let's check processTrivy... it doesn't save location.
            // We should update processTrivy to save location if possible, 
            // but for now let's assume SAST is the main target for this feature.
            // If SCA, we might use the package name as a fallback or just 'Dependencies'.
            path = 'Dependencies';
        }

        const moduleName = getModuleFromPath(path, depth);

        if (!modules[moduleName]) {
            modules[moduleName] = {
                name: moduleName,
                path: path, // Representative path
                findings: [],
                stats: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, UNKNOWN: 0 }
            };
        }

        modules[moduleName].findings.push(f);
        if (modules[moduleName].stats[f.severity] !== undefined) {
            modules[moduleName].stats[f.severity]++;
        } else {
            modules[moduleName].stats.UNKNOWN++;
        }
    });

    return Object.values(modules).sort((a, b) => a.name.localeCompare(b.name));
}

// --- Filtering & Sorting ---


function updateSort(type, value) {
    const parts = value.split('_');
    const col = parts[0];
    const dir = parts[1]; // 'asc' or 'desc'

    state[type].sort = { col: col, asc: dir === 'asc' };
    applyFilters(type);
}

function applyFilters(type) {
    const s = state[type];
    const container = document.getElementById(`${type === 'scaFs' ? 'sca-fs' : (type === 'scaImage' ? 'sca-image' : 'sast')}-view`);
    const severityFilter = container.querySelector('.filter-select').value;
    const searchFilter = container.querySelector('.search-input').value.toLowerCase();

    // 1. Filter
    let filtered = s.data.filter(item => {
        if (!state.showDismissed && state.dismissed.includes(item.uuid)) return false;

        // Module Context Filter
        if (type === 'sast' && state.sast.activeModule) {
            const itemPath = item.location.split(':')[0];
            const modName = getModuleFromPath(itemPath, state.moduleDepth);
            if (modName !== state.sast.activeModule) return false;
        }

        const matchesSeverity = !severityFilter || item.severity === severityFilter;
        const matchesSearch = !searchFilter ||
            item.id.toLowerCase().includes(searchFilter) ||
            item.message.toLowerCase().includes(searchFilter) ||
            (item.package && item.package.toLowerCase().includes(searchFilter)) ||
            (item.location && item.location.toLowerCase().includes(searchFilter));

        return matchesSeverity && matchesSearch;
    });

    // 2. Sort
    filtered.sort((a, b) => {
        const sortCol = s.sort.col;
        const asc = s.sort.asc ? 1 : -1;

        if (sortCol === 'severity') {
            const wA = SEVERITY_WEIGHTS[a.severity] || 0;
            const wB = SEVERITY_WEIGHTS[b.severity] || 0;
            return (wA - wB) * asc;
        } else if (sortCol === 'name') {
            const valA = (a.package || a.id || '').toLowerCase();
            const valB = (b.package || b.id || '').toLowerCase();
            return valA.localeCompare(valB) * asc;
        }
        return 0;
    });

    s.filtered = filtered;
    s.page = 1;
    renderList(type);
}

// --- Rendering ---

function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return unsafe;
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function renderDismissButton(uuid) {
    const isDismissed = state.dismissed.includes(uuid);
    return `
        <button class="dismiss-btn ${isDismissed ? 'restorable' : ''}" onclick="event.stopPropagation(); toggleDismiss('${uuid}')">
            ${isDismissed ? '↺ Restore' : '⨯ Dismiss'}
        </button>
    `;
}

function renderList(type) {
    const s = state[type];
    const listId = type === 'scaFs' ? 'sca-fs-list' : (type === 'scaImage' ? 'sca-image-list' : 'sast-list');
    const listContainer = document.getElementById(listId);

    if (type === 'sast') {
        if (state.viewMode === 'modules') {
            renderModules(type);
            return;
        }

        const start = (s.page - 1) * s.pageSize;
        const end = start + s.pageSize;
        const pageData = s.filtered.slice(start, end);

        if (state.sast.activeModule) {
            listContainer.innerHTML = `
                <div class="breadcrumb-nav">
                    <div class="breadcrumb-item" onclick="resetToRoot()">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                        Root
                    </div>
                    <span class="breadcrumb-separator">/</span>
                    <div class="breadcrumb-item" onclick="clearModuleFilter()">
                        Modules (Depth ${state.moduleDepth})
                    </div>
                    <span class="breadcrumb-separator">/</span>
                    <div class="breadcrumb-item active">
                        ${escapeHtml(state.sast.activeModule)}
                    </div>
                </div>
             `;
        } else {
            listContainer.innerHTML = '';
        }

        if (pageData.length === 0) {
            listContainer.innerHTML = '<div style="text-align:center; padding: 2rem; color: var(--text-secondary);">No findings match your filters.</div>';
        } else {
            listContainer.innerHTML = pageData.map(f => `
                <div class="vuln-card ${state.selected.includes(f.uuid) ? 'selected' : ''}" onclick="openDrawer('${f.uuid}')">
                    <div class="vuln-icon">
                        ${getSeverityIcon(f.severity)}
                    </div>
                    <div class="vuln-details">
                        <div class="vuln-header">
                            <span class="severity-pill ${f.severity.toLowerCase()}">${f.severity}</span>
                            <span class="vuln-title">${escapeHtml(f.message)}</span>
                        </div>
                        <div class="vuln-meta">
                            <span class="vuln-id">${escapeHtml(f.id)}</span>
                            <span>•</span>
                            <span style="font-family: monospace;">${escapeHtml(f.location.split('/').pop())}</span>
                        </div>
                    </div>
                    <div class="vuln-actions-area">
                        ${renderDismissButton(f.uuid)}
                    </div>
                </div>
            `).join('');
        }
    } else {
        // SCA Grouping
        const groups = groupScaFindings(s.filtered);
        // Sort groups by max severity
        groups.sort((a, b) => {
            return SEVERITY_WEIGHTS[b.maxSeverity] - SEVERITY_WEIGHTS[a.maxSeverity];
        });

        const start = (s.page - 1) * s.pageSize;
        const end = start + s.pageSize;
        const pageGroups = groups.slice(start, end);

        if (pageGroups.length === 0) {
            listContainer.innerHTML = '<div style="text-align:center; padding: 2rem; color: var(--text-secondary);">No findings match your filters.</div>';
        } else {
            listContainer.innerHTML = pageGroups.map(g => {
                const groupId = `group-${g.package.replace(/[^a-zA-Z0-9]/g, '-')}`;
                return `
                <div class="group-container">
                    <div class="group-header" onclick="toggleGroup('${groupId}', this)">
                        <span class="group-expand-icon">▶</span>
                        <span class="severity-pill ${g.maxSeverity.toLowerCase()}">${g.maxSeverity}</span>
                        <strong style="font-size: 1rem; color: var(--text-primary);">${escapeHtml(g.package)}</strong>
                        <span style="color: var(--text-secondary); font-size: 0.9rem;">${escapeHtml(g.installed)}</span>
                        <span style="margin-left: auto; color: var(--text-secondary); font-size: 0.85rem;">${g.findings.length} vulnerabilities</span>
                    </div>
                    ${g.findings.map(f => `
                        <div class="child-row ${groupId} vuln-card" onclick="openDrawer('${f.uuid}')" style="margin-left: 20px; border-left: 2px solid var(--border-color);">
                            <div class="vuln-icon" style="font-size: 1.2rem;">
                                ${getSeverityIcon(f.severity)}
                            </div>
                            <div class="vuln-details">
                                <div class="vuln-header">
                                    <span class="severity-pill ${f.severity.toLowerCase()}" style="transform: scale(0.9);">${f.severity}</span>
                                    <span class="vuln-title" style="font-size: 0.95rem;">${escapeHtml(f.id)}</span>
                                </div>
                                <div class="vuln-meta">
                                    <span>Fixed in: <code style="color: #4ade80">${escapeHtml(f.fixed)}</code></span>
                                </div>
                            </div>
                            <div class="vuln-actions-area">
                                ${renderDismissButton(f.uuid)}
                            </div>
                        </div>
                    `).join('')}
                </div>
                `;
            }).join('');
        }
    }
    renderPagination(type);
}

function renderModules(type) {
    const s = state[type];
    const listContainer = document.getElementById('sast-list'); // Reusing SAST container
    const modules = groupFindingsByModule(s.filtered, state.moduleDepth);

    if (modules.length === 0) {
        listContainer.innerHTML = '<div style="text-align:center; padding: 2rem; color: var(--text-secondary);">No modules found matching filters.</div>';
        document.getElementById('sast-pagination').innerHTML = '';
        return;
    }

    listContainer.innerHTML = `
        <div class="module-grid">
            ${modules.map(m => {
        const total = m.findings.length;
        // Determine max severity for icon color
        let maxSev = 'LOW';
        if (m.stats.CRITICAL > 0) maxSev = 'CRITICAL';
        else if (m.stats.HIGH > 0) maxSev = 'HIGH';
        else if (m.stats.MEDIUM > 0) maxSev = 'MEDIUM';

        return `
                <div class="module-card" onclick="filterByModule('${m.name}')">
                    <div class="module-header">
                        <div class="module-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                        </div>
                        <div class="severity-pill ${maxSev.toLowerCase()}" style="transform: scale(0.9); margin-right: -8px;">${maxSev}</div>
                    </div>
                    <div class="module-title">${escapeHtml(m.name)}</div>
                    <div class="module-path">${total} findings</div>
                    
                    <div class="module-stats">
                        ${m.stats.CRITICAL > 0 ? `
                        <div class="stat-item">
                            <span class="stat-value critical-color">${m.stats.CRITICAL}</span>
                            <span class="stat-label">Crit</span>
                        </div>` : ''}
                        ${m.stats.HIGH > 0 ? `
                        <div class="stat-item">
                            <span class="stat-value high-color">${m.stats.HIGH}</span>
                            <span class="stat-label">High</span>
                        </div>` : ''}
                        ${m.stats.MEDIUM > 0 ? `
                        <div class="stat-item">
                            <span class="stat-value medium-color">${m.stats.MEDIUM}</span>
                            <span class="stat-label">Med</span>
                        </div>` : ''}
                         ${m.stats.LOW > 0 ? `
                        <div class="stat-item">
                            <span class="stat-value low-color">${m.stats.LOW}</span>
                            <span class="stat-label">Low</span>
                        </div>` : ''}
                    </div>
                </div>
                `;
    }).join('')}
        </div>
    `;

    // Hide pagination in module view for now (or implement module pagination)
    document.getElementById('sast-pagination').innerHTML = '';
}

function filterByModule(moduleName) {
    state.sast.activeModule = moduleName;

    // Clear search input to avoid confusion
    const searchInput = document.querySelector('#sast-view .search-input');
    searchInput.value = '';

    switchViewMode('list'); // Switch back to list
    applyFilters('sast'); // Apply filter
}

function clearModuleFilter() {
    state.sast.activeModule = null;
    switchViewMode('modules');
    applyFilters('sast');
}

function resetToRoot() {
    state.sast.activeModule = null;
    updateModuleDepth(1); // Reset to depth 1 (Root)
    switchViewMode('modules');
}

function getSeverityIcon(severity) {
    const s = severity.toUpperCase();
    const colors = {
        'CRITICAL': '#ff4757',
        'HIGH': '#ffae42',
        'MEDIUM': '#ffd86a',
        'LOW': '#3cb0ff',
        'UNKNOWN': '#788b91'
    };
    const color = colors[s] || colors.UNKNOWN;

    // Simple geometric shapes for "Zero-G" feel
    if (s === 'CRITICAL') {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="${color}"><path d="M12 2L1 21h22L12 2zm0 3.45l8.27 14.3H3.73L12 5.45zM11 10v6h2v-6h-2zm0 8v2h2v-2h-2z"/></svg>`; // Triangle
    }
    if (s === 'HIGH') {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="${color}"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>`; // Circle Exclamation
    }
    if (s === 'MEDIUM') {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="${color}"><path d="M3 3h18v18H3V3zm2 2v14h14V5H5z"/></svg>`; // Square
    }
    if (s === 'LOW') {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="${color}"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9v-2h2v2zm0-4H9V7h2v5zm4 4h-2v-2h2v2zm0-4h-2V7h2v5z"/></svg>`; // Circle Info (approx)
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="${color}"><circle cx="12" cy="12" r="10" opacity="0.5"/></svg>`;
}

function toggleGroup(groupId, header) {
    header.classList.toggle('expanded');
    document.querySelectorAll(`.${groupId}`).forEach(row => {
        row.classList.toggle('visible');
    });
}

function renderPagination(type) {
    const s = state[type];
    const totalItems = type === 'sast' ? s.filtered.length : groupScaFindings(s.filtered).length;
    const totalPages = Math.ceil(totalItems / s.pageSize);

    const containerId = type === 'scaFs' ? 'sca-fs-pagination' : (type === 'scaImage' ? 'sca-image-pagination' : 'sast-pagination');
    const container = document.getElementById(containerId);

    container.innerHTML = `
        <button ${s.page === 1 ? 'disabled' : ''} onclick="changePage('${type}', -1)">Previous</button>
        <span>Page ${s.page} of ${totalPages || 1}</span>
        <button ${s.page === totalPages || totalPages === 0 ? 'disabled' : ''} onclick="changePage('${type}', 1)">Next</button>
    `;
}

function changePage(type, delta) {
    state[type].page += delta;
    renderList(type);
}

// --- Drawer & Details ---

function openDrawer(uuid) {
    const allFindings = [...state.sast.data, ...state.scaFs.data, ...state.scaImage.data];
    const finding = allFindings.find(f => f.uuid === uuid);
    if (!finding) return;

    const content = document.getElementById('drawer-content');

    let detailsHtml = `
        <div style="margin-bottom: 1.5rem;">
            <span class="severity-pill ${finding.severity.toLowerCase()}">${finding.severity}</span>
            <span class="tag" style="margin-left: 10px;">${finding.type}</span>
        </div>
        <h3 style="font-size: 1.25rem; margin-bottom: 1rem;">${escapeHtml(finding.message)}</h3>
        <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">ID: <code style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px;">${finding.id}</code></p>

        <div class="remediation-box">
            <h4 style="margin-bottom: 0.5rem; color: #4ade80;">🛠️ How to Fix</h4>
            <p>${escapeHtml(finding.remediation)}</p>
        </div>
    `;

    if (finding.type === 'SAST') {
        detailsHtml += `
            <div style="margin-top: 2rem;">
                <h4>Location</h4>
                <p style="color: var(--text-secondary); font-family: monospace;">${escapeHtml(finding.location)}</p>
            </div>
            
            <div style="margin-top: 1.5rem;">
                <h4>Code Snippet</h4>
                <div class="code-block">
                    ${finding.code ? `<span class="code-line highlight">${escapeHtml(finding.code)}</span>` : '<span class="code-line">// Code snippet not available</span>'}
                </div>
            </div>

            <div style="margin-top: 1.5rem;">
                <h4>Standards</h4>
                <div style="margin-top: 0.5rem;">
                    ${(Array.isArray(finding.cwe) ? finding.cwe : [finding.cwe]).filter(Boolean).map(c => `<span class="tag cwe">${c}</span>`).join('')}
                    ${(Array.isArray(finding.owasp) ? finding.owasp : [finding.owasp]).filter(Boolean).map(o => `<span class="tag owasp">${o}</span>`).join('')}
                </div>
            </div>
        `;
    } else {
        detailsHtml += `
            <div style="margin-top: 2rem;">
                <h4>Package Details</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 0.5rem;">
                    <div>
                        <span style="color: var(--text-secondary); font-size: 0.85rem;">Package</span>
                        <div style="font-weight: 600;">${escapeHtml(finding.package)}</div>
                    </div>
                    <div>
                        <span style="color: var(--text-secondary); font-size: 0.85rem;">Installed Version</span>
                        <div style="font-family: monospace;">${escapeHtml(finding.installed)}</div>
                    </div>
                    <div>
                        <span style="color: var(--text-secondary); font-size: 0.85rem;">Fixed Version</span>
                        <div style="font-family: monospace; color: #4ade80;">${escapeHtml(finding.fixed)}</div>
                    </div>
                </div>
            </div>
            
            <div style="margin-top: 1.5rem;">
                <h4>Description</h4>
                <p style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.6;">${escapeHtml(finding.raw.Description || 'No description available.')}</p>
            </div>
            
            <div style="margin-top: 1.5rem;">
                <h4>References</h4>
                <ul style="list-style: none; padding: 0; margin-top: 0.5rem;">
                    ${(finding.raw.References || []).slice(0, 3).map(url => `<li style="margin-bottom: 4px;"><a href="${url}" target="_blank" style="color: var(--accent-color); text-decoration: none; font-size: 0.9rem;">🔗 ${url}</a></li>`).join('')}
                </ul>
            </div>
        `;
    }

    content.innerHTML = detailsHtml;
    document.getElementById('details-drawer').classList.add('open');
    document.getElementById('drawer-overlay').classList.add('open');
}

function closeDrawer() {
    document.getElementById('details-drawer').classList.remove('open');
    document.getElementById('drawer-overlay').classList.remove('open');
}

// --- Actions ---

function toggleDismiss(uuid) {
    if (state.dismissed.includes(uuid)) {
        state.dismissed = state.dismissed.filter(id => id !== uuid);
    } else {
        state.dismissed.push(uuid);
    }
    localStorage.setItem('dismissedFindings', JSON.stringify(state.dismissed));

    // Re-apply filters to update view
    applyFilters('sast');
    applyFilters('scaFs');
    applyFilters('scaImage');
}

function toggleDismissed(type) {
    // We only have one checkbox ID in the new HTML for SAST, but we might want it for others.
    // The HTML I wrote has one checkbox for SAST. 
    // If we want global toggle, we need to sync them or just use one.
    // For now, let's assume the checkbox passed the type or we check the active view.
    const checkbox = document.getElementById(`show-dismissed-${type}`);
    if (checkbox) {
        state.showDismissed = checkbox.checked;
        applyFilters('sast');
        applyFilters('scaFs');
        applyFilters('scaImage');
    }
}

function exportData() {
    const allFiltered = [
        ...state.sast.filtered,
        ...state.scaFs.filtered,
        ...state.scaImage.filtered
    ];

    // Helper to format standards
    const formatStandards = (f) => {
        const standards = [];
        if (f.cwe && f.cwe.length) standards.push(`CWE: ${f.cwe.join(', ')}`);
        if (f.owasp && f.owasp.length) standards.push(`OWASP: ${f.owasp.join(', ')}`);
        return standards.join('; ');
    };

    const csvContent = "data:text/csv;charset=utf-8,"
        + "Type,Severity,Rule ID,Summary,Location,Package,Installed Version,Fixed Version,Standards,Remediation\n"
        + allFiltered.map(f => {
            return [
                f.type,
                f.severity,
                f.id,
                `"${(f.message || '').replace(/"/g, '""')}"`,
                `"${(f.location || 'N/A').replace(/"/g, '""')}"`,
                f.package || 'N/A',
                f.installed || 'N/A',
                f.fixed || 'N/A',
                `"${formatStandards(f).replace(/"/g, '""')}"`,
                `"${(f.remediation || '').replace(/"/g, '""')}"`
            ].join(",");
        }).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `security_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// --- Utils ---
function updateSummary(findings) {
    const activeFindings = findings.filter(f => !state.dismissed.includes(f.uuid));

    const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, UNKNOWN: 0 };
    activeFindings.forEach(f => {
        const sev = f.severity;
        if (counts[sev] !== undefined) counts[sev]++;
        else counts.UNKNOWN++;
    });

    const total = activeFindings.length;
    document.getElementById('total-count').textContent = total;
    document.getElementById('critical-count').textContent = counts.CRITICAL;
    document.getElementById('high-count').textContent = counts.HIGH;
    document.getElementById('medium-count').textContent = counts.MEDIUM;

    const setBar = (sev, count) => {
        const pct = total > 0 ? (count / total) * 100 : 0;
        document.querySelector(`.${sev.toLowerCase()}-bg`).style.width = `${pct}%`;
    };

    setBar('CRITICAL', counts.CRITICAL);
    setBar('HIGH', counts.HIGH);
    setBar('MEDIUM', counts.MEDIUM);
}

function renderCharts(findings) {
    const activeFindings = findings.filter(f => !state.dismissed.includes(f.uuid));
    const severityCounts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, UNKNOWN: 0 };
    const categoryCounts = {};

    activeFindings.forEach(f => {
        // Severity
        const sev = f.severity;
        if (severityCounts[sev] !== undefined) severityCounts[sev]++;
        else severityCounts.UNKNOWN++;

        // Category
        let cat = 'Other';
        if (f.type === 'SAST') cat = f.category || 'Code Quality';
        else cat = 'Dependency'; // Simple bucket for SCA

        if (!categoryCounts[cat]) categoryCounts[cat] = 0;
        categoryCounts[cat]++;
    });

    // Severity Chart
    const sevCtx = document.getElementById('severityChart');
    if (window.sevChartInst) window.sevChartInst.destroy();

    window.sevChartInst = new Chart(sevCtx, {
        type: 'doughnut',
        data: {
            labels: ['Critical', 'High', 'Medium', 'Low', 'Unknown'],
            datasets: [{
                data: [
                    severityCounts.CRITICAL,
                    severityCounts.HIGH,
                    severityCounts.MEDIUM,
                    severityCounts.LOW,
                    severityCounts.UNKNOWN
                ],
                backgroundColor: ['#ff4757', '#ffae42', '#ffd86a', '#3cb0ff', '#788b91'],
                borderWidth: 0,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '75%',
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: '#8b92a8',
                        font: { family: 'Outfit', size: 12 },
                        padding: 20,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                }
            }
        }
    });

    // Category Chart
    const catLabels = Object.keys(categoryCounts);
    const catData = Object.values(categoryCounts);
    const colors = ['#00d9ff', '#70a1ff', '#5352ed', '#ff6b81', '#a4b0be', '#2ed573'];

    const catCtx = document.getElementById('categoryChart');
    if (window.catChartInst) window.catChartInst.destroy();

    window.catChartInst = new Chart(catCtx, {
        type: 'bar',
        data: {
            labels: catLabels,
            datasets: [{
                label: 'Findings',
                data: catData,
                backgroundColor: colors.slice(0, catLabels.length),
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                title: { display: false }
            },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8b92a8' } },
                x: { grid: { display: false }, ticks: { color: '#8b92a8' } }
            }
        }
    });
}

function renderTopIssues(findings) {
    const activeFindings = findings.filter(f => !state.dismissed.includes(f.uuid));
    const sorted = activeFindings.sort((a, b) => {
        return SEVERITY_WEIGHTS[b.severity] - SEVERITY_WEIGHTS[a.severity];
    });

    const top5 = sorted.slice(0, 5);
    const container = document.getElementById('top-issues-list');

    if (top5.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 2rem;">No critical issues found. Great job!</p>';
        return;
    }

    container.innerHTML = top5.map(f => `
        <div class="issue-item" onclick="openDrawer('${f.uuid}')">
            <div class="severity-pill ${f.severity.toLowerCase()}" style="transform: scale(0.8); margin-right: 0;">${f.severity}</div>
            <div class="issue-content">
                <div class="issue-title" title="${escapeHtml(f.message)}">${escapeHtml(f.message)}</div>
                <div class="issue-meta">${f.type} • ${escapeHtml(f.id)}</div>
            </div>
            <div style="color: var(--text-secondary);">›</div>
        </div>
    `).join('');
}
