// ============================================================================
// EMPLOYEES MODULE — list, add, edit + daily attendance check-in/out
// ============================================================================

let allEmployees = [];
let allCentersForForm = [];
let employeeModal;
let todaysAttendance = {};

async function initEmployeesPage() {
  employeeModal = new bootstrap.Modal(document.getElementById("employeeModal"));
  document.getElementById("employeeForm").addEventListener("submit", saveEmployee);
  document.getElementById("employeeSearchInput").addEventListener("input", renderEmployeesTable);
  document.getElementById("addEmployeeBtn").addEventListener("click", () => openEmployeeModal(null));

  const { data: centers } = await supabaseClient.from("centers").select("id, center_name").order("center_name");
  allCentersForForm = centers || [];
  document.getElementById("employeeCenterSelect").innerHTML =
    `<option value="">— Unassigned —</option>` +
    allCentersForForm.map(c => `<option value="${c.id}">${c.center_name}</option>`).join("");

  await loadEmployees();
  await loadTodaysAttendance();
}

async function loadEmployees() {
  const { data, error } = await supabaseClient
    .from("employees")
    .select("*, centers(center_name)")
    .order("created_at", { ascending: false });

  if (error) {
    document.getElementById("employeesTableBody").innerHTML =
      `<tr><td colspan="7" class="text-danger text-center py-4">Could not load employees: ${error.message}</td></tr>`;
    return;
  }
  allEmployees = data || [];
  renderEmployeesTable();
}

async function loadTodaysAttendance() {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabaseClient.from("employee_attendance").select("*").eq("attendance_date", today);
  todaysAttendance = {};
  (data || []).forEach(a => { todaysAttendance[a.employee_id] = a; });
  renderEmployeesTable();
}

function renderEmployeesTable() {
  const q = document.getElementById("employeeSearchInput").value.trim().toLowerCase();
  const filtered = allEmployees.filter(e =>
    !q || e.full_name.toLowerCase().includes(q) || e.employee_code.toLowerCase().includes(q) || (e.designation || "").toLowerCase().includes(q)
  );

  document.getElementById("employeesCount").textContent = `${filtered.length} of ${allEmployees.length} employees`;
  const tbody = document.getElementById("employeesTableBody");

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No employees match your search.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(e => {
    const att = todaysAttendance[e.id];
    let attCell;
    if (!att) {
      attCell = `<button class="btn btn-erp btn-sm" onclick="checkIn('${e.id}')"><i class="bi bi-box-arrow-in-right"></i> Check in</button>`;
    } else if (!att.check_out_time) {
      attCell = `<button class="btn btn-erp btn-sm" onclick="checkOut('${e.id}')"><i class="bi bi-box-arrow-right"></i> Check out</button>`;
    } else {
      attCell = `<span class="badge-status badge-present">Done · ${att.total_hours ?? "—"}h</span>`;
    }

    return `
      <tr>
        <td><span class="code-chip">${e.employee_code}</span></td>
        <td>
          <div style="font-weight:600;">${e.full_name}</div>
          <div style="font-size:11.5px;color:var(--gray-500);">${e.mobile || ""}</div>
        </td>
        <td>${e.designation || "—"}</td>
        <td>${e.centers?.center_name || "—"}</td>
        <td><span class="badge-status badge-${e.status}">${e.status.replace(/_/g, " ")}</span></td>
        <td>${attCell}</td>
        <td class="text-end">
          <button class="btn btn-erp btn-sm" onclick="openEmployeeModal('${e.id}')"><i class="bi bi-pencil"></i></button>
        </td>
      </tr>`;
  }).join("");
}

async function checkIn(employeeId) {
  const emp = allEmployees.find(e => e.id === employeeId);
  const today = new Date().toISOString().slice(0, 10);
  const { error } = await supabaseClient.from("employee_attendance").insert({
    employee_id: employeeId,
    center_id: emp?.center_id || null,
    attendance_date: today,
    check_in_time: new Date().toISOString(),
    status: "present"
  });
  if (error) { alert("Check-in failed: " + error.message); return; }
  await loadTodaysAttendance();
}

async function checkOut(employeeId) {
  const today = new Date().toISOString().slice(0, 10);
  const att = todaysAttendance[employeeId];
  if (!att) return;
  const checkOutTime = new Date();
  const hours = ((checkOutTime - new Date(att.check_in_time)) / 3600000).toFixed(2);

  const { error } = await supabaseClient
    .from("employee_attendance")
    .update({ check_out_time: checkOutTime.toISOString(), total_hours: hours })
    .eq("employee_id", employeeId)
    .eq("attendance_date", today);

  if (error) { alert("Check-out failed: " + error.message); return; }
  await loadTodaysAttendance();
}

function openEmployeeModal(employeeId) {
  const form = document.getElementById("employeeForm");
  form.reset();
  document.getElementById("employeeFormId").value = "";
  document.getElementById("employeeModalTitle").textContent = "Add employee";

  if (employeeId) {
    const e = allEmployees.find(x => x.id === employeeId);
    if (e) {
      document.getElementById("employeeModalTitle").textContent = "Edit employee";
      document.getElementById("employeeFormId").value = e.id;
      for (const key of ["employee_code","full_name","designation","department","mobile","email","qualification","experience_years","date_of_joining","employee_type","status"]) {
        const el = form.elements[key];
        if (el) el.value = e[key] ?? "";
      }
      document.getElementById("employeeCenterSelect").value = e.center_id || "";
    }
  }
  employeeModal.show();
}

async function saveEmployee(event) {
  event.preventDefault();
  const form = document.getElementById("employeeForm");
  const id = document.getElementById("employeeFormId").value;

  const payload = {};
  for (const key of ["employee_code","full_name","designation","department","mobile","email","qualification","date_of_joining","employee_type","status"]) {
    payload[key] = form.elements[key].value || null;
  }
  payload.experience_years = form.elements["experience_years"].value ? parseFloat(form.elements["experience_years"].value) : null;
  payload.center_id = document.getElementById("employeeCenterSelect").value || null;

  const saveBtn = document.getElementById("employeeSaveBtn");
  saveBtn.disabled = true;
  saveBtn.textContent = "Saving…";

  const { error } = id
    ? await supabaseClient.from("employees").update(payload).eq("id", id)
    : await supabaseClient.from("employees").insert(payload);

  saveBtn.disabled = false;
  saveBtn.textContent = "Save employee";

  if (error) {
    alert("Could not save employee: " + error.message);
    return;
  }
  employeeModal.hide();
  await loadEmployees();
  await loadTodaysAttendance();
}
