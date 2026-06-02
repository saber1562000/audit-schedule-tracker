/* ============================================
   BUSINESS RULES & HELPERS
   Pure logic — no rendering, no DOM access
   ============================================ */

function isYes(val) {
    return val && val.toString().toLowerCase() === "yes";
}

function getSchedulingStatus(audit) {
    var now = new Date();
    var arb = audit.audit_required_by ? new Date(audit.audit_required_by) : null;
    var agreed = audit.date_agreed ? new Date(audit.date_agreed) : null;

    if (isYes(audit.cancelled))                          return "Cancelled";
    if (audit.audit_end)                                 return "Scheduled - Complete";
    if (isYes(audit.on_hold))                            return "On Hold";
    if (isYes(audit.rescheduled))                        return "Rescheduled";
    if (agreed && agreed < now && !audit.audit_start)     return "Scheduled - Overdue";
    if (agreed)                                          return "Scheduled - Upcoming";
    if (arb && arb < now && !agreed)                     return "Unscheduled - Overdue";
    if (arb && arb.getFullYear() === now.getFullYear())  return "Unscheduled - Pending";
    if (arb && arb.getFullYear() === now.getFullYear() + 1) return "Due Next Year";
    if (!audit.audit_type)                               return "Awaiting Requirements";
    return "Future";
}

function getAuditStatus(audit) {
    if (isYes(audit.cancelled))       return "Cancelled";
    if (audit.closed_date)            return "Closed";
    if (audit.report_issued_date)     return "Report Issued";
    if (audit.audit_end)              return "Audit Completed";
    if (audit.audit_start)            return "Audit In Progress";
    if (audit.date_agreed)            return "Confirmed (Date Agreed)";
    if (isYes(audit.on_hold))         return "On Hold";
    if (isYes(audit.rescheduled))     return "Rescheduled";
    return "Pending Scheduling";
}

function getReportDueBy(audit) {
    if (!audit.audit_end) return "";
    var d = new Date(audit.audit_end);
    d.setDate(d.getDate() + 45);
    return formatDate(d);
}

function getNextAuditDate(audit) {
    if (!audit.audit_start || !audit.audit_interval) return "";
    if (audit.audit_interval === "N/A") return "N/A";
    var d = new Date(audit.audit_start);
    d.setMonth(d.getMonth() + audit.audit_interval);
    return formatDate(d);
}

/* ---------- Vendor Lookups ---------- */

function getVendor(vendorId) {
    for (var i = 0; i < vendors.length; i++) {
        if (vendors[i].vendor_id === vendorId) return vendors[i];
    }
    return null;
}

function getVendorField(audit, field) {
    var v = getVendor(audit.vendor_id);
    return v ? (v[field] || "") : "";
}

function getVendorName(vendorId) {
    var v = getVendor(vendorId);
    return v ? v.vendor_name : "";
}

/* ---------- Vendor Computed Fields ---------- */

function getVendorAudits(vendorId) {
    var result = [];
    for (var i = 0; i < audits.length; i++) {
        if (audits[i].vendor_id === vendorId) result.push(audits[i]);
    }
    result.sort(function (a, b) {
        var da = a.audit_required_by || "";
        var db = b.audit_required_by || "";
        return db.localeCompare(da);
    });
    return result;
}

function getLastCompletedAudit(vendorId) {
    var va = getVendorAudits(vendorId);
    for (var i = 0; i < va.length; i++) {
        if (va[i].audit_end && !isYes(va[i].cancelled)) return va[i];
    }
    return null;
}

function getVendorLastAuditDate(vendorId) {
    var a = getLastCompletedAudit(vendorId);
    return a ? formatDateDisplay(a.audit_end) : "-";
}

function getVendorLastOutcome(vendorId) {
    var a = getLastCompletedAudit(vendorId);
    return a ? (a.audit_outcome || "-") : "-";
}

function getVendorCurrentRisk(vendorId) {
    var a = getLastCompletedAudit(vendorId);
    return a ? (a.risk_rating || "-") : "-";
}

