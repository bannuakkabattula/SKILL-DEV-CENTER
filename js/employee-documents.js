// ============================================================================
// EMPLOYEE DOCUMENTS MODULE
// ============================================================================
const EMPLOYEE_DOC_BUCKET = "employee-documents";
let allEmployeeDocs = [];
let edEmployeesForForm = [];
let edModal;

async function initEmployeeDocumentsPage() {
  edModal = new bootstrap.Modal(document.getElementById("edModal"));
  document.getElementById("edForm").addEventListener("submit", saveEmployeeDoc);
  document.getElementById("edEmployeeFilter").addEventListener("change", renderEmployeeDocsTable);
  document.getElementById("addEmployeeDocBtn").addEventListener("click", () => openEdModal());

  const { data: employees } = await supabaseClient.from("employees").select("id, full_name, employee_code").order("full_name");
  edEmployeesForForm = employees || [];
  document.getElementById("edEmployeeFilter").innerHTML = `<option value="">All employees</option>` + edEmployeesForForm.map(e => `<option value="${e.id}">${e.full_name}</option>`).join("");
  document.getElementById("edEmployeeSelect").innerHTML = edEmployeesForForm.map(e => `<option value="${e.id}">${e.full_name} (${e.employee_code})</option>`).join("");

  await loadEmployeeDocs();
}

async function loadEmployeeDocs() {
  const { data, error } = await supabaseClient
    .from("employee_documents")
    .select("*, employees(full_name, employee_code)")
    .order("uploaded_at", { ascending: false });
  if (error) {
    document.getElementById("edTableBody").innerHTML = `<tr><td colspan="4" class="text-danger text-center py-4">${error.message}</td></tr>`;
    return;
  }
  allEmployeeDocs = data || [];
  renderEmployeeDocsTable();
}

function renderEmployeeDocsTable() {
  const empFilter = document.getElementById("edEmployeeFilter").value;
  const filtered = allEmployeeDocs.filter(d => !empFilter || d.employee_id === empFilter);
  document.getElementById("edCount").textContent = `${filtered.length} of ${allEmployeeDocs.length} documents`;
  const tbody = document.getElementById("edTableBody");
  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-muted">No documents uploaded yet.</td></tr>`;
    return;
  }
  tbody.innerHTML = filtered.map(d => `
    <tr>
      <td>${d.document_name}</td>
      <td>${d.document_type || "—"}</td>
      <td>${d.employees?.full_name || "—"}</td>
      <td class="text-end">${d.file_path ? `<button class="btn btn-erp btn-sm" onclick="downloadEmployeeDoc('${d.id}')"><i class="bi bi-download"></i></button>` : ""}</td>
    </tr>`).join("");
}

async function downloadEmployeeDoc(docId) {
  const doc = allEmployeeDocs.find(d => d.id === docId);
  if (!doc?.file_path) return;
  const { data, error } = await supabaseClient.storage.from(EMPLOYEE_DOC_BUCKET).createSignedUrl(doc.file_path, 300);
  if (error) { alert("Could not generate link: " + error.message); return; }
  window.open(data.signedUrl, "_blank");
}

function openEdModal() {
  document.getElementById("edForm").reset();
  edModal.show();
}

async function saveEmployeeDoc(event) {
  event.preventDefault();
  const form = document.getElementById("edForm");
  const employeeId = document.getElementById("edEmployeeSelect").value;
  const fileInput = document.getElementById("edFileInput");
  if (!fileInput.files[0]) { alert("Choose a file to upload."); return; }

  const saveBtn = document.getElementById("edSaveBtn");
  saveBtn.disabled = true; saveBtn.textContent = "Uploading…";

  const file = fileInput.files[0];
  const path = `${employeeId}/${Date.now()}_${file.name}`;
  const { error: uploadError } = await supabaseClient.storage.from(EMPLOYEE_DOC_BUCKET).upload(path, file, { upsert: true });
  if (uploadError) {
    saveBtn.disabled = false; saveBtn.textContent = "Upload";
    alert("Upload failed: " + uploadError.message);
    return;
  }

  const { error } = await supabaseClient.from("employee_documents").insert({
    employee_id: employeeId,
    document_name: form.elements["document_name"].value,
    document_type: form.elements["document_type"].value || null,
    file_path: path,
  });

  saveBtn.disabled = false; saveBtn.textContent = "Upload";
  if (error) { alert("Could not save document record: " + error.message); return; }
  edModal.hide();
  await loadEmployeeDocs();
}
