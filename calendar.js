/* ============================================
   CALENDAR MODULE
   Auditor leave & audit schedule calendar
   ============================================ */

var calendarMonth = new Date().getMonth();
var calendarYear = new Date().getFullYear();
var calendarRegion = "EU";

/* ---------- Main Render ---------- */

function renderCalendar() {
    var container = document.getElementById("view-calendar");

    var regionAuditors = [];
    for (var i = 0; i < auditors.length; i++) {
        if (auditors[i].active_status !== "Active") continue;
        if (auditors[i].region === calendarRegion) regionAuditors.push(auditors[i]);
    }

    var monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    var daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();

    var html = '';

    html += '<div class="view-header">';
    html += '<h1 class="page-title">Auditor Calendar</h1>';
    html += '</div>';

    html += '<div class="forecast-explainer">';
    html += 'Shows auditor leave and scheduled audit days by region. Click a cell to add or remove leave. ';
    html += 'Audit days are auto-populated from assignments and shown in blue. Travel days for onsite audits shown in light blue.';
    html += '</div>';

    // Region tabs
    var regionTabs = ["USA", "EU", "India", "Asia"];
    html += '<div class="cap-region-tabs" style="margin-bottom:16px;">';
    for (var i = 0; i < regionTabs.length; i++) {
        var activeClass = calendarRegion === regionTabs[i] ? " cap-tab-active" : "";
        html += '<button class="cap-tab' + activeClass + '" onclick="setCalendarRegion(\'' + regionTabs[i] + '\')">' + regionTabs[i] + '</button>';
    }
    html += '</div>';

    // Month navigation
    html += '<div class="dash-year-bar">';
    html += '<button class="btn-secondary btn-sm" onclick="changeCalendarMonth(-1)">&larr;</button>';
    html += '<span class="dash-year-label">' + monthNames[calendarMonth] + ' ' + calendarYear + '</span>';
    html += '<button class="btn-secondary btn-sm" onclick="changeCalendarMonth(1)">&rarr;</button>';
    html += '</div>';

    // Calendar grid
    html += '<div class="cal-wrapper">';
    html += '<table class="cal-table"><thead><tr>';
    html += '<th class="cal-name-col">Auditor</th>';

    for (var d = 1; d <= daysInMonth; d++) {
        var date = new Date(calendarYear, calendarMonth, d);
        var dayName = ["S", "M", "T", "W", "T", "F", "S"][date.getDay()];
        var isWeekend = date.getDay() === 0 || date.getDay() === 6;
        var thClass = isWeekend ? "cal-day-header cal-weekend-header" : "cal-day-header";
        html += '<th class="' + thClass + '">' + dayName + '<br>' + d + '</th>';
    }

    html += '</tr></thead><tbody>';

    for (var a = 0; a < regionAuditors.length; a++) {
        var aud = regionAuditors[a];
        html += '<tr>';
        html += '<td class="cal-name-cell">' + aud.first_name + ' ' + aud.last_name + '</td>';

        for (var d = 1; d <= daysInMonth; d++) {
            var dateStr = formatCalDate(calendarYear, calendarMonth, d);
            var date = new Date(calendarYear, calendarMonth, d);
            var isWeekend = date.getDay() === 0 || date.getDay() === 6;

            var leave = getLeaveForDate(aud, dateStr);
            var auditInfo = getAuditForDate(aud.auditor_id, dateStr);

            var cellClass = "cal-cell";
            var cellContent = "";
            var cellTitle = "";

            if (isWeekend) {
                cellClass += " cal-weekend";
            }

            if (auditInfo) {
                if (auditInfo.type === "travel") {
                    cellClass += " cal-travel";
                    cellContent = "T";
                    cellTitle = "Travel: " + auditInfo.vendor;
                } else {
                    cellClass += " cal-audit";
                    cellContent = "A";
                    cellTitle = auditInfo.method + " audit: " + auditInfo.vendor;
                }
            } else if (leave) {
                cellClass += " " + getLeaveClass(leave.type);
                cellContent = getLeaveAbbrev(leave.type);
                cellTitle = leave.type;
            }

            var clickHandler = 'onclick="toggleLeave(\'' + aud.auditor_id + '\', \'' + dateStr + '\')"';

            html += '<td class="' + cellClass + '" title="' + cellTitle + '" ' + clickHandler + '>' + cellContent + '</td>';
        }

        html += '</tr>';
    }

    html += '</tbody></table></div>';

    // Legend
    html += '<div class="cal-legend">';
    html += '<span class="cal-legend-item"><span class="cal-legend-swatch cal-audit"></span> Audit</span>';
    html += '<span class="cal-legend-item"><span class="cal-legend-swatch cal-travel"></span> Travel</span>';
    html += '<span class="cal-legend-item"><span class="cal-legend-swatch cal-leave-vacation"></span> Vacation</span>';
    html += '<span class="cal-legend-item"><span class="cal-legend-swatch cal-leave-personal"></span> Personal</span>';
    html += '<span class="cal-legend-item"><span class="cal-legend-swatch cal-leave-sick"></span> Sick</span>';
    html += '<span class="cal-legend-item"><span class="cal-legend-swatch cal-leave-training"></span> Training</span>';
    html += '<span class="cal-legend-item"><span class="cal-legend-swatch cal-leave-public"></span> Public Holiday</span>';
    html += '<span class="cal-legend-item"><span class="cal-legend-swatch cal-leave-company"></span> Company Holiday</span>';
    html += '<span class="cal-legend-item"><span class="cal-legend-swatch cal-weekend"></span> Weekend</span>';
    html += '</div>';

    container.innerHTML = html;
}

