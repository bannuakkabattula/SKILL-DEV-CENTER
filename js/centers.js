// ============================================================================
// CENTERS MODULE — list, search, add, edit, deactivate
// ============================================================================

let allCenters = [];
let centerModal;

async function initCentersPage() {
  centerModal = new bootstrap.Modal(document.getElementById("centerModal"));
  document.getElementById("centerForm").addEventListener("submit", saveCenter);
  document.getElementById("centerSearchInput").addEventListener("input", renderCentersTable);
  document.getElementById("centerStatusFilter").addEventListener("change", renderCentersTable);
  document.getElementById("addCenterBtn").addEventListener("click", () => openCenterModal(null));
  await loadCenters();
}

async function loadCenters() {
  const { data, error } = await supabaseClient
    .from("centers")
    .select("*, students(count), employees(count)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    document.getElementById("centersTableBody").innerHTML =
      `<tr><td colspan="7" class="text-danger text-center py-4">Could not load centers: ${error.message}</td></tr>`;
    return;
  }
  allCenters = data || [];
  renderCentersTable();
}

function renderCentersTable() {
  const q = document.getElementById("centerSearchInput").value.trim().toLowerCase();
  const statusFilter = document.getElementById("centerStatusFilter").value;

  const filtered = allCenters.filter(c => {
    const matchesQ = !q || c.center_name.toLowerCase().includes(q) || c.center_code.toLowerCase().includes(q) || (c.district || "").toLowerCase().includes(q);
    const matchesStatus = !statusFilter || c.status === statusFilter;
    return matchesQ && matchesStatus;
  });

  const tbody = document.getElementById("centersTableBody");
  document.getElementById("centersCount").textContent = `${filtered.length} of ${allCenters.length} centers`;

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No centers match your search.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(c => `
    <tr>
      <td><span class="code-chip">${c.center_code}</span></td>
      <td>
        <div style="font-weight:600;">${c.center_name}</div>
        <div class="breadcrumb-chip"><span>${c.district || "—"}</span><span>${c.state || "—"}</span></div>
      </td>
      <td>${c.center_incharge || "—"}</td>
      <td>${c.students?.[0]?.count ?? 0}</td>
      <td>${c.employees?.[0]?.count ?? 0}</td>
      <td><span class="badge-status badge-${c.status}">${c.status.replace(/_/g, " ")}</span></td>
      <td class="text-end">
        <button class="btn btn-erp btn-sm" onclick="openCenterModal('${c.id}')"><i class="bi bi-pencil"></i></button>
        ${c.latitude ? `<a class="btn btn-erp btn-sm" target="_blank" href="https://www.google.com/maps?q=${c.latitude},${c.longitude}"><i class="bi bi-geo-alt"></i></a>` : ""}
      </td>
    </tr>
  `).join("");
}

function openCenterModal(centerId) {
  const form = document.getElementById("centerForm");
  form.reset();
  document.getElementById("centerFormId").value = "";
  document.getElementById("centerModalTitle").textContent = "Add center";

  if (centerId) {
    const c = allCenters.find(x => x.id === centerId);
    if (c) {
      document.getElementById("centerModalTitle").textContent = "Edit center";
      document.getElementById("centerFormId").value = c.id;
      for (const key of ["center_code","center_name","center_type","address","village","mandal","city","district","state","pincode","contact_number","email","center_incharge","center_coordinator","establishment_date","status","latitude","longitude"]) {
        const el = form.elements[key];
        if (el) el.value = c[key] ?? "";
      }
    }
  }
  centerModal.show();
}

async function saveCenter(event) {
  event.preventDefault();
  const form = document.getElementById("centerForm");
  const id = document.getElementById("centerFormId").value;

  const payload = {};
  for (const key of ["center_code","center_name","center_type","address","village","mandal","city","district","state","pincode","contact_number","email","center_incharge","center_coordinator","establishment_date","status"]) {
    payload[key] = form.elements[key].value || null;
  }
  payload.latitude = form.elements["latitude"].value ? parseFloat(form.elements["latitude"].value) : null;
  payload.longitude = form.elements["longitude"].value ? parseFloat(form.elements["longitude"].value) : null;

  const saveBtn = document.getElementById("centerSaveBtn");
  saveBtn.disabled = true;
  saveBtn.textContent = "Saving…";

  const { error } = id
    ? await supabaseClient.from("centers").update(payload).eq("id", id)
    : await supabaseClient.from("centers").insert(payload);

  saveBtn.disabled = false;
  saveBtn.textContent = "Save center";

  if (error) {
    alert("Could not save center: " + error.message);
    return;
  }
  centerModal.hide();
  await loadCenters();
}
