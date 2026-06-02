/* ============================================
   CLOSURE TRACKER MODULE
   Post-execution audits pending closure
   ============================================ */

/* ---------- Main Render ---------- */

function renderClosure() {
    var container = document.getElementById("view-closure");
    var allData = getClosureData();

    // Summary counts
    var reportPending = 0;
    var reportOverdue = 0;
    var awaitingClosure = 0;
    var now = new Date();

    for (var i = 0; i < allData.length; i++) {
        var d = allData[i];
        if (!d.reportIssued) {
            reportPending++;
            if (d.reportDueDate && new Date(d.reportDueDate) < now) reportOverdue++;
        }
        awaitingClosure++;
    }

    var html = '';

    html += '<div class="view-header">';
    html += '<h1 class="page-title">Closure Tracker</h1>';
    html += '</div>';

    html += '<div class="forecast-explainer">';
    html += 'Audits that have completed execution but are not yet closed. ';
    html += 'Tracks report issuance, timeliness, and days since completion to highlight stalled closures.';
    html += '</div>';

    // Summary tiles
    html += '<div class="dash-card"><div class="dash-card-title">Closure Pipeline</div>';
    html += '<div class="dash-card-tiles">';
    html += dashMini("Awaiting Closure", awaitingClosure, "");
    html += dashMini("Report Pending", reportPending, reportPending > 0 ? "yellow" : "green");
    html += dashMini("Report Overdue", reportOverdue, reportOverdue > 0 ? "red" : "green");
    html += '</div></div>';

    // Filters
    html += '<div class="filter-bar">';
    html += '<select class="filter-select" id="closure-filter-region" onchange="applyClosureFilters()">';
    html += '<option value="">All Regions</option>';
    var regions = ["USA", "EU", "India", "Asia", "China"];
    for (var i = 0; i < regions.length; i++) {
        html += '<option value="' + regions[i] + '">' + regions[i] + '</option>';
    }
    html += '</select>';
    html += '<select class="filter-select" id="closure-filter-auditor" onchange="applyClosureFilters()">';
    html += '<option value="">All Auditors</option>';
    for (var i = 0; i < auditors.length; i++) {
        if (auditors[i].active_status !== "Active") continue;
        html += '<option value="' + auditors[i].auditor_id + '">' + auditors[i].first_name + ' ' + auditors[i].last_name + '</option>';
    }
    html += '</select>';
    html += '<select class="filter-select" id="closure-filter-report" onchange="applyClosureFilters()">';
    html += '<option value="">All Report Status</option>';
    html += '<option value="issued">Report Issued</option>';
    html += '<option value="pending">Report Pending</option>';
    html += '<option value="overdue">Report Overdue</option>';
    html += '</select>';
    html += '<button class="btn-filter-clear" onclick="clearClosureFilters()">Clear</button>';
    html += '</div>';

    // Table
    var columns = [
        { label: "Audit ID", sortKey: "audit_id" },
        { label: "Vendor", sortKey: "vendor_name" },
        { label: "Region", sortKey: "region" },
        { label: "Auditor", sortKey: "auditor_name" },
        { label: "Audit End", sortKey: "audit_end" },
        { label: "Days Since", sortKey: "daysSince" },
        { label: "Report Due", sortKey: "reportDueDate" },
        { label: "Report Status", sortKey: "reportStatus" },
        { label: "Audit Status", sortKey: "auditStatus" },
        { label: "Actions", sortKey: null }
    ];

    html += '<table><thead>' + buildSortableHeader(columns) + '</thead>';
    html += '<tbody id="closure-table-body"></tbody></table>';
    html += '<div class="table-footer" id="closure-table-footer"></div>';

    container.innerHTML = html;
    applyClosureFilters();
}

/* ---------- Table Render ---------- */

