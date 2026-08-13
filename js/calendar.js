// ============================================================================
// CALENDAR — simple month grid, plotting task due dates + batch start/end
// ============================================================================
let calCurrentDate = new Date();
let calEvents = {}; // "YYYY-MM-DD" -> [{label, type}]

async function initCalendarPage() {
  document.getElementById("calPrevBtn").addEventListener("click", () => { calCurrentDate.setMonth(calCurrentDate.getMonth() - 1); renderCalendar(); });
  document.getElementById("calNextBtn").addEventListener("click", () => { calCurrentDate.setMonth(calCurrentDate.getMonth() + 1); renderCalendar(); });
  await loadCalendarEvents();
  renderCalendar();
}

async function loadCalendarEvents() {
  const [{ data: tasks }, { data: batches }] = await Promise.all([
    supabaseClient.from("tasks").select("task_title, due_date, status"),
    supabaseClient.from("batches").select("batch_name, start_date, end_date"),
  ]);
  calEvents = {};
  (tasks || []).forEach(t => {
    if (!t.due_date) return;
    (calEvents[t.due_date] ||= []).push({ label: t.task_title, type: t.status === "completed" ? "done" : "task" });
  });
  (batches || []).forEach(b => {
    if (b.start_date) (calEvents[b.start_date] ||= []).push({ label: `${b.batch_name} starts`, type: "batch" });
    if (b.end_date) (calEvents[b.end_date] ||= []).push({ label: `${b.batch_name} ends`, type: "batch" });
  });
}

function renderCalendar() {
  const year = calCurrentDate.getFullYear();
  const month = calCurrentDate.getMonth();
  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  document.getElementById("calMonthLabel").textContent = `${monthNames[month]} ${year}`;

  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = new Date().toISOString().slice(0, 10);

  let cells = "";
  for (let i = 0; i < startOffset; i++) cells += `<div class="cal-cell cal-empty"></div>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const dayEvents = calEvents[dateStr] || [];
    cells += `
      <div class="cal-cell ${dateStr === todayStr ? "cal-today" : ""}">
        <div class="cal-daynum">${d}</div>
        ${dayEvents.slice(0, 3).map(e => `<div class="cal-event cal-event-${e.type}">${e.label}</div>`).join("")}
        ${dayEvents.length > 3 ? `<div class="cal-event-more">+${dayEvents.length - 3} more</div>` : ""}
      </div>`;
  }

  document.getElementById("calGrid").innerHTML = `
    <div class="cal-weekday-row">
      ${["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => `<div class="cal-weekday">${d}</div>`).join("")}
    </div>
    <div class="cal-days-grid">${cells}</div>`;
}
