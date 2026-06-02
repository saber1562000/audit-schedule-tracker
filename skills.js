/* ============================================
   SKILLS MATRIX MODULE
   Team heatmap, gap dashboard, profiles
   ============================================ */

var skillsView = "heatmap";
var skillsCategoryFilter = "";

/* ---------- Main Render ---------- */

function renderSkillsMatrix() {
    var container = document.getElementById("view-skills");

    var html = '';

    html += '<div class="view-header">';
    html += '<h1 class="page-title">Skills Matrix</h1>';
    html += '</div>';

    html += '<div class="forecast-explainer">';
    html += '<strong>How to read this matrix</strong><br><br>';
    html += 'Auditors self-assess across three dimensions per skill. The heatmap shows <strong>Knowledge</strong> scores, colour-coded from red (0) to green (4). ';
    html += 'Hover over any cell to see the full assessment including Audit Confidence and Drive.<br><br>';
    html += '<strong>Knowledge</strong> is scored on a teaching scale. Auditors are asked: <em>"could you teach this?"</em> ';
    html += 'A score of 0 (<em>Never Encountered</em>) means the topic hasn\'t arisen in their career. ';
    html += '1 (<em>Aware</em>) means basic familiarity without the ability to explain it. ';
    html += '2 (<em>Could Explain</em>) means they could walk someone through the basics with preparation. ';
    html += '3 (<em>Could Coach</em>) means they could train others from practical experience. ';
    html += '4 (<em>Could Lecture</em>) means they could deliver a detailed session with no preparation.<br><br>';
    html += '<strong>Audit Confidence</strong> reflects whether the auditor could independently handle this topic on-site. ';
    html += '<em>Observer</em> means they might not catch issues independently. ';
    html += '<em>Identifier</em> means they\'d recognise something is wrong but would need support to fully evaluate. ';
    html += '<em>Assessor</em> means they\'d independently assess to a good standard.<br><br>';
    html += '<strong>Drive</strong> indicates self-motivated interest in deeper learning. ';
    html += '<em>Content</em> means satisfied at their current level. <em>Open to It</em> means receptive if opportunities arise. ';
    html += '<em>Actively Curious</em> means they\'re already seeking out knowledge in this area.<br><br>';
    html += '<strong>Coverage (≥3)</strong> shows how many auditors score <em>Could Coach</em> or above. ';
    html += 'A count of 0 means no one on the team can independently handle this area. A count of 1 is a single point of failure. ';
    html += 'The <span style="color:#f59e0b; font-weight:700;">*</span> marker indicates high development drive.';
    html += '</div>';

    // View tabs
    html += '<div class="cap-region-tabs" style="margin-bottom:16px;">';
    var tabs = [
        { id: "heatmap", label: "Heatmap" },
        { id: "gaps", label: "Gap Dashboard" },
        { id: "profiles", label: "Profiles" }
    ];
    for (var i = 0; i < tabs.length; i++) {
        var activeClass = skillsView === tabs[i].id ? " cap-tab-active" : "";
        html += '<button class="cap-tab' + activeClass + '" onclick="setSkillsView(\'' + tabs[i].id + '\')">' + tabs[i].label + '</button>';
    }
    html += '</div>';

    // Category filter
    var categories = getSkillCategories();
    html += '<div class="filter-bar">';
    html += '<select class="filter-select" id="skills-filter-category" onchange="applySkillsFilter()">';
    html += '<option value="">All Categories</option>';
    for (var i = 0; i < categories.length; i++) {
        var sel = skillsCategoryFilter === categories[i] ? " selected" : "";
        html += '<option value="' + categories[i] + '"' + sel + '>' + categories[i] + '</option>';
    }
    html += '</select>';
    html += '<button class="btn-filter-clear" onclick="clearSkillsFilter()">Clear</button>';
    html += '</div>';

    if (skillsView === "heatmap") {
        html += renderSkillsHeatmap();
    } else if (skillsView === "gaps") {
        html += renderSkillsGaps();
    } else if (skillsView === "profiles") {
        html += renderSkillsProfiles();
    }

    container.innerHTML = html;
}

/* ---------- Heatmap ---------- */

