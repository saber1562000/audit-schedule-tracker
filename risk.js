/* ============================================
   RISK MODULE
   Vendor Risk Heatmap — priority scoring
   ============================================ */

/* ---------- Main Render ---------- */

function renderRisk() {
    var container = document.getElementById("view-risk");
    var allScored = getAllVendorRiskScores();

    var critical = allScored.filter(function (v) { return v.band === "Critical"; });
    var elevated = allScored.filter(function (v) { return v.band === "Elevated"; });
    var monitor  = allScored.filter(function (v) { return v.band === "Monitor"; });

    var html = "";

    html += '<div class="view-header">';
    html += '<h1 class="page-title">Vendor Risk Heatmap</h1>';
    html += '</div>';

    html += '<div class="risk-explainer">';
    html += '<strong>Critical</strong> — Requires immediate attention. These vendors combine high supply or regulatory risk with an urgent scheduling gap. ';
    html += '<strong>Elevated</strong> — Should be prioritised in scheduling. Something about this vendor warrants closer attention, whether that\'s vendor type, audit history, or an approaching due date. ';
    html += '<strong>Monitor</strong> — No immediate concerns. Standard scheduling cadence is appropriate.';
    html += '</div>';

    // Summary tiles
    html += '<div class="dash-card-tiles" style="margin-bottom:24px;">';
    html += '<div class="dash-mini-tile dash-mini-red" onclick="setRiskFilter(\'Critical\')" style="cursor:pointer">';
    html += '<div class="dash-mini-value">' + critical.length + '</div><div class="dash-mini-label">Critical</div></div>';
    html += '<div class="dash-mini-tile dash-mini-yellow" onclick="setRiskFilter(\'Elevated\')" style="cursor:pointer">';
    html += '<div class="dash-mini-value">' + elevated.length + '</div><div class="dash-mini-label">Elevated</div></div>';
    html += '<div class="dash-mini-tile dash-mini-green" onclick="setRiskFilter(\'Monitor\')" style="cursor:pointer">';
    html += '<div class="dash-mini-value">' + monitor.length + '</div><div class="dash-mini-label">Monitor</div></div>';
    html += '<div class="dash-mini-tile" onclick="setRiskFilter(\'\')" style="cursor:pointer">';
    html += '<div class="dash-mini-value">' + allScored.length + '</div><div class="dash-mini-label">Total Scored</div></div>';
    html += '</div>';

    // Filters
    html += '<div class="filter-bar">';
    html += '<select class="filter-select" id="risk-filter-band" onchange="applyRiskFilters()">';
    html += '<option value="">All Bands</option>';
    html += '<option value="Critical">Critical</option>';
    html += '<option value="Elevated">Elevated</option>';
    html += '<option value="Monitor">Monitor</option>';
    html += '</select>';
    html += '<select class="filter-select" id="risk-filter-region" onchange="applyRiskFilters()">';
    html += '<option value="">All Regions</option>';
    var regions = ["USA", "EU", "India", "Asia", "China"];
    for (var i = 0; i < regions.length; i++) {
        html += '<option value="' + regions[i] + '">' + regions[i] + '</option>';
    }
    html += '</select>';
    html += '<select class="filter-select" id="risk-filter-type" onchange="applyRiskFilters()">';
    html += '<option value="">All Vendor Types</option>';
    for (var i = 0; i < OPTIONS.vendor_type.length; i++) {
        html += '<option value="' + OPTIONS.vendor_type[i] + '">' + OPTIONS.vendor_type[i] + '</option>';
    }
    html += '</select>';
    html += '<button class="btn-filter-clear" onclick="clearRiskFilters()">Clear</button>';
    html += '</div>';

    // Table
    var columns = [
        { label: "Score", sortKey: "score" },
        { label: "Band", sortKey: "band" },
        { label: "Vendor", sortKey: "vendor_name" },
        { label: "Region", sortKey: "region" },
        { label: "Type", sortKey: "vendor_type" },
        { label: "Last Audit", sortKey: "lastAuditDate" },
        { label: "Outcome", sortKey: "lastOutcome" },
        { label: "Risk Rating", sortKey: "riskRating" },
        { label: "Interval", sortKey: "interval" },
        { label: "Next Due", sortKey: "nextDue" },
        { label: "Why", sortKey: null }
    ];

    html += '<table><thead id="risk-table-head">' + buildSortableHeader(columns) + '</thead>';
    html += '<tbody id="risk-table-body"></tbody></table>';
    html += '<div class="table-footer" id="risk-table-footer"></div>';

    container.innerHTML = html;
    applyRiskFilters();
}