function getVendorCurrentInterval(vendorId) {
    var a = getLastCompletedAudit(vendorId);
    if (!a || !a.audit_interval) return "-";
    return a.audit_interval === "N/A" ? "N/A" : a.audit_interval + " months";
}

function getVendorNextAuditDue(vendorId) {
    var a = getLastCompletedAudit(vendorId);
    if (!a) return "-";
    var nad = getNextAuditDate(a);
    return nad || "-";
}

/* ---------- Auditor Lookups ---------- */

function getAuditorName(auditorId) {
    for (var i = 0; i < auditors.length; i++) {
        if (auditors[i].auditor_id === auditorId) {
            return auditors[i].first_name + " " + auditors[i].last_name;
        }
    }
    return auditorId || "";
}

function getActiveAuditors() {
    var result = [];
    for (var i = 0; i < auditors.length; i++) {
        if (auditors[i].active_status === "Active") result.push(auditors[i]);
    }
    return result;
}

/* ---------- Counting ---------- */

function countBySchedulingStatus(data, status) {
    var count = 0;
    for (var i = 0; i < data.length; i++) {
        if (getSchedulingStatus(data[i]) === status) count++;
    }
    return count;
}

/* ---------- Format Helpers ---------- */

function formatDate(d) {
    if (!d) return "";
    if (typeof d === "string") d = new Date(d);
    var yyyy = d.getFullYear();
    var mm = String(d.getMonth() + 1).padStart(2, "0");
    var dd = String(d.getDate()).padStart(2, "0");
    return yyyy + "-" + mm + "-" + dd;
}

function formatDateDisplay(val) {
    if (!val) return "-";
    return formatDate(val);
}

function generateVendorId() {
    var max = 0;
    for (var i = 0; i < vendors.length; i++) {
        var num = parseInt(vendors[i].vendor_id.replace("V", ""), 10);
        if (num > max) max = num;
    }
    return "V" + String(max + 1).padStart(3, "0");
}

function generateAuditorId() {
    var max = 0;
    for (var i = 0; i < auditors.length; i++) {
        var num = parseInt(auditors[i].auditor_id.replace("AUD", ""), 10);
        if (num > max) max = num;
    }
    return "AUD" + String(max + 1).padStart(3, "0");
}

function getScheduleBadgeClass(schedulingStatus) {
    var map = {
        "Scheduled - Complete": "badge-completed",
        "Scheduled - Upcoming": "badge-scheduled",
        "Scheduled - Overdue": "badge-overdue",
        "Unscheduled - Pending": "badge-unscheduled",
        "Unscheduled - Overdue": "badge-overdue",
        "On Hold": "badge-on-hold",
        "Cancelled": "badge-cancelled",
        "Rescheduled": "badge-rescheduled",
        "Due Next Year": "badge-future",
        "Awaiting Requirements": "badge-future",
        "Future": "badge-future"
    };
    return "badge " + (map[schedulingStatus] || "");
}

function getQualificationBadgeClass(status) {
    var map = {
        "Qualified": "badge-qualified",
        "Pending": "badge-pending",
        "Conditional": "badge-conditional",
        "Not Qualified": "badge-not-qualified",
        "Disqualified": "badge-disqualified"
    };
    return "badge " + (map[status] || "badge-gray");
}

function getActiveBadgeClass(status) {
    return "badge " + (status === "Active" ? "badge-active" : "badge-inactive");
}

function getReviewedBadgeHtml(vendor) {
    if (vendor.reviewed) return "";
    return '<span class="badge badge-new-review">New</span>';
}

