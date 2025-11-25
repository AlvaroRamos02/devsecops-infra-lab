document.addEventListener('DOMContentLoaded', () => {
    // Set current date
    document.getElementById('scan-date').textContent = new Date().toLocaleString();

    // Fetch and process data
    Promise.all([
        fetch('data/semgrep-report.json').then(res => res.ok ? res.json() : { results: [] }).catch(() => ({ results: [] })),
        fetch('data/trivy-fs-report.json').then(res => res.ok ? res.json() : { Results: [] }).catch(() => ({ Results: [] })),
        fetch('data/trivy-image-report.json').then(res => res.ok ? res.json() : { Results: [] }).catch(() => ({ Results: [] }))
    ]).then(([semgrepData, trivyFsData, trivyImageData]) => {
        processData(semgrepData, trivyFsData, trivyImageData);
    });
});

function processData(semgrep, trivyFs, trivyImage) {
    const findings = {
        sast: processSemgrep(semgrep),
        scaFs: processTrivy(trivyFs),
        scaImage: processTrivy(trivyImage)
    };

    const allFindings = [...findings.sast, ...findings.scaFs, ...findings.scaImage];
    updateSummary(allFindings);
    renderCharts(allFindings);
    renderTables(findings);
}

function processSemgrep(data) {
    if (!data.results) return [];
    return data.results.map(item => {
        const metadata = item.extra.metadata || {};

        // Try to infer category from check_id if metadata is missing
        let category = metadata.category || 'Security';
        if (!metadata.category && item.check_id) {
            const parts = item.check_id.split('.');
            if (parts.length > 2) {
                // e.g. javascript.express.security.injection.tainted-sql-string -> injection
                // This is a heuristic
                category = parts.find(p => ['injection', 'xss', 'cryptography', 'auth', 'audit'].includes(p)) || 'Security';
            }
        }

        // Format CWE/OWASP
        let cwe = metadata.cwe ? (Array.isArray(metadata.cwe) ? metadata.cwe.join(', ') : metadata.cwe) : '';
        let owasp = metadata.owasp ? (Array.isArray(metadata.owasp) ? metadata.owasp.join(', ') : metadata.owasp) : '';
        let standards = [cwe, owasp].filter(Boolean).join('<br>');

        return {
            type: 'SAST',
            severity: item.extra.severity || 'UNKNOWN',
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
                    severity: vuln.Severity || 'UNKNOWN',
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

function updateSummary(findings) {
    const counts = {
        CRITICAL: 0,
        HIGH: 0,
        MEDIUM: 0,
        LOW: 0,
        UNKNOWN: 0
    };

    findings.forEach(f => {
        const sev = f.severity.toUpperCase();
        if (counts[sev] !== undefined) counts[sev]++;
        else counts.UNKNOWN++;
    });

    const total = findings.length;
    document.getElementById('total-count').textContent = total;
    document.getElementById('critical-count').textContent = counts.CRITICAL;
    document.getElementById('high-count').textContent = counts.HIGH;
    document.getElementById('medium-count').textContent = counts.MEDIUM;

    // Update progress bars (relative to total, max 100%)
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
        const sev = f.severity.toUpperCase();
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

function renderTables(findings) {
    // SAST Table
    const sastTbody = document.getElementById('sast-tbody');
    sastTbody.innerHTML = findings.sast.map(f => `
        <tr>
            <td><span class="severity-badge ${f.severity.toLowerCase()}">${f.severity}</span></td>
            <td><span class="category-badge">${f.category}</span></td>
            <td><code>${f.id}</code></td>
            <td>${f.message}</td>
            <td><small>${f.standards}</small></td>
            <td><code>${f.location}</code></td>
        </tr>
    `).join('');

    // SCA FS Table
    const scaFsTbody = document.getElementById('sca-fs-tbody');
    scaFsTbody.innerHTML = findings.scaFs.map(f => `
        <tr>
            <td><span class="severity-badge ${f.severity.toLowerCase()}">${f.severity}</span></td>
            <td>${f.package}</td>
            <td>${f.installed}</td>
            <td>${f.fixed}</td>
            <td><code>${f.id}</code></td>
        </tr>
    `).join('');

    // SCA Image Table
    const scaImageTbody = document.getElementById('sca-image-tbody');
    scaImageTbody.innerHTML = findings.scaImage.map(f => `
        <tr>
            <td><span class="severity-badge ${f.severity.toLowerCase()}">${f.severity}</span></td>
            <td>${f.package}</td>
            <td>${f.installed}</td>
            <td>${f.fixed}</td>
            <td><code>${f.id}</code></td>
        </tr>
    `).join('');
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

    // Find button that calls this function with tabId
    const btn = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.getAttribute('onclick').includes(tabId));
    if (btn) btn.classList.add('active');

    const content = document.getElementById(`${tabId}-view`);
    if (content) content.classList.add('active');
}

function filterTable(tableId, query) {
    const table = document.getElementById(tableId);
    const trs = table.getElementsByTagName('tr');
    const filter = query.toLowerCase();

    for (let i = 1; i < trs.length; i++) {
        const tr = trs[i];
        const text = tr.textContent.toLowerCase();
        tr.style.display = text.includes(filter) ? '' : 'none';
    }
}
