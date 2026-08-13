// ============================================================================
// PLACEMENTS MODULE
// ============================================================================
let allPlacements = [];
let placementStudentsForForm = [];
let placementModal;

async function initPlacementsPage() {
  placementModal = new bootstrap.Modal(document.getElementById("placementModal"));
  document.getElementById("placementForm").addEventListener("submit", savePlacement);
  document.getElementById("placementSearchInput").addEventListener("input", renderPlacementsTable);
  document.getElementById("placementStatusFilter").addEventListener("change", renderPlacementsTable);
  document.getElementById("addPlacementBtn").addEventListener("click", () => openPlacementModal(null));

  const { data: students } = await supabaseClient.from("students").select("id, candidate_name, student_code, center_id, batch_id, course_name").order("candidate_name");
  placementStudentsForForm = students || [];
  document.getElementById("placementStudentSelect").innerHTML = placementStudentsForForm.map(s => `<option value="${s.id}">${s.candidate_name} (${s.student_code})</option>`).join("");

  await loadPlacements();
}

async function loadPlacements() {
  const { data, error } = await supabaseClient
    .from("placements")
    .select("*, students(candidate_name, student_code), centers(center_name)")
    .order("created_at", { ascending: false });
  if (error) {
    document.getElementById("placementsTableBody").innerHTML = `<tr><td colspan="7" class="text-danger text-center py-4">${error.message}</td></tr>`;
    return;
  }
  allPlacements = data || [];
  renderPlacementsTable();
}

function renderPlacementsTable() {
  const q = document.getElementById("placementSearchInput").value.trim().toLowerCase();
  const statusFilter = document.getElementById("placementStatusFilter").value;
  const filtered = allPlacements.filter(p => {
    const matchesQ = !q || (p.students?.candidate_name || "").toLowerCase().includes(q) || (p.company_name || "").toLowerCase().includes(q);
    const matchesStatus = !statusFilter || p.placement_status === statusFilter;
    return matchesQ && matchesStatus;
  });
  document.getElementById("placementsCount").textContent = `${filtered.length} of ${allPlacements.length} placements`;
  const tbody = document.getElementById("placementsTableBody");
  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No placements match your search.</td></tr>`;
    return;
  }
  tbody.innerHTML = filtered.map(p => `
    <tr>
      <td><div style="font-weight:600;">${p.students?.candidate_name || "—"}</div><div style="font-size:11.5px;color:var(--gray-500);">${p.students?.student_code || ""}</div></td>
      <td>${p.company_name || "—"}</td>
      <td>${p.job_role || "—"}</td>
      <td>${p.salary ? "₹" + Number(p.salary).toLocaleString("en-IN") : "—"}</td>
      <td>${p.joining_date || p.interview_date || "—"}</td>
      <td><span class="badge-status badge-${p.placement_status}">${(p.placement_status || "").replace(/_/g," ")}</span></td>
      <td class="text-end"><button class="btn btn-erp btn-sm" onclick="openPlacementModal('${p.id}')"><i class="bi bi-pencil"></i></button></td>
    </tr>`).join("");
}

function openPlacementModal(id) {
  const form = document.getElementById("placementForm");
  form.reset();
  document.getElementById("placementFormId").value = "";
  document.getElementById("placementModalTitle").textContent = "Add placement";
  if (id) {
    const p = allPlacements.find(x => x.id === id);
    if (p) {
      document.getElementById("placementModalTitle").textContent = "Edit placement";
      document.getElementById("placementFormId").value = p.id;
      for (const key of ["company_name","job_role","salary","interview_date","joining_date","placement_status","location","course_name"]) {
        const el = form.elements[key];
        if (el) el.value = p[key] ?? "";
      }
      document.getElementById("placementStudentSelect").value = p.student_id || "";
    }
  }
  placementModal.show();
}

async function savePlacement(event) {
  event.preventDefault();
  const form = document.getElementById("placementForm");
  const id = document.getElementById("placementFormId").value;
  const studentId = document.getElementById("placementStudentSelect").value;
  const student = placementStudentsForForm.find(s => s.id === studentId);

  const payload = {};
  for (const key of ["company_name","job_role","interview_date","joining_date","placement_status","location","course_name"]) {
    payload[key] = form.elements[key].value || null;
  }
  payload.salary = form.elements["salary"].value ? parseFloat(form.elements["salary"].value) : null;
  payload.student_id = studentId || null;
  payload.center_id = student?.center_id || null;
  payload.batch_id = student?.batch_id || null;

  const saveBtn = document.getElementById("placementSaveBtn");
  saveBtn.disabled = true; saveBtn.textContent = "Saving…";
  const { error } = id
    ? await supabaseClient.from("placements").update(payload).eq("id", id)
    : await supabaseClient.from("placements").insert(payload);
  saveBtn.disabled = false; saveBtn.textContent = "Save placement";

  if (error) { alert("Could not save placement: " + error.message); return; }
  placementModal.hide();
  await loadPlacements();
}
