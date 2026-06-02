/* ============================================
   VENDORS MODULE
   List, filtering, quick update, detail, form, CRUD
   ============================================ */

var vendorQuickUpdateMode = false;

/* ---------- Filtering ---------- */

function getVendorFilters() {
    var searchEl = document.getElementById("vendor-search");
    var qualEl = document.getElementById("vendor-filter-qualification");
    var activeEl = document.getElementById("vendor-filter-active");
    var regionEl = document.getElementById("vendor-filter-region");
    var typeEl = document.getElementById("vendor-filter-type");

    return {
        search: searchEl ? searchEl.value.toLowerCase().trim() : "",
        qualification: qualEl ? qualEl.value : "",
        active: activeEl ? activeEl.value : "",
        region: regionEl ? regionEl.value : "",
        type: typeEl ? typeEl.value : "",
        review: document.getElementById("vendor-filter-review") ? document.getElementById("vendor-filter-review").value : ""
    };
}

function filterVendors() {
    var f = getVendorFilters();
    var results = [];

    for (var i = 0; i < vendors.length; i++) {
        var v = vendors[i];

        if (f.qualification && v.qualification_status !== f.qualification) continue;
        if (f.active && v.active_status !== f.active) continue;
        if (f.region && v.region !== f.region) continue;
        if (f.type && v.vendor_type !== f.type) continue;
        var reviewFilter = getFilterVal("vendor-filter-review");
        if (reviewFilter === "pending" && v.reviewed) continue;
        if (reviewFilter === "reviewed" && !v.reviewed) continue;

        if (f.search) {
            var searchable = [
                v.vendor_id, v.vendor_name, v.city, v.country_state,
                v.region, v.vendor_type, v.qualification_status, v.active_status
            ].join(" ").toLowerCase();

            if (searchable.indexOf(f.search) === -1) continue;
        }

        results.push({ index: i, vendor: v });
    }

    return results;
}

function clearVendorFilters() {
    document.getElementById("vendor-search").value = "";
    document.getElementById("vendor-filter-qualification").value = "";
    document.getElementById("vendor-filter-active").value = "";
    document.getElementById("vendor-filter-region").value = "";
    document.getElementById("vendor-filter-type").value = "";
    var reviewEl = document.getElementById("vendor-filter-review");
    if (reviewEl) reviewEl.value = "";
    renderVendorList();
}

function populateVendorTypeFilter() {
    var el = document.getElementById("vendor-filter-type");
    if (!el) return;

    var typeSet = {};
    for (var i = 0; i < vendors.length; i++) {
        if (vendors[i].vendor_type) typeSet[vendors[i].vendor_type] = true;
    }

    var types = Object.keys(typeSet).sort();
    var current = el.value;
    el.innerHTML = '<option value="">All Types</option>';
    for (var i = 0; i < types.length; i++) {
        var sel = types[i] === current ? " selected" : "";
        el.innerHTML += '<option value="' + types[i] + '"' + sel + '>' + types[i] + '</option>';
    }
}

/* ---------- List ---------- */

