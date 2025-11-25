// State management
const state = {
    sast: { data: [], filtered: [], page: 1, pageSize: 10, sort: { col: 'severity', asc: false } },
    scaFs: { data: [], filtered: [], page: 1, pageSize: 10, sort: { col: 'severity', asc: false } },
    scaImage: { data: [], filtered: [], page: 1, pageSize: 10, sort: { col: 'severity', asc: false } }
};

const SEVERITY_WEIGHTS = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1, 'UNKNOWN': 0 };

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('scan-date').textContent = new Date().toLocaleString();

    Promise.all([
        fetch('data/semgrep-report.json').then(res => res.ok ? res.json() : { results: [] }).catch(() => ({ results: [] })),
        fetch('data/trivy-fs-report.json').then(res => res.ok ? res.json() : { Results: [] }).catch(() => ({ Results: [] })),
        fetch('data/trivy-image-report.json').then(res => res.ok ? res.json() : { Results: [] }).catch(() => ({ Results: [] }))
    ]).then(([semgrepData, trivyFsData, trivyImageData]) => {
        // Process and store data
        state.sast.data = processSemgrep(semgrepData);
        state.scaFs.data = processTrivy(trivyFsData);
        state.scaImage.data = processTrivy(trivyImageData);

        // Initial filter (all)
        applyFilters('sast');
        applyFilters('scaFs');
        applyFilters('scaImage');

        // Update summary and charts with ALL data
        const allFindings = [...state.sast.data, ...state.scaFs.data, ...state.scaImage.data];
        updateSummary(allFindings);
        renderCharts(allFindings);
    });
});

function normalizeSeverity(severity) {
    const s = (severity || 'UNKNOWN').toUpperCase();
    if (s === 'ERROR') return 'HIGH';
    if (s === 'WARNING') return 'MEDIUM';
    if (s === 'INFO') return 'LOW';
    return s;
}

function processSemgrep(data) {
    if (!data.results) return [];
    return data.results.map(item => {
        const metadata = item.extra.metadata || {};
        let category = metadata.category || 'Security';
        if (!metadata.category && item.check_id) {
            const parts = item.check_id.split('.');
            if (parts.length > 2) {
                category = parts.find(p => ['injection', 'xss', 'cryptography', 'auth', 'audit'].includes(p)) || 'Security';
            }
        }
        let cwe = metadata.cwe ? (Array.isArray(metadata.cwe) ? metadata.cwe.join(', ') : metadata.cwe) : '';
        let owasp = metadata.owasp ? (Array.isArray(metadata.owasp) ? metadata.owasp.join(', ') : metadata.owasp) : '';
        let standards = [cwe, owasp].filter(Boolean).join('<br>');

        return {
            type: 'SAST',
            severity: normalizeSeverity(item.extra.severity),
            id: item.check_id,
            message: item.extra.message,
            location: `${item.path}:${item.start.line}`,
            category: category,
            standards: standards || 'N/A',
            raw: item
        };
    });
}

function processTrivy(data) {
    if (!data.Results) return [];
    let vulnerabilities = [];
    data.Results.forEach(target => {
        if (target.Vulnerabilities) {
            target.Vulnerabilities.forEach(vuln => {
                vulnerabilities.push({
                    type: 'SCA',
                    severity: normalizeSeverity(vuln.Severity),
                    id: vuln.VulnerabilityID,
                    package: vuln.PkgName,
                    installed: vuln.InstalledVersion,
                    fixed: vuln.FixedVersion || 'N/A',
                    message: vuln.Title || vuln.Description,
                    raw: vuln
                });
            });
        }
    });
    return vulnerabilities;
}

function applyFilters(type) {
    const s = state[type];
    const container = document.getElementById(`${type === 'scaFs' ? 'sca-fs' : (type === 'scaImage' ? 'sca-image' : 'sast')}-view`);
    const severityFilter = container.querySelector('.filter-select').value;
    const searchFilter = container.querySelector('.search-input').value.toLowerCase();

    s.filtered = s.data.filter(item => {
        const matchesSeverity = !severityFilter || item.severity === severityFilter;
        const matchesSearch = !searchFilter ||
            item.id.toLowerCase().includes(searchFilter) ||
            item.message.toLowerCase().includes(searchFilter) ||
            (item.package && item.package.toLowerCase().includes(searchFilter));
        return matchesSeverity && matchesSearch;
    });

    // Reset to page 1 on filter change
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

    s.filtered.sort((a, b) => {
        let valA = a[col];
        let valB = b[col];

        if (col === 'severity') {
            valA = SEVERITY_WEIGHTS[valA] || 0;
            valB = SEVERITY_WEIGHTS[valB] || 0;
        }

        if (valA < valB) return asc ? -1 : 1;
        if (valA > valB) return asc ? 1 : -1;
        return 0;
    });

    renderTable(type);
    renderPagination(type);
}

function renderTable(type) {
    const s = state[type];
    const start = (s.page - 1) * s.pageSize;
    const end = start + s.pageSize;
    const pageData = s.filtered.slice(start, end);

    const tbodyId = type === 'scaFs' ? 'sca-fs-tbody' : (type === 'scaImage' ? 'sca-image-tbody' : 'sast-tbody');
    const tbody = document.getElementById(tbodyId);

    if (type === 'sast') {
        tbody.innerHTML = pageData.map(f => `
            <tr>
                <td><span class="severity-badge ${f.severity.toLowerCase()}">${f.severity}</span></td>
                <td><span class="category-badge">${f.category}</span></td>
                <td><code>${f.id}</code></td>
                <td>${f.message}</td>
                <td><small>${f.standards}</small></td>
                <td><code>${f.location}</code></td>
            </tr>
        `).join('');
    } else {
        tbody.innerHTML = pageData.map(f => `
            <tr>
                <td><span class="severity-badge ${f.severity.toLowerCase()}">${f.severity}</span></td>
                <td>${f.package}</td>
                <td>${f.installed}</td>
                <td>${f.fixed}</td>
                <td><code>${f.id}</code></td>
            </tr>
        `).join('');
    }
}

function renderPagination(type) {
    const s = state[type];
    const totalPages = Math.ceil(s.filtered.length / s.pageSize);
    const containerId = type === 'scaFs' ? 'sca-fs-pagination' : (type === 'scaImage' ? 'sca-image-pagination' : 'sast-pagination');
    const container = document.getElementById(containerId);

    container.innerHTML = `
        <button ${s.page === 1 ? 'disabled' : ''} onclick="changePage('${type}', -1)">Previous</button>
        <span>Page ${s.page} of ${totalPages || 1} (${s.filtered.length} items)</span>
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

function updateSummary(findings) {
    const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, UNKNOWN: 0 };
    findings.forEach(f => {
        const sev = f.severity; // Already normalized
        if (counts[sev] !== undefined) counts[sev]++;
        else counts.UNKNOWN++;
    });

    const total = findings.length;
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
    const severityCounts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, UNKNOWN: 0 };
    const sourceCounts = { SAST: 0, SCA: 0 };

    findings.forEach(f => {
        const sev = f.severity;
        if (severityCounts[sev] !== undefined) severityCounts[sev]++;
        else severityCounts.UNKNOWN++;

        if (f.type === 'SAST') sourceCounts.SAST++;
        else sourceCounts.SCA++;
    });

    // Severity Chart
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

function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

    const btn = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.getAttribute('onclick').includes(tabId));
    if (btn) btn.classList.add('active');

    const content = document.getElementById(`${tabId}-view`);
    if (content) content.classList.add('active');
}