function renderSkillsHeatmap() {
    var activeAuditors = [];
    for (var i = 0; i < auditors.length; i++) {
        if (auditors[i].active_status === "Active") activeAuditors.push(auditors[i]);
    }

    var categories = getSkillCategories();
    var html = '';

    for (var c = 0; c < categories.length; c++) {
        var cat = categories[c];
        if (skillsCategoryFilter && skillsCategoryFilter !== cat) continue;

        var catSkills = getSkillsByCategory(cat);

        html += '<div class="dash-card">';
        html += '<div class="dash-card-title">' + cat + '</div>';
        html += '<div class="cap-table-wrapper">';
        html += '<table class="skills-heatmap-table"><thead><tr>';
        html += '<th class="skills-hm-skill">Skill</th>';

        for (var a = 0; a < activeAuditors.length; a++) {
            html += '<th class="skills-hm-auditor">' + activeAuditors[a].first_name + '<br>' + activeAuditors[a].last_name + '</th>';
        }
        html += '<th class="skills-hm-avg">Team Avg</th>';
        html += '<th class="skills-hm-coverage">Coverage<br>(≥3)</th>';
        html += '</tr></thead><tbody>';

        for (var s = 0; s < catSkills.length; s++) {
            var sk = catSkills[s];
            html += '<tr>';
            html += '<td class="skills-hm-skill-name">' + sk.skill_name + '</td>';

            for (var a = 0; a < activeAuditors.length; a++) {
                var rating = getAuditorSkillRating(activeAuditors[a], sk.skill_id);
                var prof = rating ? rating.proficiency : null;
                var conf = rating ? rating.confidence : "";
                var interest = rating ? rating.interest : "";
                var cellClass = getSkillHeatClass(prof);

                var tooltip = "";
                if (prof !== null) {
                    var knowledgeLabels = {0: "Never Encountered", 1: "Aware", 2: "Could Explain", 3: "Could Coach", 4: "Could Lecture"};
                    var confLabels = {"L": "Observer", "M": "Identifier", "H": "Assessor"};
                    var driveLabels = {"L": "Content", "M": "Open to It", "H": "Actively Curious"};
                    tooltip = "Knowledge: " + (knowledgeLabels[prof] || prof);
                    if (conf) tooltip += "  |  Confidence: " + (confLabels[conf] || conf);
                    if (interest) tooltip += "  |  Drive: " + (driveLabels[interest] || interest);
                }

                var interestMarker = interest === "H" ? '<span class="skills-interest-marker" title="Actively Curious">*</span>' : "";

                html += '<td class="skills-hm-cell ' + cellClass + '" title="' + tooltip + '">';
                html += (prof !== null ? prof : '-') + interestMarker;
                html += '</td>';
            }

            var teamAvg = getTeamSkillAvg(sk.skill_id);
            var avgClass = getSkillHeatClass(teamAvg !== null ? Math.round(teamAvg) : null);
            var coverage = getSkillProficientCount(sk.skill_id, 3);
            var coverageClass = coverage === 0 ? "skills-coverage-none" : coverage === 1 ? "skills-coverage-single" : "skills-coverage-ok";

            html += '<td class="skills-hm-cell ' + avgClass + '">' + (teamAvg !== null ? teamAvg : '-') + '</td>';
            html += '<td class="skills-hm-cell ' + coverageClass + '">' + coverage + '</td>';
            html += '</tr>';
        }

        html += '</tbody></table></div></div>';
    }

    return html;
}

/* ---------- Gap Dashboard ---------- */