function renderVendorList() {
    if (vendorQuickUpdateMode) { renderVendorQuickUpdate(); return; }

    populateVendorTypeFilter();

    var filtered = filterVendors();

    // Attach sort values
    for (var i = 0; i < filtered.length; i++) {
        var v = filtered[i].vendor;
        filtered[i]._sortVals = {
            vendor_id: v.vendor_id,
            vendor_name: v.vendor_name,
            city: v.city || "",
            region: v.region || "",
            vendor_type: v.vendor_type || "",
            qualification: v.qualification_status || "",
            active: v.active_status || "",
            last_audit: getVendorLastAuditDate(v.vendor_id),
            risk: getVendorCurrentRisk(v.vendor_id)
        };
    }

    filtered = sortResults(filtered, currentSort.field, currentSort.dir);

    var columns = [
        { label: "ID", sortKey: "vendor_id" },
        { label: "Vendor Name", sortKey: "vendor_name" },
        { label: "City", sortKey: "city" },
        { label: "Region", sortKey: "region" },
        { label: "Type", sortKey: "vendor_type" },
        { label: "Qualification", sortKey: "qualification" },
        { label: "Active", sortKey: "active" },
        { label: "Last Audit", sortKey: "last_audit" },
        { label: "Risk", sortKey: "risk" },
        { label: "Actions", sortKey: null },
        { label: "Tags", sortKey: null }
    ];

    document.getElementById("vendor-table-head").innerHTML = buildSortableHeader(columns);

    var filterBar = document.getElementById("vendor-filter-bar");
    if (filterBar) filterBar.style.display = "flex";

    var tbody = document.getElementById("vendor-table-body");
    tbody.innerHTML = "";

    for (var i = 0; i < filtered.length; i++) {
        var v = filtered[i].vendor;
        var idx = filtered[i].index;

        var row = document.createElement("tr");
        row.style.cursor = "pointer";
        row.innerHTML =
            "<td>" + v.vendor_id + "</td>" +
            "<td>" + v.vendor_name + "</td>" +
            "<td>" + (v.city || "-") + "</td>" +
            "<td>" + (v.region || "-") + "</td>" +
            '<td><span class="' + getVendorTypeBadgeClass(v.vendor_type) + '">' + (v.vendor_type || "-") + '</span></td>' +
            '<td><span class="' + getQualificationBadgeClass(v.qualification_status) + '">' + (v.qualification_status || "-") + '</span></td>' +
            '<td><span class="' + getActiveBadgeClass(v.active_status) + '">' + (v.active_status || "-") + '</span></td>' +
            "<td>" + getVendorLastAuditDate(v.vendor_id) + "</td>" +
            "<td>" + getVendorCurrentRisk(v.vendor_id) + "</td>" +
            '<td class="row-actions">' +
                '<button class="btn-icon" onclick="event.stopPropagation(); showVendorDetail(' + idx + ')" title="View">&#128065;</button>' +
                '<button class="btn-icon" onclick="event.stopPropagation(); editVendor(' + idx + ')" title="Edit">&#9998;</button>' +
                '<button class="btn-icon btn-icon-danger" onclick="event.stopPropagation(); deleteVendor(' + idx + ')" title="Delete">&#128465;</button>' +
            "</td>" +
            "<td>" + getReviewedBadgeHtml(v) + "</td>";

        row.setAttribute("onclick", "showVendorDetail(" + idx + ")");
        tbody.appendChild(row);
    }

    var footer = document.getElementById("vendor-table-footer");
    if (footer) {
        footer.textContent = "Showing " + filtered.length + " of " + vendors.length + " vendors";
    }
}

/* ---------- Quick Update ---------- */

function showVendorQuickUpdate() {
    vendorQuickUpdateMode = true;
    document.getElementById("vendor-btn-bar").innerHTML =
        '<button class="btn-primary" onclick="saveVendorQuickUpdate()">Save All Changes</button>' +
        '<button class="btn-secondary" onclick="exitVendorQuickUpdate()">Back to List</button>';

    var filterBar = document.getElementById("vendor-filter-bar");
    if (filterBar) filterBar.style.display = "none";

    renderVendorQuickUpdate();
}

function exitVendorQuickUpdate() {
    vendorQuickUpdateMode = false;
    document.getElementById("vendor-btn-bar").innerHTML =
        '<button class="btn-primary" onclick="addVendor()">+ Add Vendor</button>' +
        '<button class="btn-secondary" onclick="showVendorQuickUpdate()">&#9889; Quick Update</button>';
    renderVendorList();
}

function renderVendorQuickUpdate() {
    var tbody = document.getElementById("vendor-table-body");
    tbody.innerHTML = "";

    document.getElementById("vendor-table-head").innerHTML =
        "<tr>" +
        "<th>Vendor Name</th><th>Current Qualification</th>" +
        "<th>Qualification Status</th><th>Active Status</th>" +
        "</tr>";

    var count = 0;
    for (var i = 0; i < vendors.length; i++) {
        var v = vendors[i];

        if (v.qualification_status !== "Pending" && v.qualification_status !== "Conditional") continue;

        count++;
        var row = document.createElement("tr");

        var qualOptions = "";
        for (var j = 0; j < OPTIONS.qualification_status.length; j++) {
            var opt = OPTIONS.qualification_status[j];
            var sel = opt === v.qualification_status ? " selected" : "";
            qualOptions += '<option value="' + opt + '"' + sel + '>' + opt + '</option>';
        }

        var actOptions = "";
        for (var j = 0; j < OPTIONS.active_status.length; j++) {
            var opt = OPTIONS.active_status[j];
            var sel = opt === v.active_status ? " selected" : "";
            actOptions += '<option value="' + opt + '"' + sel + '>' + opt + '</option>';
        }

        row.innerHTML =
            "<td>" + v.vendor_name + "</td>" +
            '<td><span class="badge badge-unscheduled">' + (v.qualification_status || "-") + "</span></td>" +
            '<td><select class="qu-input" data-index="' + i + '" data-field="qualification_status">' + qualOptions + '</select></td>' +
            '<td><select class="qu-input" data-index="' + i + '" data-field="active_status">' + actOptions + '</select></td>';

        tbody.appendChild(row);
    }

    if (count === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:#64748b;">No vendors with Pending or Conditional status.</td></tr>';
    }

    var footer = document.getElementById("vendor-table-footer");
    if (footer) footer.textContent = "Showing " + count + " vendors requiring status update";
}

