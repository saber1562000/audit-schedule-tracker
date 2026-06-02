/* ============================================
   AUDITS MODULE
   List, filtering, quick update, form, CRUD
   ============================================ */

var auditQuickUpdateMode = false;

/* ---------- Filtering ---------- */

function getAuditFilters() {
    var searchEl = document.getElementById("audit-search");
    var schedEl = document.getElementById("audit-filter-scheduling");
    var typeEl = document.getElementById("audit-filter-type");
    var methodEl = document.getElementById("audit-filter-method");
    var regionEl = document.getElementById("audit-filter-region");
    var yearEl = document.getElementById("audit-filter-year");

    return {
        search: searchEl ? searchEl.value.toLowerCase().trim() : "",
        scheduling: schedEl ? schedEl.value : "",
        type: typeEl ? typeEl.value : "",
        method: methodEl ? methodEl.value : "",
        region: regionEl ? regionEl.value : "",
        year: yearEl ? yearEl.value : ""
    };
}

function filterAudits() {
    var f = getAuditFilters();
    var results = [];

    for (var i = 0; i < audits.length; i++) {
        var a = audits[i];
        var sched = getSchedulingStatus(a);
        var region = getVendorField(a, "region");
        var vendorName = getVendorName(a.vendor_id);
        var auditorName = getAuditorName(a.assigned_auditor);
        var arbYear = a.audit_required_by ? a.audit_required_by.substring(0, 4) : "";

        // Scheduling status filter (supports exclusion with ! prefix)
        if (f.scheduling) {
            if (f.scheduling.charAt(0) === "!") {
                var excludeList = f.scheduling.substring(1).split(",");
                var excluded = false;
                for (var e = 0; e < excludeList.length; e++) {
                    if (sched === excludeList[e]) { excluded = true; break; }
                }
                if (excluded) continue;
            } else {
                if (sched !== f.scheduling) continue;
            }
        }

        // Type filter
        if (f.type && a.audit_type !== f.type) continue;

        // Method filter
        if (f.method && a.audit_method !== f.method) continue;

        // Region filter
        if (f.region && region !== f.region) continue;

        // Year filter
        if (f.year && arbYear !== f.year) continue;

        // Text search
        if (f.search) {
            var searchable = [
                a.audit_id, vendorName, a.audit_type, a.audit_method,
                region, auditorName, sched, a.comment
            ].join(" ").toLowerCase();

            if (searchable.indexOf(f.search) === -1) continue;
        }

        results.push({ index: i, audit: a });
    }

    return results;
}

function clearAuditFilters() {
    document.getElementById("audit-search").value = "";
    document.getElementById("audit-filter-scheduling").value = "";
    document.getElementById("audit-filter-type").value = "";
    document.getElementById("audit-filter-method").value = "";
    document.getElementById("audit-filter-region").value = "";
    document.getElementById("audit-filter-year").value = "";
    renderAuditList();
}

function populateAuditYearFilter() {
    var yearSet = {};
    for (var i = 0; i < audits.length; i++) {
        var arb = audits[i].audit_required_by;
        if (arb) {
            var yr = arb.substring(0, 4);
            yearSet[yr] = true;
        }
    }

    var years = Object.keys(yearSet).sort().reverse();
    var el = document.getElementById("audit-filter-year");
    if (!el) return;

    var current = el.value;
    el.innerHTML = '<option value="">All Years</option>';
    for (var i = 0; i < years.length; i++) {
        var sel = years[i] === current ? " selected" : "";
        el.innerHTML += '<option value="' + years[i] + '"' + sel + '>' + years[i] + '</option>';
    }
}

/* ---------- List ---------- */

