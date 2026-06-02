/* ============================================
   APP SHELL
   Navigation, modal system, save routing
   ============================================ */

var activeFilter = null;
var currentView = "dashboard";
var modalMode = null;
var editIndex = null;

var currentSort = { field: null, dir: null };

/* ---------- Theme ---------- */

function toggleTheme() {
    var html = document.documentElement;
    var current = html.getAttribute("data-theme");
    var next = current === "dark" ? "light" : "dark";
    html.setAttribute("data-theme", next);
    localStorage.setItem("eqa_theme", next);
    var btn = document.getElementById("theme-btn");
    if (btn) {
        var iconSpan = btn.querySelector(".sidebar-icon");
        if (iconSpan) iconSpan.innerHTML = next === "dark" ? "&#9788;" : "&#9789;";
    }
}

function loadTheme() {
    var saved = localStorage.getItem("eqa_theme");
    if (saved === "dark") {
        document.documentElement.setAttribute("data-theme", "dark");
        var btn = document.getElementById("theme-btn");
        if (btn) {
            var iconSpan = btn.querySelector(".sidebar-icon");
            if (iconSpan) iconSpan.innerHTML = "&#9788;";
        }
    }
}

function handleSort(field) {
    if (currentSort.field === field) {
        if (currentSort.dir === "asc") {
            currentSort.dir = "desc";
        } else if (currentSort.dir === "desc") {
            currentSort.field = null;
            currentSort.dir = null;
        }
    } else {
        currentSort.field = field;
        currentSort.dir = "asc";
    }

    if (currentView === "audits") renderAuditList();
    if (currentView === "vendors") renderVendorList();
    if (currentView === "auditors") renderAuditorList();
    if (currentView === "capacity") renderCapacity();
    if (currentView === "closure") renderClosure();
}

function sortResults(results, field, dir) {
    if (!field || !dir) return results;

    results.sort(function (a, b) {
        var va = a._sortVals[field];
        var vb = b._sortVals[field];

        if (va === null || va === undefined || va === "" || va === "-") va = null;
        if (vb === null || vb === undefined || vb === "" || vb === "-") vb = null;

        // Nulls always last
        if (va === null && vb === null) return 0;
        if (va === null) return 1;
        if (vb === null) return -1;

        // String comparison
        if (typeof va === "string") va = va.toLowerCase();
        if (typeof vb === "string") vb = vb.toLowerCase();

        var cmp = 0;
        if (va < vb) cmp = -1;
        else if (va > vb) cmp = 1;

        return dir === "desc" ? -cmp : cmp;
    });

    return results;
}

function buildSortableHeader(columns) {
    var html = "<tr>";
    for (var i = 0; i < columns.length; i++) {
        var col = columns[i];
        if (col.sortKey) {
            var cls = "sortable";
            if (currentSort.field === col.sortKey) {
                cls += currentSort.dir === "asc" ? " sort-asc" : " sort-desc";
            }
            html += '<th class="' + cls + '" onclick="handleSort(\'' + col.sortKey + '\')">' + col.label + '</th>';
        } else {
            html += '<th>' + col.label + '</th>';
        }
    }
    html += "</tr>";
    return html;
}

/* ---------- Navigation ---------- */

function showView(view) {
    currentView = view;
    activeFilter = null;
    currentSort = { field: null, dir: null };

    var links = document.querySelectorAll(".sidebar-item");
    for (var i = 0; i < links.length; i++) {
        var dv = links[i].getAttribute("data-view");
        if (dv) {
            links[i].className = "sidebar-item" + (dv === view ? " active" : "");
        }
    }
    expandSectionForView(view);

   var views = ["dashboard", "audits", "vendors", "vendor-detail", "audit-detail", "auditors", "auditor-detail", "forecast", "risk", "capacity", "closure", "skills", "calendar"];
    for (var i = 0; i < views.length; i++) {
        var el = document.getElementById("view-" + views[i]);
        if (el) el.style.display = views[i] === view ? "block" : "none";
    }

    if (view === "dashboard") renderDashboard();
    if (view === "audits") renderAuditList();
    if (view === "vendors") renderVendorList();
    if (view === "auditors") renderAuditorList();
    if (view === "forecast") renderForecast();
    if (view === "capacity") renderCapacity();
    if (view === "closure") renderClosure();
    if (view === "skills") renderSkillsMatrix();
    if (view === "calendar") renderCalendar();
    if (view === "risk") renderRisk();
    if (view === "audit-detail") {} // rendered by showAuditDetail directly
}

/* ---------- Filter ---------- */

function filterByStatus(status) {
    if (activeFilter === status) {
        activeFilter = null;
    } else {
        activeFilter = status;
    }
    renderDashboard();
}

/* ---------- Modal System ---------- */

