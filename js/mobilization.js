// ============================================================================
// MOBILIZATION MODULE — leads list + funnel stage kanban
// ============================================================================
let allLeads = [];
let mobCentersForForm = [];
let mobMobilizersForForm = [];
let leadModal;
const FUNNEL_STAGES = ["lead","contacted","counselling","interested","documents_collected","enrolled","rejected","follow_up"];

async function initMobilizationPage() {
  leadModal = new bootstrap.Modal(document.getElementById("leadModal"));
  document.getElementById("leadForm").addEventListener("submit", saveLead);
  document.getElementById("leadSearchInput").addEventListener("input", renderLeadsBoard);
  document.getElementById("addLeadBtn").addEventListener("click", () => openLeadModal(null));

  const [{ data: centers }, { data: employees }] = await Promise.all([
    supabaseClient.from("centers").select("id, center_name").order("center_name"),
    supabaseClient.from("employees").select("id, full_name").order("full_name"),
  ]);
  mobCentersForForm = centers || [];
  mobMobilizersForForm = employees || [];
  document.getElementById("leadCenterSelect").innerHTML = mobCentersForForm.map(c => `<option value="${c.id}">${c.center_name}</option>`).join("");
  document.getElementById("leadMobilizerSelect").innerHTML = `<option value="">— None —</option>` + mobMobilizersForForm.map(e => `<option value="${e.id}">${e.full_name}</option>`).join("");

  await loadLeads();
}

async function loadLeads() {
  const { data, error } = await supabaseClient
    .from("mobilization_leads")
    .select("*, centers(center_name), employees:mobilizer_id(full_name)")
    .order("created_at", { ascending: false });
  if (error) {
    document.getElementById("leadsBoard").innerHTML = `<div class="text-danger text-center py-4">${error.message}</div>`;
    return;
  }
  allLeads = data || [];
  renderLeadsBoard();
}

function renderLeadsBoard() {
  const q = document.getElementById("leadSearchInput").value.trim().toLowerCase();
  const filtered = allLeads.filter(l => !q || l.candidate_name.toLowerCase().includes(q) || (l.mobile || "").includes(q) || (l.course_name || "").toLowerCase().includes(q));

  const board = document.getElementById("leadsBoard");
  board.innerHTML = `<div class="mob-board">` + FUNNEL_STAGES.map(stage => {
    const stageLeads = filtered.filter(l => l.status === stage);
    return `
      <div class="mob-column">
        <div class="mob-column-header">${stage.replace(/_/g, " ")} <span class="nav-count">${stageLeads.length}</span></div>
        <div class="mob-column-body">
          ${stageLeads.map(l => `
            <div class="mob-card">
              <div style="font-weight:700;font-size:13px;">${l.candidate_name}</div>
              <div style="font-size:11.5px;color:var(--gray-500);">${l.course_name || ""} · ${l.centers?.center_name || ""}</div>
              <div style="font-size:11.5px;color:var(--gray-500);">${l.mobile || ""}</div>
              <div class="d-flex justify-content-between align-items-center mt-2">
                <select class="form-select form-select-sm" style="font-size:11px;width:auto;" onchange="moveLeadStage('${l.id}', this.value)">
                  ${FUNNEL_STAGES.map(s => `<option value="${s}" ${s === l.status ? "selected" : ""}>${s.replace(/_/g," ")}</option>`).join("")}
                </select>
                <button class="btn btn-erp btn-sm" onclick="openLeadModal('${l.id}')"><i class="bi bi-pencil"></i></button>
              </div>
            </div>`).join("") || `<div class="text-muted text-center" style="font-size:12px;padding:16px 0;">No leads</div>`}
        </div>
      </div>`;
  }).join("") + `</div>`;
}

async function moveLeadStage(leadId, newStatus) {
  const { error } = await supabaseClient.from("mobilization_leads").update({ status: newStatus }).eq("id", leadId);
  if (error) { alert("Could not update: " + error.message); return; }
  await loadLeads();
}

function openLeadModal(leadId) {
  const form = document.getElementById("leadForm");
  form.reset();
  document.getElementById("leadFormId").value = "";
  document.getElementById("leadModalTitle").textContent = "Add lead";
  if (leadId) {
    const l = allLeads.find(x => x.id === leadId);
    if (l) {
      document.getElementById("leadModalTitle").textContent = "Edit lead";
      document.getElementById("leadFormId").value = l.id;
      for (const key of ["candidate_name","mobile","course_name","lead_source","follow_up_date","status"]) {
        const el = form.elements[key];
        if (el) el.value = l[key] ?? "";
      }
      document.getElementById("leadCenterSelect").value = l.center_id || "";
      document.getElementById("leadMobilizerSelect").value = l.mobilizer_id || "";
    }
  }
  leadModal.show();
}

async function saveLead(event) {
  event.preventDefault();
  const form = document.getElementById("leadForm");
  const id = document.getElementById("leadFormId").value;
  const payload = {};
  for (const key of ["candidate_name","mobile","course_name","lead_source","follow_up_date","status"]) {
    payload[key] = form.elements[key].value || null;
  }
  payload.center_id = document.getElementById("leadCenterSelect").value || null;
  payload.mobilizer_id = document.getElementById("leadMobilizerSelect").value || null;

  const saveBtn = document.getElementById("leadSaveBtn");
  saveBtn.disabled = true; saveBtn.textContent = "Saving…";
  const { error } = id
    ? await supabaseClient.from("mobilization_leads").update(payload).eq("id", id)
    : await supabaseClient.from("mobilization_leads").insert(payload);
  saveBtn.disabled = false; saveBtn.textContent = "Save lead";

  if (error) { alert("Could not save lead: " + error.message); return; }
  leadModal.hide();
  await loadLeads();
}
