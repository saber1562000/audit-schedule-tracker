/* ============================================
   AUDITORS MODULE
   ============================================ */

var auditorRegionFilter = "All";

function renderAuditorList() {
    // Region tabs
    var tabContainer = document.getElementById("auditor-region-tabs");
    if (tabContainer) {
        var regionTabs = ["All", "USA", "EU", "India", "Asia"];
        var tabHtml = '<div class="cap-region-tabs" style="margin-bottom:16px;">';
        for (var i = 0; i < regionTabs.length; i++) {
            var activeClass = auditorRegionFilter === regionTabs[i] ? " cap-tab-active" : "";
            tabHtml += '<button class="cap-tab' + activeClass + '" onclick="setAuditorRegion(\'' + regionTabs[i] + '\')">' + regionTabs[i] + '</button>';
        }
        tabHtml += '</div>';
        tabContainer.innerHTML = tabHtml;
    }

    var results = [];
    for (var i = 0; i < auditors.length; i++) {
        var a = auditors[i];
        if (auditorRegionFilter !== "All" && a.region !== auditorRegionFilter) continue;

        results.push({
            index: i,
            auditor: a,
            _sortVals: {
                auditor_id: a.auditor_id,
                name: a.first_name + " " + a.last_name,
                email: a.email || "",
                region: a.region || "",
                status: a.active_status || "",
                date_added: a.date_added || ""
            }
        });
    }

    results = sortResults(results, currentSort.field, currentSort.dir);

    var columns = [
        { label: "ID", sortKey: "auditor_id" },
        { label: "Name", sortKey: "name" },
        { label: "Email", sortKey: "email" },
        { label: "Region", sortKey: "region" },
        { label: "Status", sortKey: "status" },
        { label: "Date Added", sortKey: "date_added" },
        { label: "Actions", sortKey: null }
    ];

    var thead = document.querySelector("#view-auditors thead");
    if (thead) thead.innerHTML = buildSortableHeader(columns);

    var tbody = document.getElementById("auditor-table-body");
    tbody.innerHTML = "";

    for (var i = 0; i < results.length; i++) {
        var a = results[i].auditor;
        var idx = results[i].index;
        var statusClass = a.active_status === "Active" ? "badge-completed" : "badge-cancelled";

        var row = document.createElement("tr");
        row.innerHTML =
            "<td>" + a.auditor_id + "</td>" +
            "<td>" + a.first_name + " " + a.last_name + "</td>" +
            "<td>" + (a.email || "-") + "</td>" +
            "<td>" + (a.region || "-") + "</td>" +
            '<td><span class="badge ' + statusClass + '">' + a.active_status + "</span></td>" +
            "<td>" + (a.date_added || "-") + "</td>" +
            '<td class="row-actions">' +
                '<button class="btn-icon btn-icon-view" onclick="showAuditorDetail(' + idx + ')" title="View">&#128065;</button>' +
                '<button class="btn-icon" onclick="editAuditorPage(' + idx + ')" title="Edit">&#9998;</button>' +
                '<button class="btn-icon btn-icon-danger" onclick="deleteAuditor(' + idx + ')" title="Delete">&#128465;</button>' +
            "</td>";

        tbody.appendChild(row);
    }

    var footer = document.getElementById("auditor-table-footer");
    if (footer) footer.textContent = "Showing " + results.length + " of " + auditors.length + " auditors";
}

function setAuditorRegion(region) {
    auditorRegionFilter = region;
    renderAuditorList();
}

/* ---------- CRUD ---------- */

function addAuditor() {
    modalMode = "add-auditor";
    editIndex = null;
    document.getElementById("modal-body").innerHTML = buildAuditorForm(null);
    openModal("Add Auditor");
}

function editAuditorPage(index) {
    showAuditorDetail(index, false);
}

function editAuditor(index) {
    showAuditorDetail(index, false);
}

function deleteAuditor(index) {
    if (confirm("Delete this auditor? This cannot be undone.")) {
        auditors.splice(index, 1);
        saveData();
        renderAuditorList();
    }
}

/* ---------- Auditor Detail (Full Page) ---------- */

