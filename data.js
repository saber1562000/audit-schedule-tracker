/* ============================================
   DATA LAYER
   Loads from localStorage if available,
   otherwise uses defaults
   ============================================ */

var DEFAULT_VENDORS = [
    {
        vendor_id: "V001",
        vendor_name: "Supplier Alpha Global Pvt Ltd, Nashik",
        date_added: "2026-05-28",
        added_by: "",
        city: "Nashik",
        country_state: "Maharashtra",
        region: "India",
        address: "",
        vendor_type: "Contract Manufacturing Organisation",
        site_materials: [
            { business_unit: "Business Unit A", site: "", material_or_service: "", material_subtype: "" }
        ],
        qualification_status: "Qualified",
        active_status: "Active",
        notes: "",
        folder_link: "",
        reviewed: true
    },
    {
        vendor_id: "V002",
        vendor_name: "Beta Pharma Ingredients GmbH",
        date_added: "2026-05-28",
        added_by: "",
        city: "Frankfurt",
        country_state: "Germany",
        region: "EU",
        address: "",
        vendor_type: "API Suppliers – Commercial Use",
        site_materials: [
            { business_unit: "Business Unit B", site: "", material_or_service: "", material_subtype: "" }
        ],
        qualification_status: "Pending",
        active_status: "Active",
        notes: "",
        folder_link: "",
        reviewed: true
    }
];

var DEFAULT_AUDITS = [
    {
        audit_id: "XX-02500",
        vendor_id: "V001",
        audit_method: "On-site",
        audit_type: "Routine",
        audit_required_by: "2026-12-31",
        date_agreed: "2026-09-15",
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
        legacy_source: "",
        changelog: []
    },
    {
        audit_id: "",
        vendor_id: "V002",
        audit_method: "On-site",
        audit_type: "Qualification",
        audit_required_by: "2026-12-31",
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
        legacy_source: "",
        changelog: []
    }
];

var DEFAULT_AUDITORS = [
    {
        auditor_id: "AUD001",
        first_name: "Sample",
        last_name: "Auditor",
        email: "",
        region: "EU",
        active_status: "Active",
        date_added: "2026-05-28",
        notes: "",
        cu_ceiling: null
    }
];

var DEFAULT_CU_CONFIG = {
    cu_desktop: 1,
    cu_virtual: 2,
    cu_onsite: 3,
    cu_travel: 1,
    co_auditor_fraction: 0.75,
    default_annual_ceiling: 96,
    audit_target: 30
};

