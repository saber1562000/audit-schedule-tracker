/* ============================================
   FORECAST MODULE
   Routine Audit Forecast — interval-driven
   projected demand for routine audits
   ============================================ */

var forecastYear = new Date().getFullYear().toString();

/* ---------- Main Render ---------- */

function renderForecast() {
    var savedFilters = captureForecastFilters();
    var container = document.getElementById("view-forecast");
    var allData = getForecastData(forecastYear);

    // Summary counts from unfiltered data
    var total = allData.length;
    var pickedUp = 0;
    var notActioned = 0;
    var regionCounts = {};
    for (var i = 0; i < allData.length; i++) {
        if (allData[i].status === "Picked Up") pickedUp++;
        else notActioned++;
        var r = allData[i].region || "Unknown";
        regionCounts[r] = (regionCounts[r] || 0) + 1;
    }

    var html = '';

    // Year selector
    html += '<div class="dash-year-bar">';
    html += '<button class="btn-secondary btn-sm" onclick="changeForecastYear(-1)">&larr;</button>';
    html += '<span class="dash-year-label">' + forecastYear + '</span>';
    html += '<button class="btn-secondary btn-sm" onclick="changeForecastYear(1)">&rarr;</button>';
    html += '</div>';

    // Explainer
    html += '<div class="forecast-explainer">';
    html += '<strong>Routine Audit Forecast</strong><br>';
    html += 'This view shows projected routine audit demand driven by completed audit intervals. ';
    html += 'Only active, non-disqualified vendors with a prior completed audit and numeric interval are included. ';
    html += 'Qualification, for-cause, and ad-hoc audits do not appear here as they are not interval-driven.<br><br>';
    html += '<strong>Picked Up</strong> = an audit record has been created for this vendor in ' + forecastYear + '. ';
    html += '<strong>Not Actioned</strong> = interval-driven demand with no audit record created yet.';
    html += '</div>';

    // Summary tiles
    html += '<div class="dash-row-2col">';

    html += '<div class="dash-card"><div class="dash-card-title">Forecast Summary</div>';
    html += '<div class="dash-card-tiles">';
    html += '<div class="dash-mini-tile" onclick="setForecastFilter(\'status\', \'\')" style="cursor:pointer"><div class="dash-mini-value">' + total + '</div><div class="dash-mini-label">Total</div></div>';
    html += '<div class="dash-mini-tile dash-mini-green" onclick="setForecastFilter(\'status\', \'Picked Up\')" style="cursor:pointer"><div class="dash-mini-value">' + pickedUp + '</div><div class="dash-mini-label">Picked Up</div></div>';
    html += '<div class="dash-mini-tile dash-mini-red" onclick="setForecastFilter(\'status\', \'Not Actioned\')" style="cursor:pointer"><div class="dash-mini-value">' + notActioned + '</div><div class="dash-mini-label">Not Actioned</div></div>';
    html += '</div></div>';

    html += '<div class="dash-card"><div class="dash-card-title">Regional Breakdown</div>';
    html += '<div class="dash-card-tiles">';
    var regions = ["USA", "EU", "India", "Asia", "China"];
    for (var i = 0; i < regions.length; i++) {
        html += '<div class="dash-mini-tile" onclick="setForecastFilter(\'region\', \'' + regions[i] + '\')" style="cursor:pointer"><div class="dash-mini-value">' + (regionCounts[regions[i]] || 0) + '</div><div class="dash-mini-label">' + regions[i] + '</div></div>';
    }
    html += '</div></div>';

    html += '</div>';

    // Filters
    html += '<div class="filter-bar">';
    html += '<select class="filter-select" id="forecast-filter-region" onchange="applyForecastView()">';
    html += '<option value="">All Regions</option>';
    for (var i = 0; i < regions.length; i++) {
        html += '<option value="' + regions[i] + '">' + regions[i] + '</option>';
    }
    html += '</select>';
    html += '<select class="filter-select" id="forecast-filter-type" onchange="applyForecastView()">';
    html += '<option value="">All Vendor Types</option>';
    for (var i = 0; i < OPTIONS.vendor_type.length; i++) {
        html += '<option value="' + OPTIONS.vendor_type[i] + '">' + OPTIONS.vendor_type[i] + '</option>';
    }
    html += '</select>';
    html += '<select class="filter-select" id="forecast-filter-status" onchange="applyForecastView()">';
    html += '<option value="">All Statuses</option>';
    html += '<option value="Picked Up">Picked Up</option>';
    html += '<option value="Not Actioned">Not Actioned</option>';
    html += '</select>';
    html += '<button class="btn-filter-clear" onclick="clearForecastFilters()">Clear</button>';
    html += '</div>';

    // Table
    var columns = [
        { label: "Vendor", sortKey: "vendor_name" },
        { label: "Region", sortKey: "region" },
        { label: "Vendor Type", sortKey: "vendor_type" },
        { label: "Last Audit", sortKey: "last_audit_date" },
        { label: "Interval", sortKey: "interval" },
        { label: "Projected Due", sortKey: "projected_date" },
        { label: "Status", sortKey: "status" },
        { label: "Audit ID", sortKey: "audit_id" },
        { label: "Actions", sortKey: null }
    ];

    html += '<table><thead>' + buildSortableHeader(columns) + '</thead>';
    html += '<tbody id="forecast-table-body"></tbody></table>';
    html += '<div class="table-footer" id="forecast-table-footer"></div>';

    container.innerHTML = html;
    restoreForecastFilters(savedFilters);

    var filtered = filterForecastData(allData);
    renderForecastTable(filtered, allData.length);
}

