// State management
const state = {
    sast: { data: [], filtered: [], page: 1, pageSize: 10, sort: { col: 'severity', asc: false } },
    scaFs: { data: [], filtered: [], page: 1, pageSize: 10, sort: { col: 'severity', asc: false } },
    scaImage: { data: [], filtered: [], page: 1, pageSize: 10, sort: { col: 'severity', asc: false } },
    dismissed: JSON.parse(localStorage.getItem('dismissedFindings') || '[]'),
    showDismissed: false,
    selected: [] // Store UUIDs of selected items
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

        const allFindings = [...state.sast.data, ...state.scaFs.data, ...state.scaImage.data];
        updateSummary(allFindings);
        renderCharts(allFindings);
        renderTopIssues(allFindings);
    });
});

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
    // Try to get message from metadata
    if (item.extra.fix) return `Apply the following fix:\n\n${item.extra.fix}`;

    // Generic advice based on category/keywords
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

// --- Filtering & Sorting ---

function applyFilters(type) {
    const s = state[type];
    const container = document.getElementById(`${type === 'scaFs' ? 'sca-fs' : (type === 'scaImage' ? 'sca-image' : 'sast')}-view`);
    const severityFilter = container.querySelector('.filter-select').value;
    const searchFilter = container.querySelector('.search-input').value.toLowerCase();

    s.filtered = s.data.filter(item => {
        if (!state.showDismissed && state.dismissed.includes(item.uuid)) return false;

        const matchesSeverity = !severityFilter || item.severity === severityFilter;
        const matchesSearch = !searchFilter ||
            item.id.toLowerCase().includes(searchFilter) ||
            item.message.toLowerCase().includes(searchFilter) ||
            (item.package && item.package.toLowerCase().includes(searchFilter));
        return matchesSeverity && matchesSearch;
    });

    s.page = 1;
    sortAndRender(type);
}

function sortData(type, col) {
    const s = state[type];
    if (s.sort.col === col) {
        s.sort.asc = !s.sort.asc;
    } else {
        s.sort.col = col;
        s.sort.asc = true;
    }
    sortAndRender(type);
}

function sortAndRender(type) {
    const s = state[type];
    const col = s.sort.col;
    const asc = s.sort.asc;

    if (type === 'sast') {
        s.filtered.sort((a, b) => compare(a, b, col, asc));
    }
    // For SCA, grouping happens at render time, but we need to sort the groups.
    // We'll handle SCA sorting inside renderTable to keep it simple.

    renderTable(type);
    renderPagination(type);
}

