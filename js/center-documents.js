// ============================================================================
// CENTER DOCUMENTS MODULE — metadata in `center_documents`, files in the
// `center-documents` Supabase Storage bucket (private, signed URLs).
// ============================================================================
const CENTER_DOC_BUCKET = "center-documents";
let allCenterDocs = [];
let cdCentersForForm = [];
let cdModal;

async function initCenterDocumentsPage() {
  cdModal = new bootstrap.Modal(document.getElementById("cdModal"));
  document.getElementById("cdForm").addEventListener("submit", saveCenterDocument);
  document.getElementById("cdCenterFilter").addEventListener("change", renderCenterDocsTable);
  document.getElementById("cdStatusFilter").addEventListener("change", renderCenterDocsTable);
  document.getElementById("addCenterDocBtn").addEventListener("click", () => openCdModal(null));

  const { data: centers } = await supabaseClient.from("centers").select("id, center_name").order("center_name");
  cdCentersForForm = centers || [];
  document.getElementById("cdCenterFilter").innerHTML = `<option value="">All centers</option>` + cdCentersForForm.map(c => `<option value="${c.id}">${c.center_name}</option>`).join("");
  document.getElementById("cdCenterSelect").innerHTML = cdCentersForForm.map(c => `<option value="${c.id}">${c.center_name}</option>`).join("");

  await loadCenterDocuments();
}

async function loadCenterDocuments() {
  const { data, error } = await supabaseClient
    .from("center_documents")
    .select("*, centers(center_name)")
    .order("uploaded_at", { ascending: false });
  if (error) {
    document.getElementById("cdTableBody").innerHTML = `<tr><td colspan="6" class="text-danger text-center py-4">${error.message}</td></tr>`;
    return;
  }
  allCenterDocs = data || [];
  renderCenterDocsTable();
}

function renderCenterDocsTable() {
  const centerFilter = document.getElementById("cdCenterFilter").value;
  const statusFilter = document.getElementById("cdStatusFilter").value;
  const filtered = allCenterDocs.filter(d => (!centerFilter || d.center_id === centerFilter) && (!statusFilter || d.status === statusFilter));

  document.getElementById("cdCount").textContent = `${filtered.length} of ${allCenterDocs.length} documents`;
  const tbody = document.getElementById("cdTableBody");
  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">No documents match your filters.</td></tr>`;
    return;
  }
  tbody.innerHTML = filtered.map(d => `
    <tr>
      <td><div style="font-weight:600;">${d.document_name}</div><div style="font-size:11.5px;color:var(--gray-500);">${d.document_type || ""}</div></td>
      <td>${d.centers?.center_name || "—"}</td>
      <td>${d.expiry_date || "—"}</td>
      <td><span class="badge-status badge-${d.status}">${(d.status || "").replace(/_/g," ")}</span></td>
      <td>${d.file_path ? `<button class="btn btn-erp btn-sm" onclick="downloadCenterDoc('${d.id}')"><i class="bi bi-download"></i></button>` : `<span class="text-muted" style="font-size:12px;">No file</span>`}</td>
      <td class="text-end"><button class="btn btn-erp btn-sm" onclick="openCdModal('${d.id}')"><i class="bi bi-pencil"></i></button></td>
    </tr>`).join("");
}

async function downloadCenterDoc(docId) {
  const doc = allCenterDocs.find(d => d.id === docId);
  if (!doc?.file_path) return;
  const { data, error } = await supabaseClient.storage.from(CENTER_DOC_BUCKET).createSignedUrl(doc.file_path, 300);
  if (error) { alert("Could not generate download link: " + error.message); return; }
  window.open(data.signedUrl, "_blank");
}

function openCdModal(docId) {
  const form = document.getElementById("cdForm");
  form.reset();
  document.getElementById("cdFormId").value = "";
  document.getElementById("cdModalTitle").textContent = "Upload document";
  document.getElementById("cdExistingFileNote").textContent = "";
  if (docId) {
    const d = allCenterDocs.find(x => x.id === docId);
    if (d) {
      document.getElementById("cdModalTitle").textContent = "Edit document";
      document.getElementById("cdFormId").value = d.id;
      for (const key of ["document_name","document_type","document_number","issue_date","expiry_date","remarks","status"]) {
        const el = form.elements[key];
        if (el) el.value = d[key] ?? "";
      }
      document.getElementById("cdCenterSelect").value = d.center_id || "";
      if (d.file_path) document.getElementById("cdExistingFileNote").textContent = "A file is already attached. Choosing a new one will replace it.";
    }
  }
  cdModal.show();
}

async function saveCenterDocument(event) {
  event.preventDefault();
  const form = document.getElementById("cdForm");
  const id = document.getElementById("cdFormId").value;
  const fileInput = document.getElementById("cdFileInput");
  const centerId = document.getElementById("cdCenterSelect").value;

  const payload = {};
  for (const key of ["document_name","document_type","document_number","issue_date","expiry_date","remarks","status"]) {
    payload[key] = form.elements[key].value || null;
  }
  payload.center_id = centerId || null;

  const saveBtn = document.getElementById("cdSaveBtn");
  saveBtn.disabled = true; saveBtn.textContent = "Saving…";

  if (fileInput.files[0]) {
    const file = fileInput.files[0];
    const path = `${centerId}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabaseClient.storage.from(CENTER_DOC_BUCKET).upload(path, file, { upsert: true });
    if (uploadError) {
      saveBtn.disabled = false; saveBtn.textContent = "Save document";
      alert("File upload failed: " + uploadError.message);
      return;
    }
    payload.file_path = path;
  }

  const { error } = id
    ? await supabaseClient.from("center_documents").update(payload).eq("id", id)
    : await supabaseClient.from("center_documents").insert(payload);

  saveBtn.disabled = false; saveBtn.textContent = "Save document";
  if (error) { alert("Could not save document: " + error.message); return; }
  cdModal.hide();
  await loadCenterDocuments();
}