function getVendorTypeBadgeClass(vendorType) {
    if (!vendorType) return "badge badge-vtype-other";

    if (vendorType.indexOf("API") === 0) return "badge badge-vtype-api";
    if (vendorType.indexOf("Contract Manufacturing") === 0) return "badge badge-vtype-mfg";
    if (vendorType.indexOf("Contract Packaging") === 0) return "badge badge-vtype-pkg";
    if (vendorType.indexOf("Contract Testing") === 0) return "badge badge-vtype-lab";
    if (vendorType.indexOf("Warehousing") === 0) return "badge badge-vtype-logistics";
    if (vendorType.indexOf("Compendial") === 0) return "badge badge-vtype-excipient";
    if (vendorType.indexOf("Clinical") === 0) return "badge badge-vtype-clinical";
    if (vendorType.indexOf("Recall") === 0) return "badge badge-vtype-other";

    if (vendorType.indexOf("Packaging") !== -1) return "badge badge-vtype-pkg";
    if (vendorType.indexOf("consumable") !== -1) return "badge badge-vtype-consumable";

    if (vendorType === "Service Providers" || vendorType === "Calibration" || vendorType === "Preventive Maintenance") return "badge badge-vtype-service";

    return "badge badge-vtype-other";
}

/* ---------- Projection Chain ---------- */

function getProjectedAudits() {
    var projections = [];
    var maxYear = new Date().getFullYear() + 5;

    for (var i = 0; i < vendors.length; i++) {
        var v = vendors[i];

        // Only project for eligible vendors
        if (v.active_status !== "Active") continue;
        if (v.qualification_status === "Disqualified") continue;

        // Find latest completed non-cancelled, non-for-cause audit
        var latest = null;
        for (var j = 0; j < audits.length; j++) {
            var a = audits[j];
            if (a.vendor_id !== v.vendor_id) continue;
            if (!a.audit_start || isYes(a.cancelled)) continue;
            if (a.audit_type === "For-cause") continue;
            if (!a.audit_interval || a.audit_interval === "N/A") continue;

            if (!latest || a.audit_start > latest.audit_start) {
                latest = a;
            }
        }

        if (!latest) continue;

        var intervalMonths = parseInt(latest.audit_interval, 10);
        if (isNaN(intervalMonths) || intervalMonths <= 0) continue;

        var nextDate = new Date(latest.audit_start);

        for (var cycle = 0; cycle < 10; cycle++) {
            nextDate = new Date(nextDate);
            nextDate.setMonth(nextDate.getMonth() + intervalMonths);

            var projYear = nextDate.getFullYear().toString();
            if (parseInt(projYear) > maxYear) break;

            if (hasAuditForVendorYear(v.vendor_id, projYear)) continue;

            projections.push({
                vendor_id: v.vendor_id,
                vendor_name: v.vendor_name,
                projected_date: formatDate(nextDate),
                projected_year: projYear,
                arb_default: projYear + "-12-31",
                source_audit_id: latest.audit_id,
                source_audit_start: latest.audit_start,
                interval: intervalMonths,
                audit_type: "Routine",
                region: v.region || ""
            });
        }
    }

    return projections;
}

function hasAuditForVendorYear(vendorId, year) {
    for (var i = 0; i < audits.length; i++) {
        var a = audits[i];
        if (a.vendor_id !== vendorId) continue;
        var arb = a.audit_required_by;
        if (arb && arb.substring(0, 4) === year) return true;
    }
    return false;
}

function getProjectionsForYear(year) {
    var all = getProjectedAudits();
    var results = [];
    for (var i = 0; i < all.length; i++) {
        if (all[i].projected_year === year) results.push(all[i]);
    }
    return results;
}

/* ---------- Vendor Risk Scoring ---------- */

var VENDOR_TYPE_CRITICALITY = {
    "API Suppliers – Commercial Use": 3,
    "API Supplier - R&D Use": 3,
    "Contract Manufacturing Organisation": 3,
    "Contract Testing Laboratory": 3,
    "Clinical Research Organisation": 3,
    "Primary Packaging Components suppliers": 2,
    "Sterile Packaging suppliers": 2,
    "Product Contact consumables": 2,
    "Contract Packaging Organisation": 1,
    "Secondary Packaging Component Suppliers": 1,
    "Non-product contact consumables": 1,
    "Compendial Excipients": 1,
    "Warehousing and Distribution": 1,
    "Service Providers": 1,
    "Calibration": 1,
    "Preventive Maintenance": 1,
    "Recall Services": 1
};