var DEFAULT_SKILLS_CATALOGUE = [
    { skill_id: "REG01", category: "Regulatory & Standards", skill_name: "ICH Q10 Pharmaceutical Quality Systems", relevant_vendor_types: [] },
    { skill_id: "REG02", category: "Regulatory & Standards", skill_name: "ICH Q7 GMP for Active Pharmaceutical Ingredients", relevant_vendor_types: ["API Suppliers – Commercial Use", "API Supplier - R&D Use"] },
    { skill_id: "REG03", category: "Regulatory & Standards", skill_name: "21 CFR Part 210/211 (FDA cGMP)", relevant_vendor_types: [] },
    { skill_id: "REG04", category: "Regulatory & Standards", skill_name: "EU GMP Annex 1 (Sterile Manufacturing)", relevant_vendor_types: ["Sterile Packaging suppliers"] },
    { skill_id: "REG05", category: "Regulatory & Standards", skill_name: "EU GMP Annex 11 (Computerised Systems)", relevant_vendor_types: [] },
    { skill_id: "REG06", category: "Regulatory & Standards", skill_name: "EMA/WHO/PIC-S GMP Guidelines", relevant_vendor_types: [] },
    { skill_id: "REG07", category: "Regulatory & Standards", skill_name: "GDP (Good Distribution Practice)", relevant_vendor_types: ["Warehousing and Distribution"] },
    { skill_id: "REG08", category: "Regulatory & Standards", skill_name: "GCP (Good Clinical Practice)", relevant_vendor_types: ["Clinical Research Organisation"] },
    { skill_id: "REG09", category: "Regulatory & Standards", skill_name: "GVP (Good Pharmacovigilance Practice)", relevant_vendor_types: [] },
    { skill_id: "REG10", category: "Regulatory & Standards", skill_name: "ISO 15378 Primary Packaging Materials", relevant_vendor_types: ["Primary Packaging Components suppliers"] },

    { skill_id: "AUD01", category: "Audit Execution", skill_name: "Audit planning & scoping", relevant_vendor_types: [] },
    { skill_id: "AUD02", category: "Audit Execution", skill_name: "Opening & closing meeting facilitation", relevant_vendor_types: [] },
    { skill_id: "AUD03", category: "Audit Execution", skill_name: "Document review & gap analysis", relevant_vendor_types: [] },
    { skill_id: "AUD04", category: "Audit Execution", skill_name: "On-site inspection techniques", relevant_vendor_types: [] },
    { skill_id: "AUD05", category: "Audit Execution", skill_name: "Sampling strategy & risk-based selection", relevant_vendor_types: [] },
    { skill_id: "AUD06", category: "Audit Execution", skill_name: "Observation writing (ALCOA+ principles)", relevant_vendor_types: [] },
    { skill_id: "AUD07", category: "Audit Execution", skill_name: "CAPA evaluation & follow-up", relevant_vendor_types: [] },
    { skill_id: "AUD08", category: "Audit Execution", skill_name: "Audit report writing", relevant_vendor_types: [] },
    { skill_id: "AUD09", category: "Audit Execution", skill_name: "Supplier qualification & re-qualification", relevant_vendor_types: [] },
    { skill_id: "AUD10", category: "Audit Execution", skill_name: "Remote / hybrid audit methods", relevant_vendor_types: [] },

    { skill_id: "TEC01", category: "Technical / Domain Knowledge", skill_name: "Sterile manufacturing processes", relevant_vendor_types: ["Sterile Packaging suppliers"] },
    { skill_id: "TEC02", category: "Technical / Domain Knowledge", skill_name: "Solid dosage form manufacturing", relevant_vendor_types: ["Contract Manufacturing Organisation"] },
    { skill_id: "TEC03", category: "Technical / Domain Knowledge", skill_name: "Biologics / biotech manufacturing", relevant_vendor_types: [] },
    { skill_id: "TEC04", category: "Technical / Domain Knowledge", skill_name: "API synthesis & processing", relevant_vendor_types: ["API Suppliers – Commercial Use", "API Supplier - R&D Use"] },
    { skill_id: "TEC05", category: "Technical / Domain Knowledge", skill_name: "Analytical laboratory practices", relevant_vendor_types: ["Contract Testing Laboratory"] },
    { skill_id: "TEC06", category: "Technical / Domain Knowledge", skill_name: "Packaging & labelling operations", relevant_vendor_types: ["Contract Packaging Organisation", "Primary Packaging Components suppliers", "Secondary Packaging Component Suppliers"] },
    { skill_id: "TEC07", category: "Technical / Domain Knowledge", skill_name: "Cold chain & temperature control", relevant_vendor_types: ["Warehousing and Distribution"] },
    { skill_id: "TEC08", category: "Technical / Domain Knowledge", skill_name: "Contamination control strategy", relevant_vendor_types: [] },
    { skill_id: "TEC09", category: "Technical / Domain Knowledge", skill_name: "Computer Systems Validation (CSV)", relevant_vendor_types: [] },
    { skill_id: "TEC10", category: "Technical / Domain Knowledge", skill_name: "Data integrity principles (ALCOA+)", relevant_vendor_types: [] },

    { skill_id: "RQS01", category: "Risk & Quality Systems", skill_name: "ICH Q9 Quality Risk Management", relevant_vendor_types: [] },
    { skill_id: "RQS02", category: "Risk & Quality Systems", skill_name: "FMEA / HACCP / risk tool application", relevant_vendor_types: [] },
    { skill_id: "RQS03", category: "Risk & Quality Systems", skill_name: "Deviation & OOS investigation", relevant_vendor_types: [] },
    { skill_id: "RQS04", category: "Risk & Quality Systems", skill_name: "Change control evaluation", relevant_vendor_types: [] },
    { skill_id: "RQS05", category: "Risk & Quality Systems", skill_name: "Complaint & recall assessment", relevant_vendor_types: ["Recall Services"] },
    { skill_id: "RQS06", category: "Risk & Quality Systems", skill_name: "Annual Product Review / PQR", relevant_vendor_types: [] },
    { skill_id: "RQS07", category: "Risk & Quality Systems", skill_name: "Validation principles (Process, Cleaning)", relevant_vendor_types: [] },
    { skill_id: "RQS08", category: "Risk & Quality Systems", skill_name: "Quality Metrics & KPI analysis", relevant_vendor_types: [] },

    { skill_id: "SOF01", category: "Soft & Professional Skills", skill_name: "Audit stakeholder management", relevant_vendor_types: [] },
    { skill_id: "SOF02", category: "Soft & Professional Skills", skill_name: "Interviewing & active listening", relevant_vendor_types: [] },
    { skill_id: "SOF03", category: "Soft & Professional Skills", skill_name: "Conflict resolution / difficult auditees", relevant_vendor_types: [] },
    { skill_id: "SOF04", category: "Soft & Professional Skills", skill_name: "Written & verbal communication", relevant_vendor_types: [] },
    { skill_id: "SOF05", category: "Soft & Professional Skills", skill_name: "Critical thinking & scepticism", relevant_vendor_types: [] },
    { skill_id: "SOF06", category: "Soft & Professional Skills", skill_name: "Time management under audit pressure", relevant_vendor_types: [] },
    { skill_id: "SOF07", category: "Soft & Professional Skills", skill_name: "Cross-cultural awareness", relevant_vendor_types: [] }
];