function renderAuditList() {
    if (auditQuickUpdateMode) { renderAuditQuickUpdate(); return; }

    populateAuditYearFilter();

    var filtered = filterAudits();

    // Attach sort values
    for (var i = 0; i < filtered.length; i++) {
        var a = filtered[i].audit;
        var sched = getSchedulingStatus(a);
        filtered[i]._sortVals = {
            audit_id: a.audit_id || "",
            vendor: getVendorName(a.vendor_id),
            region: getVendorField(a, "region"),
            type: a.audit_type || "",
            method: a.audit_method || "",
            arb: a.audit_required_by || "",
            date_agreed: a.date_agreed || "",
            start: a.audit_start || "",
            end: a.audit_end || "",
            audit_status: getAuditStatus(a),
            scheduling: sched
        };
    }

    filtered = sortResults(filtered, currentSort.field, currentSort.dir);

    var columns = [
        { label: "Audit ID", sortKey: "audit_id" },
        { label: "Vendor", sortKey: "vendor" },
        { label: "Region", sortKey: "region" },
        { label: "Type", sortKey: "type" },
        { label: "Method", sortKey: "method" },
        { label: "Required By", sortKey: "arb" },
        { label: "Date Agreed", sortKey: "date_agreed" },
        { label: "Start", sortKey: "start" },
        { label: "End", sortKey: "end" },
        { label: "Audit Status", sortKey: "audit_status" },
        { label: "Scheduling Status", sortKey: "scheduling" },
        { label: "Actions", sortKey: null }
    ];

    document.getElementById("audit-table-head").innerHTML = buildSortableHeader(columns);

    var filterBar = document.getElementById("audit-filter-bar");
    if (filterBar) filterBar.style.display = "flex";

    var tbody = document.getElementById("audit-table-body");
    tbody.innerHTML = "";

    for (var i = 0; i < filtered.length; i++) {
        var a = filtered[i].audit;
        var idx = filtered[i].index;
        var auditStatus = getAuditStatus(a);
        var sched = getSchedulingStatus(a);
        var region = getVendorField(a, "region");

        var row = document.createElement("tr");
        row.innerHTML =
            "<td>" + (a.audit_id || "-") + "</td>" +
            "<td>" + getVendorName(a.vendor_id) + "</td>" +
            "<td>" + (region || "-") + "</td>" +
            "<td>" + (a.audit_type || "-") + "</td>" +
            "<td>" + (a.audit_method || "-") + "</td>" +
            "<td>" + formatDateDisplay(a.audit_required_by) + "</td>" +
            "<td>" + formatDateDisplay(a.date_agreed) + "</td>" +
            "<td>" + formatDateDisplay(a.audit_start) + "</td>" +
            "<td>" + formatDateDisplay(a.audit_end) + "</td>" +
            "<td>" + auditStatus + "</td>" +
            '<td><span class="' + getScheduleBadgeClass(sched) + '">' + sched + "</span></td>" +
           '<td class="row-actions">' +
                '<button class="btn-icon btn-icon-view" onclick="showAuditDetail(' + idx + ')" title="View">&#128065;</button>' +
                '<button class="btn-icon" onclick="editAudit(' + idx + ')" title="Edit">&#9998;</button>' +
                '<button class="btn-icon btn-icon-danger" onclick="deleteAudit(' + idx + ')" title="Delete">&#128465;</button>' +
            "</td>";

        tbody.appendChild(row);
    }

    var footer = document.getElementById("audit-table-footer");
    if (footer) {
        footer.textContent = "Showing " + filtered.length + " of " + audits.length + " audits";
    }
}

/* ---------- Quick Update ---------- */

function showAuditQuickUpdate() {
    auditQuickUpdateMode = true;
    document.getElementById("audit-btn-bar").innerHTML =
        '<button class="btn-primary" onclick="saveAuditQuickUpdate()">Save All Changes</button>' +
        '<button class="btn-secondary" onclick="exitAuditQuickUpdate()">Back to List</button>';

    // Hide filter bar in quick update mode
    var filterBar = document.getElementById("audit-filter-bar");
    if (filterBar) filterBar.style.display = "none";

    renderAuditQuickUpdate();
}

function exitAuditQuickUpdate() {
    auditQuickUpdateMode = false;
    document.getElementById("audit-btn-bar").innerHTML =
        '<button class="btn-primary" onclick="addAudit()">+ Add Audit</button>' +
        '<button class="btn-secondary" onclick="showAuditQuickUpdate()">&#9889; Quick Update</button>';
    renderAuditList();
}

function renderAuditQuickUpdate() {
    var tbody = document.getElementById("audit-table-body");
    tbody.innerHTML = "";

    document.getElementById("audit-table-head").innerHTML =
        "<tr>" +
        "<th>Audit ID</th><th>Vendor</th><th>Type</th>" +
        "<th>Date Agreed</th><th>Audit Start</th><th>Audit End</th>" +
        "<th>On Hold</th><th>Cancelled</th><th>Scheduling Status</th>" +
        "</tr>";

    var count = 0;
    for (var i = 0; i < audits.length; i++) {
        var a = audits[i];
        var sched = getSchedulingStatus(a);

        if (sched === "Scheduled - Complete" || sched === "Cancelled") continue;

        count++;
        var row = document.createElement("tr");
        row.innerHTML =
            "<td>" + (a.audit_id || "-") + "</td>" +
            "<td>" + getVendorName(a.vendor_id) + "</td>" +
            "<td>" + (a.audit_type || "-") + "</td>" +
            '<td><input type="date" class="qu-input" data-index="' + i + '" data-field="date_agreed" value="' + (a.date_agreed || "") + '"></td>' +
            '<td><input type="date" class="qu-input" data-index="' + i + '" data-field="audit_start" value="' + (a.audit_start || "") + '"></td>' +
            '<td><input type="date" class="qu-input" data-index="' + i + '" data-field="audit_end" value="' + (a.audit_end || "") + '"></td>' +
            '<td><select class="qu-input" data-index="' + i + '" data-field="on_hold">' +
                '<option value="No"' + (a.on_hold !== "Yes" ? " selected" : "") + '>No</option>' +
                '<option value="Yes"' + (a.on_hold === "Yes" ? " selected" : "") + '>Yes</option>' +
            '</select></td>' +
            '<td><select class="qu-input" data-index="' + i + '" data-field="cancelled">' +
                '<option value="No"' + (a.cancelled !== "Yes" ? " selected" : "") + '>No</option>' +
                '<option value="Yes"' + (a.cancelled === "Yes" ? " selected" : "") + '>Yes</option>' +
            '</select></td>' +
            '<td><span class="' + getScheduleBadgeClass(sched) + '">' + sched + "</span></td>";

        tbody.appendChild(row);
    }

    if (count === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:20px; color:#64748b;">All audits are complete or cancelled.</td></tr>';
    }

    var footer = document.getElementById("audit-table-footer");
    if (footer) footer.textContent = "Showing " + count + " active audits";
}