/* ---------- Table Render ---------- */

function renderForecastTable(data, totalCount) {
    var results = [];
    for (var i = 0; i < data.length; i++) {
        results.push({
            data: data[i],
            _sortVals: {
                vendor_name: data[i].vendor_name,
                region: data[i].region,
                vendor_type: data[i].vendor_type,
                last_audit_date: data[i].last_audit_date || "",
                interval: data[i].interval,
                projected_date: data[i].projected_date,
                status: data[i].status,
                audit_id: data[i].audit_id || ""
            }
        });
    }

    results = sortResults(results, currentSort.field, currentSort.dir);

    var tbody = document.getElementById("forecast-table-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    for (var i = 0; i < results.length; i++) {
        var d = results[i].data;
        var statusClass = d.status === "Picked Up" ? "badge-completed" : "badge-overdue";
        var actionHtml = d.status === "Not Actioned"
            ? '<button class="btn-primary btn-sm" onclick="createAuditFromForecast(\'' + d.vendor_id + '\', \'' + forecastYear + '\')">Create Audit</button>'
            : "-";

        var row = document.createElement("tr");
        row.innerHTML =
            "<td>" + d.vendor_name + "</td>" +
            "<td>" + (d.region || "-") + "</td>" +
            "<td>" + (d.vendor_type || "-") + "</td>" +
            "<td>" + formatDateDisplay(d.last_audit_date) + "</td>" +
            "<td>" + d.interval + " mo</td>" +
            "<td>" + formatDateDisplay(d.projected_date) + "</td>" +
            '<td><span class="badge ' + statusClass + '">' + d.status + '</span></td>' +
            "<td>" + (d.audit_id || "-") + "</td>" +
            "<td>" + actionHtml + "</td>";

        tbody.appendChild(row);
    }

    var footer = document.getElementById("forecast-table-footer");
    if (footer) footer.textContent = "Showing " + results.length + " of " + totalCount + " forecasted audits";
}

/* ---------- Forecast Data ---------- */

function getForecastData(year) {
    var results = [];

    for (var i = 0; i < vendors.length; i++) {
        var v = vendors[i];
        if (v.active_status !== "Active") continue;
        if (v.qualification_status === "Disqualified") continue;

        var latest = getLatestProjectableAudit(v.vendor_id);
        if (!latest) continue;

        var intervalMonths = parseInt(latest.audit_interval, 10);
        if (isNaN(intervalMonths) || intervalMonths <= 0) continue;

        var nextDate = new Date(latest.audit_start);
        var maxYear = new Date().getFullYear() + 5;

        for (var cycle = 0; cycle < 10; cycle++) {
            nextDate = new Date(nextDate);
            nextDate.setMonth(nextDate.getMonth() + intervalMonths);
            var projYear = nextDate.getFullYear().toString();
            if (parseInt(projYear) > maxYear) break;

            if (projYear === year) {
                var existingAudit = findAuditForVendorYear(v.vendor_id, year);
                results.push({
                    vendor_id: v.vendor_id,
                    vendor_name: v.vendor_name,
                    region: v.region || "",
                    vendor_type: v.vendor_type || "",
                    last_audit_date: latest.audit_start,
                    interval: intervalMonths,
                    projected_date: formatDate(nextDate),
                    status: existingAudit ? "Picked Up" : "Not Actioned",
                    audit_id: existingAudit ? (existingAudit.audit_id || "-") : "",
                    scheduling_status: existingAudit ? getSchedulingStatus(existingAudit) : ""
                });
                break;
            }
        }
    }

    return results;
}