function openModal(title) {
    document.getElementById("modal-title").textContent = title;
    document.getElementById("modal-overlay").style.display = "flex";
}

function closeModal() {
    document.getElementById("modal-overlay").style.display = "none";
    document.getElementById("modal-body").innerHTML = "";
    modalMode = null;
    editIndex = null;
}

function closeModalOverlay(event) {
    if (event.target === document.getElementById("modal-overlay")) {
        closeModal();
    }
}

/* ---------- Form Builder Helpers ---------- */

function buildSelect(id, options, selected, onchange) {
    var onchangeAttr = onchange ? ' onchange="' + onchange + '"' : '';
    var html = '<select id="' + id + '"' + onchangeAttr + '>';
    html += '<option value="">— Select —</option>';
    for (var i = 0; i < options.length; i++) {
        var sel = options[i].toString() === (selected || "").toString() ? " selected" : "";
        html += '<option value="' + options[i] + '"' + sel + ">" + options[i] + "</option>";
    }
    html += "</select>";
    return html;
}

function buildInput(id, type, value) {
    var val = value || "";
    return '<input type="' + type + '" id="' + id + '" value="' + val + '">';
}

function buildLimitedInput(id, value, maxlength) {
    var val = value || "";
    return '<input type="text" id="' + id + '" value="' + val + '" maxlength="' + maxlength + '">';
}

function buildReadonly(id, value) {
    var val = value || "";
    return '<input type="text" id="' + id + '" value="' + val + '" readonly>';
}

function buildTextarea(id, value) {
    var val = value || "";
    return '<textarea id="' + id + '">' + val + "</textarea>";
}

function buildVendorSelect(id, selectedId) {
    var html = '<select id="' + id + '">';
    html += '<option value="">— Select Vendor —</option>';
    for (var i = 0; i < vendors.length; i++) {
        var sel = vendors[i].vendor_id === selectedId ? " selected" : "";
        html += '<option value="' + vendors[i].vendor_id + '"' + sel + ">" + vendors[i].vendor_name + "</option>";
    }
    html += "</select>";
    return html;
}

function buildAuditorSelect(id, selectedId, includeInactive) {
    var html = '<select id="' + id + '" onchange="checkAuditConflicts()">';
    html += '<option value="">— Select —</option>';
    for (var i = 0; i < auditors.length; i++) {
        var a = auditors[i];
        if (!includeInactive && a.active_status !== "Active") continue;
        var name = a.first_name + " " + a.last_name;
        var sel = a.auditor_id === selectedId ? " selected" : "";
        var suffix = a.active_status === "Inactive" ? " (Inactive)" : "";
        html += '<option value="' + a.auditor_id + '"' + sel + ">" + name + suffix + "</option>";
    }
    html += "</select>";
    return html;
}

function field(label, inputHtml) {
    return '<div class="form-field"><label>' + label + "</label>" + inputHtml + "</div>";
}

function row() {
    var fields = "";
    for (var i = 0; i < arguments.length; i++) {
        fields += arguments[i];
    }
    return '<div class="form-row">' + fields + "</div>";
}

function section(title) {
    return '<div class="form-section"><div class="form-section-title">' + title + "</div></div>";
}

/* ---------- Save Router ---------- */

function saveModal() {
    if (modalMode === "add-audit" || modalMode === "edit-audit") {
        var auditData = readAuditForm();
        var errors = validateAuditForm(auditData);
        if (errors.length > 0) { alert(errors.join("\n")); return; }
        if (modalMode === "add-audit") {
            auditData.changelog = [];
            audits.push(auditData);
        } else {
            var oldAudit = audits[editIndex];
            auditData.changelog = oldAudit.changelog ? oldAudit.changelog.slice() : [];
            var logEntries = diffAuditChanges(oldAudit, auditData);
            for (var l = 0; l < logEntries.length; l++) {
                auditData.changelog.push(logEntries[l]);
            }
            audits[editIndex] = auditData;
        }
    }

    if (modalMode === "add-vendor" || modalMode === "edit-vendor") {
        var vendorData = readVendorForm();
        var errors = validateVendorForm(vendorData);
        if (errors.length > 0) { alert(errors.join("\n")); return; }
        if (modalMode === "add-vendor") {
            vendors.push(vendorData);
        } else {
            vendors[editIndex] = vendorData;
        }
    }

    if (modalMode === "add-auditor" || modalMode === "edit-auditor") {
        var auditorData = readAuditorForm();
        var errors = validateAuditorForm(auditorData);
        if (errors.length > 0) { alert(errors.join("\n")); return; }
        if (modalMode === "add-auditor") {
            auditors.push(auditorData);
        } else {
            auditors[editIndex] = auditorData;
        }
    }

    saveData();
    closeModal();

    if (currentView === "dashboard") renderDashboard();
    if (currentView === "audits") renderAuditList();
    if (currentView === "vendors") renderVendorList();
    if (currentView === "auditors") renderAuditorList();
    if (currentView === "forecast") renderForecast();
    if (currentView === "vendor-detail") showVendorDetail(editIndex);
    if (currentView === "capacity") renderCapacity();
  
}