/* ---------- Table Render ---------- */

function renderRiskTable(data, totalCount) {
    var results = [];
    for (var i = 0; i < data.length; i++) {
        results.push({
            data: data[i],
            _sortVals: {
                score: data[i].score,
                band: data[i].band,
                vendor_name: data[i].vendor_name,
                region: data[i].region,
                vendor_type: data[i].vendor_type,
                lastAuditDate: data[i].lastAuditDate,
                lastOutcome: data[i].lastOutcome,
                riskRating: data[i].riskRating,
                interval: data[i].interval,
                nextDue: data[i].nextDue
            }
        });
    }

    results = sortResults(results, currentSort.field, currentSort.dir);

    var tbody = document.getElementById("risk-table-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    for (var i = 0; i < results.length; i++) {
        var d = results[i].data;
        var b = d.breakdown;

        var breakdownHtml = buildRiskNarrative(d);

        var row = document.createElement("tr");
        row.style.cursor = "pointer";
        var vendorIdx = (function(vid) {
            for (var j = 0; j < vendors.length; j++) {
                if (vendors[j].vendor_id === vid) return j;
            }
            return -1;
        })(d.vendor_id);
        if (vendorIdx >= 0) {
            row.setAttribute("onclick", "editVendor(" + vendorIdx + ")");
        }
        row.innerHTML =
            '<td><strong class="' + d.bandClass + '-score">' + d.score + '</strong></td>' +
            '<td><span class="badge ' + d.bandClass + '">' + d.band + '</span></td>' +
            "<td>" + d.vendor_name + "</td>" +
            "<td>" + (d.region || "-") + "</td>" +
            '<td><span class="' + getVendorTypeBadgeClass(d.vendor_type) + '">' + (d.vendor_type || "-") + '</span></td>' +
            "<td>" + formatDateDisplay(d.lastAuditDate) + "</td>" +
            "<td>" + d.lastOutcome + "</td>" +
            "<td>" + d.riskRating + "</td>" +
            "<td>" + d.interval + "</td>" +
            "<td>" + formatDateDisplay(d.nextDue) + "</td>" +
            "<td>" + breakdownHtml + "</td>";

        tbody.appendChild(row);
    }

    var footer = document.getElementById("risk-table-footer");
    if (footer) {
        footer.textContent = "Showing " + results.length + " of " + totalCount + " scored vendors";
    }

    var thead = document.getElementById("risk-table-head");
    if (thead) {
        var columns = [
            { label: "Score", sortKey: "score" },
            { label: "Band", sortKey: "band" },
            { label: "Vendor", sortKey: "vendor_name" },
            { label: "Region", sortKey: "region" },
            { label: "Type", sortKey: "vendor_type" },
            { label: "Last Audit", sortKey: "lastAuditDate" },
            { label: "Outcome", sortKey: "lastOutcome" },
            { label: "Risk Rating", sortKey: "riskRating" },
            { label: "Interval", sortKey: "interval" },
            { label: "Next Due", sortKey: "nextDue" },
            { label: "Why", sortKey: null }
        ];
        thead.innerHTML = buildSortableHeader(columns);
    }
}

/* ---------- Risk Narrative ---------- */