function saveAuditQuickUpdate() {
    var inputs = document.querySelectorAll(".qu-input");
    for (var i = 0; i < inputs.length; i++) {
        var el = inputs[i];
        var index = parseInt(el.getAttribute("data-index"), 10);
        var fieldName = el.getAttribute("data-field");
        var value = el.value;

        if (fieldName === "date_agreed" || fieldName === "audit_start" || fieldName === "audit_end") {
            audits[index][fieldName] = value || null;
        } else {
            audits[index][fieldName] = value;
        }
    }

    saveData();
    alert("Changes saved.");
    renderAuditQuickUpdate();
}

/* ---------- CRUD ---------- */

function addAudit() {
    modalMode = "add-audit";
    editIndex = null;
    document.getElementById("modal-body").innerHTML = buildAuditForm(null);
    openModal("Add Audit");
    onAuditMethodChange();
}

function editAudit(index) {
    showAuditDetail(index, false);
}

function deleteAudit(index) {
    if (confirm("Delete this audit? This cannot be undone.")) {
        audits.splice(index, 1);
        saveData();
        if (currentView === "dashboard") renderDashboard();
        if (currentView === "audits") renderAuditList();
    }
}

/* ---------- Form ---------- */

function buildAuditForm(a) {
    if (!a) {
        a = {
            audit_id: "", vendor_id: "", audit_method: "", audit_type: "",
            audit_required_by: "", date_agreed: null, assigned_auditor: "",
            second_auditor: "", audit_start: null, audit_end: null,
            report_issued_date: null, closed_date: null, cancelled: "No",
            cancelled_reason: "", cancelled_reason_other: "", rescheduled: "No",
            rescheduled_to_date: null, on_hold: "No", on_hold_reason: "",
            on_hold_reason_other: "", desktop_docs_received: "Not Applicable",
            risk_rating: "", audit_outcome: "", obs_critical: null,
            obs_major: null, obs_minor: null, audit_interval: null,
            escalation: "", comment: "", legacy_source: ""
        };
    }

    var html = "";

    
    html += section("Identity");
    html += row(
        field("Vendor", buildVendorSelect("f-vendor-id", a.vendor_id)),
        field("Audit ID", buildInput("f-audit-id", "text", a.audit_id))
    );
    html += row(
        field("Audit Type", buildSelect("f-audit-type", OPTIONS.audit_type, a.audit_type)),
        field("Audit Method", buildSelect("f-audit-method", OPTIONS.audit_method, a.audit_method, "onAuditMethodChange()"))
    );
    html += row(
        field("Audit Required By", buildInput("f-arb", "date", formatDate(a.audit_required_by)))
    );

    html += section("Scheduling");
    html += row(
        field("Assigned Auditor", buildAuditorSelect("f-auditor", a.assigned_auditor, true) + '<div id="conflict-lead" class="cal-conflict-msg"></div>'),
        field("Second Auditor", buildAuditorSelect("f-auditor2", a.second_auditor, true) + '<div id="conflict-second" class="cal-conflict-msg"></div>')
    );
    html += row(
        field("Date Agreed", '<input type="date" id="f-date-agreed" value="' + formatDate(a.date_agreed) + '" onchange="checkAuditConflicts()">')
    );
    html += '<div id="conflict-warnings"></div>';

    html += section("Execution");
    html += row(
        field("Audit Start", buildInput("f-audit-start", "date", formatDate(a.audit_start))),
        field("Audit End", buildInput("f-audit-end", "date", formatDate(a.audit_end))),
        field("Audit Days", '<input type="number" id="f-audit-days" value="' + (a.audit_days || "") + '" placeholder="e.g. 2" min="1" max="10" step="1">')
    );

    html += section("Closure");
    html += row(
        field("Report Issued Date", buildInput("f-report-issued", "date", formatDate(a.report_issued_date))),
        field("Report Due By", buildReadonly("f-report-due", getReportDueBy(a)))
    );
    html += row(
        field("Closed Date", buildInput("f-closed-date", "date", formatDate(a.closed_date)))
    );

    html += section("Outcome");
    html += row(
        field("Risk Rating", buildSelect("f-risk", OPTIONS.risk_rating, a.risk_rating)),
        field("Audit Outcome", buildSelect("f-outcome", OPTIONS.audit_outcome, a.audit_outcome))
    );
    html += row(
        field("Critical", buildInput("f-obs-crit", "number", a.obs_critical)),
        field("Major", buildInput("f-obs-maj", "number", a.obs_major)),
        field("Minor", buildInput("f-obs-min", "number", a.obs_minor))
    );
    html += row(
        field("Audit Interval (months)", buildSelect("f-interval", OPTIONS.audit_interval, a.audit_interval))
    );

    html += section("Status Flags");
    html += row(
        field("Cancelled", buildSelect("f-cancelled", OPTIONS.yes_no, a.cancelled, "onCancelledChange()")),
        field("Cancelled Reason", buildSelect("f-cancel-reason", OPTIONS.cancelled_reason, a.cancelled_reason))
    );
    html += row(
        field("Cancelled — Other (100 chars)", buildLimitedInput("f-cancel-reason-other", a.cancelled_reason_other, 100))
    );
    html += row(
        field("On Hold", buildSelect("f-on-hold", OPTIONS.yes_no, a.on_hold, "onOnHoldChange()")),
        field("On Hold Reason", buildSelect("f-on-hold-reason", OPTIONS.on_hold_reason, a.on_hold_reason))
    );
    html += row(
        field("On Hold — Other (100 chars)", buildLimitedInput("f-on-hold-reason-other", a.on_hold_reason_other, 100))
    );
    html += row(
        field("Rescheduled", buildSelect("f-rescheduled", OPTIONS.yes_no, a.rescheduled)),
        field("Rescheduled To", buildInput("f-resched-date", "date", formatDate(a.rescheduled_to_date)))
    );

    html += section("Desktop Audit");
    html += row(
        field("Docs Received", buildSelect("f-desktop-docs", OPTIONS.desktop_docs, a.desktop_docs_received))
    );

    html += section("Notes");
    html += row(
        field("Escalation (100 chars)", buildLimitedInput("f-escalation", a.escalation, 100))
    );
    html += row(
        field("Comment / Note", buildTextarea("f-comment", a.comment))
    );
    html += row(
        field("Legacy Source", buildInput("f-legacy", "text", a.legacy_source))
    );

    // Change log — edit mode only
    if (a.changelog && a.changelog.length > 0) {
        html += '<div class="form-section">';
        html += '<div class="form-section-title changelog-toggle" onclick="toggleChangelog()" style="cursor:pointer;">';
        html += '&#128221; Change Log (' + a.changelog.length + ' entries) <span id="changelog-chevron">&#9656;</span>';
        html += '</div>';
        html += '<div id="changelog-body" style="display:none;">';
        html += '<table class="changelog-table"><thead><tr>';
        html += '<th>Timestamp</th><th>Field</th><th>Previous Value</th><th>New Value</th>';
        html += '</tr></thead><tbody>';

        // Show newest first
        var logCopy = a.changelog.slice().reverse();
        for (var c = 0; c < logCopy.length; c++) {
            var entry = logCopy[c];
            var ts = new Date(entry.timestamp);
            var tsDisplay = ts.toLocaleDateString() + " " + ts.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            html += '<tr>';
            html += '<td class="changelog-ts">' + tsDisplay + '</td>';
            html += '<td><strong>' + entry.field + '</strong></td>';
            html += '<td class="changelog-old">' + entry.old_value + '</td>';
            html += '<td class="changelog-new">' + entry.new_value + '</td>';
            html += '</tr>';
        }

        html += '</tbody></table>';
        html += '</div></div>';
    }

    return html;
}