function getVendorRiskScore(vendor) {
    var lastAudit = getLastCompletedAudit(vendor.vendor_id);

    // No completed audit — not scored
    if (!lastAudit) return null;

    var score = 0;
    var breakdown = {};

    // Factor 1: Vendor type criticality
    var typeCrit = VENDOR_TYPE_CRITICALITY[vendor.vendor_type] || 1;
    breakdown.type = typeCrit;
    score += typeCrit;

    // Factor 2: Last audit outcome
    var outcomePts = 1;
    if (lastAudit.audit_outcome === "Unacceptable") outcomePts = 3;
    else if (lastAudit.audit_outcome === "Conditional") outcomePts = 2;
    breakdown.outcome = outcomePts;
    score += outcomePts;

    // Factor 3: Risk rating from last audit
    var riskPts = 1;
    if (lastAudit.risk_rating === "High") riskPts = 3;
    else if (lastAudit.risk_rating === "Medium") riskPts = 2;
    breakdown.riskRating = riskPts;
    score += riskPts;

    // Factor 4 & 5: Interval proximity and overrun
    var intervalMonths = parseInt(lastAudit.audit_interval, 10);
    if (!isNaN(intervalMonths) && intervalMonths > 0 && lastAudit.audit_start) {
        var lastAuditDate = new Date(lastAudit.audit_start);
        var nextDueDate = new Date(lastAuditDate);
        nextDueDate.setMonth(nextDueDate.getMonth() + intervalMonths);
        var now = new Date();

        // Factor 4: Overrun (past due date)
        var overrunPts = 1;
        if (now > nextDueDate) {
            overrunPts = 3;
        } else {
            var totalMs = nextDueDate - lastAuditDate;
            var remainingMs = nextDueDate - now;
            var remainingFraction = remainingMs / totalMs;
            if (remainingFraction <= 0.2) overrunPts = 2;
        }
        breakdown.overrun = overrunPts;
        score += overrunPts;

        // Factor 5: Proximity (months to next due)
        var monthsToNext = (nextDueDate - now) / (1000 * 60 * 60 * 24 * 30.44);
        var proximityPts = 1;
        if (now > nextDueDate) proximityPts = 3;
        else if (monthsToNext <= 3) proximityPts = 3;
        else if (monthsToNext <= 6) proximityPts = 2;
        breakdown.proximity = proximityPts;
        score += proximityPts;
    } else {
        // No interval set — neutral on time factors
        breakdown.overrun = 1;
        breakdown.proximity = 1;
        score += 2;
    }

    var band = "Monitor";
    var bandClass = "risk-band-monitor";
    if (score >= 11) { band = "Critical"; bandClass = "risk-band-critical"; }
    else if (score >= 7) { band = "Elevated"; bandClass = "risk-band-elevated"; }

    return {
        vendor_id: vendor.vendor_id,
        vendor_name: vendor.vendor_name,
        region: vendor.region || "",
        vendor_type: vendor.vendor_type || "",
        score: score,
        band: band,
        bandClass: bandClass,
        breakdown: breakdown,
        lastAuditDate: lastAudit.audit_start || "",
        lastOutcome: lastAudit.audit_outcome || "-",
        riskRating: lastAudit.risk_rating || "-",
        interval: isNaN(parseInt(lastAudit.audit_interval)) ? "N/A" : lastAudit.audit_interval + " mo",
        nextDue: getVendorNextAuditDue(vendor.vendor_id)
    };
}

function getAllVendorRiskScores() {
    var results = [];
    for (var i = 0; i < vendors.length; i++) {
        var v = vendors[i];
        if (v.active_status !== "Active") continue;
        if (v.qualification_status === "Disqualified") continue;
        var scored = getVendorRiskScore(v);
        if (!scored) continue;
        results.push(scored);
    }
    results.sort(function (a, b) { return b.score - a.score; });
    return results;
}

/* ---------- Capacity Unit Calculations ---------- */

function getCUBase(auditMethod) {
    if (auditMethod === "Desktop") return cuConfig.cu_desktop;
    if (auditMethod === "Virtual") return cuConfig.cu_virtual;
    if (auditMethod === "On-site") return cuConfig.cu_onsite;
    return 0;
}