/* ---------- Audit Change Log ---------- */

var CHANGELOG_FIELDS = [
    { key: "vendor_id", label: "Vendor" },
    { key: "audit_type", label: "Audit Type" },
    { key: "audit_method", label: "Audit Method" },
    { key: "audit_required_by", label: "Required By" },
    { key: "date_agreed", label: "Date Agreed" },
    { key: "audit_start", label: "Audit Start" },
    { key: "audit_end", label: "Audit End" },
    { key: "assigned_auditor", label: "Assigned Auditor" },
    { key: "second_auditor", label: "Second Auditor" },
    { key: "cancelled", label: "Cancelled" },
    { key: "cancelled_reason", label: "Cancelled Reason" },
    { key: "on_hold", label: "On Hold" },
    { key: "on_hold_reason", label: "On Hold Reason" },
    { key: "rescheduled", label: "Rescheduled" },
    { key: "rescheduled_to_date", label: "Rescheduled To" },
    { key: "audit_interval", label: "Audit Interval" }
];

function diffAuditChanges(oldAudit, newAudit) {
    var entries = [];
    var now = new Date().toISOString();

    for (var i = 0; i < CHANGELOG_FIELDS.length; i++) {
        var f = CHANGELOG_FIELDS[i];
        var oldVal = oldAudit[f.key] !== undefined && oldAudit[f.key] !== null ? oldAudit[f.key].toString() : "";
        var newVal = newAudit[f.key] !== undefined && newAudit[f.key] !== null ? newAudit[f.key].toString() : "";

        // Resolve vendor_id to name for readability
        if (f.key === "vendor_id") {
            oldVal = getVendorName(oldAudit[f.key]) || oldVal;
            newVal = getVendorName(newAudit[f.key]) || newVal;
        }
        // Resolve auditor IDs to names
        if (f.key === "assigned_auditor" || f.key === "second_auditor") {
            oldVal = getAuditorName(oldAudit[f.key]) || oldVal;
            newVal = getAuditorName(newAudit[f.key]) || newVal;
        }

        if (oldVal !== newVal) {
            entries.push({
                timestamp: now,
                field: f.label,
                old_value: oldVal || "—",
                new_value: newVal || "—"
            });
        }
    }
    return entries;
}

/* ---------- Sidebar ---------- */

function initSidebar() {
    var saved = localStorage.getItem("eqa_sidebar");
    if (saved === "collapsed") {
        document.getElementById("sidebar").classList.add("collapsed");
    }
    // Expand the section containing the active view
    expandSectionForView(currentView);
}

function toggleSidebar() {
    var sb = document.getElementById("sidebar");
    sb.classList.toggle("collapsed");
    localStorage.setItem("eqa_sidebar", sb.classList.contains("collapsed") ? "collapsed" : "expanded");
}

function toggleSection(sectionName) {
    var sb = document.getElementById("sidebar");
    if (sb.classList.contains("collapsed")) return;
    var section = document.querySelector('.sidebar-section[data-section="' + sectionName + '"]');
    if (section) section.classList.toggle("collapsed-section");
}

function expandSectionForView(view) {
    var viewToSection = {
        "dashboard": "programme",
        "audits": "programme",
        "vendors": "programme",
        "vendor-detail": "programme",
        "audit-detail": "programme",
        "forecast": "planning",
        "capacity": "planning",
        "auditors": "people",
        "risk": "insights",
        "risk": "insights",
        "closure": "insights",
        "skills": "people",
        "auditor-detail": "people",
        "calendar": "people"
        
    };
    var sectionName = viewToSection[view];
    if (sectionName) {
        var section = document.querySelector('.sidebar-section[data-section="' + sectionName + '"]');
        if (section) section.classList.remove("collapsed-section");
    }
}


  /* ---------- Keyboard Shortcuts ---------- */

document.addEventListener("keydown", function (e) {
    var tag = document.activeElement ? document.activeElement.tagName.toLowerCase() : "";
    var isTyping = tag === "input" || tag === "textarea" || tag === "select";

    // Escape closes modal
    if (e.key === "Escape") {
        var overlay = document.getElementById("modal-overlay");
        if (overlay && overlay.style.display !== "none") {
            closeModal();
        }
        return;
    }

    // Arrow keys navigate year selectors (only when not typing in a field)
    if (!isTyping) {
        if (e.key === "ArrowLeft") {
            if (currentView === "dashboard") changeYear(-1);
            if (currentView === "forecast") changeForecastYear(-1);
            if (currentView === "capacity") changeCapacityYear(-1);
        }
        if (e.key === "ArrowRight") {
            if (currentView === "dashboard") changeYear(1);
            if (currentView === "forecast") changeForecastYear(1);
            if (currentView === "capacity") changeCapacityYear(1);
        }
    }
});