function readAuditForm() {
    var intervalVal = document.getElementById("f-interval").value;
    var interval = null;
    if (intervalVal === "N/A") { interval = "N/A"; }
    else if (intervalVal) { interval = parseInt(intervalVal, 10); }

    return {
        audit_id: document.getElementById("f-audit-id").value.trim(),
        vendor_id: document.getElementById("f-vendor-id").value,
        audit_method: document.getElementById("f-audit-method").value,
        audit_type: document.getElementById("f-audit-type").value,
        audit_required_by: document.getElementById("f-arb").value || "",
        date_agreed: document.getElementById("f-date-agreed").value || null,
        assigned_auditor: document.getElementById("f-auditor").value,
        second_auditor: document.getElementById("f-auditor2").value,
        audit_start: document.getElementById("f-audit-start").value || null,
        audit_end: document.getElementById("f-audit-end").value || null,
        audit_days: document.getElementById("f-audit-days").value ? parseInt(document.getElementById("f-audit-days").value) : null,
        report_issued_date: document.getElementById("f-report-issued").value || null,
        closed_date: document.getElementById("f-closed-date").value || null,
        cancelled: document.getElementById("f-cancelled").value || "No",
        cancelled_reason: document.getElementById("f-cancel-reason").value,
        cancelled_reason_other: document.getElementById("f-cancel-reason-other").value.trim(),
        rescheduled: document.getElementById("f-rescheduled").value || "No",
        rescheduled_to_date: document.getElementById("f-resched-date").value || null,
        on_hold: document.getElementById("f-on-hold").value || "No",
        on_hold_reason: document.getElementById("f-on-hold-reason").value,
        on_hold_reason_other: document.getElementById("f-on-hold-reason-other").value.trim(),
        desktop_docs_received: document.getElementById("f-desktop-docs").value || "Not Applicable",
        risk_rating: document.getElementById("f-risk").value,
        audit_outcome: document.getElementById("f-outcome").value,
        obs_critical: parseInt(document.getElementById("f-obs-crit").value) || null,
        obs_major: parseInt(document.getElementById("f-obs-maj").value) || null,
        obs_minor: parseInt(document.getElementById("f-obs-min").value) || null,
        audit_interval: interval,
        escalation: document.getElementById("f-escalation").value.trim(),
        comment: document.getElementById("f-comment").value.trim(),
        legacy_source: document.getElementById("f-legacy").value.trim()
    };
}