function showAuditorDetail(index, readOnly) {
    if (readOnly === undefined) readOnly = true;
    editIndex = index;
    var a = auditors[index];
    var container = document.getElementById("view-auditor-detail");

    var allViews = ["dashboard", "audits", "vendors", "vendor-detail", "audit-detail", "auditors", "forecast", "risk", "capacity", "closure", "skills"];
    for (var i = 0; i < allViews.length; i++) {
        var el = document.getElementById("view-" + allViews[i]);
        if (el) el.style.display = "none";
    }
    container.style.display = "block";
    currentView = "auditor-detail";

    var links = document.querySelectorAll(".sidebar-item");
    for (var i = 0; i < links.length; i++) {
        var dv = links[i].getAttribute("data-view");
        if (dv) {
            links[i].className = "sidebar-item" + (dv === "auditors" ? " active" : "");
        }
    }
    expandSectionForView("auditor-detail");

    var statusClass = a.active_status === "Active" ? "badge-completed" : "badge-cancelled";

    var html = "";

    // Header
    html += '<div class="detail-header">';
    html += '<button class="btn-secondary" onclick="showView(\'auditors\')">&larr; Back to Auditors</button>';
    html += '<div class="detail-header-actions">';
    if (readOnly) {
        html += '<button class="btn-primary" onclick="showAuditorDetail(' + index + ', false)">&#9998; Edit Auditor</button>';
    } else {
        html += '<button class="btn-secondary" onclick="showAuditorDetail(' + index + ', true)">Cancel</button>';
        html += '<button class="btn-danger" onclick="deleteAuditorFromDetail(' + index + ')">Delete</button>';
        html += '<button class="btn-primary" onclick="saveAuditorDetail(' + index + ')">Save Auditor</button>';
    }
    html += '</div></div>';

    // Title
    html += '<div class="audit-detail-title">';
    html += '<h1 class="page-title">' + a.first_name + ' ' + a.last_name + '</h1>';
    html += '<div class="audit-detail-badges">';
    html += '<span class="badge ' + statusClass + '">' + a.active_status + '</span>';
    if (a.region) html += '<span class="badge badge-scheduled">' + a.region + '</span>';
    html += '</div></div>';

    if (readOnly) {
        html += buildAuditorDetailReadOnly(a, index);
    } else {
        html += '<div class="audit-detail-form">';
        html += buildAuditorForm(a);
        html += '</div>';
    }

    container.innerHTML = html;
}

function saveAuditorDetail(index) {
    var auditorData = readAuditorForm();
    var errors = validateAuditorForm(auditorData);
    if (errors.length > 0) {
        alert(errors.join("\n"));
        return;
    }
    auditors[index] = auditorData;
    saveData();
    showAuditorDetail(index, true);
}

function deleteAuditorFromDetail(index) {
    if (confirm("Delete this auditor? This cannot be undone.")) {
        auditors.splice(index, 1);
        saveData();
        showView("auditors");
    }
}

/* ---------- Read-Only View ---------- */