function compare(a, b, col, asc) {
    let valA = a[col];
    let valB = b[col];

    if (col === 'severity') {
        valA = SEVERITY_WEIGHTS[valA] || 0;
        valB = SEVERITY_WEIGHTS[valB] || 0;
    }

    if (valA < valB) return asc ? -1 : 1;
    if (valA > valB) return asc ? 1 : -1;
    return 0;
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

function renderTable(type) {
    const s = state[type];
    const tbodyId = type === 'scaFs' ? 'sca-fs-tbody' : (type === 'scaImage' ? 'sca-image-tbody' : 'sast-tbody');
    const tbody = document.getElementById(tbodyId);

    if (type === 'sast') {
        const start = (s.page - 1) * s.pageSize;
        const end = start + s.pageSize;
        const pageData = s.filtered.slice(start, end);

        tbody.innerHTML = pageData.map(f => `
            <tr onclick="openDrawer('${f.uuid}')" style="cursor: pointer;" class="${state.selected.includes(f.uuid) ? 'selected-row' : ''}">
                <td onclick="event.stopPropagation()">
                    <input type="checkbox" class="row-checkbox" 
                        onchange="toggleSelect('${f.uuid}')" 
                        ${state.selected.includes(f.uuid) ? 'checked' : ''}>
                </td>
                <td><span class="severity-badge ${f.severity.toLowerCase()}">${f.severity}</span></td>
                <td><span class="category-badge">${f.category}</span></td>
                <td><code>${escapeHtml(f.id)}</code></td>
                <td>${escapeHtml(f.message)}</td>
                <td>
                    ${(Array.isArray(f.cwe) ? f.cwe : [f.cwe]).filter(Boolean).map(c => `<span class="tag cwe">${c}</span>`).join('')}
                    ${(Array.isArray(f.owasp) ? f.owasp : [f.owasp]).filter(Boolean).map(o => `<span class="tag owasp">${o}</span>`).join('')}
                </td>
                <td><code>${escapeHtml(f.location)}</code></td>
                <td>
                    <button class="action-btn dismiss" onclick="event.stopPropagation(); toggleDismiss('${f.uuid}')">
                        ${state.dismissed.includes(f.uuid) ? 'Restore' : 'Dismiss'}
                    </button>
                </td>
            </tr>
        `).join('');
    } else {
        // SCA Grouping
        const groups = groupScaFindings(s.filtered);
        // Sort groups
        const col = s.sort.col;
        const asc = s.sort.asc;
        groups.sort((a, b) => {
            if (col === 'severity') return compare({ severity: a.maxSeverity }, { severity: b.maxSeverity }, 'severity', asc);
            if (col === 'package') return compare(a, b, 'package', asc);
            return 0;
        });

        const start = (s.page - 1) * s.pageSize;
        const end = start + s.pageSize;
        const pageGroups = groups.slice(start, end);

        tbody.innerHTML = pageGroups.map(g => {
            const groupId = `group-${g.package.replace(/[^a-zA-Z0-9]/g, '-')}`;
            return `
            <tr class="group-header" onclick="toggleGroup('${groupId}', this)">
                <td><span class="severity-badge ${g.maxSeverity.toLowerCase()}">${g.maxSeverity}</span></td>
                <td>
                    <span class="group-expand-icon">▶</span> 
                    <strong>${escapeHtml(g.package)}</strong>
                </td>
                <td>${escapeHtml(g.installed)}</td>
                <td>${g.findings.length} vulnerabilities</td>
                <td></td>
            </tr>
            ${g.findings.map(f => `
                <tr class="child-row ${groupId} ${state.selected.includes(f.uuid) ? 'selected-row' : ''}" onclick="openDrawer('${f.uuid}')" style="cursor: pointer;">
                    <td></td> <!-- Indent -->
                    <td onclick="event.stopPropagation()">
                         <input type="checkbox" class="row-checkbox" 
                            onchange="toggleSelect('${f.uuid}')" 
                            ${state.selected.includes(f.uuid) ? 'checked' : ''}>
                    </td>
                    <td><span class="severity-badge ${f.severity.toLowerCase()}" style="transform: scale(0.9);">${f.severity}</span></td>
                    <td><code>${escapeHtml(f.id)}</code></td>
                    <td>${escapeHtml(f.fixed)}</td>
                    <td>
                        <button class="action-btn dismiss" onclick="event.stopPropagation(); toggleDismiss('${f.uuid}')">
                            ${state.dismissed.includes(f.uuid) ? 'Restore' : 'Dismiss'}
                        </button>
                    </td>
                </tr>
            `).join('')}
            `;
        }).join('');
    }
}

function toggleGroup(groupId, header) {
    header.classList.toggle('expanded');
    document.querySelectorAll(`.${groupId}`).forEach(row => {
        row.classList.toggle('visible');
    });
}

function renderPagination(type) {
    const s = state[type];
    // For SCA we paginate GROUPS, for SAST we paginate ITEMS
    const totalItems = type === 'sast' ? s.filtered.length : groupScaFindings(s.filtered).length;
    const totalPages = Math.ceil(totalItems / s.pageSize);

    const containerId = type === 'scaFs' ? 'sca-fs-pagination' : (type === 'scaImage' ? 'sca-image-pagination' : 'sast-pagination');
    const container = document.getElementById(containerId);

    container.innerHTML = `
        <button ${s.page === 1 ? 'disabled' : ''} onclick="changePage('${type}', -1)">Previous</button>
        <span>Page ${s.page} of ${totalPages || 1} (${totalItems} items)</span>
        <button ${s.page === totalPages || totalPages === 0 ? 'disabled' : ''} onclick="changePage('${type}', 1)">Next</button>
        <select onchange="changePageSize('${type}', this.value)" style="margin-left: 10px; padding: 4px;">
            <option value="5" ${s.pageSize === 5 ? 'selected' : ''}>5 / page</option>
            <option value="10" ${s.pageSize === 10 ? 'selected' : ''}>10 / page</option>
            <option value="25" ${s.pageSize === 25 ? 'selected' : ''}>25 / page</option>
            <option value="50" ${s.pageSize === 50 ? 'selected' : ''}>50 / page</option>
        </select>
    `;
}

function changePage(type, delta) {
    state[type].page += delta;
    renderTable(type);
    renderPagination(type);
}

function changePageSize(type, size) {
    state[type].pageSize = parseInt(size);
    state[type].page = 1;
    renderTable(type);
    renderPagination(type);
}

// --- Drawer & Details ---

function openDrawer(uuid) {
    const allFindings = [...state.sast.data, ...state.scaFs.data, ...state.scaImage.data];
    const finding = allFindings.find(f => f.uuid === uuid);
    if (!finding) return;

    const content = document.getElementById('drawer-content');

    let detailsHtml = `
        <div style="margin-bottom: 1rem;">
            <span class="severity-badge ${finding.severity.toLowerCase()}">${finding.severity}</span>
            <span class="category-badge">${finding.type}</span>
        </div>
        <h3>${escapeHtml(finding.message)}</h3>
        <p style="color: var(--text-secondary); margin-bottom: 1rem;">ID: <code>${finding.id}</code></p>

        <div class="remediation-box">
            <h4><span class="icon">🛠️</span> How to Fix</h4>
            <p>${escapeHtml(finding.remediation)}</p>
        </div>
    `;

    if (finding.type === 'SAST') {
        detailsHtml += `
            <h4>Location</h4>
            <p><code>${escapeHtml(finding.location)}</code></p>
            
            <h4>Code Snippet</h4>
            <div class="code-block">
                ${finding.code ? `<span class="code-line highlight">${escapeHtml(finding.code)}</span>` : '<span class="code-line">// Code snippet not available</span>'}
            </div>

            <div style="margin-top: 1rem;">
                <h4>Standards</h4>
                ${(Array.isArray(finding.cwe) ? finding.cwe : [finding.cwe]).filter(Boolean).map(c => `<span class="tag cwe">${c}</span>`).join('')}
                ${(Array.isArray(finding.owasp) ? finding.owasp : [finding.owasp]).filter(Boolean).map(o => `<span class="tag owasp">${o}</span>`).join('')}
            </div>
        `;
    } else {
        detailsHtml += `
            <h4>Package Details</h4>
            <p>Package: <strong>${escapeHtml(finding.package)}</strong></p>
            <p>Installed Version: <code>${escapeHtml(finding.installed)}</code></p>
            <p>Fixed Version: <code style="color: #4ade80">${escapeHtml(finding.fixed)}</code></p>
            
            <h4>Description</h4>
            <p>${escapeHtml(finding.raw.Description || 'No description available.')}</p>
            
            <h4>References</h4>
            <ul>
                ${(finding.raw.References || []).slice(0, 3).map(url => `<li><a href="${url}" target="_blank" style="color: var(--accent-color)">${url}</a></li>`).join('')}
            </ul>
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

function toggleDismissed() {
    state.showDismissed = document.getElementById('show-dismissed').checked;
    applyFilters('sast');
    applyFilters('scaFs');
    applyFilters('scaImage');
}

function toggleSelect(uuid) {
    if (state.selected.includes(uuid)) {
        state.selected = state.selected.filter(id => id !== uuid);
    } else {
        state.selected.push(uuid);
    }
    updateBulkActions();
}

function toggleSelectAll(type) {
    const s = state[type];
    // If all currently filtered items are selected, deselect them. Otherwise select them.
    const allSelected = s.filtered.every(f => state.selected.includes(f.uuid));

    if (allSelected) {
        s.filtered.forEach(f => {
            state.selected = state.selected.filter(id => id !== f.uuid);
        });
    } else {
        s.filtered.forEach(f => {
            if (!state.selected.includes(f.uuid)) state.selected.push(f.uuid);
        });
    }

    renderTable(type); // Re-render to update checkboxes
    updateBulkActions();
}

function updateBulkActions() {
    const count = state.selected.length;
    // In a real implementation we would show/hide a floating toolbar here
    // For now we can just log it or update a counter if we had one
    console.log(`Selected ${count} items`);
}

function exportData() {
    const allFiltered = [
        ...state.sast.filtered,
        ...state.scaFs.filtered,
        ...state.scaImage.filtered
    ];

    const csvContent = "data:text/csv;charset=utf-8,"
        + "Type,Severity,ID,Message,Package,Location\n"
        + allFiltered.map(f => {
            return [
                f.type,
                f.severity,
                f.id,
                `"${(f.message || '').replace(/"/g, '""')}"`,
                f.package || 'N/A',
                f.location || 'N/A'
            ].join(",");
        }).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "security_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// --- Utils ---
