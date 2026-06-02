/* ============================================
   CAPACITY MODULE
   CU-based workload tracking per auditor
   ============================================ */

var capacityYear = new Date().getFullYear().toString();
var capacityConfigVisible = false;
var capacityRegion = "All";

/* ---------- Main Render ---------- */

function renderCapacity() {
    var container = document.getElementById("view-capacity");
    var year = capacityYear;

    // Get relevant auditors: active ones + inactive with load
    var relevantAuditors = [];
    for (var i = 0; i < auditors.length; i++) {
        if (auditors[i].active_status === "Active") {
            relevantAuditors.push(auditors[i]);
        }
    }

    // Build auditor data
    var auditorData = [];

   for (var i = 0; i < relevantAuditors.length; i++) {
        var aud = relevantAuditors[i];
        var ceiling = getAuditorCeiling(aud);
        var annualLoad = getAuditorAnnualLoad(aud.auditor_id, year);
        var annualCount = getAuditorAnnualAuditCount(aud.auditor_id, year);
        var utilPct = ceiling > 0 ? annualLoad / ceiling : 0;
        var status = getCapacityStatus(utilPct);

        var peakMonth = getAuditorPeakMonth(aud.auditor_id, year);
        var overloadedMonths = getAuditorOverloadedMonths(aud.auditor_id, year);

        var monthly = [];
        for (var m = 0; m < 12; m++) {
            monthly.push({
                cu: getAuditorMonthlyLoad(aud.auditor_id, year, m),
                count: getAuditorMonthlyAuditCount(aud.auditor_id, year, m)
            });
        }

        auditorData.push({
            auditor: aud,
            ceiling: ceiling,
            monthlyBudget: ceiling / 12,
            annualLoad: annualLoad,
            annualCount: annualCount,
            utilPct: utilPct,
            status: status,
            monthly: monthly,
            peakMonth: peakMonth,
            overloadedMonths: overloadedMonths
        });
    }

    var filteredData = [];
    for (var i = 0; i < auditorData.length; i++) {
        if (capacityRegion === "All" || auditorData[i].auditor.region === capacityRegion) {
            filteredData.push(auditorData[i]);
        }
    }

    var teamCapacity = 0;
    var teamLoad = 0;
    var overloadedCount = 0;
    var nearCapCount = 0;

    for (var i = 0; i < filteredData.length; i++) {
        var d = filteredData[i];
        teamCapacity += d.ceiling;
        teamLoad += d.annualLoad;
        if (d.status === "Overloaded" || d.status === "No Remaining Capacity") overloadedCount++;
        else if (d.status === "Near Capacity") nearCapCount++;
    }

    var teamRemaining = teamCapacity - teamLoad;
    var teamUtil = teamCapacity > 0 ? teamLoad / teamCapacity : 0;

    // Projected workload
    var projections = getProjectionsForYear(year);
    var projCount = projections.length;

    var html = '';

    // Year selector + config toggle
    html += '<div class="dash-year-bar">';
    html += '<button class="btn-secondary btn-sm" onclick="changeCapacityYear(-1)">&larr;</button>';
    html += '<span class="dash-year-label">' + year + '</span>';
    html += '<button class="btn-secondary btn-sm" onclick="changeCapacityYear(1)">&rarr;</button>';
    html += '<button class="dash-collapse-toggle" onclick="toggleCapacityConfig()" title="CU Configuration">&#9881;</button>';
    html += '</div>';

    // Config panel
    html += buildCapacityConfigPanel();

    // Region tabs
    var regionTabs = ["All", "USA", "EU", "India", "Asia"];
    html += '<div class="cap-region-tabs">';
    for (var i = 0; i < regionTabs.length; i++) {
        var activeClass = capacityRegion === regionTabs[i] ? " cap-tab-active" : "";
        html += '<button class="cap-tab' + activeClass + '" onclick="setCapacityRegion(\'' + regionTabs[i] + '\')">' + regionTabs[i] + '</button>';
    }
    html += '</div>';

    // Team summary
    html += '<div class="dash-row-2col">';

    html += '<div class="dash-card"><div class="dash-card-title">Team Workload Summary</div>';
    html += '<div class="dash-card-tiles">';
    var teamAuditCount = 0;
    for (var i = 0; i < filteredData.length; i++) {
        teamAuditCount += filteredData[i].annualCount;
    }
    html += dashMini("Audits Assigned", teamAuditCount, "");
    html += dashMini("Utilisation", Math.round(teamUtil * 100) + "%", teamUtil >= 1 ? "red" : teamUtil >= 0.85 ? "yellow" : "");
    html += dashMini("Remaining", Math.round((1 - teamUtil) * 100) + "%", teamUtil >= 1 ? "red" : "green");
    html += '</div></div>';

    html += '</div>';

// Regional comparison
    var regionList = ["USA", "EU", "India", "Asia", "China"];
    var regionData = [];
    for (var i = 0; i < regionList.length; i++) {
        var rd = getRegionCapacityData(regionList[i], year);
        if (rd.auditorCount > 0) regionData.push(rd);
    }

    html += '<div class="dash-card">';
    html += '<div class="dash-card-title">Regional Comparison</div>';
    html += '<table class="cap-table"><thead><tr>';
    html += '<th>Region</th><th>Auditors</th><th>Assigned</th><th>Target</th><th>Spare Capacity</th><th>Utilisation</th><th>Status</th><th>Support</th>';
    html += '</tr></thead><tbody>';

    for (var i = 0; i < regionData.length; i++) {
        var rd = regionData[i];
        var statusClass = getCapacityStatusClass(rd.status);
        var supportText = "";
        var supportClass = "";

        if (rd.spareAudits > 5) {
            supportText = "Can support (~" + rd.spareAudits + " audits)";
            supportClass = "cap-support-available";
        } else if (rd.spareAudits > 0) {
            supportText = "Limited (~" + rd.spareAudits + " audits)";
            supportClass = "cap-support-limited";
        } else {
            supportText = "Needs support";
            supportClass = "cap-support-needs";
        }

        html += '<tr>';
        html += '<td><strong>' + rd.region + '</strong></td>';
        html += '<td>' + rd.auditorCount + '</td>';
        html += '<td>' + rd.assignedAudits + '</td>';
        html += '<td>' + rd.auditTarget + '</td>';
        html += '<td>' + (rd.spareAudits > 0 ? rd.spareAudits : rd.spareAudits) + ' audits</td>';
        html += '<td>' + Math.round(rd.utilPct * 100) + '%</td>';
        html += '<td><span class="' + statusClass + '">' + rd.status + '</span></td>';
        html += '<td><span class="' + supportClass + '">' + supportText + '</span></td>';
        html += '</tr>';
    }

    html += '</tbody></table>';
    html += '</div>';

        // Forward demand preview — filtered by region
    var filteredProjections = [];
    for (var i = 0; i < projections.length; i++) {
        if (capacityRegion === "All" || projections[i].region === capacityRegion) {
            filteredProjections.push(projections[i]);
        }
    }
    var filteredProjCount = filteredProjections.length;

    if (filteredProjCount > 0 || teamAuditCount > 0) {
        var fwdTeamData = getRegionCapacityData(capacityRegion, year);
        var fwdTarget = fwdTeamData.auditTarget;
        var fwdAssigned = fwdTeamData.assignedAudits;
        var fwdTotalDemand = fwdAssigned + filteredProjCount;
        var fwdShortfall = fwdTotalDemand - fwdTarget;
        var regionLabel = capacityRegion === "All" ? "All regions" : capacityRegion;

        html += '<div class="dash-card">';
        html += '<div class="dash-card-title">Forward Demand Preview — ' + regionLabel + '</div>';
        html += '<div class="dash-card-tiles">';
        html += dashMini("Assigned", fwdAssigned, "");
        if (filteredProjCount > 0) {
            html += dashMini("Projected", filteredProjCount, "blue");
        }
        html += dashMini("Total Demand", fwdTotalDemand, "");
        html += dashMini("Team Target", fwdTarget, "");
        if (fwdShortfall > 0) {
            html += dashMini("Shortfall", fwdShortfall + " audits", "red");
        } else {
            html += dashMini("Headroom", Math.abs(fwdShortfall) + " audits", "green");
        }
        html += '</div>';
        html += '<div class="forecast-explainer" style="margin-top:8px;">';
        html += 'Total demand (' + fwdTotalDemand + ' audits) vs ' + regionLabel + ' target (' + fwdTarget + ' audits based on ' + fwdTeamData.auditorCount + ' auditors × ' + cuConfig.audit_target + ' target). ';
        if (fwdShortfall > 0) {
            html += regionLabel + ' is approximately ' + fwdShortfall + ' audits short. Consider cross-region support or additional headcount.';
        } else {
            html += regionLabel + ' capacity covers projected demand with approximately ' + Math.abs(fwdShortfall) + ' audits of headroom.';
        }
        html += '</div></div>';
    }

    // Per-auditor table
    html += '<div class="dash-card">';
    html += '<div class="dash-card-title">Per-Auditor Capacity</div>';
    html += '<div class="cap-table-wrapper">';
    html += '<table class="cap-table"><thead><tr>';
    html += '<th>Auditor</th><th>Audits</th><th>Target</th><th>Utilisation</th><th>Prior Yr</th><th>Status</th>';
    var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    for (var m = 0; m < 12; m++) {
        html += '<th class="cap-month-header">' + monthNames[m] + '</th>';
    }
    html += '</tr></thead><tbody>';

    for (var i = 0; i < filteredData.length; i++) {
        var d = filteredData[i];
        var statusClass = getCapacityStatusClass(d.status);

        html += '<tr>';
       var priorYear = (parseInt(year) - 1).toString();
        var priorLoad = getAuditorAnnualLoad(d.auditor.auditor_id, priorYear);
        var priorUtil = d.ceiling > 0 ? priorLoad / d.ceiling : 0;
        var target = cuConfig.audit_target || 30;
        var trendArrow = "";
        if (d.utilPct > priorUtil + 0.05) trendArrow = " \u2191";
        else if (d.utilPct < priorUtil - 0.05) trendArrow = " \u2193";

        html += '<td class="cap-auditor-name">' + d.auditor.first_name + ' ' + d.auditor.last_name + '</td>';
        html += '<td>' + d.annualCount + ' / ' + target + '</td>';
        html += '<td>' + target + '</td>';
        html += '<td>' + Math.round(d.utilPct * 100) + '%</td>';
        html += '<td>' + Math.round(priorUtil * 100) + '%' + trendArrow + '</td>';
        html += '<td><span class="' + statusClass + '">' + d.status + '</span></td>';

        for (var m = 0; m < 12; m++) {
            var mLoad = d.monthly[m].cu;
            var mCount = d.monthly[m].count;
            var mBudget = d.monthlyBudget;
            var mUtil = mBudget > 0 ? mLoad / mBudget : 0;
            var mClass = getMonthlyHeatClass(mUtil);

            html += '<td class="cap-month-cell ' + mClass + '">';
            html += '<div class="cap-month-cu">' + mCount + '</div>';
            html += '<div class="cap-month-pct">' + Math.round(mUtil * 100) + '%</div>';
            html += '</td>';
        }

        html += '</tr>';
    }

    // Team total row
    var priorYearTeam = (parseInt(year) - 1).toString();
    var teamPriorLoad = 0;
    for (var i = 0; i < filteredData.length; i++) {
        teamPriorLoad += getAuditorAnnualLoad(filteredData[i].auditor.auditor_id, priorYearTeam);
    }
    var teamPriorUtil = teamCapacity > 0 ? teamPriorLoad / teamCapacity : 0;
    var teamTarget = filteredData.length * (cuConfig.audit_target || 30);

    html += '<td class="cap-auditor-name"><strong>TEAM TOTAL</strong></td>';
    html += '<td><strong>' + teamAuditCount + '</strong></td>';
    html += '<td><strong>' + teamTarget + '</strong></td>';
    html += '<td><strong>' + Math.round(teamUtil * 100) + '%</strong></td>';
    html += '<td><strong>' + Math.round(teamPriorUtil * 100) + '%</strong></td>';
    html += '<td></td>';

    var teamMonthlyBudget = teamCapacity / 12;
    for (var m = 0; m < 12; m++) {
        var teamMonthLoad = 0;
        var teamMonthCount = 0;
        for (var i = 0; i < filteredData.length; i++) {
            teamMonthLoad += filteredData[i].monthly[m].cu;
            teamMonthCount += filteredData[i].monthly[m].count;
        }
        var teamMUtil = teamMonthlyBudget > 0 ? teamMonthLoad / teamMonthlyBudget : 0;
        var tmClass = getMonthlyHeatClass(teamMUtil);

        html += '<td class="cap-month-cell ' + tmClass + '">';
        html += '<div class="cap-month-cu">' + teamMonthCount + '</div>';
        html += '<div class="cap-month-pct">' + Math.round(teamMUtil * 100) + '%</div>';
        html += '</td>';
    }

    html += '</tr>';
    html += '</tbody></table>';
    html += '</div></div>';

   // Workload distribution
    html += '<div class="dash-card">';
    html += '<div class="dash-card-title">Workload Distribution</div>';
    html += '<table class="cap-table"><thead><tr>';
    html += '<th>Auditor</th><th>Assigned</th><th>Peak Month</th><th>Months Over Budget</th><th>Assessment</th>';
    html += '</tr></thead><tbody>';

    for (var i = 0; i < filteredData.length; i++) {
        var d = filteredData[i];
        var flag = getWorkloadFlag(d);

        var peakText = d.peakMonth.month + " (" + d.peakMonth.count + " audits)";
        var overMonthText = d.overloadedMonths + " of 12";

        html += '<tr>';
        html += '<td class="cap-auditor-name">' + d.auditor.first_name + ' ' + d.auditor.last_name + '</td>';
        html += '<td>' + d.annualCount + '</td>';
        html += '<td>' + peakText + '</td>';
        html += '<td>' + overMonthText + '</td>';
        html += '<td><span class="' + flag.cls + '">' + flag.label + '</span></td>';
        html += '</tr>';
    }

    html += '</tbody></table>';
    html += '</div>';

    // Regional fairness
    var fairnessRegion = capacityRegion === "All" ? "All" : capacityRegion;
    var fairness = getRegionFairness(fairnessRegion, year);

    if (fairness && fairness.auditors.length > 1) {
        var balanceClass = "cap-ok";
        if (fairness.balance === "Uneven") balanceClass = "cap-near";
        if (fairness.balance === "Poorly Distributed") balanceClass = "cap-overloaded";

        html += '<div class="dash-card">';
        html += '<div class="dash-card-title">Distribution Balance — ' + (fairnessRegion === "All" ? "All Regions" : fairnessRegion) + '</div>';
        html += '<div class="dash-card-tiles">';
        html += dashMini("Lowest", fairness.min + " audits", "");
        html += dashMini("Average", fairness.avg + " audits", "");
        html += dashMini("Highest", fairness.max + " audits", "");
        html += dashMini("Spread", fairness.spread + " audits", fairness.spread > 10 ? "red" : fairness.spread > 5 ? "yellow" : "");
        html += dashMini("Balance", fairness.balance, "");
        html += '</div>';
        html += '<div class="forecast-explainer" style="margin-top:8px;">';

        if (fairness.balance === "Balanced") {
            html += 'Audit assignments are reasonably distributed across the ' + (fairnessRegion === "All" ? "team" : fairnessRegion + " team") + '.';
        } else if (fairness.balance === "Uneven") {
            html += 'There is a notable gap between the lightest and heaviest loaded auditors. Consider rebalancing assignments to reduce the spread.';
        } else {
            html += 'Assignments are significantly uneven. The heaviest loaded auditor has ' + fairness.max + ' audits while the lightest has ' + fairness.min + '. This scheduling pattern should be reviewed.';
        }

        html += '</div></div>';
    }

    // Capacity alerts
    var flagged = filteredData.filter(function (d) {
        return d.status !== "OK";
    });

    if (flagged.length > 0) {
        html += '<div class="dash-card">';
        html += '<div class="dash-card-title">Capacity Alerts</div>';
        html += '<table><thead><tr>';
        html += '<th>Auditor</th><th>Audits</th><th>Utilisation</th><th>Status</th><th>Recommended Action</th>';
        html += '</tr></thead><tbody>';

        for (var i = 0; i < flagged.length; i++) {
            var d = flagged[i];
            var action = "";
            if (d.status === "Overloaded") action = "Reassign audits to reduce below ceiling";
            else if (d.status === "No Remaining Capacity") action = "No further assignments recommended";
            else if (d.status === "Near Capacity") action = "Monitor \u2014 limited remaining capacity";

            html += '<tr>';
            html += '<td>' + d.auditor.first_name + ' ' + d.auditor.last_name + '</td>';
            html += '<td>' + d.annualCount + '</td>';
            html += '<td>' + Math.round(d.utilPct * 100) + '%</td>';
            html += '<td><span class="' + getCapacityStatusClass(d.status) + '">' + d.status + '</span></td>';
            html += '<td>' + action + '</td>';
            html += '</tr>';
        }

        html += '</tbody></table>';
        html += '</div>';
    }

    container.innerHTML = html;
}

