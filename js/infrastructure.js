// ============================================================================
// INFRASTRUCTURE MODULE — one center_infrastructure row per center
// ============================================================================
let infraCenters = [];

async function initInfrastructurePage() {
  document.getElementById("infraForm").addEventListener("submit", saveInfra);
  document.getElementById("infraCenterSelect").addEventListener("change", loadInfraForCenter);

  const { data: centers } = await supabaseClient.from("centers").select("id, center_name").order("center_name");
  infraCenters = centers || [];
  document.getElementById("infraCenterSelect").innerHTML = `<option value="">Select a center…</option>` + infraCenters.map(c => `<option value="${c.id}">${c.center_name}</option>`).join("");
}

async function loadInfraForCenter() {
  const centerId = document.getElementById("infraCenterSelect").value;
  const formArea = document.getElementById("infraFormArea");
  if (!centerId) { formArea.classList.add("d-none"); return; }
  formArea.classList.remove("d-none");

  const { data, error } = await supabaseClient.from("center_infrastructure").select("*").eq("center_id", centerId).maybeSingle();
  const form = document.getElementById("infraForm");
  form.reset();
  document.getElementById("infraRowId").value = "";

  if (data) {
    document.getElementById("infraRowId").value = data.id;
    for (const key of ["classrooms","labs","computers","working_computers","non_working_computers","projectors","smart_tvs","printers","washrooms","other_equipment"]) {
      const el = form.elements[key];
      if (el) el.value = data[key] ?? "";
    }
    for (const key of ["cctv","internet","power_backup","drinking_water"]) {
      const el = form.elements[key];
      if (el) el.checked = !!data[key];
    }
  }
}

async function saveInfra(event) {
  event.preventDefault();
  const centerId = document.getElementById("infraCenterSelect").value;
  if (!centerId) return;
  const form = document.getElementById("infraForm");
  const rowId = document.getElementById("infraRowId").value;

  const payload = { center_id: centerId };
  for (const key of ["classrooms","labs","computers","working_computers","non_working_computers","projectors","smart_tvs","printers","washrooms"]) {
    payload[key] = form.elements[key].value ? parseInt(form.elements[key].value) : 0;
  }
  payload.other_equipment = form.elements["other_equipment"].value || null;
  for (const key of ["cctv","internet","power_backup","drinking_water"]) {
    payload[key] = form.elements[key].checked;
  }

  const saveBtn = document.getElementById("infraSaveBtn");
  saveBtn.disabled = true; saveBtn.textContent = "Saving…";
  const { error } = rowId
    ? await supabaseClient.from("center_infrastructure").update(payload).eq("id", rowId)
    : await supabaseClient.from("center_infrastructure").insert(payload);
  saveBtn.disabled = false; saveBtn.textContent = "Save infrastructure";

  if (error) { alert("Could not save: " + error.message); return; }
  alert("Infrastructure details saved.");
  await loadInfraForCenter();
}
