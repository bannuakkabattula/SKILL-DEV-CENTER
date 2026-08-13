// ============================================================================
// TASKS / WORK MANAGEMENT MODULE
// Ported from the earlier localStorage "Task Manager" project onto the
// Supabase `tasks` table. Supports: all/pending/completed/important/overdue
// filters, center/employee/priority filters, star (important) toggle,
// assign-work modal, grouped-by-employee view.
// ============================================================================

let allTasks = [];
let taskCentersForForm = [];
let taskEmployeesForForm = [];
let taskModal;
let currentTaskView = "all"; // all | pending | completed | important | overdue | assigned

const TASK_CATEGORIES = ["Administrative","Reports","Placement","Mobilization","Training","Compliance","Infrastructure"];

async function initTasksPage() {
  taskModal = new bootstrap.Modal(document.getElementById("taskModal"));
  document.getElementById("taskForm").addEventListener("submit", saveTask);
  document.getElementById("addTaskBtn").addEventListener("click", () => openTaskModal(null));
  document.getElementById("taskSearchInput").addEventListener("input", renderTasksView);
  document.getElementById("taskCenterFilter").addEventListener("change", renderTasksView);
  document.getElementById("taskPriorityFilter").addEventListener("change", renderTasksView);

  document.querySelectorAll("[data-task-tab]").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll("[data-task-tab]").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      currentTaskView = tab.dataset.taskTab;
      renderTasksView();
    });
  });

  const params = new URLSearchParams(window.location.search);
  const initialFilter = params.get("filter");
  if (initialFilter) {
    currentTaskView = initialFilter;
    const tab = document.querySelector(`[data-task-tab="${initialFilter}"]`);
    if (tab) {
      document.querySelectorAll("[data-task-tab]").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
    }
  }

  const [{ data: centers }, { data: employees }] = await Promise.all([
    supabaseClient.from("centers").select("id, center_name").order("center_name"),
    supabaseClient.from("employees").select("id, full_name, center_id, designation").order("full_name"),
  ]);
  taskCentersForForm = centers || [];
  taskEmployeesForForm = employees || [];

  document.getElementById("taskCenterFilter").innerHTML =
    `<option value="">All centers</option>` + taskCentersForForm.map(c => `<option value="${c.id}">${c.center_name}</option>`).join("");
  document.getElementById("taskCenterSelect").innerHTML =
    taskCentersForForm.map(c => `<option value="${c.id}">${c.center_name}</option>`).join("");
  document.getElementById("taskEmployeeSelect").innerHTML =
    taskEmployeesForForm.map(e => `<option value="${e.id}">${e.full_name} — ${e.designation || ""}</option>`).join("");

  await loadTasks();
}