/* ---------- Monthly Heatmap ---------- */

function getMonthlyHeatClass(utilPct) {
    if (utilPct > 1.25) return "cap-heat-critical";
    if (utilPct >= 1) return "cap-heat-over";
    if (utilPct >= 0.85) return "cap-heat-near";
    if (utilPct > 0) return "cap-heat-ok";
    return "cap-heat-empty";
}

/* ---------- Config Panel ---------- */

function buildCapacityConfigPanel() {
    var html = '<div id="capacity-config-panel" class="cap-config-panel" style="display:none;">';
    html += '<div class="dash-card">';
    html += '<div class="dash-card-title" style="cursor:default;">CU Configuration</div>';

    html += '<div class="form-row">';
    html += '<div class="form-field"><label>Desktop Audit CU</label>';
    html += '<input type="number" id="cfg-cu-desktop" value="' + cuConfig.cu_desktop + '" step="0.5" min="0"></div>';
    html += '<div class="form-field"><label>Virtual Audit CU</label>';
    html += '<input type="number" id="cfg-cu-virtual" value="' + cuConfig.cu_virtual + '" step="0.5" min="0"></div>';
    html += '<div class="form-field"><label>Onsite Audit CU</label>';
    html += '<input type="number" id="cfg-cu-onsite" value="' + cuConfig.cu_onsite + '" step="0.5" min="0"></div>';
    html += '</div>';

    html += '<div class="form-row">';
    html += '<div class="form-field"><label>Travel CU (per onsite)</label>';
    html += '<input type="number" id="cfg-cu-travel" value="' + cuConfig.cu_travel + '" step="0.5" min="0"></div>';
    html += '<div class="form-field"><label>Co-Auditor Fraction</label>';
    html += '<input type="number" id="cfg-cu-cofrac" value="' + cuConfig.co_auditor_fraction + '" step="0.05" min="0" max="1"></div>';
    html += '<div class="form-field"><label>Default Annual Ceiling</label>';
    html += '<input type="number" id="cfg-cu-ceiling" value="' + cuConfig.default_annual_ceiling + '" step="1" min="1"></div>';
    html += '<div class="form-field"><label>Audit Target (per auditor/yr)</label>';
    html += '<input type="number" id="cfg-cu-target" value="' + cuConfig.audit_target + '" step="1" min="1"></div>';
    html += '</div>';

    html += '<div style="margin-top:12px;">';
    html += '<button class="btn-primary btn-sm" onclick="saveCapacityConfig()">Save Configuration</button>';
    html += '<button class="btn-secondary btn-sm" onclick="toggleCapacityConfig()" style="margin-left:8px;">Close</button>';
    html += '</div>';

    html += '</div></div>';
    return html;
}