function getCUTravel(auditMethod) {
    if (auditMethod === "On-site") return cuConfig.cu_travel;
    return 0;
}

function getCULead(auditMethod) {
    return getCUBase(auditMethod) + getCUTravel(auditMethod);
}

function getCUCo(auditMethod) {
    return (getCUBase(auditMethod) + getCUTravel(auditMethod)) * cuConfig.co_auditor_fraction;
}

function getAuditBucketDate(audit) {
    if (audit.date_agreed) return audit.date_agreed;
    if (audit.audit_required_by) return audit.audit_required_by;
    return null;
}

function getAuditBucketMonth(audit) {
    var d = getAuditBucketDate(audit);
    if (!d) return null;
    return new Date(d).getMonth();
}

function getAuditBucketYear(audit) {
    var d = getAuditBucketDate(audit);
    if (!d) return null;
    return new Date(d).getFullYear().toString();
}

function getAuditorCeiling(auditor) {
    if (auditor.cu_ceiling !== null && auditor.cu_ceiling !== undefined && auditor.cu_ceiling !== "") {
        return parseFloat(auditor.cu_ceiling);
    }
    return cuConfig.default_annual_ceiling;
}

function getCapacityStatus(utilPct) {
    if (utilPct > 1) return "Overloaded";
    if (utilPct >= 1) return "No Remaining Capacity";
    if (utilPct >= 0.85) return "Near Capacity";
    return "OK";
}

function getCapacityStatusClass(status) {
    var map = {
        "Overloaded": "badge cap-overloaded",
        "No Remaining Capacity": "badge cap-full",
        "Near Capacity": "badge cap-near",
        "OK": "badge cap-ok"
    };
    return map[status] || "badge";
}

function getAuditorMonthlyLoad(auditorId, year, month) {
    var total = 0;
    for (var i = 0; i < audits.length; i++) {
        var a = audits[i];
        if (isYes(a.cancelled)) continue;

        var bucketYear = getAuditBucketYear(a);
        if (bucketYear !== year) continue;

        var bucketMonth = getAuditBucketMonth(a);
        if (bucketMonth !== month) continue;

        if (a.assigned_auditor === auditorId) {
            total += getCULead(a.audit_method);
        }
        if (a.second_auditor === auditorId) {
            total += getCUCo(a.audit_method);
        }
    }
    return total;
}

function getAuditorAnnualLoad(auditorId, year) {
    var total = 0;
    for (var m = 0; m < 12; m++) {
        total += getAuditorMonthlyLoad(auditorId, year, m);
    }
    return total;
}

function getAuditorMonthlyAuditCount(auditorId, year, month) {
    var count = 0;
    for (var i = 0; i < audits.length; i++) {
        var a = audits[i];
        if (isYes(a.cancelled)) continue;
        if (a.assigned_auditor !== auditorId && a.second_auditor !== auditorId) continue;

        var bucketYear = getAuditBucketYear(a);
        if (bucketYear !== year) continue;

        var bucketMonth = getAuditBucketMonth(a);
        if (bucketMonth !== month) continue;

        count++;
    }
    return count;
}

function getAuditorAnnualAuditCount(auditorId, year) {
    var count = 0;
    for (var m = 0; m < 12; m++) {
        count += getAuditorMonthlyAuditCount(auditorId, year, m);
    }
    return count;
}

function getRegionCapacityData(region, year) {
    var regionAuditors = [];
    for (var i = 0; i < auditors.length; i++) {
        if (auditors[i].active_status !== "Active") continue;
        if (region !== "All" && auditors[i].region !== region) continue;
        regionAuditors.push(auditors[i]);
    }

    var totalCeiling = 0;
    var totalLoad = 0;
    var totalCount = 0;
    var auditorCount = regionAuditors.length;
    var target = cuConfig.audit_target || 30;

    for (var i = 0; i < regionAuditors.length; i++) {
        var aud = regionAuditors[i];
        totalCeiling += getAuditorCeiling(aud);
        totalLoad += getAuditorAnnualLoad(aud.auditor_id, year);
        totalCount += getAuditorAnnualAuditCount(aud.auditor_id, year);
    }

    var totalTarget = auditorCount * target;
    var spareAudits = totalTarget - totalCount;
    var utilPct = totalCeiling > 0 ? totalLoad / totalCeiling : 0;

    return {
        region: region,
        auditorCount: auditorCount,
        assignedAudits: totalCount,
        auditTarget: totalTarget,
        spareAudits: spareAudits,
        utilPct: utilPct,
        status: getCapacityStatus(utilPct)
    };
}

