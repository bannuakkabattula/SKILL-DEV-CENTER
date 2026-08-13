// ============================================================================
// REPORTS — Center-wise completion, status breakdown, priority distribution,
// employee workload. Ported from the earlier localStorage reports panel,
// now backed by live Supabase data.
// ============================================================================

async function loadReports() {
  const { data: tasks } = await supabaseClient
    .from("tasks")
    .select("*, centers(center_name), employees:assigned_employee_id(full_name)");

  const list = tasks || [];
  const today = new Date().toISOString().slice(0, 10);
  list.forEach(t => {
    t._effectiveStatus = (t.status !== "completed" && t.due_date && t.due_date < today) ? "overdue" : t.status;
  });

  renderCompletionChart(list);
  renderStatusChart(list);
  renderPriorityChart(list);
  renderWorkloadChart(list);
  renderReportsSummary(list);
}

function renderCompletionChart(list) {
  const byCenterMap = {};
  list.forEach(t => {
    const name = t.centers?.center_name || "Unassigned";
    if (!byCenterMap[name]) byCenterMap[name] = { total: 0, completed: 0 };
    byCenterMap[name].total++;
    if (t._effectiveStatus === "completed") byCenterMap[name].completed++;
  });
  const labels = Object.keys(byCenterMap);
  const pct = labels.map(l => byCenterMap[l].total ? Math.round((byCenterMap[l].completed / byCenterMap[l].total) * 100) : 0);

  new Chart(document.getElementById("chartCompletion"), {
    type: "bar",
    data: { labels: labels.map(l => l.replace(" Center", "")), datasets: [{ data: pct, backgroundColor: "#16A34A", borderRadius: 6, maxBarThickness: 34 }] },
    options: {
      responsive: true,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => c.parsed.y + "% completed" } } },
      scales: { y: { beginAtZero: true, max: 100, grid: { color: "#EEF1F6" } }, x: { grid: { display: false } } }
    }
  });
}

function renderStatusChart(list) {
  const statuses = ["pending", "in_progress", "completed", "overdue"];
  const counts = statuses.map(s => list.filter(t => t._effectiveStatus === s).length);
  new Chart(document.getElementById("chartStatus"), {
    type: "doughnut",
    data: {
      labels: ["Pending", "In progress", "Completed", "Overdue"],
      datasets: [{ data: counts, backgroundColor: ["#D97706", "#3B6BFA", "#16A34A", "#DC2626"], borderWidth: 0 }]
    },
    options: { responsive: true, cutout: "62%", plugins: { legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 11 } } } } }
  });
}

function renderPriorityChart(list) {
  const priorities = ["high", "medium", "low"];
  const counts = priorities.map(p => list.filter(t => t.priority === p).length);
  new Chart(document.getElementById("chartPriority"), {
    type: "bar",
    data: {
      labels: ["High", "Medium", "Low"],
      datasets: [{ data: counts, backgroundColor: ["#DC2626", "#D97706", "#9AA4B7"], borderRadius: 6, maxBarThickness: 40 }]
    },
    options: {
      indexAxis: "y",
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { x: { beginAtZero: true, grid: { color: "#EEF1F6" } }, y: { grid: { display: false } } }
    }
  });
}

function renderWorkloadChart(list) {
  const byEmpMap = {};
  list.forEach(t => {
    const name = t.employees?.full_name;
    if (!name) return;
    byEmpMap[name] = (byEmpMap[name] || 0) + 1;
  });
  const sorted = Object.entries(byEmpMap).sort((a, b) => b[1] - a[1]).slice(0, 10);

  new Chart(document.getElementById("chartWorkload"), {
    type: "bar",
    data: {
      labels: sorted.map(s => s[0]),
      datasets: [{ data: sorted.map(s => s[1]), backgroundColor: "#3B6BFA", borderRadius: 6, maxBarThickness: 22 }]
    },
    options: {
      indexAxis: "y",
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { x: { beginAtZero: true, grid: { color: "#EEF1F6" } }, y: { grid: { display: false } } }
    }
  });
}

function renderReportsSummary(list) {
  const total = list.length;
  const completed = list.filter(t => t._effectiveStatus === "completed").length;
  const overdue = list.filter(t => t._effectiveStatus === "overdue").length;
  const important = list.filter(t => t.is_important).length;
  const completionRate = total ? Math.round((completed / total) * 100) : 0;

  document.getElementById("reportsKpiGrid").innerHTML = `
    <div class="col-6 col-lg-3">
      <div class="stat-card"><div class="stat-value">${total}</div><div class="stat-label">Total works</div></div>
    </div>
    <div class="col-6 col-lg-3">
      <div class="stat-card"><div class="stat-value" style="color:var(--green-600);">${completionRate}%</div><div class="stat-label">Completion rate</div></div>
    </div>
    <div class="col-6 col-lg-3">
      <div class="stat-card"><div class="stat-value" style="color:var(--red-600);">${overdue}</div><div class="stat-label">Overdue</div></div>
    </div>
    <div class="col-6 col-lg-3">
      <div class="stat-card"><div class="stat-value" style="color:var(--orange-600);">${important}</div><div class="stat-label">Flagged important</div></div>
    </div>`;
}
