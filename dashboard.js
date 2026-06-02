/* ============================================
   DASHBOARD MODULE — REDESIGNED
   Card-based layout with projections
   ============================================ */

var dashboardYear = new Date().getFullYear().toString();

var TYPE_COLORS = {
    "Routine": "#22c55e",
    "Qualification": "#f59e0b",
    "For-cause": "#ef4444",
    "Unknown": "#94a3b8"
};

var METHOD_COLORS = {
    "On-site": "#3b82f6",
    "Virtual": "#60a5fa",
    "Desktop": "#93c5fd",
    "Unknown": "#94a3b8"
};

/* ---------- Main Render ---------- */

function renderDashboard() {
    var container = document.getElementById("view-dashboard");

  var auditsThisYear = getAuditsForYear(dashboardYear);
    var projectionsThisYear = getProjectionsForYear(dashboardYear);
    var activeAudits = auditsThisYear.filter(function (a) { return !isYes(a.cancelled); });
    var activeTotal = activeAudits.length + projectionsThisYear.length;
    var schedulable = activeAudits.filter(function (a) { return !isYes(a.on_hold) && !isYes(a.rescheduled); });

    var nextYear = (parseInt(dashboardYear) + 1).toString();
    var auditsNextYear = getAuditsForYear(nextYear);
    var activeNextYear = auditsNextYear.filter(function (a) { return !isYes(a.cancelled); });
    var projectionsNextYear = getProjectionsForYear(nextYear);

    // Scheduling counts
    var completed = countWithStatus(auditsThisYear, "Scheduled - Complete");
    var upcoming = countWithStatus(auditsThisYear, "Scheduled - Upcoming");
    var schedOverdue = countWithStatus(auditsThisYear, "Scheduled - Overdue");
    var unscheduled = countWithStatus(auditsThisYear, "Unscheduled - Pending");
    var unschedOverdue = countWithStatus(auditsThisYear, "Unscheduled - Overdue");
    var onHold = countWithStatus(auditsThisYear, "On Hold");
    var rescheduled = countWithStatus(auditsThisYear, "Rescheduled");
    var cancelled = countWithStatus(auditsThisYear, "Cancelled");
    var totalOverdue = schedOverdue + unschedOverdue;

    // Performance
    var executionRate = schedulable.length > 0 ? Math.round((completed / schedulable.length) * 100) : 0;
    var scheduled = completed + upcoming + schedOverdue;
    var schedulingRate = schedulable.length > 0 ? Math.round((scheduled / schedulable.length) * 100) : 0;

    // Regional — include projections
    var regionCounts = countByRegion(activeAudits);
    for (var p = 0; p < projectionsThisYear.length; p++) {
        var pr = projectionsThisYear[p].region || "Unknown";
        regionCounts[pr] = (regionCounts[pr] || 0) + 1;
    }

    // Method & Type — include projections in type counts
    var methodCounts = countByField(activeAudits, "audit_method");
    var typeCounts = countByField(activeAudits, "audit_type");
    for (var p = 0; p < projectionsThisYear.length; p++) {
        var pt = projectionsThisYear[p].audit_type || "Routine";
        typeCounts[pt] = (typeCounts[pt] || 0) + 1;
    }

    // Lifecycle
    var completedAudits = activeAudits.filter(function (a) { return a.audit_end; });
    var reportsIssued = completedAudits.filter(function (a) { return a.report_issued_date; });
    var reportsOnTime = reportsIssued.filter(function (a) {
        var due = getReportDueBy(a);
        return due && a.report_issued_date <= due;
    });
    var reportsLate = reportsIssued.filter(function (a) {
        var due = getReportDueBy(a);
        return due && a.report_issued_date > due;
    });
    var reportsOverdue = completedAudits.filter(function (a) {
        if (a.report_issued_date) return false;
        var due = getReportDueBy(a);
        return due && new Date(due) < new Date();
    });
    var avgDaysToReport = calcAvgDaysToReport(reportsIssued);

    var closed = completedAudits.filter(function (a) { return a.closed_date; });
    var awaitingClosure = completedAudits.filter(function (a) { return !a.closed_date; });

    var acceptable = completedAudits.filter(function (a) { return a.audit_outcome === "Acceptable"; });
    var conditional = completedAudits.filter(function (a) { return a.audit_outcome === "Conditional"; });
    var unacceptable = completedAudits.filter(function (a) { return a.audit_outcome === "Unacceptable"; });

    var totalCritical = sumField(completedAudits, "obs_critical");
    var totalMajor = sumField(completedAudits, "obs_major");
    var totalMinor = sumField(completedAudits, "obs_minor");
    var totalObs = totalCritical + totalMajor + totalMinor;
    var avgPerAudit = completedAudits.length > 0 ? (totalObs / completedAudits.length).toFixed(1) : "0";
    var zeroObs = completedAudits.filter(function (a) { return (!a.obs_critical && !a.obs_major && !a.obs_minor); });
    var withCritical = completedAudits.filter(function (a) { return a.obs_critical > 0; });

    var riskLow = completedAudits.filter(function (a) { return a.risk_rating === "Low"; });
    var riskMed = completedAudits.filter(function (a) { return a.risk_rating === "Medium"; });
    var riskHigh = completedAudits.filter(function (a) { return a.risk_rating === "High"; });

    // Forward look
    var nyCreated = activeNextYear.length;
    var nyProjected = projectionsNextYear.length;
    var nyTotal = nyCreated + nyProjected;
    var nyScheduled = auditsNextYear.filter(function (a) { return a.date_agreed && !isYes(a.cancelled); });
    var nySchedPct = nyTotal > 0 ? Math.round((nyScheduled.length / nyTotal) * 100) : 0;

    // Build HTML
    var html = '';

    // Year selector
    html += '<div class="dash-year-bar">';
    html += '<button class="btn-secondary btn-sm" onclick="changeYear(-1)">&larr;</button>';
    html += '<span class="dash-year-label">' + dashboardYear + '</span>';
    html += '<button class="btn-secondary btn-sm" onclick="changeYear(1)">&rarr;</button>';
    html += '<button class="dash-collapse-toggle" onclick="toggleAllCards()">&#9776; Toggle All</button>';
    html += '</div>';

    
    var totalDemand = auditsThisYear.length + projectionsThisYear.length;

    // Banner
    html += '<div class="dash-banner">';
    html += '<div class="dash-banner-label">TOTAL DEMAND ' + dashboardYear + '</div>';
    html += '<div class="dash-banner-value">' + totalDemand + '</div>';
    if (projectionsThisYear.length > 0) {
        html += '<div class="dash-banner-sub">' + auditsThisYear.length + ' audit records + ' + projectionsThisYear.length + ' projected from intervals</div>';
    } else {
        html += '<div class="dash-banner-sub">All audits identified for ' + dashboardYear + '</div>';
    }
    html += '</div>';

    // ---- TOP ROW: Scheduling + Events side by side ----
    html += '<div class="dash-row-2col">';

    html += '<div class="dash-card">';
    html += '<div class="dash-card-title">Active Audits</div>';
    html += '<div class="dash-card-tiles">';
    html += dashTile("Active", activeTotal, "Excl. cancelled", "tile-scheduled", "active");
    html += dashTile("Complete", completed, "", "tile-completed", "Scheduled - Complete");
    html += dashTile("Upcoming", upcoming, "", "tile-scheduled", "Scheduled - Upcoming");
    html += dashTile("Unscheduled", unscheduled, "", "tile-unscheduled", "Unscheduled - Pending");
    html += dashTile("Overdue", totalOverdue, "", "tile-overdue", "overdue");
    html += '</div></div>';

    html += '<div class="dash-card">';
    html += '<div class="dash-card-title">Schedule Events</div>';
    html += '<div class="dash-card-tiles">';
    html += dashTile("On Hold", onHold, "", "tile-onhold", "On Hold");
    html += dashTile("Rescheduled", rescheduled, "", "tile-rescheduled", "Rescheduled");
    html += dashTile("Cancelled", cancelled, "", "tile-cancelled-dash", "Cancelled");
    html += '</div></div>';

    html += '</div>';

    // ---- PERFORMANCE ROW ----
    html += '<div class="dash-row-2col">';

    html += '<div class="dash-card">';
    html += '<div class="dash-card-title">Performance</div>';
    html += '<div class="dash-kpi-pair">';
    html += '<div class="dash-kpi-item">';
    html += '<div class="dash-kpi-value">' + executionRate + '%</div>';
    html += '<div class="dash-kpi-label">Execution Rate</div>';
    html += '<div class="dash-kpi-sub">' + completed + ' of ' + schedulable.length + ' schedulable completed</div>';
    html += '</div>';
    html += '<div class="dash-kpi-item">';
    html += '<div class="dash-kpi-value">' + schedulingRate + '%</div>';
    html += '<div class="dash-kpi-label">Scheduling Rate</div>';
    html += '<div class="dash-kpi-sub">' + scheduled + ' of ' + schedulable.length + ' schedulable have a date</div>';
    html += '</div>';
    html += '</div></div>';

    html += '<div class="dash-card">';
    html += '<div class="dash-card-title">Regional Breakdown</div>';
    html += '<div class="dash-card-tiles">';
    var regions = ["USA", "EU", "India", "Asia", "China"];
    for (var i = 0; i < regions.length; i++) {
        var rc = regionCounts[regions[i]] || 0;
        html += '<div class="dash-mini-tile"><div class="dash-mini-value">' + rc + '</div><div class="dash-mini-label">' + regions[i] + '</div></div>';
    }
    html += '</div></div>';

    html += '</div>';

    // ---- CHARTS ROW ----
    html += '<div class="dash-row-2col">';

    html += '<div class="dash-card">';
    html += '<div class="dash-card-title">Audit Method Distribution</div>';
    html += '<div class="dash-chart-container">';
    html += buildDonut(methodCounts, METHOD_COLORS);
    html += '</div></div>';

    html += '<div class="dash-card">';
    html += '<div class="dash-card-title">Audit Type Distribution</div>';
    html += '<div class="dash-chart-container">';
    html += buildDonut(typeCounts, TYPE_COLORS);
    html += '</div></div>';

    html += '</div>';

    // ---- LIFECYCLE ROW ----
    html += '<div class="dash-row-2col">';

    html += '<div class="dash-card">';
    html += '<div class="dash-card-title">Report Timeliness</div>';
    html += '<div class="dash-card-tiles">';
    html += dashMini("Issued", reportsIssued.length, "");
    html += dashMini("On Time", reportsOnTime.length, "green");
    html += dashMini("Late", reportsLate.length, "red");
    html += dashMini("Avg Days", avgDaysToReport, "");
    html += dashMini("Overdue", reportsOverdue.length, "red");
    html += '</div></div>';

    html += '<div class="dash-card">';
    html += '<div class="dash-card-title">Closure</div>';
    html += '<div class="dash-card-tiles">';
    html += dashMini("Closed", closed.length, "green");
    html += dashMini("Awaiting", awaitingClosure.length, "yellow");
    html += '</div></div>';

    html += '</div>';

    // ---- OUTCOMES + OBSERVATIONS ROW ----
    html += '<div class="dash-row-2col">';

    html += '<div class="dash-card">';
    html += '<div class="dash-card-title">Outcomes</div>';
    html += '<div class="dash-card-tiles">';
    html += dashMini("Acceptable", acceptable.length, "green");
    html += dashMini("Conditional", conditional.length, "yellow");
    html += dashMini("Unacceptable", unacceptable.length, "red");
    html += '</div></div>';

    html += '<div class="dash-card">';
    html += '<div class="dash-card-title">Observations</div>';
    html += '<div class="dash-card-tiles">';
    html += dashMini("Critical", totalCritical, "red");
    html += dashMini("Major", totalMajor, "yellow");
    html += dashMini("Minor", totalMinor, "");
    html += dashMini("Avg/Audit", avgPerAudit, "");
    html += dashMini("Zero Obs", zeroObs.length, "green");
    html += dashMini("W/ Critical", withCritical.length, "red");
    html += '</div></div>';

    html += '</div>';

    // ---- RISK + FORWARD LOOK ROW ----
    html += '<div class="dash-row-2col">';

    html += '<div class="dash-card">';
    html += '<div class="dash-card-title">Risk Ratings</div>';
    html += '<div class="dash-card-tiles">';
    html += dashMini("Low", riskLow.length, "green");
    html += dashMini("Medium", riskMed.length, "yellow");
    html += dashMini("High", riskHigh.length, "red");
    html += '</div></div>';

    html += '<div class="dash-card">';
    html += '<div class="dash-card-title">Forward Look — ' + nextYear + '</div>';
    html += '<div class="dash-card-tiles">';
    html += dashMini("Total", nyTotal, "");
    html += dashMini("Created", nyCreated, "");
    html += dashMini("Projected", nyProjected, "blue");
    html += dashMini("Scheduled", nyScheduled.length, "green");
    html += dashMini("Sched %", nySchedPct + "%", "");
    html += '</div>';
    if (nyProjected > 0) {
        html += '<div class="dash-projection-note">&#9432; ' + nyProjected + ' projected from completed audit intervals (not yet created as audit records)</div>';
    }
    html += '</div>';

    html += '</div>';

    // ---- AUDIT TABLE ----
    html += '<div class="dash-card" style="margin-top:8px;">';
    html += '<div class="dash-card-title">Audit List — ' + dashboardYear + '</div>';
    html += '<table><thead><tr>';
    html += '<th>Audit ID</th><th>Vendor</th><th>Type</th><th>Required By</th>';
    html += '<th>Date Agreed</th><th>Auditor</th><th>Scheduling Status</th>';
    html += '</tr></thead><tbody id="dashboard-table-body"></tbody></table>';
    html += '</div>';

    container.innerHTML = html;
    renderDashboardTable(auditsThisYear);
    initCollapsibleCards();
}