function validateAuditForm(a) {
    var errors = [];
    if (!a.vendor_id) errors.push("Vendor is required.");
    if (!a.audit_required_by) errors.push("Audit Required By is required.");
    if (!a.audit_type) errors.push("Audit Type is required.");
    if (a.audit_end && !a.audit_start) errors.push("Audit Start is required when Audit End is set.");
    if (a.cancelled === "Yes" && a.on_hold === "Yes") errors.push("Cancelled and On Hold cannot both be Yes.");
    if (a.cancelled === "Yes" && !a.cancelled_reason) errors.push("Cancelled Reason is required when Cancelled is Yes.");
    if (a.on_hold === "Yes" && !a.on_hold_reason) errors.push("On Hold Reason is required when On Hold is Yes.");
    return errors;
}

/* ---------- Audit Detail (Full Page) ---------- */

function showAuditDetail(index, readOnly) {
    if (readOnly === undefined) readOnly = true;
    editIndex = index;
    var a = audits[index];
    var container = document.getElementById("view-audit-detail");

    // Hide all views and show audit detail
    var allViews = ["dashboard", "audits", "vendors", "vendor-detail", "auditors", "forecast", "risk", "capacity"];
    for (var i = 0; i < allViews.length; i++) {
        var el = document.getElementById("view-" + allViews[i]);
        if (el) el.style.display = "none";
    }
    container.style.display = "block";
    currentView = "audit-detail";

    // Update sidebar active state
    var links = document.querySelectorAll(".sidebar-item");
    for (var i = 0; i < links.length; i++) {
        var dv = links[i].getAttribute("data-view");
        if (dv) {
            links[i].className = "sidebar-item" + (dv === "audits" ? " active" : "");
        }
    }
    expandSectionForView("audit-detail");

    var vendorName = getVendorName(a.vendor_id);
    var schedStatus = getSchedulingStatus(a);

    var html = "";

    // Header
    html += '<div class="detail-header">';
    html += '<button class="btn-secondary" onclick="showView(\'audits\')">&larr; Back to Audits</button>';
    html += '<div class="detail-header-actions">';
    if (readOnly) {
        html += '<button class="btn-primary" onclick="showAuditDetail(' + index + ', false)">&#9998; Edit Audit</button>';
    } else {
        html += '<button class="btn-secondary" onclick="showAuditDetail(' + index + ', true)">Cancel</button>';
        html += '<button class="btn-danger" onclick="deleteAuditFromDetail(' + index + ')">Delete</button>';
        html += '<button class="btn-primary" onclick="saveAuditDetail(' + index + ')">Save Audit</button>';
    }
    html += '</div></div>';

    // Title row
    html += '<div class="audit-detail-title">';
    html += '<h1 class="page-title">' + (a.audit_id || "New Audit") + ' — ' + vendorName + '</h1>';
    html += '<div class="audit-detail-badges">';
    html += '<span class="' + getScheduleBadgeClass(schedStatus) + '">' + schedStatus + '</span>';
    html += '</div></div>';

    // Timeline
    html += buildAuditTimelineFull(a);

    // Form
    html += '<div class="audit-detail-form">';
    if (readOnly) {
        html += buildAuditDetailReadOnly(a);
    } else {
        html += buildAuditForm(a);
    }
    html += '</div>';

    
    container.innerHTML = html;
}

function saveAuditDetail(index) {
    var auditData = readAuditForm();
    var errors = validateAuditForm(auditData);
    if (errors.length > 0) {
        alert(errors.join("\n"));
        return;
    }
    audits[index] = auditData;
    saveData();
    showAuditDetail(index);
}

function deleteAuditFromDetail(index) {
    if (confirm("Delete this audit? This cannot be undone.")) {
        audits.splice(index, 1);
        saveData();
        showView("audits");
    }
}

/* ---------- Full Page Timeline ---------- */