/* ---------- Data Quality Check ---------- */

function runDataQualityCheck() {
    var dupeIds = findDuplicateAuditIds();
    var dupeVendorAudits = findDuplicateVendorAudits();
    var similarVendors = findSimilarVendorNames();

    var totalIssues = dupeIds.length + dupeVendorAudits.length + similarVendors.length;

    var html = "";

    if (totalIssues === 0) {
        html += '<div class="dq-section">';
        html += '<p style="color: var(--badge-green-text); font-weight:600;">&#10004; No data quality issues found.</p>';
        html += '</div>';
    } else {
        html += '<div class="dq-summary">';
        html += '<strong>' + totalIssues + ' potential issue' + (totalIssues > 1 ? 's' : '') + ' found</strong>';
        html += '</div>';
    }

    // Duplicate Audit IDs
    if (dupeIds.length > 0) {
        html += '<div class="dq-section">';
        html += '<div class="dq-section-title">Duplicate Audit IDs (' + dupeIds.length + ')</div>';
        html += '<table class="dq-table"><thead><tr>';
        html += '<th>Audit ID</th><th>Copies</th><th>Vendors</th><th>Actions</th>';
        html += '</tr></thead><tbody>';

        for (var i = 0; i < dupeIds.length; i++) {
            var d = dupeIds[i];
            var vendorNames = [];
            for (var j = 0; j < d.indices.length; j++) {
                vendorNames.push(getVendorName(audits[d.indices[j]].vendor_id));
            }

            var actionBtns = '';
            for (var j = 0; j < d.indices.length; j++) {
                actionBtns += '<button class="btn-icon btn-icon-view" onclick="closeModal(); showAuditDetail(' + d.indices[j] + ')" title="View #' + (j + 1) + '">&#128065; #' + (j + 1) + '</button> ';
            }

            html += '<tr>';
            html += '<td><strong>' + d.audit_id + '</strong></td>';
            html += '<td>' + d.count + '</td>';
            html += '<td>' + vendorNames.join(', ') + '</td>';
            html += '<td>' + actionBtns + '</td>';
            html += '</tr>';
        }

        html += '</tbody></table></div>';
    }

    // Duplicate Vendor+ARB
    if (dupeVendorAudits.length > 0) {
        html += '<div class="dq-section">';
        html += '<div class="dq-section-title">Duplicate Vendor + Required By (' + dupeVendorAudits.length + ')</div>';
        html += '<table class="dq-table"><thead><tr>';
        html += '<th>Vendor</th><th>Required By</th><th>Copies</th><th>Actions</th>';
        html += '</tr></thead><tbody>';

        for (var i = 0; i < dupeVendorAudits.length; i++) {
            var d = dupeVendorAudits[i];

            var actionBtns = '';
            for (var j = 0; j < d.indices.length; j++) {
                var aId = audits[d.indices[j]].audit_id || "(no ID)";
                actionBtns += '<button class="btn-icon btn-icon-view" onclick="closeModal(); showAuditDetail(' + d.indices[j] + ')" title="View">' + aId + '</button> ';
            }

            html += '<tr>';
            html += '<td>' + d.vendor_name + '</td>';
            html += '<td>' + d.arb + '</td>';
            html += '<td>' + d.count + '</td>';
            html += '<td>' + actionBtns + '</td>';
            html += '</tr>';
        }

        html += '</tbody></table></div>';
    }

    // Similar Vendor Names
    if (similarVendors.length > 0) {
        html += '<div class="dq-section">';
        html += '<div class="dq-section-title">Similar Vendor Names (' + similarVendors.length + ')</div>';
        html += '<table class="dq-table"><thead><tr>';
        html += '<th>Vendor A</th><th>Vendor B</th><th>Actions</th>';
        html += '</tr></thead><tbody>';

        for (var i = 0; i < similarVendors.length; i++) {
            var d = similarVendors[i];
            html += '<tr>';
            html += '<td>' + d.nameA + ' (' + d.idA + ')</td>';
            html += '<td>' + d.nameB + ' (' + d.idB + ')</td>';
            html += '<td>';
            html += '<button class="btn-icon btn-icon-view" onclick="closeModal(); editVendor(' + d.indexA + ')" title="Edit A">&#9998; A</button> ';
            html += '<button class="btn-icon btn-icon-view" onclick="closeModal(); editVendor(' + d.indexB + ')" title="Edit B">&#9998; B</button>';
            html += '</td>';
            html += '</tr>';
        }

        html += '</tbody></table></div>';
    }

    document.getElementById("modal-body").innerHTML = html;
    openModal("Data Quality Check");
}