function saveVendorQuickUpdate() {
    var inputs = document.querySelectorAll(".qu-input");
    for (var i = 0; i < inputs.length; i++) {
        var el = inputs[i];
        var index = parseInt(el.getAttribute("data-index"), 10);
        var fieldName = el.getAttribute("data-field");
        vendors[index][fieldName] = el.value;
    }

    saveData();
    alert("Changes saved.");
    renderVendorQuickUpdate();
}

/* ---------- Vendor Detail View ---------- */

function showVendorDetail(index) {
    var v = vendors[index];
    var detailView = document.getElementById("view-vendor-detail");

    document.getElementById("view-dashboard").style.display = "none";
    document.getElementById("view-audits").style.display = "none";
    document.getElementById("view-vendors").style.display = "none";
    document.getElementById("view-auditors").style.display = "none";
    detailView.style.display = "block";
    currentView = "vendor-detail";

    var links = document.querySelectorAll(".navbar-links a");
    for (var i = 0; i < links.length; i++) {
        links[i].className = links[i].getAttribute("data-view") === "vendors" ? "active" : "";
    }

    var html = "";

    html += '<div class="detail-header">';
    html += '<button class="btn-secondary" onclick="showView(\'vendors\')">&larr; Back to Vendors</button>';
    html += '<div class="detail-header-actions">';
    html += '<button class="btn-primary" onclick="editVendor(' + index + ')">&#9998; Edit Vendor</button>';
    html += '</div></div>';

    html += '<h1 class="page-title">' + v.vendor_name + '</h1>';

    html += '<div class="detail-grid">';

    html += '<div class="detail-card">';
    html += '<div class="detail-card-title">Location & Classification</div>';
    html += detailRow("City", v.city);
    html += detailRow("Country/State", v.country_state);
    html += detailRow("Region", v.region);
    html += detailRow("Address", v.address);
    html += detailRow("Vendor Type", v.vendor_type);
    html += '</div>';

    html += '<div class="detail-card">';
    html += '<div class="detail-card-title">Status</div>';
    html += detailRow("Qualification", v.qualification_status);
    html += detailRow("Active", v.active_status);
    html += detailRow("Date Added", v.date_added);
    html += detailRow("Added By", v.added_by);
    html += '</div>';

    html += '<div class="detail-card">';
    html += '<div class="detail-card-title">Audit Summary</div>';
    html += detailRow("Last Audit", getVendorLastAuditDate(v.vendor_id));
    html += detailRow("Last Outcome", getVendorLastOutcome(v.vendor_id));
    html += detailRow("Risk Rating", getVendorCurrentRisk(v.vendor_id));
    html += detailRow("Interval", getVendorCurrentInterval(v.vendor_id));
    html += detailRow("Next Due", getVendorNextAuditDue(v.vendor_id));
    html += '</div>';

    html += '</div>';

    html += '<div class="detail-section">';
    html += '<div class="detail-section-title">Site & Material Assignments</div>';
    html += '<table><thead><tr><th>Business Unit</th><th>Site</th><th>Material / Service</th><th>Subtype</th></tr></thead><tbody>';
    var sm = v.site_materials || [];
    if (sm.length === 0) {
        html += '<tr><td colspan="4">No site-material assignments</td></tr>';
    } else {
        for (var j = 0; j < sm.length; j++) {
            html += '<tr>';
            html += '<td>' + (sm[j].business_unit || '-') + '</td>';
            html += '<td>' + (sm[j].site || '-') + '</td>';
            html += '<td>' + (sm[j].material_or_service || '-') + '</td>';
            html += '<td>' + (sm[j].material_subtype || '-') + '</td>';
            html += '</tr>';
        }
    }
    html += '</tbody></table></div>';

    if (v.notes || v.folder_link) {
        html += '<div class="detail-section">';
        html += '<div class="detail-section-title">Notes & Links</div>';
        if (v.notes) html += '<p class="detail-notes">' + v.notes + '</p>';
        if (v.folder_link) html += '<p><a href="' + v.folder_link + '" target="_blank" class="detail-link">&#128193; Open Vendor Folder</a></p>';
        html += '</div>';
    }

    html += '<div class="detail-section">';
    html += '<div class="detail-section-title">Audit History</div>';
    var va = getVendorAudits(v.vendor_id);
    if (va.length === 0) {
        html += '<p>No audits recorded for this vendor.</p>';
    } else {
        html += '<table><thead><tr>';
        html += '<th>Audit ID</th><th>Type</th><th>Method</th><th>Required By</th>';
        html += '<th>Start</th><th>End</th><th>Outcome</th><th>Risk</th><th>Scheduling Status</th><th>Actions</th>';
        html += '</tr></thead><tbody>';
        for (var j = 0; j < va.length; j++) {
            var a = va[j];
            var auditIndex = audits.indexOf(a);
            var sched = getSchedulingStatus(a);
            html += '<tr>';
            html += '<td>' + (a.audit_id || '-') + '</td>';
            html += '<td>' + (a.audit_type || '-') + '</td>';
            html += '<td>' + (a.audit_method || '-') + '</td>';
            html += '<td>' + formatDateDisplay(a.audit_required_by) + '</td>';
            html += '<td>' + formatDateDisplay(a.audit_start) + '</td>';
            html += '<td>' + formatDateDisplay(a.audit_end) + '</td>';
            html += '<td>' + (a.audit_outcome || '-') + '</td>';
            html += '<td>' + (a.risk_rating || '-') + '</td>';
            html += '<td><span class="' + getScheduleBadgeClass(sched) + '">' + sched + '</span></td>';
            html += '<td class="row-actions"><button class="btn-icon" onclick="editAudit(' + auditIndex + ')" title="Edit">&#9998;</button></td>';
            html += '</tr>';
        }
        html += '</tbody></table>';
    }
    html += '</div>';

    if (!v.reviewed) {
        html += '<div style="margin-top:16px;">';
        html += '<button class="btn-primary" onclick="markVendorReviewed(' + index + ')">&#10003; Mark Reviewed</button>';
        html += '</div>';
    }

    detailView.innerHTML = html;
}