function buildAuditTimelineFull(a) {
    var preSteps = [
        { label: "Created", done: true, icon: "&#43;", date: null },
        { label: "Scheduled", done: !!a.date_agreed, icon: "&#128197;", date: a.date_agreed }
    ];

    var postSteps = [
        { label: "Pending", done: !!a.date_agreed, icon: "&#9202;", date: null },
        { label: "Started", done: !!a.audit_start, icon: "&#9654;", date: a.audit_start },
        { label: "Completed", done: !!a.audit_end, icon: "&#10004;", date: a.audit_end },
        { label: "Report Issued", done: !!a.report_issued_date, icon: "&#128196;", date: a.report_issued_date },
        { label: "Closed", done: !!a.closed_date, icon: "&#128274;", date: a.closed_date }
    ];

    var currentPreIdx = -1;
    for (var i = preSteps.length - 1; i >= 0; i--) {
        if (preSteps[i].done) { currentPreIdx = i; break; }
    }
    var currentPostIdx = -1;
    for (var i = postSteps.length - 1; i >= 0; i--) {
        if (postSteps[i].done) { currentPostIdx = i; break; }
    }

    var flags = [];
    if (isYes(a.cancelled)) flags.push({ label: "Cancelled", cls: "tl-flag-cancelled" });
    if (isYes(a.on_hold)) flags.push({ label: "On Hold", cls: "tl-flag-hold" });
    if (isYes(a.rescheduled)) flags.push({ label: "Rescheduled", cls: "tl-flag-rescheduled" });

    var html = '<div class="audit-timeline-full">';

    if (flags.length > 0) {
        html += '<div class="tlf-flags">';
        for (var i = 0; i < flags.length; i++) {
            html += '<span class="tl-flag ' + flags[i].cls + '">' + flags[i].label + '</span>';
        }
        html += '</div>';
    }

    html += '<div class="tlf-phases">';

    // Pre-schedule
    html += '<div class="tlf-phase">';
    html += '<div class="tlf-phase-header">Pre-Schedule</div>';
    html += '<div class="tlf-track">';
    html += buildTimelineNodes(preSteps, currentPreIdx, currentPostIdx < 0);
    html += '</div></div>';

    // Divider
    html += '<div class="tlf-divider"><div class="tlf-divider-line"></div></div>';

    // Post-schedule
    html += '<div class="tlf-phase tlf-phase-post">';
    html += '<div class="tlf-phase-header">Post-Schedule</div>';
    html += '<div class="tlf-track">';
    html += buildTimelineNodes(postSteps, currentPostIdx, true);
    html += '</div></div>';

    html += '</div></div>';
    return html;
}

function buildTimelineNodes(steps, currentIdx, showCurrentGlow) {
    var html = "";
    for (var i = 0; i < steps.length; i++) {
        var s = steps[i];
        var nodeClass = "tlf-node";
        if (s.done) nodeClass += " tlf-done";
        if (i === currentIdx && showCurrentGlow) nodeClass += " tlf-current";

        html += '<div class="tlf-step">';
        html += '<div class="' + nodeClass + '">' + s.icon + '</div>';
        html += '<div class="tlf-label">' + s.label + '</div>';
        if (s.done && s.date) {
            html += '<div class="tlf-date">' + formatDateDisplay(s.date) + '</div>';
        }
        html += '</div>';

        if (i < steps.length - 1) {
            var connClass = "tlf-connector";
            if (steps[i + 1].done) connClass += " tlf-connector-done";
            html += '<div class="' + connClass + '"></div>';
        }
    }
    return html;
}

/* ---------- Change Log ---------- */

function toggleChangelog() {
    var body = document.getElementById("changelog-body");
    var chevron = document.getElementById("changelog-chevron");
    if (!body) return;
    if (body.style.display === "none") {
        body.style.display = "block";
        if (chevron) chevron.innerHTML = "&#9662;";
    } else {
        body.style.display = "none";
        if (chevron) chevron.innerHTML = "&#9656;";
    }
}

/* ---------- Audit Form Field Handlers ---------- */

function onAuditMethodChange() {
    var method = document.getElementById("f-audit-method");
    var docsField = document.getElementById("f-desktop-docs");
    if (!method || !docsField) return;

    if (method.value === "Desktop") {
        docsField.disabled = false;
        docsField.style.opacity = "1";
        docsField.style.cursor = "";
    } else {
        docsField.value = "Not Applicable";
        docsField.disabled = true;
        docsField.style.opacity = "0.45";
        docsField.style.cursor = "not-allowed";
    }
}

function onCancelledChange() {
    var cancelled = document.getElementById("f-cancelled");
    var onHold = document.getElementById("f-on-hold");
    if (!cancelled || !onHold) return;

    if (cancelled.value === "Yes" && onHold.value === "Yes") {
        onHold.value = "No";
    }
}

function onOnHoldChange() {
    var onHold = document.getElementById("f-on-hold");
    var cancelled = document.getElementById("f-cancelled");
    if (!onHold || !cancelled) return;

    if (onHold.value === "Yes" && cancelled.value === "Yes") {
        cancelled.value = "No";
    }
}

/* ---------- Lifecycle Timeline ---------- */

