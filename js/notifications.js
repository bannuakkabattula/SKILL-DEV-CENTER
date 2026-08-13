// ============================================================================
// NOTIFICATIONS MODULE
// ============================================================================
let allNotifications = [];

async function initNotificationsPage() {
  document.getElementById("notifFilter").addEventListener("change", renderNotifications);
  document.getElementById("markAllReadBtn").addEventListener("click", markAllRead);
  document.getElementById("generateNotifBtn").addEventListener("click", generateSystemNotifications);
  await loadNotifications();
}

async function loadNotifications() {
  const { data, error } = await supabaseClient.from("notifications").select("*, centers(center_name)").order("created_at", { ascending: false }).limit(100);
  if (error) {
    document.getElementById("notifList").innerHTML = `<div class="text-danger text-center py-4">${error.message}</div>`;
    return;
  }
  allNotifications = data || [];
  renderNotifications();
}

function renderNotifications() {
  const filter = document.getElementById("notifFilter").value;
  const filtered = allNotifications.filter(n => !filter || n.category === filter);
  const list = document.getElementById("notifList");
  if (!filtered.length) {
    list.innerHTML = `<div class="text-center text-muted py-4">No notifications yet. Click "Check for alerts" to scan for expiring documents and overdue tasks.</div>`;
    return;
  }
  list.innerHTML = filtered.map(n => `
    <div class="d-flex justify-content-between align-items-start py-3" style="border-bottom:1px solid var(--gray-100); ${n.is_read ? "opacity:0.55;" : ""}">
      <div class="d-flex gap-3">
        <div class="stat-icon ${notifIconTint(n.category)}" style="width:32px;height:32px;margin-bottom:0;"><i class="bi ${notifIcon(n.category)}"></i></div>
        <div>
          <div style="font-weight:600;font-size:13.5px;">${n.title}</div>
          <div style="font-size:12.5px;color:var(--gray-500);">${n.message || ""} ${n.centers ? "· " + n.centers.center_name : ""}</div>
          <div style="font-size:11px;color:var(--gray-400);margin-top:2px;">${new Date(n.created_at).toLocaleString()}</div>
        </div>
      </div>
      ${!n.is_read ? `<button class="btn btn-erp btn-sm" onclick="markRead('${n.id}')">Mark read</button>` : `<span class="badge-status badge-completed">Read</span>`}
    </div>`).join("");
}

function notifIcon(category) {
  const map = {
    employee_absent: "bi-person-x", student_attendance_low: "bi-graph-down", task_pending: "bi-hourglass-split",
    task_overdue: "bi-exclamation-triangle", document_expiring: "bi-file-earmark-excel", document_expired: "bi-file-earmark-x",
    batch_ending: "bi-calendar-x", assessment_pending: "bi-clipboard-check", ojt_pending: "bi-briefcase",
    placement_pending: "bi-person-check", general: "bi-bell"
  };
  return map[category] || "bi-bell";
}
function notifIconTint(category) {
  if (["task_overdue", "document_expired"].includes(category)) return "bg-red-tint";
  if (["document_expiring", "task_pending", "batch_ending"].includes(category)) return "bg-orange-tint";
  return "bg-blue-tint";
}

async function markRead(id) {
  await supabaseClient.from("notifications").update({ is_read: true }).eq("id", id);
  await loadNotifications();
}
async function markAllRead() {
  await supabaseClient.from("notifications").update({ is_read: true }).eq("is_read", false);
  await loadNotifications();
}

// Scans current data for expiring documents / overdue tasks and inserts
// notification rows — a lightweight stand-in for a scheduled server job.
async function generateSystemNotifications() {
  const btn = document.getElementById("generateNotifBtn");
  btn.disabled = true; btn.textContent = "Checking…";

  const today = new Date();
  const in30 = new Date(today.getTime() + 30 * 86400000).toISOString().slice(0, 10);
  const todayStr = today.toISOString().slice(0, 10);

  const [{ data: expiringDocs }, { data: overdueTasks }] = await Promise.all([
    supabaseClient.from("center_documents").select("*, centers(center_name)").lte("expiry_date", in30),
    supabaseClient.from("tasks").select("*, centers(center_name)").lt("due_date", todayStr).neq("status", "completed"),
  ]);

  const rows = [];
  (expiringDocs || []).forEach(d => {
    const isExpired = d.expiry_date < todayStr;
    rows.push({
      title: `${d.document_name} — ${d.centers?.center_name || "Center"}`,
      message: isExpired ? "This document has expired." : `Expires on ${d.expiry_date}.`,
      category: isExpired ? "document_expired" : "document_expiring",
      center_id: d.center_id
    });
  });
  (overdueTasks || []).forEach(t => {
    rows.push({
      title: `Overdue: ${t.task_title}`,
      message: `Was due ${t.due_date}.`,
      category: "task_overdue",
      center_id: t.center_id
    });
  });

  btn.disabled = false; btn.textContent = "Check for alerts";

  if (!rows.length) { alert("No new alerts found — everything looks current."); return; }
  const { error } = await supabaseClient.from("notifications").insert(rows);
  if (error) { alert("Could not create notifications: " + error.message); return; }
  await loadNotifications();
  alert(`${rows.length} new alert(s) added.`);
}