function getAuditorPeakMonth(auditorId, year) {
    var peak = 0;
    var peakMonth = -1;
    for (var m = 0; m < 12; m++) {
        var load = getAuditorMonthlyLoad(auditorId, year, m);
        if (load > peak) {
            peak = load;
            peakMonth = m;
        }
    }
    var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return {
        cu: peak,
        count: peakMonth >= 0 ? getAuditorMonthlyAuditCount(auditorId, year, peakMonth) : 0,
        month: peakMonth >= 0 ? monthNames[peakMonth] : "-"
    };
}

function getAuditorOverloadedMonths(auditorId, year) {
    var count = 0;
    for (var m = 0; m < 12; m++) {
        var load = getAuditorMonthlyLoad(auditorId, year, m);
        var budget = getAuditorCeiling(getAuditorById(auditorId)) / 12;
        if (load > budget) count++;
    }
    return count;
}

function getAuditorById(auditorId) {
    for (var i = 0; i < auditors.length; i++) {
        if (auditors[i].auditor_id === auditorId) return auditors[i];
    }
    return null;
}

function getRegionFairness(region, year) {
    var loads = [];
    for (var i = 0; i < auditors.length; i++) {
        var aud = auditors[i];
        if (aud.active_status !== "Active") continue;
        if (region !== "All" && aud.region !== region) continue;
        loads.push({
            name: aud.first_name + " " + aud.last_name,
            count: getAuditorAnnualAuditCount(aud.auditor_id, year),
            utilPct: getAuditorCeiling(aud) > 0 ? getAuditorAnnualLoad(aud.auditor_id, year) / getAuditorCeiling(aud) : 0
        });
    }
    if (loads.length === 0) return null;

    var counts = loads.map(function (l) { return l.count; });
    var min = Math.min.apply(null, counts);
    var max = Math.max.apply(null, counts);
    var avg = 0;
    for (var i = 0; i < counts.length; i++) avg += counts[i];
    avg = Math.round((avg / counts.length) * 10) / 10;

    var spread = max - min;
    var balance = "Balanced";
    if (spread > avg * 0.5 && spread > 5) balance = "Uneven";
    if (spread > avg && spread > 10) balance = "Poorly Distributed";

    return {
        min: min,
        max: max,
        avg: avg,
        spread: spread,
        balance: balance,
        auditors: loads
    };
}

function getWorkloadFlag(auditorData) {
    var peak = auditorData.peakMonth;
    var overloadedMonths = auditorData.overloadedMonths;

    if (overloadedMonths >= 4) return { label: "Overcommitted", cls: "badge cap-overloaded" };
    if (peak.cu > auditorData.monthlyBudget * 1.5) return { label: "Peak Month Flagged", cls: "badge cap-near" };
    if (overloadedMonths >= 2) return { label: "Heavy", cls: "badge cap-near" };
    if (auditorData.annualCount === 0) return { label: "Unassigned", cls: "badge cap-near" };
    return { label: "Balanced", cls: "badge cap-ok" };
}

/* ---------- Duplicate Detection ---------- */

function findDuplicateAuditIds() {
    var idMap = {};
    var dupes = [];

    for (var i = 0; i < audits.length; i++) {
        var id = audits[i].audit_id;
        if (!id || id.trim() === "") continue;
        if (!idMap[id]) {
            idMap[id] = [];
        }
        idMap[id].push(i);
    }

    for (var id in idMap) {
        if (idMap[id].length > 1) {
            dupes.push({
                audit_id: id,
                indices: idMap[id],
                count: idMap[id].length
            });
        }
    }
    return dupes;
}

