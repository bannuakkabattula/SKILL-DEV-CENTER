// ============================================================================
// STUDENTS MODULE
// ============================================================================
let allStudents = [];
let studentCentersForForm = [];
let studentBatchesForForm = [];
let studentModal;

async function initStudentsPage() {
  studentModal = new bootstrap.Modal(document.getElementById("studentModal"));
  document.getElementById("studentForm").addEventListener("submit", saveStudent);
  document.getElementById("studentSearchInput").addEventListener("input", renderStudentsTable);
  document.getElementById("studentCenterFilter").addEventListener("change", renderStudentsTable);
  document.getElementById("studentStatusFilter").addEventListener("change", renderStudentsTable);
  document.getElementById("addStudentBtn").addEventListener("click", () => openStudentModal(null));

  const [{ data: centers }, { data: batches }] = await Promise.all([
    supabaseClient.from("centers").select("id, center_name").order("center_name"),
    supabaseClient.from("batches").select("id, batch_name, center_id").order("batch_name"),
  ]);
  studentCentersForForm = centers || [];
  studentBatchesForForm = batches || [];
  document.getElementById("studentCenterFilter").innerHTML = `<option value="">All centers</option>` + studentCentersForForm.map(c => `<option value="${c.id}">${c.center_name}</option>`).join("");
  document.getElementById("studentCenterSelect").innerHTML = studentCentersForForm.map(c => `<option value="${c.id}">${c.center_name}</option>`).join("");
  refreshBatchOptionsForCenter();
  document.getElementById("studentCenterSelect").addEventListener("change", refreshBatchOptionsForCenter);

  await loadStudents();
}

function refreshBatchOptionsForCenter() {
  const centerId = document.getElementById("studentCenterSelect").value;
  const opts = studentBatchesForForm.filter(b => !centerId || b.center_id === centerId);
  document.getElementById("studentBatchSelect").innerHTML = `<option value="">— None —</option>` + opts.map(b => `<option value="${b.id}">${b.batch_name}</option>`).join("");
}

async function loadStudents() {
  const { data, error } = await supabaseClient
    .from("students")
    .select("*, centers(center_name), batches(batch_name)")
    .order("created_at", { ascending: false });
  if (error) {
    document.getElementById("studentsTableBody").innerHTML = `<tr><td colspan="8" class="text-danger text-center py-4">${error.message}</td></tr>`;
    return;
  }
  allStudents = data || [];
  renderStudentsTable();
}

function renderStudentsTable() {
  const q = document.getElementById("studentSearchInput").value.trim().toLowerCase();
  const centerFilter = document.getElementById("studentCenterFilter").value;
  const statusFilter = document.getElementById("studentStatusFilter").value;
  const filtered = allStudents.filter(s => {
    const matchesQ = !q || s.candidate_name.toLowerCase().includes(q) || s.student_code.toLowerCase().includes(q) || (s.mobile || "").includes(q);
    const matchesCenter = !centerFilter || s.center_id === centerFilter;
    const matchesStatus = !statusFilter || s.training_status === statusFilter;
    return matchesQ && matchesCenter && matchesStatus;
  });
  document.getElementById("studentsCount").textContent = `${filtered.length} of ${allStudents.length} students`;
  const tbody = document.getElementById("studentsTableBody");
  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">No students match your search.</td></tr>`;
    return;
  }
  tbody.innerHTML = filtered.map(s => `
    <tr>
      <td><span class="code-chip">${s.student_code}</span></td>
      <td><div style="font-weight:600;">${s.candidate_name}</div><div style="font-size:11.5px;color:var(--gray-500);">${s.mobile || ""}</div></td>
      <td>${s.gender ? s.gender[0].toUpperCase() + s.gender.slice(1) : "—"}</td>
      <td>${s.centers?.center_name || "—"}</td>
      <td>${s.batches?.batch_name || "—"}</td>
      <td>${s.course_name || "—"}</td>
      <td><span class="badge-status badge-${s.training_status}">${(s.training_status || "").replace(/_/g, " ")}</span></td>
      <td class="text-end"><button class="btn btn-erp btn-sm" onclick="openStudentModal('${s.id}')"><i class="bi bi-pencil"></i></button></td>
    </tr>`).join("");
}

function openStudentModal(studentId) {
  const form = document.getElementById("studentForm");
  form.reset();
  document.getElementById("studentFormId").value = "";
  document.getElementById("studentModalTitle").textContent = "Add student";
  if (studentId) {
    const s = allStudents.find(x => x.id === studentId);
    if (s) {
      document.getElementById("studentModalTitle").textContent = "Edit student";
      document.getElementById("studentFormId").value = s.id;
      for (const key of ["student_code","candidate_name","parent_name","mobile","email","gender","dob","qualification","address","village","mandal","district","state","pincode","course_name","enrollment_date","training_status"]) {
        const el = form.elements[key];
        if (el) el.value = s[key] ?? "";
      }
      document.getElementById("studentCenterSelect").value = s.center_id || "";
      refreshBatchOptionsForCenter();
      document.getElementById("studentBatchSelect").value = s.batch_id || "";
    }
  } else {
    refreshBatchOptionsForCenter();
  }
  studentModal.show();
}

async function saveStudent(event) {
  event.preventDefault();
  const form = document.getElementById("studentForm");
  const id = document.getElementById("studentFormId").value;
  const payload = {};
  for (const key of ["student_code","candidate_name","parent_name","mobile","email","gender","dob","qualification","address","village","mandal","district","state","pincode","course_name","enrollment_date","training_status"]) {
    payload[key] = form.elements[key].value || null;
  }
  payload.center_id = document.getElementById("studentCenterSelect").value || null;
  payload.batch_id = document.getElementById("studentBatchSelect").value || null;

  const saveBtn = document.getElementById("studentSaveBtn");
  saveBtn.disabled = true; saveBtn.textContent = "Saving…";
  const { error } = id
    ? await supabaseClient.from("students").update(payload).eq("id", id)
    : await supabaseClient.from("students").insert(payload);
  saveBtn.disabled = false; saveBtn.textContent = "Save student";

  if (error) { alert("Could not save student: " + error.message); return; }
  studentModal.hide();
  await loadStudents();
}
