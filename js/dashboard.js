// ============================================================================
// DASHBOARD — stat cards + charts pulled live from Supabase
// ============================================================================

async function loadDashboard() {
  const today = new Date().toISOString().slice(0, 10);

  const [
    centersRes, activeCentersRes, employeesRes, presentTodayRes,
    batchesRes, activeBatchesRes, studentsRes, studentsPresentRes,
    pendingTasksRes, overdueTasksRes, expiringDocsRes, placementsRes
  ] = await Promise.all([
    supabaseClient.from("centers").select("id", { count: "exact", head: true }),
    supabaseClient.from("centers").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabaseClient.from("employees").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabaseClient.from("employee_attendance").select("id", { count: "exact", head: true }).eq("attendance_date", today).eq("status", "present"),
    supabaseClient.from("batches").select("id", { count: "exact", head: true }),
    supabaseClient.from("batches").select("id", { count: "exact", head: true }).in("status", ["active", "ongoing"]),
    supabaseClient.from("students").select("id", { count: "exact", head: true }),
    supabaseClient.from("student_attendance").select("id", { count: "exact", head: true }).eq("attendance_date", today).eq("status", "present"),
    supabaseClient.from("tasks").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabaseClient.from("tasks").select("id", { count: "exact", head: true }).eq("status", "overdue"),
    supabaseClient.from("center_documents").select("id", { count: "exact", head: true }).eq("status", "expiring_soon"),
    supabaseClient.from("placements").select("id", { count: "exact", head: true }).in("placement_status", ["selected", "joined"]),
  ]);

  setStat("statTotalCenters", centersRes.count);
  setStat("statActiveCenters", activeCentersRes.count);
  setStat("statTotalEmployees", employeesRes.count);
  setStat("statPresentToday", presentTodayRes.count);
  setStat("statTotalBatches", batchesRes.count);
  setStat("statActiveBatches", activeBatchesRes.count);
  setStat("statTotalStudents", studentsRes.count);
  setStat("statStudentsPresent", studentsPresentRes.count);
  setStat("statPendingTasks", pendingTasksRes.count);
  setStat("statOverdueTasks", overdueTasksRes.count);
  setStat("statExpiringDocs", expiringDocsRes.count);
  setStat("statPlacements", placementsRes.count);

  await Promise.all([loadCenterStrengthChart(), loadMobilizationFunnelChart(), loadAttendanceDonut()]);
  await loadExpiringDocsList();
}

function setStat(elId, value) {
  const el = document.getElementById(elId);
  if (el) el.textContent = value ?? 0;
}

async function loadCenterStrengthChart() {
  const { data: centers } = await supabaseClient.from("centers").select("id, center_name");
  if (!centers?.length) return;

  const counts = await Promise.all(
    centers.map(c => supabaseClient.from("students").select("id", { count: "exact", head: true }).eq("center_id", c.id))
  );

  new Chart(document.getElementById("centerStrengthChart"), {
    type: "bar",
    data: {
      labels: centers.map(c => c.center_name.replace(" Center", "")),
      datasets: [{
        label: "Students enrolled",
        data: counts.map(r => r.count || 0),
        backgroundColor: "#3B6BFA",
        borderRadius: 6,
        maxBarThickness: 36
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { color: "#EEF1F6" } },
        x: { grid: { display: false } }
      }
    }
  });
}

async function loadMobilizationFunnelChart() {
  const stages = ["lead", "contacted", "counselling", "interested", "documents_collected", "enrolled"];
  const counts = await Promise.all(
    stages.map(s => supabaseClient.from("mobilization_leads").select("id", { count: "exact", head: true }).eq("status", s))
  );

  new Chart(document.getElementById("mobilizationFunnelChart"), {
    type: "bar",
    data: {
      labels: stages.map(s => s.replace("_", " ")),
      datasets: [{
        data: counts.map(r => r.count || 0),
        backgroundColor: "#16A34A",
        borderRadius: 6,
        maxBarThickness: 26
      }]
    },
    options: {
      indexAxis: "y",
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { beginAtZero: true, grid: { color: "#EEF1F6" } },
        y: { grid: { display: false } }
      }
    }
  });
}

async function loadAttendanceDonut() {
  const today = new Date().toISOString().slice(0, 10);
  const [present, absent, leave] = await Promise.all([
    supabaseClient.from("employee_attendance").select("id", { count: "exact", head: true }).eq("attendance_date", today).eq("status", "present"),
    supabaseClient.from("employee_attendance").select("id", { count: "exact", head: true }).eq("attendance_date", today).eq("status", "absent"),
    supabaseClient.from("employee_attendance").select("id", { count: "exact", head: true }).eq("attendance_date", today).eq("status", "leave"),
  ]);

  new Chart(document.getElementById("attendanceDonutChart"), {
    type: "doughnut",
    data: {
      labels: ["Present", "Absent", "Leave"],
      datasets: [{
        data: [present.count || 0, absent.count || 0, leave.count || 0],
        backgroundColor: ["#16A34A", "#DC2626", "#D97706"],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      cutout: "68%",
      plugins: { legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 11 } } } }
    }
  });
}

async function loadExpiringDocsList() {
  const { data } = await supabaseClient
    .from("center_documents")
    .select("document_name, expiry_date, status, centers(center_name)")
    .in("status", ["expiring_soon", "expired"])
    .order("expiry_date", { ascending: true })
    .limit(6);

  const box = document.getElementById("expiringDocsList");
  if (!box) return;
  if (!data?.length) {
    box.innerHTML = `<div class="text-muted" style="font-size:13px;">No documents expiring soon.</div>`;
    return;
  }
  box.innerHTML = data.map(d => {
    const days = Math.ceil((new Date(d.expiry_date) - new Date()) / 86400000);
    const label = days < 0 ? `Expired ${Math.abs(days)}d ago` : `Expires in ${days}d`;
    const badgeClass = d.status === "expired" ? "badge-expired" : "badge-expiring_soon";
    return `<div class="d-flex justify-content-between align-items-center py-2" style="border-bottom:1px solid var(--gray-100);">
      <div>
        <div style="font-size:13px;font-weight:600;">${d.document_name}</div>
        <div style="font-size:11.5px;color:var(--gray-500);">${d.centers?.center_name || ""}</div>
      </div>
      <span class="badge-status ${badgeClass}">${label}</span>
    </div>`;
  }).join("");
}