function buildAuditorDetailReadOnly(a, index) {
    var html = '';

    // Info cards
    html += '<div class="detail-grid">';

    html += '<div class="detail-card">';
    html += '<div class="detail-card-title">Details</div>';
    html += detailRow("Auditor ID", a.auditor_id);
    html += detailRow("Email", a.email || "-");
    html += detailRow("Region", a.region || "-");
    html += detailRow("Date Added", formatDateDisplay(a.date_added));
    html += '</div>';

    html += '<div class="detail-card">';
    html += '<div class="detail-card-title">Capacity</div>';
    var ceiling = getAuditorCeiling(a);
    var year = new Date().getFullYear().toString();
    var annualLoad = getAuditorAnnualLoad(a.auditor_id, year);
    var auditCount = getAuditorAnnualAuditCount(a.auditor_id, year);
    var utilPct = ceiling > 0 ? annualLoad / ceiling : 0;
    var status = getCapacityStatus(utilPct);
    var statusClass = getCapacityStatusClass(status);
    html += detailRow("CU Ceiling", ceiling + (a.cu_ceiling ? " (custom)" : " (default)"));
    html += detailRow("Audits Assigned (" + year + ")", auditCount);
    html += detailRow("Utilisation", Math.round(utilPct * 100) + "%");
    html += detailRow("Status", '<span class="' + statusClass + '">' + status + '</span>');
    html += '</div>';

    html += '<div class="detail-card">';
    html += '<div class="detail-card-title">Skills Overview</div>';
    var categories = getSkillCategories();
    for (var c = 0; c < categories.length; c++) {
        var catAvg = getAuditorCategoryAvg(a, categories[c]);
        var shortCat = categories[c].replace("Technical / Domain Knowledge", "Tech Domain")
                          .replace("Regulatory & Standards", "Regulatory")
                          .replace("Risk & Quality Systems", "Risk & Quality")
                          .replace("Audit Execution", "Audit Exec.")
                          .replace("Soft & Professional Skills", "Soft Skills");
        html += detailRow(shortCat, catAvg !== null ? catAvg + " / 4.0" : "Not assessed");
    }
    html += '</div>';

    html += '</div>';

    // Notes
    if (a.notes) {
        html += '<div class="detail-grid"><div class="detail-card">';
        html += '<div class="detail-card-title">Notes</div>';
        html += '<div style="font-size:13px; color:var(--text); padding:4px 0;">' + a.notes + '</div>';
        html += '</div></div>';
    }

    // Audit history
    html += '<div class="dash-card" style="margin-top:16px;">';
    html += '<div class="dash-card-title">Audit History</div>';

    var auditorAudits = [];
    for (var i = 0; i < audits.length; i++) {
        if (audits[i].assigned_auditor === a.auditor_id || audits[i].second_auditor === a.auditor_id) {
            auditorAudits.push({ audit: audits[i], index: i });
        }
    }

    auditorAudits.sort(function (a, b) {
        var da = a.audit.audit_required_by || "";
        var db = b.audit.audit_required_by || "";
        return db.localeCompare(da);
    });

    if (auditorAudits.length === 0) {
        html += '<div style="padding:12px; color:var(--text-muted); font-size:13px;">No audits assigned to this auditor.</div>';
    } else {
        html += '<table><thead><tr>';
        html += '<th>Audit ID</th><th>Vendor</th><th>Type</th><th>Method</th><th>Role</th><th>Required By</th><th>Start</th><th>End</th><th>Status</th><th>Actions</th>';
        html += '</tr></thead><tbody>';

        for (var i = 0; i < auditorAudits.length; i++) {
            var au = auditorAudits[i].audit;
            var auIdx = auditorAudits[i].index;
            var role = au.assigned_auditor === a.auditor_id ? "Lead" : "Co-Auditor";
            var roleClass = role === "Lead" ? "badge-scheduled" : "badge-future";
            var sched = getSchedulingStatus(au);

            html += '<tr>';
            html += '<td>' + (au.audit_id || "-") + '</td>';
            html += '<td>' + getVendorName(au.vendor_id) + '</td>';
            html += '<td>' + (au.audit_type || "-") + '</td>';
            html += '<td>' + (au.audit_method || "-") + '</td>';
            html += '<td><span class="badge ' + roleClass + '">' + role + '</span></td>';
            html += '<td>' + formatDateDisplay(au.audit_required_by) + '</td>';
            html += '<td>' + formatDateDisplay(au.audit_start) + '</td>';
            html += '<td>' + formatDateDisplay(au.audit_end) + '</td>';
            html += '<td><span class="' + getScheduleBadgeClass(sched) + '">' + sched + '</span></td>';
            html += '<td class="row-actions">';
            html += '<button class="btn-icon btn-icon-view" onclick="showAuditDetail(' + auIdx + ')" title="View">&#128065;</button>';
            html += '</td>';
            html += '</tr>';
        }

        html += '</tbody></table>';
    }

    html += '</div>';

    return html;
}

/* ---------- Form ---------- */

function buildAuditorForm(a) {
    if (!a) {
        a = {
            auditor_id: generateAuditorId(),
            first_name: "", last_name: "", email: "",
            region: "", active_status: "Active",
            date_added: formatDate(new Date()), notes: "", cu_ceiling: null, skills: []
        };
    }

    var html = "";

    html += section("Details");
    html += row(
        field("Auditor ID", buildReadonly("f-aud-id", a.auditor_id)),
        field("Status", buildSelect("f-aud-status", OPTIONS.active_status, a.active_status))
    );
    html += row(
        field("First Name", buildInput("f-aud-first", "text", a.first_name)),
        field("Last Name", buildInput("f-aud-last", "text", a.last_name))
    );
    html += row(
        field("Email", buildInput("f-aud-email", "email", a.email)),
        field("Region", buildSelect("f-aud-region", OPTIONS.region, a.region))
    );
    html += row(
        field("CU Ceiling", '<input type="number" id="f-aud-ceiling" value="' + (a.cu_ceiling || "") + '" placeholder="Default: ' + cuConfig.default_annual_ceiling + '" step="1" min="0">'),
        field("Date Added", buildReadonly("f-aud-date", a.date_added))
    );

    html += section("Skills & Competency");
    html += buildAuditorSkillsForm(a.skills || []);

    html += section("Notes");
    html += row(
        field("Notes", buildTextarea("f-aud-notes", a.notes))
    );

    return html;
}