function buildAuditTimeline(a) {
    var preSteps = [
        { label: "Created", done: true },
        { label: "Scheduled", done: !!a.date_agreed, date: a.date_agreed }
    ];

    var postSteps = [
        { label: "Pending", done: !!a.date_agreed, date: a.date_agreed },
        { label: "Started", done: !!a.audit_start, date: a.audit_start },
        { label: "Completed", done: !!a.audit_end, date: a.audit_end },
        { label: "Report Issued", done: !!a.report_issued_date, date: a.report_issued_date },
        { label: "Closed", done: !!a.closed_date, date: a.closed_date }
    ];

    // Find the current step (last done step)
    var currentPreIdx = -1;
    for (var i = preSteps.length - 1; i >= 0; i--) {
        if (preSteps[i].done) { currentPreIdx = i; break; }
    }

    var currentPostIdx = -1;
    for (var i = postSteps.length - 1; i >= 0; i--) {
        if (postSteps[i].done) { currentPostIdx = i; break; }
    }

    // Status flags
    var flags = [];
    if (isYes(a.cancelled)) flags.push({ label: "Cancelled", cls: "tl-flag-cancelled" });
    if (isYes(a.on_hold)) flags.push({ label: "On Hold", cls: "tl-flag-hold" });
    if (isYes(a.rescheduled)) flags.push({ label: "Rescheduled", cls: "tl-flag-rescheduled" });

    var html = '<div class="audit-timeline">';

    // Flags
    if (flags.length > 0) {
        html += '<div class="tl-flags">';
        for (var i = 0; i < flags.length; i++) {
            html += '<span class="tl-flag ' + flags[i].cls + '">' + flags[i].label + '</span>';
        }
        html += '</div>';
    }

    // Pre-schedule phase
    html += '<div class="tl-phase">';
    html += '<div class="tl-phase-label">Pre-Schedule</div>';
    html += '<div class="tl-track">';
    for (var i = 0; i < preSteps.length; i++) {
        var s = preSteps[i];
        var cls = "tl-node";
        if (s.done) cls += " tl-done";
        if (i === currentPreIdx && currentPostIdx < 0) cls += " tl-current";

        html += '<div class="tl-step">';
        html += '<div class="' + cls + '"></div>';
        html += '<div class="tl-step-label">' + s.label + '</div>';
        if (s.done && s.date) {
            html += '<div class="tl-step-date">' + formatDateDisplay(s.date) + '</div>';
        }
        html += '</div>';
        if (i < preSteps.length - 1) {
            html += '<div class="tl-connector' + (preSteps[i + 1].done ? ' tl-connector-done' : '') + '"></div>';
        }
    }
    html += '</div></div>';

    // Phase separator
    html += '<div class="tl-phase-separator"></div>';

    // Post-schedule phase
    html += '<div class="tl-phase">';
    html += '<div class="tl-phase-label">Post-Schedule</div>';
    html += '<div class="tl-track">';
    for (var i = 0; i < postSteps.length; i++) {
        var s = postSteps[i];
        var cls = "tl-node";
        if (s.done) cls += " tl-done";
        if (i === currentPostIdx) cls += " tl-current";

        html += '<div class="tl-step">';
        html += '<div class="' + cls + '"></div>';
        html += '<div class="tl-step-label">' + s.label + '</div>';
        if (s.done && s.date && i > 0) {
            html += '<div class="tl-step-date">' + formatDateDisplay(s.date) + '</div>';
        }
        html += '</div>';
        if (i < postSteps.length - 1) {
            html += '<div class="tl-connector' + (postSteps[i + 1].done ? ' tl-connector-done' : '') + '"></div>';
        }
    }
    html += '</div></div>';

    html += '</div>';
    return html;
}

/* ---------- Read-Only Audit View ---------- */

function buildAuditDetailReadOnly(a) {
    var html = "";

    html += '<div class="detail-grid">';

    html += '<div class="detail-card">';
    html += '<div class="detail-card-title">Identity</div>';
    html += detailRow("Vendor", getVendorName(a.vendor_id));
    html += detailRow("Audit ID", a.audit_id || "-");
    html += detailRow("Audit Type", a.audit_type || "-");
    html += detailRow("Audit Method", a.audit_method || "-");
    html += detailRow("Required By", formatDateDisplay(a.audit_required_by));
    html += '</div>';

    html += '<div class="detail-card">';
    html += '<div class="detail-card-title">Scheduling</div>';
    html += detailRow("Lead Auditor", getAuditorName(a.assigned_auditor));
    html += detailRow("Second Auditor", getAuditorName(a.second_auditor));
    html += detailRow("Date Agreed", formatDateDisplay(a.date_agreed));
    html += '</div>';

    html += '<div class="detail-card">';
    html += '<div class="detail-card-title">Execution</div>';
    html += detailRow("Audit Start", formatDateDisplay(a.audit_start));
    html += detailRow("Audit End", formatDateDisplay(a.audit_end));
    html += detailRow("Audit Days", a.audit_days || "-");
    html += '</div>';

    html += '</div>';

    html += '<div class="detail-grid">';

    html += '<div class="detail-card">';
    html += '<div class="detail-card-title">Closure</div>';
    html += detailRow("Report Issued", formatDateDisplay(a.report_issued_date));
    html += detailRow("Report Due By", getReportDueBy(a) || "-");
    html += detailRow("Closed Date", formatDateDisplay(a.closed_date));
    html += '</div>';

    html += '<div class="detail-card">';
    html += '<div class="detail-card-title">Outcome</div>';
    html += detailRow("Risk Rating", a.risk_rating || "-");
    html += detailRow("Audit Outcome", a.audit_outcome || "-");
    html += detailRow("Critical Obs", a.obs_critical !== null ? a.obs_critical : "-");
    html += detailRow("Major Obs", a.obs_major !== null ? a.obs_major : "-");
    html += detailRow("Minor Obs", a.obs_minor !== null ? a.obs_minor : "-");
    html += detailRow("Interval", a.audit_interval !== null ? (a.audit_interval === "N/A" ? "N/A" : a.audit_interval + " months") : "-");
    html += '</div>';

    html += '<div class="detail-card">';
    html += '<div class="detail-card-title">Status Flags</div>';
    html += detailRow("Cancelled", a.cancelled || "No");
    if (isYes(a.cancelled)) {
        html += detailRow("Reason", a.cancelled_reason || "-");
        if (a.cancelled_reason_other) html += detailRow("Other", a.cancelled_reason_other);
    }
    html += detailRow("On Hold", a.on_hold || "No");
    if (isYes(a.on_hold)) {
        html += detailRow("Reason", a.on_hold_reason || "-");
        if (a.on_hold_reason_other) html += detailRow("Other", a.on_hold_reason_other);
    }
    html += detailRow("Rescheduled", a.rescheduled || "No");
    if (isYes(a.rescheduled)) {
        html += detailRow("Rescheduled To", formatDateDisplay(a.rescheduled_to_date));
    }
    html += '</div>';

    html += '</div>';

    if (a.audit_method === "Desktop") {
        html += '<div class="detail-grid"><div class="detail-card">';
        html += '<div class="detail-card-title">Desktop Audit</div>';
        html += detailRow("Docs Received", a.desktop_docs_received || "-");
        html += '</div></div>';
    }

    if (a.escalation || a.comment || a.legacy_source) {
        html += '<div class="detail-grid"><div class="detail-card">';
        html += '<div class="detail-card-title">Notes</div>';
        if (a.escalation) html += detailRow("Escalation", a.escalation);
        if (a.comment) html += detailRow("Comment", a.comment);
        if (a.legacy_source) html += detailRow("Legacy Source", a.legacy_source);
        html += '</div></div>';
    }

    return html;
}