/* ---------- Leave Data ---------- */

function getLeaveForDate(auditor, dateStr) {
    if (!auditor.leave) return null;
    for (var i = 0; i < auditor.leave.length; i++) {
        if (auditor.leave[i].date === dateStr) return auditor.leave[i];
    }
    return null;
}

function toggleLeave(auditorId, dateStr) {
    var auditor = null;
    var auditorIdx = -1;
    for (var i = 0; i < auditors.length; i++) {
        if (auditors[i].auditor_id === auditorId) {
            auditor = auditors[i];
            auditorIdx = i;
            break;
        }
    }
    if (!auditor) return;

    // Check if audit day — don't allow leave on audit days
    var auditInfo = getAuditForDate(auditorId, dateStr);
    if (auditInfo) return;

    if (!auditor.leave) auditor.leave = [];

    var existing = -1;
    for (var i = 0; i < auditor.leave.length; i++) {
        if (auditor.leave[i].date === dateStr) { existing = i; break; }
    }

    if (existing >= 0) {
        // Remove leave
        auditor.leave.splice(existing, 1);
        saveData();
        renderCalendar();
    } else {
        // Show leave type picker
        showLeaveTypePicker(auditorId, dateStr);
    }
}

function showLeaveTypePicker(auditorId, dateStr) {
    var html = '<div class="cal-leave-picker">';
    html += '<p>Add leave starting <strong>' + formatDateDisplay(dateStr) + '</strong>:</p>';

    html += '<div class="form-row" style="margin-bottom:12px;">';
    html += '<div class="form-field"><label>From</label><input type="date" id="leave-from" value="' + dateStr + '"></div>';
    html += '<div class="form-field"><label>To</label><input type="date" id="leave-to" value="' + dateStr + '"></div>';
    html += '</div>';

    html += '<p style="margin-bottom:8px;">Select leave type:</p>';

    for (var i = 0; i < OPTIONS.leave_type.length; i++) {
        var type = OPTIONS.leave_type[i];
        var isRegional = (type === "Public Holiday" || type === "Company Holiday");
        html += '<button class="btn-secondary btn-sm" style="margin:4px;" onclick="addLeaveRange(\'' + auditorId + '\', \'' + type + '\', ' + isRegional + ')">' + type + '</button>';
    }

    html += '</div>';

    document.getElementById("modal-body").innerHTML = html;
    openModal("Add Leave");
}

function addLeave(auditorId, dateStr, leaveType, applyToRegion) {
    if (applyToRegion) {
        // Apply to all auditors in the same region
        var auditor = getAuditorById(auditorId);
        if (!auditor) return;
        var region = auditor.region;

        for (var i = 0; i < auditors.length; i++) {
            if (auditors[i].active_status !== "Active") continue;
            if (auditors[i].region !== region) continue;
            if (!auditors[i].leave) auditors[i].leave = [];

            var exists = false;
            for (var j = 0; j < auditors[i].leave.length; j++) {
                if (auditors[i].leave[j].date === dateStr) { exists = true; break; }
            }
            if (!exists) {
                auditors[i].leave.push({ date: dateStr, type: leaveType });
            }
        }
    } else {
        var auditor = null;
        for (var i = 0; i < auditors.length; i++) {
            if (auditors[i].auditor_id === auditorId) { auditor = auditors[i]; break; }
        }
        if (!auditor) return;
        if (!auditor.leave) auditor.leave = [];
        auditor.leave.push({ date: dateStr, type: leaveType });
    }

    saveData();
    closeModal();
    renderCalendar();
}