function readAuditorForm() {
    return {
        auditor_id: document.getElementById("f-aud-id").value,
        first_name: document.getElementById("f-aud-first").value.trim(),
        last_name: document.getElementById("f-aud-last").value.trim(),
        email: document.getElementById("f-aud-email").value.trim(),
        region: document.getElementById("f-aud-region").value,
        active_status: document.getElementById("f-aud-status").value,
        date_added: document.getElementById("f-aud-date").value,
        notes: document.getElementById("f-aud-notes").value.trim(),
        cu_ceiling: document.getElementById("f-aud-ceiling").value ? parseFloat(document.getElementById("f-aud-ceiling").value) : null,
        skills: readAuditorSkills()
    };
}

function validateAuditorForm(a) {
    var errors = [];
    if (!a.first_name) errors.push("First name is required.");
    if (!a.last_name) errors.push("Last name is required.");
    return errors;
}

/* ---------- Skills Entry ---------- */

function buildAuditorSkillsForm(existingSkills) {
    var categories = getSkillCategories();
    var skillMap = {};
    for (var i = 0; i < existingSkills.length; i++) {
        skillMap[existingSkills[i].skill_id] = existingSkills[i];
    }

    var categoryFraming = {
        "Regulatory & Standards": "When scoring each regulation or standard below, consider: could you teach someone how to audit against it, not just what it says, but how it should be applied and what good compliance looks like? On-site, would you independently spot where a vendor\u2019s practices fall short of the standard, or would you need to look it up and check? And is this an area you\u2019re actively trying to deepen your understanding in?",
        "Audit Execution": "When scoring each audit skill below, consider: could you coach a less experienced auditor through this aspect of running an audit? If you were leading an audit and this situation came up, would you handle it confidently on your own or need to defer to someone more experienced? And is this something you\u2019re actively working to get better at?",
        "Technical / Domain Knowledge": "When scoring each technical area below, consider: could you explain to a colleague how this process should work and what to look for when auditing it? If you were walking a shop floor or reviewing documentation in this area, would you recognise problems independently or would you need a specialist alongside you? And is this an area you\u2019re motivated to learn more about?",
        "Risk & Quality Systems": "When scoring each quality system area below, consider: could you train someone on what a robust system looks like in this area and how to evaluate it during an audit? On-site, would you confidently assess whether the vendor\u2019s approach is adequate, or would you flag it for someone else to evaluate? And is this an area where you\u2019re seeking deeper expertise?",
        "Soft & Professional Skills": "When scoring each skill below, consider: could you mentor a junior auditor on how to handle this aspect of the job? When you\u2019ve been in situations requiring this skill, have you handled it confidently without support, or did you rely on others? And is this something you\u2019re consciously trying to develop?"
    };

    var html = '<div class="skills-entry">';

    html += '<div class="forecast-explainer" style="margin-bottom:16px;">';
    html += '<strong>How to assess yourself</strong><br><br>';
    html += 'In order to accurately assess yourself, ground the context by which you base your assessment of each criterion on the principles below. ';
    html += 'It\'s not a question of capability as an auditor, it\'s about specific capabilities within specific contexts.<br><br>';
    html += '<strong>Knowledge:</strong> Could you teach this? Think about whether you could stand in front of a room and explain it. ';
    html += '<em>Never Encountered</em> means it hasn\'t come up in your career yet. ';
    html += '<em>Aware</em> means you know what it is but couldn\'t easily explain it to someone else. ';
    html += '<em>Could Explain</em> means you could walk a colleague through the basics with some prep. ';
    html += '<em>Could Coach</em> means you could confidently train someone from practical experience. ';
    html += '<em>Could Lecture</em> means you could deliver a detailed session to a group with no preparation.<br><br>';
    html += '<strong>Audit Confidence:</strong> If this came up on-site, could you assess it? ';
    html += '<em>Observer</em> means you might not catch issues independently, and that\'s fine, it just means you haven\'t had exposure yet. ';
    html += '<em>Identifier</em> means you\'d know something\'s wrong but would need support to fully evaluate it ';
    html += '(picture seeing a helicopter in a tree: you\'d know someone flew it wrong, even if you can\'t fly one yourself). ';
    html += '<em>Assessor</em> means this is home turf, you\'d spot issues immediately and independently assess to a good standard.<br><br>';
    html += '<strong>Drive:</strong> Would you actively pursue deeper knowledge in this area without being pushed? ';
    html += '<em>Content</em> means you\'re satisfied at your current level right now. ';
    html += '<em>Open to It</em> means you\'d engage if something came up. ';
    html += '<em>Actively Curious</em> means you\'re already seeking out learning in this area.<br><br>';
    html += 'Most auditors will be <em>Aware</em> or <em>Could Explain</em> across the majority of skills. ';
    html += 'A typical profile might show <em>Could Coach</em> in 5\u20138 areas and <em>Could Lecture</em> in 1\u20133. ';
    html += 'A balanced, honest profile is far more valuable than an inflated one.';
    html += '</div>';

    for (var c = 0; c < categories.length; c++) {
        var cat = categories[c];
        var catSkills = getSkillsByCategory(cat);

        html += '<div class="skills-category">';
        html += '<div class="skills-category-title" onclick="toggleSkillCategory(this)">' + cat + ' <span class="sidebar-chevron">&#9662;</span></div>';
        html += '<div class="skills-category-body">';
        if (categoryFraming[cat]) {
            html += '<div class="skills-category-framing">' + categoryFraming[cat] + '</div>';
        }
        html += '<table class="skills-table"><thead><tr>';
        html += '<th>Skill</th><th>Knowledge</th><th>Audit Confidence</th><th>Drive</th>';
        html += '</tr></thead><tbody>';

        for (var s = 0; s < catSkills.length; s++) {
            var sk = catSkills[s];
            var existing = skillMap[sk.skill_id] || {};

            html += '<tr>';
            html += '<td class="skills-name">' + sk.skill_name + '</td>';
            html += '<td>' + buildSkillProfSelect('sk-prof-' + sk.skill_id, existing.proficiency) + '</td>';
            html += '<td>' + buildSkillConfSelect('sk-conf-' + sk.skill_id, existing.confidence) + '</td>';
            html += '<td>' + buildSkillDriveSelect('sk-int-' + sk.skill_id, existing.interest) + '</td>';
            html += '</tr>';
        }

        html += '</tbody></table>';
        html += '</div></div>';
    }

    html += '</div>';
    return html;
}

