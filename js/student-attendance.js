// ============================================================================
// STUDENT ATTENDANCE — pick center + batch + date, mark present/absent/leave
// for every student in that batch, then view attendance % reports.
// ============================================================================
let saCenters = [];
let saBatches = [];
let saStudents = [];
let saExistingAttendance = {};

async function initStudentAttendancePage() {
  const { data: centers } = await supabaseClient.from("centers").select("id, center_name").order("center_name");
  saCenters = centers || [];
  document.getElementById("saCenterSelect").innerHTML = `<option value="">Select center…</option>` + saCenters.map(c => `<option value="${c.id}">${c.center_name}</option>`).join("");
  document.getElementById("saDateInput").value = new Date().toISOString().slice(0, 10);

  document.getElementById("saCenterSelect").addEventListener("change", onSaCenterChange);
  document.getElementById("saBatchSelect").addEventListener("change", loadSaStudentsForBatch);
  document.getElementById("saDateInput").addEventListener("change", loadSaStudentsForBatch);
  document.getElementById("saMarkAllPresentBtn").addEventListener("click", () => setAllSaStatus("present"));
  document.getElementById("saSaveBtn").addEventListener("click", saveSaAttendance);
}

async function onSaCenterChange() {
  const centerId = document.getElementById("saCenterSelect").value;
  const batchSelect = document.getElementById("saBatchSelect");
  if (!centerId) { batchSelect.innerHTML = `<option value="">Select center first…</option>`; return; }
  const { data } = await supabaseClient.from("batches").select("id, batch_name").eq("center_id", centerId).order("batch_name");
  saBatches = data || [];
  batchSelect.innerHTML = `<option value="">Select batch…</option>` + saBatches.map(b => `<option value="${b.id}">${b.batch_name}</option>`).join("");
  document.getElementById("saAttendanceArea").innerHTML = `<div class="text-center text-muted py-4">Select a batch to mark attendance.</div>`;
}

async function loadSaStudentsForBatch() {
  const batchId = document.getElementById("saBatchSelect").value;
  const date = document.getElementById("saDateInput").value;
  const area = document.getElementById("saAttendanceArea");
  if (!batchId || !date) { area.innerHTML = `<div class="text-center text-muted py-4">Select a batch to mark attendance.</div>`; return; }

  area.innerHTML = `<div class="text-center text-muted py-4">Loading students…</div>`;

  const [{ data: students }, { data: existing }] = await Promise.all([
    supabaseClient.from("students").select("id, student_code, candidate_name").eq("batch_id", batchId).order("candidate_name"),
    supabaseClient.from("student_attendance").select("*").eq("batch_id", batchId).eq("attendance_date", date),
  ]);
  saStudents = students || [];
  saExistingAttendance = {};
  (existing || []).forEach(a => { saExistingAttendance[a.student_id] = a.status; });

  if (!saStudents.length) {
    area.innerHTML = `<div class="text-center text-muted py-4">No students enrolled in this batch yet.</div>`;
    return;
  }

  area.innerHTML = `
    <div class="table-responsive">
      <table class="erp-table">
        <thead><tr><th>Code</th><th>Student</th><th>Attendance</th></tr></thead>
        <tbody>
          ${saStudents.map(s => `
            <tr>
              <td><span class="code-chip">${s.student_code}</span></td>
              <td style="font-weight:600;">${s.candidate_name}</td>
              <td>
                <div class="btn-group" role="group" data-student-id="${s.id}">
                  ${["present","absent","leave"].map(st => `
                    <button type="button" class="btn btn-erp btn-sm sa-status-btn ${saExistingAttendance[s.id] === st ? "active-" + st : ""}" data-status="${st}" onclick="setSaStatus('${s.id}','${st}', this)">${st}</button>
                  `).join("")}
                </div>
              </td>
            </tr>`).join("")}
        </tbody>
      </table>
    </div>`;

  document.querySelectorAll(".sa-status-btn").forEach(btn => {
    const group = btn.closest("[data-student-id]");
    const studentId = group.dataset.studentId;
    if (saExistingAttendance[studentId] === btn.dataset.status) applySaBtnStyle(btn, true);
  });
}

function applySaBtnStyle(btn, active) {
  btn.classList.remove("active-present", "active-absent", "active-leave");
  if (active) btn.classList.add("active-" + btn.dataset.status);
}

function setSaStatus(studentId, status) {
  saExistingAttendance[studentId] = status;
  const group = document.querySelector(`[data-student-id="${studentId}"]`);
  group.querySelectorAll(".sa-status-btn").forEach(b => applySaBtnStyle(b, b.dataset.status === status));
}

function setAllSaStatus(status) {
  saStudents.forEach(s => setSaStatus(s.id, status));
}

async function saveSaAttendance() {
  const batchId = document.getElementById("saBatchSelect").value;
  const centerId = document.getElementById("saCenterSelect").value;
  const date = document.getElementById("saDateInput").value;
  if (!batchId || !date) { alert("Select a batch and date first."); return; }

  const rows = saStudents
    .filter(s => saExistingAttendance[s.id])
    .map(s => ({
      student_id: s.id, center_id: centerId, batch_id: batchId,
      attendance_date: date, status: saExistingAttendance[s.id]
    }));

  if (!rows.length) { alert("Mark at least one student's attendance first."); return; }

  const saveBtn = document.getElementById("saSaveBtn");
  saveBtn.disabled = true; saveBtn.textContent = "Saving…";
  const { error } = await supabaseClient.from("student_attendance").upsert(rows, { onConflict: "student_id,attendance_date" });
  saveBtn.disabled = false; saveBtn.textContent = "Save attendance";

  if (error) { alert("Could not save attendance: " + error.message); return; }
  alert("Attendance saved for " + rows.length + " students.");
}
