// ============================================================================
// TRAINING MODULE — session schedule per batch
// ============================================================================
let allTraining = [];
let trainingBatchesForForm = [];
let trainingTrainersForForm = [];
let trainingModal;

async function initTrainingPage() {
  trainingModal = new bootstrap.Modal(document.getElementById("trainingModal"));
  document.getElementById("trainingForm").addEventListener("submit", saveTraining);
  document.getElementById("trainingBatchFilter").addEventListener("change", () => { renderTrainingTable(); });
  document.getElementById("addTrainingBtn").addEventListener("click", () => openTrainingModal(null));

  const [{ data: batches }, { data: employees }] = await Promise.all([
    supabaseClient.from("batches").select("id, batch_name").order("batch_name"),
    supabaseClient.from("employees").select("id, full_name").order("full_name"),
  ]);
  trainingBatchesForForm = batches || [];
  trainingTrainersForForm = employees || [];
  document.getElementById("trainingBatchFilter").innerHTML = `<option value="">All batches</option>` + trainingBatchesForForm.map(b => `<option value="${b.id}">${b.batch_name}</option>`).join("");
  document.getElementById("trainingBatchSelect").innerHTML = trainingBatchesForForm.map(b => `<option value="${b.id}">${b.batch_name}</option>`).join("");
  document.getElementById("trainingTrainerSelect").innerHTML = `<option value="">— None —</option>` + trainingTrainersForForm.map(e => `<option value="${e.id}">${e.full_name}</option>`).join("");

  await loadTraining();
}

async function loadTraining() {
  const { data, error } = await supabaseClient
    .from("training_schedule")
    .select("*, batches(batch_name), employees:trainer_id(full_name)")
    .order("session_date", { ascending: true });
  if (error) {
    document.getElementById("trainingTableBody").innerHTML = `<tr><td colspan="7" class="text-danger text-center py-4">${error.message}</td></tr>`;
    return;
  }
  allTraining = data || [];
  renderTrainingTable();
}

function renderTrainingTable() {
  const batchFilter = document.getElementById("trainingBatchFilter").value;
  const filtered = allTraining.filter(t => !batchFilter || t.batch_id === batchFilter);
  document.getElementById("trainingCount").textContent = `${filtered.length} sessions`;
  const tbody = document.getElementById("trainingTableBody");
  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No training sessions scheduled.</td></tr>`;
    return;
  }
  tbody.innerHTML = filtered.map(t => `
    <tr>
      <td>${t.session_date || "—"}</td>
      <td>${t.start_time || ""} ${t.end_time ? "– " + t.end_time : ""}</td>
      <td>${t.batches?.batch_name || "—"}</td>
      <td><span class="badge-status badge-${t.session_type === "theory" ? "in_progress" : "active"}">${(t.session_type || "").replace(/_/g," ")}</span></td>
      <td>${t.topic || "—"}</td>
      <td>${t.employees?.full_name || "—"}</td>
      <td class="text-end"><button class="btn btn-erp btn-sm" onclick="openTrainingModal('${t.id}')"><i class="bi bi-pencil"></i></button></td>
    </tr>`).join("");
}

function openTrainingModal(id) {
  const form = document.getElementById("trainingForm");
  form.reset();
  document.getElementById("trainingFormId").value = "";
  document.getElementById("trainingModalTitle").textContent = "Schedule session";
  if (id) {
    const t = allTraining.find(x => x.id === id);
    if (t) {
      document.getElementById("trainingModalTitle").textContent = "Edit session";
      document.getElementById("trainingFormId").value = t.id;
      for (const key of ["session_type","session_date","start_time","end_time","topic","status"]) {
        const el = form.elements[key];
        if (el) el.value = t[key] ?? "";
      }
      document.getElementById("trainingBatchSelect").value = t.batch_id || "";
      document.getElementById("trainingTrainerSelect").value = t.trainer_id || "";
    }
  }
  trainingModal.show();
}

async function saveTraining(event) {
  event.preventDefault();
  const form = document.getElementById("trainingForm");
  const id = document.getElementById("trainingFormId").value;
  const payload = {};
  for (const key of ["session_type","session_date","start_time","end_time","topic","status"]) {
    payload[key] = form.elements[key].value || null;
  }
  payload.batch_id = document.getElementById("trainingBatchSelect").value || null;
  payload.trainer_id = document.getElementById("trainingTrainerSelect").value || null;

  const saveBtn = document.getElementById("trainingSaveBtn");
  saveBtn.disabled = true; saveBtn.textContent = "Saving…";
  const { error } = id
    ? await supabaseClient.from("training_schedule").update(payload).eq("id", id)
    : await supabaseClient.from("training_schedule").insert(payload);
  saveBtn.disabled = false; saveBtn.textContent = "Save session";

  if (error) { alert("Could not save session: " + error.message); return; }
  trainingModal.hide();
  await loadTraining();
}