function toggleCapacityConfig() {
    var panel = document.getElementById("capacity-config-panel");
    if (!panel) return;
    capacityConfigVisible = !capacityConfigVisible;
    panel.style.display = capacityConfigVisible ? "block" : "none";
}

function saveCapacityConfig() {
    cuConfig.cu_desktop = parseFloat(document.getElementById("cfg-cu-desktop").value) || 1;
    cuConfig.cu_virtual = parseFloat(document.getElementById("cfg-cu-virtual").value) || 2;
    cuConfig.cu_onsite = parseFloat(document.getElementById("cfg-cu-onsite").value) || 3;
    cuConfig.cu_travel = parseFloat(document.getElementById("cfg-cu-travel").value) || 1;
    cuConfig.co_auditor_fraction = parseFloat(document.getElementById("cfg-cu-cofrac").value) || 0.75;
    cuConfig.default_annual_ceiling = parseFloat(document.getElementById("cfg-cu-ceiling").value) || 96;
    cuConfig.audit_target = parseFloat(document.getElementById("cfg-cu-target").value) || 30;

    saveData();
    toggleCapacityConfig();
    renderCapacity();
}

/* ---------- Year Navigation ---------- */

function changeCapacityYear(delta) {
    capacityYear = (parseInt(capacityYear) + delta).toString();
    renderCapacity();
}

function setCapacityRegion(region) {
    capacityRegion = region;
    renderCapacity();
}