function updateSummary(findings) {
    // Count only non-dismissed for summary unless showDismissed is true? 
    // Usually summary shows active risks.
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
    // Same logic, use active findings
    const activeFindings = findings.filter(f => !state.dismissed.includes(f.uuid));

    const severityCounts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, UNKNOWN: 0 };
    const sourceCounts = { SAST: 0, SCA: 0 };

    activeFindings.forEach(f => {
        const sev = f.severity;
        if (severityCounts[sev] !== undefined) severityCounts[sev]++;
        else severityCounts.UNKNOWN++;

        if (f.type === 'SAST') sourceCounts.SAST++;
        else sourceCounts.SCA++;
    });

    // Severity Chart
    // Note: In a real app we would destroy the old chart instance. 
    // For simplicity here we just create new ones, which might overlay.
    // A robust solution would store chart instances in `state` and call .destroy().

    // Simple hack: clear canvas container
    const sevContainer = document.getElementById('severityChart').parentNode;
    sevContainer.innerHTML = '<canvas id="severityChart"></canvas>';

    new Chart(document.getElementById('severityChart'), {
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
                backgroundColor: ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#64748b'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right', labels: { color: '#94a3b8' } }
            }
        }
    });

    const sourceContainer = document.getElementById('sourceChart').parentNode;
    sourceContainer.innerHTML = '<canvas id="sourceChart"></canvas>';

    // Source Chart
    new Chart(document.getElementById('sourceChart'), {
        type: 'bar',
        data: {
            labels: ['SAST (Code)', 'SCA (Dependencies)'],
            datasets: [{
                label: 'Vulnerabilities',
                data: [sourceCounts.SAST, sourceCounts.SCA],
                backgroundColor: ['#38bdf8', '#818cf8'],
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, grid: { color: '#334155' }, ticks: { color: '#94a3b8' } },
                x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}


function renderTopIssues(findings) {
    const activeFindings = findings.filter(f => !state.dismissed.includes(f.uuid));
    // Sort by severity (CRITICAL > HIGH)
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
            <div class="severity-badge ${f.severity.toLowerCase()}" style="transform: scale(0.8); margin-right: 10px;">${f.severity}</div>
            <div class="issue-content">
                <div class="issue-title" title="${escapeHtml(f.message)}">${escapeHtml(f.message)}</div>
                <div class="issue-meta">${f.type} • ${escapeHtml(f.id)}</div>
            </div>
            <div style="color: var(--text-secondary);">›</div>
        </div>
    `).join('');
}