function renderClosureTable(data, totalCount) {
    var results = [];
    for (var i = 0; i < data.length; i++) {
        results.push({
            data: data[i],
            _sortVals: {
                audit_id: data[i].audit_id,
                vendor_name: data[i].vendor_name,
                region: data[i].region,
                auditor_name: data[i].auditorName,
                audit_end: data[i].audit_end,
                daysSince: data[i].daysSince,
                reportDueDate: data[i].reportDueDate,
                reportStatus: data[i].reportStatus,
                auditStatus: data[i].auditStatus
            }
        });
    }

    // Default sort by days since (oldest first) if no sort set
    if (!currentSort.field) {
        results = sortResults(results, "daysSince", "desc");
    } else {
        results = sortResults(results, currentSort.field, currentSort.dir);
    }

    var tbody = document.getElementById("closure-table-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    for (var i = 0; i < results.length; i++) {
        var d = results[i].data;

        var daysClass = "";
        if (d.daysSince > 90) daysClass = "closure-days-critical";
        else if (d.daysSince > 45) daysClass = "closure-days-warning";

        var reportBadge = "";
        if (d.reportStatus === "Overdue") {
            reportBadge = '<span class="badge badge-overdue">Overdue</span>';
        } else if (d.reportStatus === "Issued") {
            reportBadge = '<span class="badge badge-completed">Issued</span>';
        } else if (d.reportStatus === "Issued Late") {
            reportBadge = '<span class="badge badge-rescheduled">Issued Late</span>';
        } else {
            reportBadge = '<span class="badge badge-unscheduled">Pending</span>';
        }

        // Find audit index for view/edit
        var auditIdx = -1;
        for (var j = 0; j < audits.length; j++) {
            if (audits[j] === d.audit) { auditIdx = j; break; }
        }

        var row = document.createElement("tr");
        row.innerHTML =
            "<td>" + (d.audit_id || "-") + "</td>" +
            "<td>" + d.vendor_name + "</td>" +
            "<td>" + (d.region || "-") + "</td>" +
            "<td>" + d.auditorName + "</td>" +
            "<td>" + formatDateDisplay(d.audit_end) + "</td>" +
            '<td class="' + daysClass + '">' + d.daysSince + ' days</td>' +
            "<td>" + formatDateDisplay(d.reportDueDate) + "</td>" +
            "<td>" + reportBadge + "</td>" +
            "<td>" + d.auditStatus + "</td>" +
            '<td class="row-actions">' +
                (auditIdx >= 0 ? '<button class="btn-icon btn-icon-view" onclick="showAuditDetail(' + auditIdx + ')" title="View">&#128065;</button>' : '') +
                (auditIdx >= 0 ? '<button class="btn-icon" onclick="editAudit(' + auditIdx + ')" title="Edit">&#9998;</button>' : '') +
            '</td>';

        tbody.appendChild(row);
    }

    var footer = document.getElementById("closure-table-footer");
    if (footer) footer.textContent = "Showing " + results.length + " of " + totalCount + " audits awaiting closure";
}

/* ---------- Closure Data ---------- */

function getClosureData() {
    var results = [];
    var now = new Date();

    for (var i = 0; i < audits.length; i++) {
        var a = audits[i];

        // Must have audit_end, must not be closed, must not be cancelled
        if (!a.audit_end) continue;
        if (a.closed_date) continue;
        if (isYes(a.cancelled)) continue;

        var endDate = new Date(a.audit_end);
        var daysSince = Math.floor((now - endDate) / (1000 * 60 * 60 * 24));

        var reportDueDate = getReportDueBy(a);
        var reportIssued = !!a.report_issued_date;

        var reportStatus = "Pending";
        if (reportIssued) {
            var dueDate = reportDueDate ? new Date(reportDueDate) : null;
            var issuedDate = new Date(a.report_issued_date);
            if (dueDate && issuedDate > dueDate) {
                reportStatus = "Issued Late";
            } else {
                reportStatus = "Issued";
            }
        } else if (reportDueDate && new Date(reportDueDate) < now) {
            reportStatus = "Overdue";
        }

        results.push({
            audit: a,
            audit_id: a.audit_id || "",
            vendor_id: a.vendor_id,
            vendor_name: getVendorName(a.vendor_id),
            region: getVendorField(a, "region"),
            auditorId: a.assigned_auditor,
            auditorName: getAuditorName(a.assigned_auditor),
            audit_end: a.audit_end,
            daysSince: daysSince,
            reportDueDate: reportDueDate,
            reportIssued: reportIssued,
            reportStatus: reportStatus,
            auditStatus: getAuditStatus(a)
        });
    }

    return results;
}

/* ---------- Filters ---------- */

function applyClosureFilters() {
    var allData = getClosureData();
    var region = document.getElementById("closure-filter-region");
    var auditor = document.getElementById("closure-filter-auditor");
    var report = document.getElementById("closure-filter-report");

    var regionVal = region ? region.value : "";
    var auditorVal = auditor ? auditor.value : "";
    var reportVal = report ? report.value : "";

    var filtered = allData.filter(function (d) {
        if (regionVal && d.region !== regionVal) return false;
        if (auditorVal && d.auditorId !== auditorVal) return false;
        if (reportVal) {
            if (reportVal === "issued" && d.reportStatus !== "Issued" && d.reportStatus !== "Issued Late") return false;
            if (reportVal === "pending" && d.reportStatus !== "Pending") return false;
            if (reportVal === "overdue" && d.reportStatus !== "Overdue") return false;
        }
        return true;
    });

    renderClosureTable(filtered, allData.length);
}

function clearClosureFilters() {
    var region = document.getElementById("closure-filter-region");
    var auditor = document.getElementById("closure-filter-auditor");
    var report = document.getElementById("closure-filter-report");
    if (region) region.value = "";
    if (auditor) auditor.value = "";
    if (report) report.value = "";
    applyClosureFilters();
}