/* ---------- Leave Conflict Detection ---------- */

function checkAuditConflicts() {
    var leadId = document.getElementById("f-auditor") ? document.getElementById("f-auditor").value : "";
    var secondId = document.getElementById("f-auditor2") ? document.getElementById("f-auditor2").value : "";
    var dateAgreed = document.getElementById("f-date-agreed") ? document.getElementById("f-date-agreed").value : "";
    var method = document.getElementById("f-method") ? document.getElementById("f-method").value : "";
    var auditDaysEl = document.getElementById("f-audit-days");
    var auditDays = auditDaysEl && auditDaysEl.value ? parseInt(auditDaysEl.value) : 1;

    var leadMsg = document.getElementById("conflict-lead");
    var secondMsg = document.getElementById("conflict-second");
    var warningsDiv = document.getElementById("conflict-warnings");

    if (leadMsg) leadMsg.innerHTML = "";
    if (secondMsg) secondMsg.innerHTML = "";
    if (warningsDiv) warningsDiv.innerHTML = "";

    if (!dateAgreed) return;

    var startDate = new Date(dateAgreed);
    var isOnsite = method === "On-site";

    // Build array of dates to check
    var datesToCheck = [];

    if (isOnsite) {
        var travelBefore = new Date(startDate);
        travelBefore.setDate(travelBefore.getDate() - 1);
        datesToCheck.push({ date: formatDate(travelBefore), label: "travel day" });
    }

    for (var d = 0; d < auditDays; d++) {
        var auditDay = new Date(startDate);
        auditDay.setDate(auditDay.getDate() + d);
        datesToCheck.push({ date: formatDate(auditDay), label: "audit day" });
    }

    if (isOnsite) {
        var travelAfter = new Date(startDate);
        travelAfter.setDate(travelAfter.getDate() + auditDays);
        datesToCheck.push({ date: formatDate(travelAfter), label: "travel day" });
    }

    // Check lead auditor
    if (leadId) {
        var leadConflicts = getAuditorLeaveConflicts(leadId, datesToCheck);
        if (leadConflicts.length > 0 && leadMsg) {
            leadMsg.innerHTML = buildConflictWarning(leadId, leadConflicts);
        }
    }

    // Check second auditor
    if (secondId) {
        var secondConflicts = getAuditorLeaveConflicts(secondId, datesToCheck);
        if (secondConflicts.length > 0 && secondMsg) {
            secondMsg.innerHTML = buildConflictWarning(secondId, secondConflicts);
        }
    }
}

function getAuditorLeaveConflicts(auditorId, datesToCheck) {
    var auditor = getAuditorById(auditorId);
    if (!auditor || !auditor.leave) return [];

    var conflicts = [];
    for (var i = 0; i < datesToCheck.length; i++) {
        for (var j = 0; j < auditor.leave.length; j++) {
            if (auditor.leave[j].date === datesToCheck[i].date) {
                conflicts.push({
                    date: datesToCheck[i].date,
                    dayType: datesToCheck[i].label,
                    leaveType: auditor.leave[j].type
                });
            }
        }
    }
    return conflicts;
}

function buildConflictWarning(auditorId, conflicts) {
    var name = getAuditorName(auditorId);
    var html = '<div class="cal-conflict-alert">';
    html += '<strong>\u26A0 On leave</strong> \u2014 check the calendar<br>';
    for (var i = 0; i < conflicts.length; i++) {
        var c = conflicts[i];
        html += formatDateDisplay(c.date) + ' (' + c.dayType + '): ' + c.leaveType;
        if (i < conflicts.length - 1) html += '<br>';
    }
    html += '</div>';
    return html;
}