function detailRow(label, value) {
    return '<div class="detail-row"><span class="detail-label">' + label + '</span><span class="detail-value">' + (value || "-") + '</span></div>';
}

/* ---------- CRUD ---------- */

function addVendor() {
    modalMode = "add-vendor";
    editIndex = null;
    document.getElementById("modal-body").innerHTML = buildVendorForm(null);
    openModal("Add Vendor");
}

function editVendor(index) {
    modalMode = "edit-vendor";
    editIndex = index;
    document.getElementById("modal-body").innerHTML = buildVendorForm(vendors[index]);
    openModal("Edit Vendor");
}

function deleteVendor(index) {
    if (confirm("Delete this vendor and all associated audits? This cannot be undone.")) {
        var vid = vendors[index].vendor_id;
        for (var i = audits.length - 1; i >= 0; i--) {
            if (audits[i].vendor_id === vid) audits.splice(i, 1);
        }
        vendors.splice(index, 1);
        saveData();
        if (currentView === "vendor-detail") showView("vendors");
        else renderVendorList();
    }
}

/* ---------- Form ---------- */

function buildVendorForm(v) {
    if (!v) {
        v = {
            vendor_id: generateVendorId(), vendor_name: "",
            date_added: formatDate(new Date()), added_by: "",
            city: "", country_state: "", region: "", address: "",
            vendor_type: "",
            site_materials: [{ business_unit: "", site: "", material_or_service: "", material_subtype: "" }],
            qualification_status: "Pending", active_status: "Active",
            notes: "", folder_link: "",
            reviewed: false
        };
    }

    var html = "";

    html += section("Identity");
    html += row(
        field("Vendor ID", buildReadonly("f-vendor-vid", v.vendor_id)),
        field("Date Added", buildReadonly("f-vendor-date-added", v.date_added))
    );
    html += row(field("Vendor Name", buildInput("f-vendor-name", "text", v.vendor_name)));
    html += row(field("Added By", buildInput("f-vendor-added-by", "text", v.added_by)));

    html += section("Location");
    html += row(
        field("City", buildInput("f-vendor-city", "text", v.city)),
        field("Country / State", buildInput("f-vendor-country", "text", v.country_state))
    );
    html += row(
        field("Region", buildSelect("f-vendor-region", OPTIONS.region, v.region)),
        field("Address", buildInput("f-vendor-address", "text", v.address))
    );

    html += section("Classification");
    html += row(field("Vendor Type", buildSelect("f-vendor-type", OPTIONS.vendor_type, v.vendor_type)));

    html += section("Site & Material Assignments");
    html += '<div id="f-site-materials">';
    var sm = v.site_materials || [{ business_unit: "", site: "", material_or_service: "", material_subtype: "" }];
    for (var i = 0; i < sm.length; i++) {
        html += buildSiteMaterialRow(i, sm[i]);
    }
    html += '</div>';
    html += '<div style="margin-bottom:16px;"><button type="button" class="btn-secondary" onclick="addSiteMaterialRow()">+ Add Assignment</button></div>';

    html += section("Status");
    html += row(
        field("Qualification Status", buildSelect("f-vendor-qual", OPTIONS.qualification_status, v.qualification_status)),
        field("Active Status", buildSelect("f-vendor-active", OPTIONS.active_status, v.active_status))
    );

    html += section("Notes & Links");
    html += row(field("Notes", buildTextarea("f-vendor-notes", v.notes)));
    html += row(field("Folder Link", buildInput("f-vendor-folder", "text", v.folder_link)));

    return html;
}

