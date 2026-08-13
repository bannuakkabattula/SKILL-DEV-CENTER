// ============================================================================
// BATCHES MODULE
// ============================================================================
let allBatches = [];
let batchCentersForForm = [];
let batchTrainersForForm = [];
let batchModal;

async function initBatchesPage() {
  batchModal = new bootstrap.Modal(document.getElementById("batchModal"));
  document.getElementById("batchForm").addEventListener("submit", saveBatch);
  document.getElementById("batchSearchInput").addEventListener("input", renderBatchesTable);
  document.getElementById("batchStatusFilter").addEventListener("change", renderBatchesTable);
  document.getElementById("addBatchBtn").addEventListener("click", () => openBatchModal(null));

  const [{ data: centers }, { data: employees }] = await Promise.all([
    supabaseClient.from("centers").select("id, center_name").order("center_name"),
    supabaseClient.from("employees").select("id, full_name").order("full_name"),
  ]);
  batchCentersForForm = centers || [];
  batchTrainersForForm = employees || [];
  document.getElementById("batchCenterSelect").innerHTML = batchCentersForForm.map(c => `<option value="${c.id}">${c.center_name}</option>`).join("");
  document.getElementById("batchTrainerSelect").innerHTML = `<option value="">— None —</option>` + batchTrainersForForm.map(e => `<option value="${e.id}">${e.full_name}</option>`).join("");

  await loadBatches();
}

async function loadBatches() {
  const { data, error } = await supabaseClient
    .from("batches")
    .select("*, centers(center_name), employees:trainer_id(full_name), students(count)")
    .order("created_at", { ascending: false });

  if (error) {
    document.getElementById("batchesTableBody").innerHTML = `<tr><td colspan="8" class="text-danger text-center py-4">${error.message}</td></tr>`;
    return;
  }
  allBatches = data || [];
  renderBatchesTable();
}

function renderBatchesTable() {
  const q = document.getElementById("batchSearchInput").value.trim().toLowerCase();
  const statusFilter = document.getElementById("batchStatusFilter").value;
  const filtered = allBatches.filter(b => {
    const matchesQ = !q || b.batch_name.toLowerCase().includes(q) || b.batch_code.toLowerCase().includes(q) || (b.course_name || "").toLowerCase().includes(q);
    const matchesStatus = !statusFilter || b.status === statusFilter;
    return matchesQ && matchesStatus;
  });
  document.getElementById("batchesCount").textContent = `${filtered.length} of ${allBatches.length} batches`;
  const tbody = document.getElementById("batchesTableBody");
  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">No batches match your search.</td></tr>`;
    return;
  }
  tbody.innerHTML = filtered.map(b => `
    <tr>
      <td><span class="code-chip">${b.batch_code}</span></td>
      <td><div style="font-weight:600;">${b.batch_name}</div><div style="font-size:11.5px;color:var(--gray-500);">${b.course_name || ""}</div></td>
      <td>${b.centers?.center_name || "—"}</td>
      <td>${b.employees?.full_name || "—"}</td>
      <td>${b.start_date || "—"} → ${b.end_date || "—"}</td>
      <td>${b.students?.[0]?.count ?? 0} / ${b.approved_strength ?? 0}</td>
      <td><span class="badge-status badge-${b.status}">${b.status.replace(/_/g, " ")}</span></td>
      <td class="text-end"><button class="btn btn-erp btn-sm" onclick="openBatchModal('${b.id}')"><i class="bi bi-pencil"></i></button></td>
    </tr>`).join("");
}

function openBatchModal(batchId) {
  const form = document.getElementById("batchForm");
  form.reset();
  document.getElementById("batchFormId").value = "";
  document.getElementById("batchModalTitle").textContent = "Add batch";
  if (batchId) {
    const b = allBatches.find(x => x.id === batchId);
    if (b) {
      document.getElementById("batchModalTitle").textContent = "Edit batch";
      document.getElementById("batchFormId").value = b.id;
      for (const key of ["batch_code","batch_name","course_name","qp_code","sector","scheme","start_date","end_date","duration","timing","approved_strength","enrolled_strength","status"]) {
        const el = form.elements[key];
        if (el) el.value = b[key] ?? "";
      }
      document.getElementById("batchCenterSelect").value = b.center_id || "";
      document.getElementById("batchTrainerSelect").value = b.trainer_id || "";
    }
  }
  batchModal.show();
}

async function saveBatch(event) {
  event.preventDefault();
  const form = document.getElementById("batchForm");
  const id = document.getElementById("batchFormId").value;
  const payload = {};
  for (const key of ["batch_code","batch_name","course_name","qp_code","sector","scheme","start_date","end_date","duration","timing","status"]) {
    payload[key] = form.elements[key].value || null;
  }
  payload.approved_strength = form.elements["approved_strength"].value ? parseInt(form.elements["approved_strength"].value) : 0;
  payload.enrolled_strength = form.elements["enrolled_strength"].value ? parseInt(form.elements["enrolled_strength"].value) : 0;
  payload.center_id = document.getElementById("batchCenterSelect").value || null;
  payload.trainer_id = document.getElementById("batchTrainerSelect").value || null;

  const saveBtn = document.getElementById("batchSaveBtn");
  saveBtn.disabled = true; saveBtn.textContent = "Saving…";
  const { error } = id
    ? await supabaseClient.from("batches").update(payload).eq("id", id)
    : await supabaseClient.from("batches").insert(payload);
  saveBtn.disabled = false; saveBtn.textContent = "Save batch";

  if (error) { alert("Could not save batch: " + error.message); return; }
  batchModal.hide();
  await loadBatches();
}