function getLatestProjectableAudit(vendorId) {
    var latest = null;
    for (var i = 0; i < audits.length; i++) {
        var a = audits[i];
        if (a.vendor_id !== vendorId) continue;
        if (!a.audit_start || isYes(a.cancelled)) continue;
        if (a.audit_type === "For-cause") continue;
        if (!a.audit_interval || a.audit_interval === "N/A") continue;
        if (!latest || a.audit_start > latest.audit_start) latest = a;
    }
    return latest;
}

function findAuditForVendorYear(vendorId, year) {
    for (var i = 0; i < audits.length; i++) {
        var a = audits[i];
        if (a.vendor_id !== vendorId) continue;
        var arb = a.audit_required_by;
        if (arb && arb.substring(0, 4) === year) return a;
    }
    return null;
}

/* ---------- Filters ---------- */

function captureForecastFilters() {
    return {
        region: getFilterVal("forecast-filter-region"),
        type: getFilterVal("forecast-filter-type"),
        status: getFilterVal("forecast-filter-status")
    };
}

function restoreForecastFilters(saved) {
    setFilterVal("forecast-filter-region", saved.region);
    setFilterVal("forecast-filter-type", saved.type);
    setFilterVal("forecast-filter-status", saved.status);
}

function getFilterVal(id) {
    var el = document.getElementById(id);
    return el ? el.value : "";
}

function setFilterVal(id, val) {
    var el = document.getElementById(id);
    if (el && val) el.value = val;
}

function filterForecastData(data) {
    var region = getFilterVal("forecast-filter-region");
    var type = getFilterVal("forecast-filter-type");
    var status = getFilterVal("forecast-filter-status");

    return data.filter(function (d) {
        if (region && d.region !== region) return false;
        if (type && d.vendor_type !== type) return false;
        if (status && d.status !== status) return false;
        return true;
    });
}

function clearForecastFilters() {
    setFilterVal("forecast-filter-region", "");
    setFilterVal("forecast-filter-type", "");
    setFilterVal("forecast-filter-status", "");
    applyForecastView();
}

function applyForecastView() {
    var allData = getForecastData(forecastYear);
    var filtered = filterForecastData(allData);
    renderForecastTable(filtered, allData.length);
}

/* ---------- Year Navigation ---------- */

function changeForecastYear(delta) {
    forecastYear = (parseInt(forecastYear) + delta).toString();
    currentSort = { field: null, dir: null };
    renderForecast();
}


/* ---------- Create Audit from Forecast ---------- */

function createAuditFromForecast(vendorId, year) {
    modalMode = "add-audit";
    editIndex = null;

    var prefill = {
        audit_id: "",
        vendor_id: vendorId,
        audit_type: "Routine",
        audit_method: "",
        audit_required_by: year + "-12-31",
        date_agreed: null,
        assigned_auditor: "",
        second_auditor: "",
        audit_start: null,
        audit_end: null,
        report_issued_date: null,
        closed_date: null,
        cancelled: "No",
        cancelled_reason: "",
        cancelled_reason_other: "",
        rescheduled: "No",
        rescheduled_to_date: null,
        on_hold: "No",
        on_hold_reason: "",
        on_hold_reason_other: "",
        desktop_docs_received: "Not Applicable",
        risk_rating: "",
        audit_outcome: "",
        obs_critical: null,
        obs_major: null,
        obs_minor: null,
        audit_interval: null,
        escalation: "",
        comment: "",
        legacy_source: ""
    };

    document.getElementById("modal-body").innerHTML = buildAuditForm(prefill);
    openModal("Create Audit — " + getVendorName(vendorId));
    onAuditMethodChange();
}

function setForecastFilter(filterType, value) {
    if (filterType === "status") {
        var el = document.getElementById("forecast-filter-status");
        if (el) el.value = (el.value === value) ? "" : value;
    }
    if (filterType === "region") {
        var el = document.getElementById("forecast-filter-region");
        if (el) el.value = (el.value === value) ? "" : value;
    }
    applyForecastView();
}