function renderSkillsGaps() {
    var html = '';
    var categories = getSkillCategories();

    // Category overview
    html += '<div class="dash-card">';
    html += '<div class="dash-card-title">Category Overview</div>';
    html += '<table class="cap-table"><thead><tr>';
    html += '<th>Category</th><th># Skills</th><th>Team Avg</th><th>Min</th><th>Max</th><th>Coverage %</th><th>Status</th>';
    html += '</tr></thead><tbody>';

    for (var c = 0; c < categories.length; c++) {
        var cat = categories[c];
        if (skillsCategoryFilter && skillsCategoryFilter !== cat) continue;

        var catSkills = getSkillsByCategory(cat);
        var totalAvg = 0;
        var minScore = 4;
        var maxScore = 0;
        var counted = 0;

        for (var s = 0; s < catSkills.length; s++) {
            var avg = getTeamSkillAvg(catSkills[s].skill_id);
            if (avg !== null) {
                totalAvg += avg;
                if (avg < minScore) minScore = avg;
                if (avg > maxScore) maxScore = avg;
                counted++;
            }
        }

        var catAvg = counted > 0 ? Math.round((totalAvg / counted) * 10) / 10 : 0;
        var coveragePct = counted > 0 ? Math.round((catAvg / 4) * 100) : 0;
        var status = coveragePct >= 75 ? "Strong" : coveragePct >= 50 ? "Developing" : "Critical Gap";
        var statusClass = coveragePct >= 75 ? "badge cap-ok" : coveragePct >= 50 ? "badge cap-near" : "badge cap-overloaded";

        html += '<tr>';
        html += '<td><strong>' + cat + '</strong></td>';
        html += '<td>' + catSkills.length + '</td>';
        html += '<td>' + catAvg + '</td>';
        html += '<td>' + (counted > 0 ? minScore : '-') + '</td>';
        html += '<td>' + (counted > 0 ? maxScore : '-') + '</td>';
        html += '<td>' + coveragePct + '%</td>';
        html += '<td><span class="' + statusClass + '">' + status + '</span></td>';
        html += '</tr>';
    }

    html += '</tbody></table></div>';

    // Single points of failure
    var spofs = [];
    for (var i = 0; i < skillsCatalogue.length; i++) {
        var sk = skillsCatalogue[i];
        if (skillsCategoryFilter && sk.category !== skillsCategoryFilter) continue;

        var proficientCount = getSkillProficientCount(sk.skill_id, 3);
        if (proficientCount === 1) {
            // Find who
            var expert = null;
            var expertScore = 0;
            for (var a = 0; a < auditors.length; a++) {
                if (auditors[a].active_status !== "Active") continue;
                var rating = getAuditorSkillRating(auditors[a], sk.skill_id);
                if (rating && rating.proficiency >= 3) {
                    expert = auditors[a];
                    expertScore = rating.proficiency;
                }
            }
            var teamAvg = getTeamSkillAvg(sk.skill_id);
            spofs.push({
                category: sk.category,
                skill: sk.skill_name,
                expert: expert ? (expert.first_name + " " + expert.last_name) : "-",
                expertScore: expertScore,
                teamAvg: teamAvg || 0,
                riskLevel: teamAvg < 1.5 ? "High" : "Medium"
            });
        }
    }

    if (spofs.length > 0) {
        html += '<div class="dash-card">';
        html += '<div class="dash-card-title">Single Points of Failure (' + spofs.length + ')</div>';
        html += '<div class="forecast-explainer">Skills where only one auditor scores ≥ 3 (Proficient). If that person is unavailable, the team has a critical gap.</div>';
        html += '<table class="cap-table"><thead><tr>';
        html += '<th>Category</th><th>Skill</th><th>Expert</th><th>Score</th><th>Team Avg</th><th>Risk</th>';
        html += '</tr></thead><tbody>';

        for (var i = 0; i < spofs.length; i++) {
            var s = spofs[i];
            var riskClass = s.riskLevel === "High" ? "badge cap-overloaded" : "badge cap-near";
            html += '<tr>';
            html += '<td>' + s.category + '</td>';
            html += '<td>' + s.skill + '</td>';
            html += '<td>' + s.expert + '</td>';
            html += '<td>' + s.expertScore + '</td>';
            html += '<td>' + s.teamAvg + '</td>';
            html += '<td><span class="' + riskClass + '">' + s.riskLevel + ' Risk</span></td>';
            html += '</tr>';
        }

        html += '</tbody></table></div>';
    }

    // Zero coverage
    var zeroCoverage = [];
    for (var i = 0; i < skillsCatalogue.length; i++) {
        var sk = skillsCatalogue[i];
        if (skillsCategoryFilter && sk.category !== skillsCategoryFilter) continue;
        if (getSkillProficientCount(sk.skill_id, 3) === 0) {
            zeroCoverage.push({ category: sk.category, skill: sk.skill_name, teamAvg: getTeamSkillAvg(sk.skill_id) || 0 });
        }
    }

    if (zeroCoverage.length > 0) {
        html += '<div class="dash-card">';
        html += '<div class="dash-card-title">No Proficient Coverage (' + zeroCoverage.length + ')</div>';
        html += '<div class="forecast-explainer">Skills where no auditor scores ≥ 3. The team lacks independent competency in these areas.</div>';
        html += '<table class="cap-table"><thead><tr>';
        html += '<th>Category</th><th>Skill</th><th>Team Avg</th>';
        html += '</tr></thead><tbody>';

        for (var i = 0; i < zeroCoverage.length; i++) {
            html += '<tr>';
            html += '<td>' + zeroCoverage[i].category + '</td>';
            html += '<td>' + zeroCoverage[i].skill + '</td>';
            html += '<td>' + zeroCoverage[i].teamAvg + '</td>';
            html += '</tr>';
        }

        html += '</tbody></table></div>';
    }

    // High development interest
    var highInterest = [];
    for (var i = 0; i < skillsCatalogue.length; i++) {
        var sk = skillsCatalogue[i];
        if (skillsCategoryFilter && sk.category !== skillsCategoryFilter) continue;

        var intCount = 0;
        for (var a = 0; a < auditors.length; a++) {
            if (auditors[a].active_status !== "Active") continue;
            var rating = getAuditorSkillRating(auditors[a], sk.skill_id);
            if (rating && rating.interest === "H") intCount++;
        }

        if (intCount >= 3) {
            highInterest.push({
                category: sk.category,
                skill: sk.skill_name,
                intCount: intCount,
                teamAvg: getTeamSkillAvg(sk.skill_id) || 0
            });
        }
    }

    if (highInterest.length > 0) {
        highInterest.sort(function (a, b) { return b.intCount - a.intCount; });

        html += '<div class="dash-card">';
        html += '<div class="dash-card-title">High Development Interest</div>';
        html += '<div class="forecast-explainer">Skills where 3+ auditors have high development interest. These represent the best return on training investment.</div>';
        html += '<table class="cap-table"><thead><tr>';
        html += '<th>Category</th><th>Skill</th><th># Interested</th><th>Current Avg</th><th>Opportunity</th>';
        html += '</tr></thead><tbody>';

        for (var i = 0; i < highInterest.length; i++) {
            var h = highInterest[i];
            var opp = h.teamAvg < 2 ? "High ROI" : "Growth";
            var oppClass = h.teamAvg < 2 ? "badge cap-ok" : "badge cap-near";
            html += '<tr>';
            html += '<td>' + h.category + '</td>';
            html += '<td>' + h.skill + '</td>';
            html += '<td>' + h.intCount + '</td>';
            html += '<td>' + h.teamAvg + '</td>';
            html += '<td><span class="' + oppClass + '">' + opp + '</span></td>';
            html += '</tr>';
        }

        html += '</tbody></table></div>';
    }

    return html;
}