function buildSkillProfSelect(id, value) {
    var opts = [
        { val: "", label: "-" },
        { val: "0", label: "Never Encountered" },
        { val: "1", label: "Aware" },
        { val: "2", label: "Could Explain" },
        { val: "3", label: "Could Coach" },
        { val: "4", label: "Could Lecture" }
    ];
    var html = '<select id="' + id + '" class="skill-select">';
    for (var i = 0; i < opts.length; i++) {
        var sel = (value !== undefined && value !== null && opts[i].val === value.toString()) ? " selected" : "";
        html += '<option value="' + opts[i].val + '"' + sel + '>' + opts[i].label + '</option>';
    }
    html += '</select>';
    return html;
}

function buildSkillConfSelect(id, value) {
    var opts = ["", "L", "M", "H"];
    var labels = ["-", "Observer", "Identifier", "Assessor"];
    var html = '<select id="' + id + '" class="skill-select-sm">';
    for (var i = 0; i < opts.length; i++) {
        var sel = (value && opts[i] === value) ? " selected" : "";
        html += '<option value="' + opts[i] + '"' + sel + '>' + labels[i] + '</option>';
    }
    html += '</select>';
    return html;
}

function buildSkillDriveSelect(id, value) {
    var opts = ["", "L", "M", "H"];
    var labels = ["-", "Content", "Open to It", "Actively Curious"];
    var html = '<select id="' + id + '" class="skill-select-sm">';
    for (var i = 0; i < opts.length; i++) {
        var sel = (value && opts[i] === value) ? " selected" : "";
        html += '<option value="' + opts[i] + '"' + sel + '>' + labels[i] + '</option>';
    }
    html += '</select>';
    return html;
}

function readAuditorSkills() {
    var skills = [];
    for (var i = 0; i < skillsCatalogue.length; i++) {
        var sk = skillsCatalogue[i];
        var profEl = document.getElementById('sk-prof-' + sk.skill_id);
        var confEl = document.getElementById('sk-conf-' + sk.skill_id);
        var intEl = document.getElementById('sk-int-' + sk.skill_id);

        if (!profEl) continue;

        var prof = profEl.value;
        var conf = confEl ? confEl.value : "";
        var interest = intEl ? intEl.value : "";

        if (prof === "" && conf === "" && interest === "") continue;

        skills.push({
            skill_id: sk.skill_id,
            proficiency: prof !== "" ? parseInt(prof) : null,
            confidence: conf || "",
            interest: interest || "",
            last_assessed: formatDate(new Date())
        });
    }
    return skills;
}

function toggleSkillCategory(el) {
    var body = el.nextElementSibling;
    if (body) {
        body.style.display = body.style.display === "none" ? "" : "none";
        var chevron = el.querySelector(".sidebar-chevron");
        if (chevron) {
            chevron.style.transform = body.style.display === "none" ? "rotate(-90deg)" : "";
        }
    }
}