function findDuplicateVendorAudits() {
    var keyMap = {};
    var dupes = [];

    for (var i = 0; i < audits.length; i++) {
        var a = audits[i];
        if (!a.vendor_id || !a.audit_required_by) continue;
        var key = a.vendor_id + "|" + a.audit_required_by;
        if (!keyMap[key]) {
            keyMap[key] = [];
        }
        keyMap[key].push(i);
    }

    for (var key in keyMap) {
        if (keyMap[key].length > 1) {
            var parts = key.split("|");
            dupes.push({
                vendor_id: parts[0],
                vendor_name: getVendorName(parts[0]),
                arb: parts[1],
                indices: keyMap[key],
                count: keyMap[key].length
            });
        }
    }
    return dupes;
}

function findSimilarVendorNames() {
    var dupes = [];
    var checked = {};

    for (var i = 0; i < vendors.length; i++) {
        for (var j = i + 1; j < vendors.length; j++) {
            var nameA = vendors[i].vendor_name.toLowerCase().replace(/[^a-z0-9]/g, "");
            var nameB = vendors[j].vendor_name.toLowerCase().replace(/[^a-z0-9]/g, "");

            if (nameA === nameB || nameA.indexOf(nameB) !== -1 || nameB.indexOf(nameA) !== -1) {
                var key = i + "-" + j;
                if (!checked[key]) {
                    checked[key] = true;
                    dupes.push({
                        indexA: i,
                        indexB: j,
                        nameA: vendors[i].vendor_name,
                        nameB: vendors[j].vendor_name,
                        idA: vendors[i].vendor_id,
                        idB: vendors[j].vendor_id
                    });
                }
            }
        }
    }
    return dupes;
}

/* ---------- Skills Helpers ---------- */

function getSkillCategories() {
    var cats = [];
    var seen = {};
    for (var i = 0; i < skillsCatalogue.length; i++) {
        var c = skillsCatalogue[i].category;
        if (!seen[c]) {
            seen[c] = true;
            cats.push(c);
        }
    }
    return cats;
}

function getSkillsByCategory(category) {
    var results = [];
    for (var i = 0; i < skillsCatalogue.length; i++) {
        if (skillsCatalogue[i].category === category) {
            results.push(skillsCatalogue[i]);
        }
    }
    return results;
}

function getSkillById(skillId) {
    for (var i = 0; i < skillsCatalogue.length; i++) {
        if (skillsCatalogue[i].skill_id === skillId) return skillsCatalogue[i];
    }
    return null;
}

function getAuditorSkillRating(auditor, skillId) {
    if (!auditor.skills) return null;
    for (var i = 0; i < auditor.skills.length; i++) {
        if (auditor.skills[i].skill_id === skillId) return auditor.skills[i];
    }
    return null;
}

function getAuditorCategoryAvg(auditor, category) {
    var catSkills = getSkillsByCategory(category);
    var total = 0;
    var count = 0;
    for (var i = 0; i < catSkills.length; i++) {
        var rating = getAuditorSkillRating(auditor, catSkills[i].skill_id);
        if (rating && rating.proficiency !== null) {
            total += rating.proficiency;
            count++;
        }
    }
    return count > 0 ? Math.round((total / count) * 10) / 10 : null;
}

function getTeamSkillAvg(skillId) {
    var total = 0;
    var count = 0;
    for (var i = 0; i < auditors.length; i++) {
        if (auditors[i].active_status !== "Active") continue;
        var rating = getAuditorSkillRating(auditors[i], skillId);
        if (rating && rating.proficiency !== null) {
            total += rating.proficiency;
            count++;
        }
    }
    return count > 0 ? Math.round((total / count) * 10) / 10 : null;
}

function getSkillProficientCount(skillId, minLevel) {
    var count = 0;
    for (var i = 0; i < auditors.length; i++) {
        if (auditors[i].active_status !== "Active") continue;
        var rating = getAuditorSkillRating(auditors[i], skillId);
        if (rating && rating.proficiency !== null && rating.proficiency >= minLevel) count++;
    }
    return count;
}