function addLeaveRange(auditorId, leaveType, applyToRegion) {
    var fromStr = document.getElementById("leave-from").value;
    var toStr = document.getElementById("leave-to").value;

    if (!fromStr || !toStr) return;

    var from = new Date(fromStr);
    var to = new Date(toStr);
    if (to < from) { var tmp = from; from = to; to = tmp; }

    var current = new Date(from);
    while (current <= to) {
        var dateStr = formatDate(current);
        var dayOfWeek = current.getDay();

        // Skip weekends
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            if (applyToRegion) {
                var auditor = getAuditorById(auditorId);
                if (auditor) {
                    for (var i = 0; i < auditors.length; i++) {
                        if (auditors[i].active_status !== "Active") continue;
                        if (auditors[i].region !== auditor.region) continue;
                        if (!auditors[i].leave) auditors[i].leave = [];

                        var exists = false;
                        for (var j = 0; j < auditors[i].leave.length; j++) {
                            if (auditors[i].leave[j].date === dateStr) { exists = true; break; }
                        }
                        if (!exists) {
                            auditors[i].leave.push({ date: dateStr, type: leaveType });
                        }
                    }
                }
            } else {
                var auditor = getAuditorById(auditorId);
                if (!auditor) break;
                if (!auditor.leave) auditor.leave = [];

                var exists = false;
                for (var j = 0; j < auditor.leave.length; j++) {
                    if (auditor.leave[j].date === dateStr) { exists = true; break; }
                }
                if (!exists) {
                    auditor.leave.push({ date: dateStr, type: leaveType });
                }
            }
        }

        current.setDate(current.getDate() + 1);
    }

    saveData();
    closeModal();
    renderCalendar();
}

/* ---------- Audit Day Detection ---------- */

function getAuditForDate(auditorId, dateStr) {
    var date = new Date(dateStr);

    for (var i = 0; i < audits.length; i++) {
        var a = audits[i];
        if (isYes(a.cancelled)) continue;
        if (a.assigned_auditor !== auditorId && a.second_auditor !== auditorId) continue;

        var bucketDate = a.date_agreed || a.audit_required_by;
        if (!bucketDate) continue;

        var startDate = new Date(bucketDate);
        var auditDays = a.audit_days || 1;
        var isOnsite = a.audit_method === "On-site";

        // Travel day before (onsite only)
        if (isOnsite) {
            var travelBefore = new Date(startDate);
            travelBefore.setDate(travelBefore.getDate() - 1);
            if (formatDate(travelBefore) === dateStr) {
                return { type: "travel", vendor: getVendorName(a.vendor_id), method: a.audit_method };
            }
        }

        // Audit days
        for (var d = 0; d < auditDays; d++) {
            var auditDay = new Date(startDate);
            auditDay.setDate(auditDay.getDate() + d);
            if (formatDate(auditDay) === dateStr) {
                return { type: "audit", vendor: getVendorName(a.vendor_id), method: a.audit_method, audit_id: a.audit_id };
            }
        }

        // Travel day after (onsite only)
        if (isOnsite) {
            var travelAfter = new Date(startDate);
            travelAfter.setDate(travelAfter.getDate() + auditDays);
            if (formatDate(travelAfter) === dateStr) {
                return { type: "travel", vendor: getVendorName(a.vendor_id), method: a.audit_method };
            }
        }
    }

    return null;
}

/* ---------- Leave Styling ---------- */

function getLeaveClass(type) {
    var map = {
        "Vacation": "cal-leave-vacation",
        "Personal Leave": "cal-leave-personal",
        "Sick Leave": "cal-leave-sick",
        "Business Travel": "cal-leave-business",
        "Training": "cal-leave-training",
        "Public Holiday": "cal-leave-public",
        "Company Holiday": "cal-leave-company"
    };
    return map[type] || "cal-leave-other";
}

function getLeaveAbbrev(type) {
    var map = {
        "Vacation": "V",
        "Personal Leave": "P",
        "Sick Leave": "S",
        "Business Travel": "B",
        "Training": "Tr",
        "Public Holiday": "PH",
        "Company Holiday": "CH"
    };
    return map[type] || "?";
}

/* ---------- Helpers ---------- */

function formatCalDate(year, month, day) {
    return year + "-" + String(month + 1).padStart(2, "0") + "-" + String(day).padStart(2, "0");
}

/* ---------- Navigation ---------- */

function setCalendarRegion(region) {
    calendarRegion = region;
    renderCalendar();
}

function changeCalendarMonth(delta) {
    calendarMonth += delta;
    if (calendarMonth > 11) {
        calendarMonth = 0;
        calendarYear++;
    } else if (calendarMonth < 0) {
        calendarMonth = 11;
        calendarYear--;
    }
    renderCalendar();
}