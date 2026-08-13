// ============================================================================
// SHARED APP SHELL — sidebar + topbar, injected into every authenticated page
// ============================================================================

const NAV_SECTIONS = [
  { label: null, items: [
    { key: "dashboard", href: "dashboard.html", icon: "bi-speedometer2", text: "Dashboard" },
  ]},
  { label: "Centers", items: [
    { key: "centers", href: "centers.html", icon: "bi-buildings", text: "All Centers" },
    { key: "center-documents", href: "center-documents.html", icon: "bi-file-earmark-text", text: "Center Documents" },
    { key: "infrastructure", href: "infrastructure.html", icon: "bi-hdd-rack", text: "Infrastructure" },
    { key: "locations", href: "locations.html", icon: "bi-geo-alt", text: "Locations" },
  ]},
  { label: "Employees", items: [
    { key: "employees", href: "employees.html", icon: "bi-people", text: "Employee List" },
    { key: "employee-attendance", href: "employees.html#attendance", icon: "bi-calendar-check", text: "Employee Attendance" },
    { key: "employee-tasks", href: "tasks.html?filter=assigned", icon: "bi-list-check", text: "Employee Tasks" },
    { key: "employee-documents", href: "employee-documents.html", icon: "bi-folder2-open", text: "Employee Documents" },
  ]},
  { label: "Students", items: [
    { key: "students", href: "students.html", icon: "bi-mortarboard", text: "Student List" },
    { key: "student-attendance", href: "student-attendance.html", icon: "bi-calendar2-check", text: "Student Attendance" },
  ]},
  { label: null, items: [
    { key: "batches", href: "batches.html", icon: "bi-collection", text: "Batches" },
    { key: "mobilization", href: "mobilization.html", icon: "bi-megaphone", text: "Mobilization" },
    { key: "training", href: "training.html", icon: "bi-easel", text: "Training" },
    { key: "placements", href: "placements.html", icon: "bi-briefcase", text: "Placements" },
    { key: "documents", href: "coming-soon.html?m=Documents", icon: "bi-files", text: "Documents" },
    { key: "notifications", href: "notifications.html", icon: "bi-bell", text: "Notifications" },
    { key: "settings", href: "settings.html", icon: "bi-gear", text: "Settings" },
  ]},
  { label: "Work management", items: [
    { key: "tasks", href: "tasks.html", icon: "bi-kanban-fill", text: "All works" },
    { key: "tasks-pending", href: "tasks.html?filter=pending", icon: "bi-hourglass-split", text: "Pending works" },
    { key: "tasks-important", href: "tasks.html?filter=important", icon: "bi-star-fill", text: "Important works" },
    { key: "tasks-overdue", href: "tasks.html?filter=overdue", icon: "bi-exclamation-triangle-fill", text: "Overdue works" },
    { key: "reports", href: "reports.html", icon: "bi-bar-chart", text: "Reports" },
    { key: "calendar", href: "calendar.html", icon: "bi-calendar3", text: "Calendar" },
  ]},
];

function renderShell({ activeKey, title, subtitle }) {
  const sidebarHtml = `
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-brand">
        <div class="mark">SDC · ERP</div>
        <div class="name">Skill Dev. Centers</div>
      </div>
      <nav class="sidebar-nav">
        ${NAV_SECTIONS.map(section => `
          ${section.label ? `<div class="sidebar-section-label">${section.label}</div>` : ""}
          ${section.items.map(item => `
            <a class="sidebar-link ${item.key === activeKey ? "active" : ""}" href="${item.href}">
              <i class="bi ${item.icon}"></i> ${item.text}
            </a>
          `).join("")}
        `).join("")}
      </nav>
      <div class="sidebar-footer">
        <div class="avatar-circle" id="avatarInitial">A</div>
        <div class="who">
          <div class="n" id="currentUserName">Loading…</div>
          <div class="r" id="currentUserRole">admin</div>
        </div>
        <button class="logout-btn" title="Log out" onclick="handleLogout()"><i class="bi bi-box-arrow-right"></i></button>
      </div>
    </aside>`;

  const topbarHtml = `
    <div class="topbar">
      <div class="d-flex align-items-center gap-3">
        <button class="btn btn-sm d-md-none" onclick="document.getElementById('sidebar').classList.toggle('open')">
          <i class="bi bi-list"></i>
        </button>
        <div>
          <h1>${title}</h1>
          ${subtitle ? `<div class="subtitle">${subtitle}</div>` : ""}
        </div>
      </div>
      <input class="search-input d-none d-md-block" style="width:260px;" placeholder="Search centers, employees, students…">
    </div>`;

  document.getElementById("shellMount").innerHTML = `
    <div class="app-shell">
      ${sidebarHtml}
      <div class="main-col">
        ${topbarHtml}
        <div class="content-area" id="contentArea"></div>
      </div>
    </div>`;
}

document.addEventListener("DOMContentLoaded", async () => {
  const session = await requireSession();
  if (!session) return;
  loadCurrentUserBadge().then(() => {
    const nameEl = document.getElementById("currentUserName");
    const avatarEl = document.getElementById("avatarInitial");
    if (nameEl && avatarEl) {
      const n = nameEl.textContent.trim();
      avatarEl.textContent = n ? n[0].toUpperCase() : "A";
    }
  });
});