/* ---------- Dashboard Table ---------- */

function renderDashboardTable(yearAudits) {
    var tbody = document.getElementById("dashboard-table-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    var list = yearAudits || getAuditsForYear(dashboardYear);

    for (var i = 0; i < list.length; i++) {
        var a = list[i];
        var sched = getSchedulingStatus(a);

        if (activeFilter) {
            if (activeFilter === "active" && isYes(a.cancelled)) continue;
            else if (activeFilter === "overdue" && sched !== "Scheduled - Overdue" && sched !== "Unscheduled - Overdue") continue;
            else if (activeFilter !== "active" && activeFilter !== "overdue" && sched !== activeFilter) continue;
        }

        var row = document.createElement("tr");
        row.innerHTML =
            "<td>" + (a.audit_id || "-") + "</td>" +
            "<td>" + getVendorName(a.vendor_id) + "</td>" +
            "<td>" + (a.audit_type || "-") + "</td>" +
            "<td>" + formatDateDisplay(a.audit_required_by) + "</td>" +
            "<td>" + formatDateDisplay(a.date_agreed) + "</td>" +
            "<td>" + getAuditorName(a.assigned_auditor) + "</td>" +
            '<td><span class="' + getScheduleBadgeClass(sched) + '">' + sched + "</span></td>";

        tbody.appendChild(row);
    }
}

/* ---------- Year Selector ---------- */

function changeYear(delta) {
    dashboardYear = (parseInt(dashboardYear) + delta).toString();
    activeFilter = null;
    renderDashboard();
}

function filterByStatus(status) {
    if (activeFilter === status) {
        activeFilter = null;
    } else {
        activeFilter = status;
    }
    renderDashboardTable();
}

/* ---------- Data Helpers ---------- */

function getAuditsForYear(year) {
    var results = [];
    for (var i = 0; i < audits.length; i++) {
        var arb = audits[i].audit_required_by;
        if (arb && arb.substring(0, 4) === year) results.push(audits[i]);
    }
    return results;
}

function countWithStatus(auditList, status) {
    var count = 0;
    for (var i = 0; i < auditList.length; i++) {
        if (getSchedulingStatus(auditList[i]) === status) count++;
    }
    return count;
}

function countByRegion(auditList) {
    var counts = {};
    for (var i = 0; i < auditList.length; i++) {
        var region = getVendorField(auditList[i], "region") || "Unknown";
        counts[region] = (counts[region] || 0) + 1;
    }
    return counts;
}

function countByField(auditList, field) {
    var counts = {};
    for (var i = 0; i < auditList.length; i++) {
        var val = auditList[i][field] || "Unknown";
        counts[val] = (counts[val] || 0) + 1;
    }
    return counts;
}

function sumField(auditList, field) {
    var total = 0;
    for (var i = 0; i < auditList.length; i++) {
        total += auditList[i][field] || 0;
    }
    return total;
}

function calcAvgDaysToReport(issuedList) {
    if (issuedList.length === 0) return "0";
    var total = 0;
    for (var i = 0; i < issuedList.length; i++) {
        var end = new Date(issuedList[i].audit_end);
        var issued = new Date(issuedList[i].report_issued_date);
        total += Math.round((issued - end) / (1000 * 60 * 60 * 24));
    }
    return Math.round(total / issuedList.length).toString();
}

/* ---------- HTML Builders ---------- */

function dashTile(label, value, sub, colorClass, filterKey) {
    var activeClass = activeFilter === filterKey ? " dash-tile-active" : "";
    return '<div class="dash-tile ' + (colorClass || "") + activeClass + '" onclick="filterByStatus(\'' + filterKey + '\')">' +
        '<div class="dash-tile-value">' + value + '</div>' +
        '<div class="dash-tile-label">' + label + '</div>' +
        (sub ? '<div class="dash-tile-sub">' + sub + '</div>' : '') +
        '</div>';
}

function dashMini(label, value, color) {
    var borderClass = "";
    if (color === "green") borderClass = " dash-mini-green";
    if (color === "yellow") borderClass = " dash-mini-yellow";
    if (color === "red") borderClass = " dash-mini-red";
    if (color === "blue") borderClass = " dash-mini-blue";
    return '<div class="dash-mini-tile' + borderClass + '">' +
        '<div class="dash-mini-value">' + value + '</div>' +
        '<div class="dash-mini-label">' + label + '</div>' +
        '</div>';
}

/* ---------- Donut Chart ---------- */

function buildDonut(dataCounts, colors) {
    var labels = Object.keys(dataCounts);
    var values = [];
    var total = 0;
    for (var i = 0; i < labels.length; i++) {
        values.push(dataCounts[labels[i]]);
        total += dataCounts[labels[i]];
    }

    if (total === 0) {
        return '<div style="text-align:center; color:var(--text-muted); font-size:12px; padding:20px;">No data</div>';
    }

    // Resolve color for each label: if colors is an object, look up by label; else use array index
    var isColorMap = (typeof colors === "object" && !Array.isArray(colors));
    var resolvedColors = [];
    for (var i = 0; i < labels.length; i++) {
        if (isColorMap) {
            resolvedColors.push(colors[labels[i]] || "#94a3b8");
        } else {
            resolvedColors.push(colors[i % colors.length]);
        }
    }

    var size = 120;
    var cx = size / 2;
    var cy = size / 2;
    var outerR = 50;
    var innerR = 32;

    var svg = '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" style="display:block; margin:0 auto 8px;">';

    var startAngle = -Math.PI / 2;
    for (var i = 0; i < values.length; i++) {
        var sliceAngle = (values[i] / total) * 2 * Math.PI;
        var endAngle = startAngle + sliceAngle;
        var largeArc = sliceAngle > Math.PI ? 1 : 0;
        var color = resolvedColors[i];

        if (values.length === 1) {
            svg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + outerR + '" fill="' + color + '"/>';
            svg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + innerR + '" fill="var(--donut-hole)"/>';
        } else {
            var x1o = cx + outerR * Math.cos(startAngle);
            var y1o = cy + outerR * Math.sin(startAngle);
            var x2o = cx + outerR * Math.cos(endAngle);
            var y2o = cy + outerR * Math.sin(endAngle);
            var x1i = cx + innerR * Math.cos(endAngle);
            var y1i = cy + innerR * Math.sin(endAngle);
            var x2i = cx + innerR * Math.cos(startAngle);
            var y2i = cy + innerR * Math.sin(startAngle);

            svg += '<path d="M ' + x1o + ' ' + y1o +
                ' A ' + outerR + ' ' + outerR + ' 0 ' + largeArc + ' 1 ' + x2o + ' ' + y2o +
                ' L ' + x1i + ' ' + y1i +
                ' A ' + innerR + ' ' + innerR + ' 0 ' + largeArc + ' 0 ' + x2i + ' ' + y2i +
                ' Z" fill="' + color + '"/>';
        }
        startAngle = endAngle;
    }

    svg += '</svg>';

    var legend = '<div class="dash-chart-legend">';
    for (var i = 0; i < labels.length; i++) {
        var color = resolvedColors[i];
        legend += '<div class="dash-legend-item">';
        legend += '<span class="dash-legend-dot" style="background-color:' + color + ';"></span>';
        legend += '<span class="dash-legend-text">' + labels[i] + ' (' + values[i] + ')</span>';
        legend += '</div>';
    }
    legend += '</div>';

    return svg + legend;
}

/* ---------- Collapsible Cards ---------- */

function initCollapsibleCards() {
    var cards = document.querySelectorAll('#view-dashboard .dash-card');
    for (var i = 0; i < cards.length; i++) {
        var card = cards[i];
        var title = card.querySelector('.dash-card-title');
        if (!title) continue;

        // Wrap everything after the title in a body div
        var body = document.createElement('div');
        body.className = 'dash-card-body';
        while (title.nextSibling) {
            body.appendChild(title.nextSibling);
        }
        card.appendChild(body);

        // Add chevron to title
        var chevron = document.createElement('span');
        chevron.className = 'dash-card-chevron';
        chevron.textContent = '\u25BE';
        title.appendChild(chevron);

        // Click to toggle
        title.addEventListener('click', function () {
            this.parentElement.classList.toggle('dash-card-collapsed');
        });
    }
}

function toggleAllCards() {
    var cards = document.querySelectorAll('#view-dashboard .dash-card');
    if (cards.length === 0) return;

    // If any card is expanded, collapse all. Otherwise expand all.
    var anyExpanded = false;
    for (var i = 0; i < cards.length; i++) {
        if (!cards[i].classList.contains('dash-card-collapsed')) {
            anyExpanded = true;
            break;
        }
    }

    for (var i = 0; i < cards.length; i++) {
        if (anyExpanded) {
            cards[i].classList.add('dash-card-collapsed');
        } else {
            cards[i].classList.remove('dash-card-collapsed');
        }
    }
}