/* ---------- Profiles ---------- */

function renderSkillsProfiles() {
    var activeAuditors = [];
    for (var i = 0; i < auditors.length; i++) {
        if (auditors[i].active_status === "Active") activeAuditors.push(auditors[i]);
    }

    var categories = getSkillCategories();
    var html = '<div class="skills-profiles-grid">';

    for (var a = 0; a < activeAuditors.length; a++) {
        var aud = activeAuditors[a];
        var totalProf = 0;
        var totalCount = 0;
        var highInterestCount = 0;

        for (var i = 0; i < skillsCatalogue.length; i++) {
            var rating = getAuditorSkillRating(aud, skillsCatalogue[i].skill_id);
            if (rating && rating.proficiency !== null) {
                totalProf += rating.proficiency;
                totalCount++;
            }
            if (rating && rating.interest === "H") highInterestCount++;
        }

        var overallAvg = totalCount > 0 ? Math.round((totalProf / totalCount) * 10) / 10 : 0;

        html += '<div class="skills-profile-card">';
        html += '<div class="skills-profile-header">';
        html += '<div class="skills-profile-name">' + aud.first_name + ' ' + aud.last_name + '</div>';
        html += '<div class="skills-profile-meta">' + (aud.region || '-') + ' &middot; Avg: ' + overallAvg + ' / 4.0</div>';
        html += '</div>';

        html += '<div class="skills-profile-cats">';
        for (var c = 0; c < categories.length; c++) {
            var cat = categories[c];
            var catAvg = getAuditorCategoryAvg(aud, cat);
            var barWidth = catAvg !== null ? Math.round((catAvg / 4) * 100) : 0;
            var barClass = catAvg >= 3 ? "skills-bar-expert" : catAvg >= 2 ? "skills-bar-working" : catAvg >= 1 ? "skills-bar-awareness" : "skills-bar-none";

            // Short category label
            var shortCat = cat.replace("Technical / Domain Knowledge", "Tech Domain")
                              .replace("Regulatory & Standards", "Regulatory")
                              .replace("Risk & Quality Systems", "Risk & Quality")
                              .replace("Audit Execution", "Audit Exec.")
                              .replace("Soft & Professional Skills", "Soft Skills");

            html += '<div class="skills-profile-row">';
            html += '<div class="skills-profile-cat-label">' + shortCat + '</div>';
            html += '<div class="skills-profile-bar-bg">';
            html += '<div class="skills-profile-bar ' + barClass + '" style="width:' + barWidth + '%"></div>';
            html += '</div>';
            html += '<div class="skills-profile-cat-val">' + (catAvg !== null ? catAvg : '-') + '</div>';
            html += '</div>';
        }
        html += '</div>';

        if (highInterestCount > 0) {
            html += '<div class="skills-profile-footer">&#128293; ' + highInterestCount + ' high development interest</div>';
        }

        html += '</div>';
    }

    html += '</div>';
    return html;
}

/* ---------- Heatmap Cell Colour ---------- */

function getSkillHeatClass(proficiency) {
    if (proficiency === null || proficiency === undefined) return "skills-heat-none";
    if (proficiency >= 4) return "skills-heat-4";
    if (proficiency >= 3) return "skills-heat-3";
    if (proficiency >= 2) return "skills-heat-2";
    if (proficiency >= 1) return "skills-heat-1";
    return "skills-heat-0";
}

/* ---------- Navigation ---------- */

function setSkillsView(view) {
    skillsView = view;
    renderSkillsMatrix();
}

function applySkillsFilter() {
    var el = document.getElementById("skills-filter-category");
    skillsCategoryFilter = el ? el.value : "";
    renderSkillsMatrix();
}

function clearSkillsFilter() {
    skillsCategoryFilter = "";
    renderSkillsMatrix();
}