async function loadTasks() {
  const { data, error } = await supabaseClient
    .from("tasks")
    .select("*, centers(center_name), employees:assigned_employee_id(full_name, designation)")
    .order("due_date", { ascending: true });

  if (error) {
    document.getElementById("tasksListArea").innerHTML =
      `<div class="text-danger text-center py-4">Could not load tasks: ${error.message}</div>`;
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  allTasks = (data || []).map(t => {
    if (t.status !== "completed" && t.due_date && t.due_date < today) {
      t._effectiveStatus = "overdue";
    } else {
      t._effectiveStatus = t.status;
    }
    return t;
  });

  renderTaskStats();
  renderTasksView();
}

function renderTaskStats() {
  const total = allTasks.length;
  const pending = allTasks.filter(t => t._effectiveStatus === "pending" || t._effectiveStatus === "in_progress").length;
  const completed = allTasks.filter(t => t._effectiveStatus === "completed").length;
  const overdue = allTasks.filter(t => t._effectiveStatus === "overdue").length;
  const important = allTasks.filter(t => t.is_important).length;

  document.getElementById("taskStatTotal").textContent = total;
  document.getElementById("taskStatPending").textContent = pending;
  document.getElementById("taskStatCompleted").textContent = completed;
  document.getElementById("taskStatOverdue").textContent = overdue;
  document.getElementById("taskStatImportant").textContent = important;

  document.querySelectorAll("[data-task-tab]").forEach(tab => {
    const key = tab.dataset.taskTab;
    const countEl = tab.querySelector(".nav-count");
    if (!countEl) return;
    if (key === "all") countEl.textContent = total;
    else if (key === "pending") countEl.textContent = pending;
    else if (key === "completed") countEl.textContent = completed;
    else if (key === "overdue") countEl.textContent = overdue;
    else if (key === "important") countEl.textContent = important;
  });
}

function taskMatchesView(t) {
  switch (currentTaskView) {
    case "pending": return t._effectiveStatus === "pending" || t._effectiveStatus === "in_progress";
    case "completed": return t._effectiveStatus === "completed";
    case "overdue": return t._effectiveStatus === "overdue";
    case "important": return t.is_important;
    case "assigned": return true;
    default: return true;
  }
}

function renderTasksView() {
  const q = document.getElementById("taskSearchInput").value.trim().toLowerCase();
  const centerFilter = document.getElementById("taskCenterFilter").value;
  const priorityFilter = document.getElementById("taskPriorityFilter").value;

  const filtered = allTasks.filter(t => {
    if (!taskMatchesView(t)) return false;
    if (centerFilter && t.center_id !== centerFilter) return false;
    if (priorityFilter && t.priority !== priorityFilter) return false;
    if (q) {
      const hay = `${t.task_title} ${t.employees?.full_name || ""} ${t.centers?.center_name || ""} ${t.category || ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const area = document.getElementById("tasksListArea");

  if (currentTaskView === "important") {
    area.innerHTML = renderImportantGrid(filtered);
    return;
  }
  if (currentTaskView === "assigned") {
    area.innerHTML = renderGroupedByEmployee(filtered);
    return;
  }
  area.innerHTML = renderTaskTable(filtered);
}

function renderTaskTable(list) {
  if (!list.length) {
    return `<div class="text-center py-5 text-muted"><i class="bi bi-inbox fs-2 d-block mb-2"></i>No tasks match this view.</div>`;
  }
  return `
    <div class="table-responsive">
      <table class="erp-table">
        <thead>
          <tr>
            <th></th>
            <th>Task</th>
            <th>Center</th>
            <th>Assigned to</th>
            <th>Priority</th>
            <th>Due date</th>
            <th>Status</th>
            <th class="text-end">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${list.map(t => `
            <tr>
              <td><button class="star-btn ${t.is_important ? "is-important" : ""}" onclick="toggleImportant('${t.id}', ${!t.is_important})" title="Mark important">
                <i class="bi ${t.is_important ? "bi-star-fill" : "bi-star"}"></i>
              </button></td>
              <td>
                <div style="font-weight:600;">${t.task_title}</div>
                <div style="font-size:11.5px;color:var(--gray-500);">${t.category || ""}</div>
              </td>
              <td>${t.centers?.center_name || "—"}</td>
              <td>${t.employees?.full_name || "—"}</td>
              <td><span class="badge-priority priority-${t.priority}">${t.priority}</span></td>
              <td>${t.due_date || "—"}</td>
              <td>${statusBadgeTask(t._effectiveStatus)}</td>
              <td class="text-end">
                ${t._effectiveStatus !== "completed" ? `<button class="btn btn-erp btn-sm" onclick="markTaskComplete('${t.id}')"><i class="bi bi-check2"></i></button>` : ""}
                <button class="btn btn-erp btn-sm" onclick="openTaskModal('${t.id}')"><i class="bi bi-pencil"></i></button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>`;
}

function renderImportantGrid(list) {
  if (!list.length) {
    return `<div class="text-center py-5 text-muted"><i class="bi bi-star fs-2 d-block mb-2"></i>No important tasks flagged right now.</div>`;
  }
  return `<div class="row g-3">${list.map(t => `
    <div class="col-md-4">
      <div class="panel h-100">
        <div class="d-flex justify-content-between align-items-start mb-2">
          <span class="badge-priority priority-${t.priority}">${t.priority}</span>
          <span class="text-warning"><i class="bi bi-star-fill"></i></span>
        </div>
        <div style="font-weight:700;margin-bottom:8px;">${t.task_title}</div>
        <div style="font-size:12.5px;color:var(--gray-500);line-height:1.8;">
          <div>Center: ${t.centers?.center_name || "—"}</div>
          <div>Assigned to: ${t.employees?.full_name || "—"}</div>
          <div>Due: ${t.due_date || "—"}</div>
          <div>${statusBadgeTask(t._effectiveStatus)}</div>
        </div>
      </div>
    </div>
  `).join("")}</div>`;
}

function renderGroupedByEmployee(list) {
  const empIds = [...new Set(list.map(t => t.assigned_employee_id).filter(Boolean))];
  if (!empIds.length) {
    return `<div class="text-center py-5 text-muted">No tasks match this view.</div>`;
  }
  return empIds.map(empId => {
    const empTasks = list.filter(t => t.assigned_employee_id === empId);
    const emp = empTasks[0]?.employees;
    const centerName = empTasks[0]?.centers?.center_name || "";
    const total = empTasks.length;
    const completed = empTasks.filter(t => t._effectiveStatus === "completed").length;
    const pending = empTasks.filter(t => t._effectiveStatus !== "completed").length;
    return `
      <div class="panel mb-3">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <div>
            <div style="font-weight:700;">${emp?.full_name || "Unknown"}</div>
            <div style="font-size:12px;color:var(--gray-500);">${emp?.designation || ""} · ${centerName}</div>
          </div>
          <div class="d-flex gap-3 text-center">
            <div><div style="font-weight:700;">${total}</div><div style="font-size:11px;color:var(--gray-500);">Assigned</div></div>
            <div><div style="font-weight:700;color:var(--orange-600);">${pending}</div><div style="font-size:11px;color:var(--gray-500);">Pending</div></div>
            <div><div style="font-weight:700;color:var(--green-600);">${completed}</div><div style="font-size:11px;color:var(--gray-500);">Completed</div></div>
          </div>
        </div>
        ${renderTaskTable(empTasks)}
      </div>`;
  }).join("");
}

function statusBadgeTask(status) {
  const map = { pending: "pending", in_progress: "in_progress", completed: "completed", overdue: "cancelled" };
  return `<span class="badge-status badge-${map[status] || "pending"}">${status.replace("_", " ")}</span>`;
}

async function toggleImportant(taskId, value) {
  const { error } = await supabaseClient.from("tasks").update({ is_important: value }).eq("id", taskId);
  if (error) { alert("Could not update: " + error.message); return; }
  await loadTasks();
}

async function markTaskComplete(taskId) {
  const { error } = await supabaseClient.from("tasks").update({ status: "completed" }).eq("id", taskId);
  if (error) { alert("Could not update: " + error.message); return; }
  await loadTasks();
}

function openTaskModal(taskId) {
  const form = document.getElementById("taskForm");
  form.reset();
  document.getElementById("taskFormId").value = "";
  document.getElementById("taskModalTitle").textContent = "Assign new work";

  if (taskId) {
    const t = allTasks.find(x => x.id === taskId);
    if (t) {
      document.getElementById("taskModalTitle").textContent = "Edit work";
      document.getElementById("taskFormId").value = t.id;
      form.elements["task_title"].value = t.task_title || "";
      form.elements["description"].value = t.remarks || "";
      form.elements["priority"].value = t.priority || "medium";
      form.elements["due_date"].value = t.due_date || "";
      form.elements["category"].value = t.category || "Administrative";
      form.elements["is_important"].checked = !!t.is_important;
      form.elements["status"].value = t.status || "pending";
      document.getElementById("taskCenterSelect").value = t.center_id || "";
      document.getElementById("taskEmployeeSelect").value = t.assigned_employee_id || "";
    }
  }
  taskModal.show();
}

async function saveTask(event) {
  event.preventDefault();
  const form = document.getElementById("taskForm");
  const id = document.getElementById("taskFormId").value;

  const payload = {
    task_title: form.elements["task_title"].value,
    remarks: form.elements["description"].value || null,
    priority: form.elements["priority"].value,
    due_date: form.elements["due_date"].value || null,
    category: form.elements["category"].value,
    is_important: form.elements["is_important"].checked,
    status: form.elements["status"].value,
    center_id: document.getElementById("taskCenterSelect").value || null,
    assigned_employee_id: document.getElementById("taskEmployeeSelect").value || null,
  };

  const saveBtn = document.getElementById("taskSaveBtn");
  saveBtn.disabled = true;
  saveBtn.textContent = "Saving…";

  const { error } = id
    ? await supabaseClient.from("tasks").update(payload).eq("id", id)
    : await supabaseClient.from("tasks").insert(payload);

  saveBtn.disabled = false;
  saveBtn.textContent = "Save work";

  if (error) {
    alert("Could not save task: " + error.message);
    return;
  }
  taskModal.hide();
  await loadTasks();
}