/* --- Load from localStorage or use defaults --- */

function loadData() {
    try {
        var stored = localStorage.getItem("eqa_vendors");
        vendors = stored ? JSON.parse(stored) : JSON.parse(JSON.stringify(DEFAULT_VENDORS));

        stored = localStorage.getItem("eqa_audits");
        audits = stored ? JSON.parse(stored) : JSON.parse(JSON.stringify(DEFAULT_AUDITS));

        stored = localStorage.getItem("eqa_auditors");
        auditors = stored ? JSON.parse(stored) : JSON.parse(JSON.stringify(DEFAULT_AUDITORS));
       
        stored = localStorage.getItem("eqa_cu_config");
        cuConfig = stored ? JSON.parse(stored) : JSON.parse(JSON.stringify(DEFAULT_CU_CONFIG));

        if (cuConfig.audit_target === undefined) cuConfig.audit_target = 30;

        stored = localStorage.getItem("eqa_skills_catalogue");
        skillsCatalogue = stored ? JSON.parse(stored) : JSON.parse(JSON.stringify(DEFAULT_SKILLS_CATALOGUE));

        // Backfill reviewed field for vendors loaded before this field existed
        for (var i = 0; i < vendors.length; i++) {
            if (vendors[i].reviewed === undefined) vendors[i].reviewed = true;
        }
    } catch (e) {
        console.error("Error loading data from localStorage:", e);
        vendors = JSON.parse(JSON.stringify(DEFAULT_VENDORS));
        audits = JSON.parse(JSON.stringify(DEFAULT_AUDITS));
        auditors = JSON.parse(JSON.stringify(DEFAULT_AUDITORS));
    }
}

function saveData() {
    try {
        localStorage.setItem("eqa_vendors", JSON.stringify(vendors));
        localStorage.setItem("eqa_audits", JSON.stringify(audits));
        localStorage.setItem("eqa_auditors", JSON.stringify(auditors));
        localStorage.setItem("eqa_cu_config", JSON.stringify(cuConfig));
        localStorage.setItem("eqa_skills_catalogue", JSON.stringify(skillsCatalogue));
    } catch (e) {
        console.error("Error saving data to localStorage:", e);
        alert("Warning: Could not save data locally. Changes may be lost on refresh.");
    }
}

function clearLocalData() {
    if (confirm("This will clear all saved data and reset to defaults.\n\nAre you sure?")) {
        localStorage.removeItem("eqa_vendors");
        localStorage.removeItem("eqa_audits");
        localStorage.removeItem("eqa_auditors");
        localStorage.removeItem("eqa_cu_config");
        localStorage.removeItem("eqa_skills_catalogue");
        loadData();
        showView(currentView);
        alert("Data reset to defaults.");
    }
}

/* --- Initialise --- */
var vendors, audits, auditors, cuConfig;
var vendors, audits, auditors, cuConfig, skillsCatalogue;
loadData();

/* Dropdown option lists */
var OPTIONS = {
    audit_type: ["Routine", "Qualification", "For-cause"],
    audit_method: ["On-site", "Virtual", "Desktop"],
    yes_no: ["Yes", "No"],
    risk_rating: ["Low", "Medium", "High"],
    audit_outcome: ["Acceptable", "Conditional", "Unacceptable"],
    audit_interval: [12, 24, 36, 48, 60, "N/A"],
    cancelled_reason: ["Vendor Retired", "Vendor Disqualified", "Business Decision", "Duplicate Entry", "Audit No Longer Required", "Other"],
    on_hold_reason: ["Awaiting Decision", "Pending Information", "Vendor Unavailable", "Resource Constraint", "Other"],
    desktop_docs: ["Not Applicable", "Not Requested", "Requested", "Partially Received", "Received"],
    qualification_status: ["Pending", "Qualified", "Conditional", "Not Qualified", "Disqualified"],
    active_status: ["Active", "Inactive"],
    region: ["USA", "EU", "India", "Asia", "China"],
    vendor_type: [
        "API Suppliers – Commercial Use",
        "API Supplier - R&D Use",
        "Compendial Excipients",
        "Contract Manufacturing Organisation",
        "Contract Packaging Organisation",
        "Contract Testing Laboratory",
        "Warehousing and Distribution",
        "Service Providers",
        "Calibration",
        "Preventive Maintenance",
        "Primary Packaging Components suppliers",
        "Secondary Packaging Component Suppliers",
        "Sterile Packaging suppliers",
        "Non-product contact consumables",
        "Product Contact consumables",
        "Clinical Research Organisation",
        "Recall Services"
    ],
    business_unit: ["Business Unit A", "Business Unit B", "Business Unit C", "Business Unit D"],
    site: ["Site Alpha", "Site Beta", "Site Gamma", "Site Delta"],
    leave_type: ["Vacation", "Personal Leave", "Sick Leave", "Training", "Public Holiday", "Company Holiday"]
};