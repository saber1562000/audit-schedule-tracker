/* ============================================
   IMPORT / EXPORT MODULE
   Excel file import and export
   ============================================ */

/* ---------- Import ---------- */

function importData() {
    var confirmed = confirm(
        "WARNING: Importing will replace ALL existing data.\n\n" +
        "This will overwrite all current vendors, audits, and auditors.\n\n" +
        "Make sure you have exported a backup first.\n\n" +
        "Continue?"
    );
    if (!confirmed) return;

    var input = document.createElement("input");
    input.type = "file";
    input.accept = ".xlsx,.xls,.csv";

    input.onchange = function (e) {
        var file = e.target.files[0];
        if (!file) return;

        var reader = new FileReader();
        reader.onload = function (e) {
            try {
                var data = new Uint8Array(e.target.result);
                var workbook = XLSX.read(data, { type: "array", cellDates: true });
                processWorkbook(workbook);
            } catch (err) {
                alert("Error reading file: " + err.message);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    input.click();
}

function findSheet(workbook, names) {
    for (var i = 0; i < names.length; i++) {
        for (var j = 0; j < workbook.SheetNames.length; j++) {
            if (workbook.SheetNames[j] === names[i]) {
                return workbook.Sheets[workbook.SheetNames[j]];
            }
        }
    }
    return null;
}

function getField(row, possibleNames) {
    for (var i = 0; i < possibleNames.length; i++) {
        if (row[possibleNames[i]] !== undefined && row[possibleNames[i]] !== "") {
            return row[possibleNames[i]];
        }
    }
    return "";
}

function processWorkbook(workbook) {
    var vendorSheet = findSheet(workbook, ["Master Vendor List", "Vendors"]);
    var auditSheet = findSheet(workbook, ["Data_Audits", "Audits"]);
    var smSheet = findSheet(workbook, ["Site_Materials"]);
    var auditorSheet = findSheet(workbook, ["Auditors"]);

    var importedVendors = 0;
    var importedAudits = 0;
    var importedAuditors = 0;

    vendors.length = 0;
    audits.length = 0;

    /* --- Import Auditors --- */
    if (auditorSheet) {
        auditors.length = 0;
        var auditorRows = XLSX.utils.sheet_to_json(auditorSheet, { defval: "" });
        for (var i = 0; i < auditorRows.length; i++) {
            var r = auditorRows[i];
            var first = cleanString(getField(r, ["First_Name"]));
            var last = cleanString(getField(r, ["Last_Name"]));
            if (!first && !last) continue;

            auditors.push({
                auditor_id: cleanString(getField(r, ["Auditor_ID"])) || generateAuditorId(),
                first_name: first,
                last_name: last,
                email: cleanString(getField(r, ["Email"])) || "",
                region: cleanString(getField(r, ["Region"])) || "",
                active_status: cleanString(getField(r, ["Active_Status"])) || "Active",
                date_added: parseExcelDate(getField(r, ["Date_Added"])) || formatDate(new Date()),
                notes: cleanString(getField(r, ["Notes"])) || ""
            });
            importedAuditors++;
        }
    }

    /* --- Import Vendors --- */
    if (vendorSheet) {
        var vendorRows = XLSX.utils.sheet_to_json(vendorSheet, { defval: "" });

        for (var i = 0; i < vendorRows.length; i++) {
            var r = vendorRows[i];
            var name = cleanString(getField(r, ["Vendor_Name"]));
            if (!name) continue;

            var vid = cleanString(getField(r, ["Vendor_ID"]));
            if (!vid) vid = generateVendorId();

            // Handle old format (single Status field) vs new (split statuses)
            var qualStatus = cleanString(getField(r, ["Qualification_Status"]));
            var actStatus = cleanString(getField(r, ["Active_Status"]));
            var oldStatus = cleanString(getField(r, ["Status"]));

            if (!qualStatus && oldStatus) {
                // Map old single status to split statuses
                var os = oldStatus.toLowerCase().trim();
                if (os === "active") { qualStatus = "Qualified"; actStatus = "Active"; }
                else if (os === "inactive") { qualStatus = "Qualified"; actStatus = "Inactive"; }
                else if (os === "pending") { qualStatus = "Pending"; actStatus = "Active"; }
                else if (os === "conditional") { qualStatus = "Conditional"; actStatus = "Active"; }
                else if (os === "not qualified") { qualStatus = "Not Qualified"; actStatus = "Inactive"; }
                else if (os === "disqualified") { qualStatus = "Disqualified"; actStatus = "Inactive"; }
                else { qualStatus = ""; actStatus = ""; }
            }

            // Handle old format site-material fields inline
            var siteMaterials = [];
            var oldBU = cleanString(getField(r, ["Business_Unit"]));
            var oldSite = cleanString(getField(r, ["Site"]));
            var oldMat = cleanString(getField(r, ["Material or Service", "Material_or_Service"]));
            var oldSub = cleanString(getField(r, ["Material Subtype", "Material_Subtype"]));
            if (oldBU || oldSite || oldMat || oldSub) {
                siteMaterials.push({
                    business_unit: oldBU,
                    site: oldSite,
                    material_or_service: oldMat,
                    material_subtype: oldSub
                });
            }
            if (siteMaterials.length === 0) {
                siteMaterials.push({ business_unit: "", site: "", material_or_service: "", material_subtype: "" });
            }

            vendors.push({
                vendor_id: vid,
                vendor_name: name,
                date_added: parseExcelDate(getField(r, ["Date_Added"])) || formatDate(new Date()),
                added_by: cleanString(getField(r, ["Added_By"])) || "",
                city: cleanString(getField(r, ["City"])) || "",
                country_state: cleanString(getField(r, ["Country/State"])) || "",
                region: cleanString(getField(r, ["Region"])) || "",
                address: cleanString(getField(r, ["Address"])) || "",
                vendor_type: cleanString(getField(r, ["Vendor_Type"])) || "",
                site_materials: siteMaterials,
                qualification_status: qualStatus || "",
                active_status: actStatus || "",
                notes: cleanString(getField(r, ["Notes", "Owner_Notes"])) || "",
                folder_link: cleanString(getField(r, ["Folder_Link"])) || "",
                reviewed: true
            });
            importedVendors++;
        }
    }

    /* --- Import Site-Materials (overrides inline values if present) --- */
    if (smSheet) {
        var smRows = XLSX.utils.sheet_to_json(smSheet, { defval: "" });

        // Group by vendor_id
        var smByVendor = {};
        for (var i = 0; i < smRows.length; i++) {
            var r = smRows[i];
            var vid = cleanString(getField(r, ["Vendor_ID"]));
            if (!vid) continue;
            if (!smByVendor[vid]) smByVendor[vid] = [];
            smByVendor[vid].push({
                business_unit: cleanString(getField(r, ["Business_Unit"])) || "",
                site: cleanString(getField(r, ["Site"])) || "",
                material_or_service: cleanString(getField(r, ["Material_or_Service", "Material or Service"])) || "",
                material_subtype: cleanString(getField(r, ["Material_Subtype", "Material Subtype"])) || ""
            });
        }

        // Apply to vendors
        for (var i = 0; i < vendors.length; i++) {
            if (smByVendor[vendors[i].vendor_id]) {
                vendors[i].site_materials = smByVendor[vendors[i].vendor_id];
            }
        }
    }

    /* --- Import Audits --- */
    if (auditSheet) {
        var auditRows = XLSX.utils.sheet_to_json(auditSheet, { defval: "" });

        for (var i = 0; i < auditRows.length; i++) {
            var r = auditRows[i];
            var vendorName = cleanString(getField(r, ["Vendor_Name"]));
            if (!vendorName) continue;

            // Find vendor by ID first, then by name
            var vendorId = cleanString(getField(r, ["Vendor_ID"]));
            var vendor = null;
            if (vendorId) vendor = findVendorById(vendorId);
            if (!vendor) vendor = findVendorByName(vendorName);
            if (!vendor) {
                vendor = {
                    vendor_id: generateVendorId(),
                    vendor_name: vendorName,
                    date_added: formatDate(new Date()), added_by: "",
                    city: cleanString(getField(r, ["City"])) || "",
                    country_state: cleanString(getField(r, ["Country/State"])) || "",
                    region: cleanString(getField(r, ["Region"])) || "",
                    address: "", vendor_type: "",
                    site_materials: [{ business_unit: "", site: "", material_or_service: "", material_subtype: "" }],
                    qualification_status: "", active_status: "",
                    notes: "", folder_link: ""
                };
                vendors.push(vendor);
            }

            var intervalRaw = getField(r, ["Audit_Interval"]);
            var interval = null;
            if (intervalRaw === "N/A" || intervalRaw === "n/a") {
                interval = "N/A";
            } else if (intervalRaw && !isNaN(intervalRaw)) {
                interval = parseInt(intervalRaw, 10);
            }

            // Handle auditor — could be ID or name string
            var auditorField = cleanString(getField(r, ["Assigned_Auditor_ID", "Assigned_Auditor"]));
            var auditor2Field = cleanString(getField(r, ["Second_Auditor_ID", "Second_Auditor"]));

            audits.push({
                audit_id: cleanString(getField(r, ["Audit_ID"])) || "",
                vendor_id: vendor.vendor_id,
                audit_method: cleanString(getField(r, ["Audit_Method"])) || "",
                audit_type: cleanString(getField(r, ["Audit_Type"])) || "",
                audit_required_by: parseExcelDate(getField(r, ["Audit_Required_By"])),
                date_agreed: parseExcelDate(getField(r, ["Date_Agreed"])),
                assigned_auditor: auditorField,
                second_auditor: auditor2Field,
                audit_start: parseExcelDate(getField(r, ["Audit_Start"])),
                audit_end: parseExcelDate(getField(r, ["Audit_End"])),
                report_issued_date: parseExcelDate(getField(r, ["Report_Issued_Date"])),
                closed_date: parseExcelDate(getField(r, ["Closed_Date"])),
                cancelled: normalizeYesNo(getField(r, ["Cancelled"])),
                cancelled_reason: cleanString(getField(r, ["Cancelled_Reason"])) || "",
                cancelled_reason_other: cleanString(getField(r, ["Cancelled_Reason_Other"])) || "",
                rescheduled: normalizeYesNo(getField(r, ["Rescheduled"])),
                rescheduled_to_date: parseExcelDate(getField(r, ["Rescheduled_To_Date"])),
                on_hold: normalizeYesNo(getField(r, ["On_Hold"])),
                on_hold_reason: cleanString(getField(r, ["On_Hold_Reason"])) || "",
                on_hold_reason_other: cleanString(getField(r, ["On_Hold_Reason_Other"])) || "",
                desktop_docs_received: cleanString(getField(r, ["Desktop_Docs_Received"])) || "Not Applicable",
                risk_rating: cleanString(getField(r, ["Risk_Rating"])) || "",
                audit_outcome: cleanString(getField(r, ["Audit_Outcome"])) || "",
                obs_critical: parseIntSafe(getField(r, ["Obs_Critical"])),
                obs_major: parseIntSafe(getField(r, ["Obs_Major"])),
                obs_minor: parseIntSafe(getField(r, ["Obs_Minor"])),
                audit_interval: interval,
                escalation: cleanString(getField(r, ["Escalation"])) || "",
                comment: cleanString(getField(r, ["Comment", "Comment/Note"])) || "",
                legacy_source: cleanString(getField(r, ["Legacy_Source"])) || ""
            });
            importedAudits++;
        }
    }

    /* --- Refresh views --- */
    if (currentView === "dashboard") renderDashboard();
    if (currentView === "audits") renderAuditList();
    if (currentView === "vendors") renderVendorList();
    if (currentView === "auditors") renderAuditorList();

    saveData();

    /* --- Report --- */
    var msg = "Import complete.\n\n";
    msg += "Vendors: " + importedVendors + " imported\n";
    msg += "Audits: " + importedAudits + " imported\n";
    msg += "Auditors: " + importedAuditors + " imported";
    alert(msg);
}

/* ---------- Export ---------- */

function exportData() {
    var wb = XLSX.utils.book_new();

    /* --- Vendors sheet --- */
    var vendorExport = [];
    for (var i = 0; i < vendors.length; i++) {
        var v = vendors[i];
        vendorExport.push({
            "Vendor_ID": v.vendor_id,
            "Vendor_Name": v.vendor_name,
            "Date_Added": v.date_added || "",
            "Added_By": v.added_by || "",
            "City": v.city,
            "Country/State": v.country_state,
            "Region": v.region,
            "Address": v.address,
            "Vendor_Type": v.vendor_type,
            "Qualification_Status": v.qualification_status || "",
            "Active_Status": v.active_status || "",
            "Notes": v.notes || "",
            "Folder_Link": v.folder_link || "",
            "Last_Audit_Date": getVendorLastAuditDate(v.vendor_id),
            "Last_Outcome": getVendorLastOutcome(v.vendor_id),
            "Current_Risk": getVendorCurrentRisk(v.vendor_id),
            "Current_Interval": getVendorCurrentInterval(v.vendor_id),
            "Next_Audit_Due": getVendorNextAuditDue(v.vendor_id)
        });
    }
    var vendorWs = XLSX.utils.json_to_sheet(vendorExport);
    XLSX.utils.book_append_sheet(wb, vendorWs, "Vendors");

    /* --- Site-Materials sheet --- */
    var smExport = [];
    for (var i = 0; i < vendors.length; i++) {
        var v = vendors[i];
        var sm = v.site_materials || [];
        for (var j = 0; j < sm.length; j++) {
            smExport.push({
                "Vendor_ID": v.vendor_id,
                "Vendor_Name": v.vendor_name,
                "Business_Unit": sm[j].business_unit || "",
                "Site": sm[j].site || "",
                "Material_or_Service": sm[j].material_or_service || "",
                "Material_Subtype": sm[j].material_subtype || ""
            });
        }
    }
    var smWs = XLSX.utils.json_to_sheet(smExport);
    XLSX.utils.book_append_sheet(wb, smWs, "Site_Materials");

    /* --- Audits sheet --- */
    var auditExport = [];
    for (var i = 0; i < audits.length; i++) {
        var a = audits[i];
        auditExport.push({
            "Audit_ID": a.audit_id,
            "Vendor_ID": a.vendor_id,
            "Vendor_Name": getVendorName(a.vendor_id),
            "Region": getVendorField(a, "region"),
            "Audit_Method": a.audit_method,
            "Audit_Type": a.audit_type,
            "Audit_Required_By": a.audit_required_by || "",
            "Date_Agreed": a.date_agreed || "",
            "Assigned_Auditor": getAuditorName(a.assigned_auditor),
            "Assigned_Auditor_ID": a.assigned_auditor || "",
            "Second_Auditor": getAuditorName(a.second_auditor),
            "Second_Auditor_ID": a.second_auditor || "",
            "Scheduling_Status": getSchedulingStatus(a),
            "Audit_Start": a.audit_start || "",
            "Audit_End": a.audit_end || "",
            "Report_Due_By": getReportDueBy(a),
            "Report_Issued_Date": a.report_issued_date || "",
            "Closed_Date": a.closed_date || "",
            "Cancelled": a.cancelled,
            "Cancelled_Reason": a.cancelled_reason || "",
            "Cancelled_Reason_Other": a.cancelled_reason_other || "",
            "Rescheduled": a.rescheduled,
            "Rescheduled_To_Date": a.rescheduled_to_date || "",
            "On_Hold": a.on_hold,
            "On_Hold_Reason": a.on_hold_reason || "",
            "On_Hold_Reason_Other": a.on_hold_reason_other || "",
            "Desktop_Docs_Received": a.desktop_docs_received || "",
            "Risk_Rating": a.risk_rating,
            "Audit_Outcome": a.audit_outcome,
            "Obs_Critical": a.obs_critical,
            "Obs_Major": a.obs_major,
            "Obs_Minor": a.obs_minor,
            "Audit_Interval": a.audit_interval,
            "Escalation": a.escalation || "",
            "Audit_Status": getAuditStatus(a),
            "Next_Audit_Date": getNextAuditDate(a),
            "Comment": a.comment,
            "Legacy_Source": a.legacy_source
        });
    }
    var auditWs = XLSX.utils.json_to_sheet(auditExport);
    XLSX.utils.book_append_sheet(wb, auditWs, "Audits");

    /* --- Auditors sheet --- */
    var auditorExport = [];
    for (var i = 0; i < auditors.length; i++) {
        var a = auditors[i];
        auditorExport.push({
            "Auditor_ID": a.auditor_id,
            "First_Name": a.first_name,
            "Last_Name": a.last_name,
            "Email": a.email || "",
            "Region": a.region || "",
            "Active_Status": a.active_status,
            "Date_Added": a.date_added || "",
            "Notes": a.notes || ""
        });
    }
    var auditorWs = XLSX.utils.json_to_sheet(auditorExport);
    XLSX.utils.book_append_sheet(wb, auditorWs, "Auditors");

    /* --- Download --- */
    var today = formatDate(new Date());
    XLSX.writeFile(wb, "EQA_Tracker_Export_" + today + ".xlsx");
}

/* ---------- Import Helpers ---------- */

function cleanString(val) {
    if (val === null || val === undefined) return "";
    return val.toString().trim().replace(/\u00A0/g, " ");
}

function normalizeYesNo(val) {
    var s = cleanString(val).toLowerCase();
    if (s === "yes") return "Yes";
    if (s === "no" || s === "" || s === "n/a") return "No";
    return "No";
}

function parseExcelDate(val) {
    if (!val) return null;
    if (val instanceof Date) {
        if (isNaN(val.getTime())) return null;
        return formatDate(val);
    }
    var s = cleanString(val);
    if (!s || s === "N/A" || s === "n/a") return null;
    var d = new Date(s);
    if (!isNaN(d.getTime())) return formatDate(d);
    return null;
}

function parseIntSafe(val) {
    if (val === null || val === undefined || val === "") return null;
    var n = parseInt(val, 10);
    return isNaN(n) ? null : n;
}

function findVendorByName(name) {
    var target = name.toLowerCase().trim();
    for (var i = 0; i < vendors.length; i++) {
        if (vendors[i].vendor_name.toLowerCase().trim() === target) {
            return vendors[i];
        }
    }
    return null;
}

function findVendorById(id) {
    for (var i = 0; i < vendors.length; i++) {
        if (vendors[i].vendor_id === id) return vendors[i];
    }
    return null;
}