function buildSiteMaterialRow(index, sm) {
    var html = '<div class="form-row site-material-row" data-sm-index="' + index + '">';
    html += '<div class="form-field"><label>Business Unit</label>' + buildSelect("f-sm-bu-" + index, OPTIONS.business_unit, sm.business_unit) + '</div>';
    html += '<div class="form-field"><label>Site</label>' + buildSelect("f-sm-site-" + index, OPTIONS.site, sm.site) + '</div>';
    html += '<div class="form-field"><label>Material / Service</label><input type="text" id="f-sm-mat-' + index + '" value="' + (sm.material_or_service || "") + '"></div>';
    html += '<div class="form-field"><label>Subtype</label><input type="text" id="f-sm-sub-' + index + '" value="' + (sm.material_subtype || "") + '"></div>';
    html += '<div class="form-field" style="flex:0;align-self:flex-end;"><button type="button" class="btn-icon btn-icon-danger" onclick="removeSiteMaterialRow(' + index + ')" title="Remove">&#128465;</button></div>';
    html += '</div>';
    return html;
}

function addSiteMaterialRow() {
    var container = document.getElementById("f-site-materials");
    var count = container.querySelectorAll(".site-material-row").length;
    container.insertAdjacentHTML("beforeend", buildSiteMaterialRow(count, { business_unit: "", site: "", material_or_service: "", material_subtype: "" }));
}

function removeSiteMaterialRow(index) {
    var rows = document.querySelectorAll(".site-material-row");
    if (rows.length <= 1) { alert("At least one site-material assignment is required."); return; }
    rows[index].remove();
    var remaining = document.querySelectorAll(".site-material-row");
    for (var i = 0; i < remaining.length; i++) {
        remaining[i].setAttribute("data-sm-index", i);
    }
}

function readVendorForm() {
    var smRows = document.querySelectorAll(".site-material-row");
    var siteMaterials = [];
    for (var i = 0; i < smRows.length; i++) {
        var idx = smRows[i].getAttribute("data-sm-index");
        siteMaterials.push({
            business_unit: document.getElementById("f-sm-bu-" + idx).value,
            site: document.getElementById("f-sm-site-" + idx).value,
            material_or_service: document.getElementById("f-sm-mat-" + idx).value.trim(),
            material_subtype: document.getElementById("f-sm-sub-" + idx).value.trim()
        });
    }

    return {
        vendor_id: document.getElementById("f-vendor-vid").value,
        vendor_name: document.getElementById("f-vendor-name").value.trim(),
        date_added: document.getElementById("f-vendor-date-added").value,
        added_by: document.getElementById("f-vendor-added-by").value.trim(),
        city: document.getElementById("f-vendor-city").value.trim(),
        country_state: document.getElementById("f-vendor-country").value.trim(),
        region: document.getElementById("f-vendor-region").value,
        address: document.getElementById("f-vendor-address").value.trim(),
        vendor_type: document.getElementById("f-vendor-type").value,
        site_materials: siteMaterials,
        qualification_status: document.getElementById("f-vendor-qual").value,
        active_status: document.getElementById("f-vendor-active").value,
        notes: document.getElementById("f-vendor-notes").value.trim(),
        folder_link: document.getElementById("f-vendor-folder").value.trim()
    };
}

function validateVendorForm(v) {
    var errors = [];
    if (!v.vendor_name) errors.push("Vendor Name is required.");
    if (!v.region) errors.push("Region is required.");
    return errors;
}

/* ---------- Review ---------- */

function markVendorReviewed(index) {
    vendors[index].reviewed = true;
    saveData();
    renderVendorList();
    showVendorDetail(index);
}