function buildRiskNarrative(d) {
    var parts = [];
    var b = d.breakdown;

    // Interval overrun / proximity — the most actionable finding
    if (b.overrun === 3 && b.proximity === 3) {
        // Work out how overdue
        var lastAudit = getLastCompletedAudit(d.vendor_id);
        if (lastAudit && lastAudit.audit_start && !isNaN(parseInt(lastAudit.audit_interval))) {
            var nextDue = new Date(lastAudit.audit_start);
            nextDue.setMonth(nextDue.getMonth() + parseInt(lastAudit.audit_interval));
            var now = new Date();
            if (now > nextDue) {
                var monthsOverdue = Math.round((now - nextDue) / (1000 * 60 * 60 * 24 * 30.44));
                if (monthsOverdue < 1) {
                    parts.push("Next audit is due this month, interval of " + d.interval + " has expired.");
                } else if (monthsOverdue === 1) {
                    parts.push("Next audit is 1 month overdue, interval of " + d.interval + " expired " + formatDateDisplay(nextDue) + ".");
                } else {
                    parts.push("Next audit is " + monthsOverdue + " months overdue, interval of " + d.interval + " expired " + formatDateDisplay(nextDue) + ".");
                }
            } else {
                parts.push("Next audit is due within 3 months (" + formatDateDisplay(nextDue) + "), interval of " + d.interval + ".");
            }
        } else {
            parts.push("Audit is overdue based on the assigned interval of " + d.interval + ".");
        }
    } else if (b.proximity === 2) {
        parts.push("Next audit due within 6 months (" + formatDateDisplay(d.nextDue) + ").");
    } else if (b.overrun === 2) {
        parts.push("Approaching the end of the current audit interval, less than 20% of the window remaining.");
    }

    // Outcome
    if (b.outcome === 3) {
        parts.push("Last audit outcome was Unacceptable, follow-up scheduling is a priority.");
    } else if (b.outcome === 2) {
        parts.push("Last audit outcome was Conditional.");
    }

    // Risk rating
    if (b.riskRating === 3) {
        parts.push("Carries a High risk rating from the last audit.");
    } else if (b.riskRating === 2) {
        parts.push("Carries a Medium risk rating from the last audit.");
    }

    // Vendor type — only call it out if it's contributing meaningfully
    if (b.type === 3) {
        parts.push("As a " + d.vendor_type + ", supply or regulatory risk from an audit gap is significant.");
    } else if (b.type === 2) {
        parts.push("As a " + d.vendor_type + ", product contact risk means audit coverage should be maintained.");
    }

    // No meaningful flags — explain why it's in Monitor
    if (parts.length === 0) {
        parts.push("No immediate concerns. Last audit outcome and risk rating are acceptable and the next due date is not imminent.");
    }

    return '<span class="risk-narrative">' + parts.join(" ") + '</span>';
}

/* ---------- Filters ---------- */

function applyRiskFilters() {
    var allScored = getAllVendorRiskScores();
    var band   = document.getElementById("risk-filter-band")   ? document.getElementById("risk-filter-band").value   : "";
    var region = document.getElementById("risk-filter-region") ? document.getElementById("risk-filter-region").value : "";
    var type   = document.getElementById("risk-filter-type")   ? document.getElementById("risk-filter-type").value   : "";

    var filtered = allScored.filter(function (v) {
        if (band   && v.band        !== band)   return false;
        if (region && v.region      !== region) return false;
        if (type   && v.vendor_type !== type)   return false;
        return true;
    });

    renderRiskTable(filtered, allScored.length);
}

function setRiskFilter(band) {
    var el = document.getElementById("risk-filter-band");
    if (el) el.value = (el.value === band) ? "" : band;
    applyRiskFilters();
}

function clearRiskFilters() {
    var band   = document.getElementById("risk-filter-band");
    var region = document.getElementById("risk-filter-region");
    var type   = document.getElementById("risk-filter-type");
    if (band)   band.value   = "";
    if (region) region.value = "";
    if (type)   type.value   = "";
    applyRiskFilters();
}