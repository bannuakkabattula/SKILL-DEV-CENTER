// ============================================================================
// LOCATIONS MODULE — every center's address + map link in one place
// ============================================================================
async function initLocationsPage() {
  const { data, error } = await supabaseClient
    .from("centers")
    .select("id, center_name, center_code, address, village, mandal, city, district, state, pincode, landmark, latitude, longitude, nearby_bus_station, nearby_railway_station")
    .order("center_name");

  const area = document.getElementById("locationsArea");
  if (error) { area.innerHTML = `<div class="text-danger text-center py-4">${error.message}</div>`; return; }
  if (!data?.length) { area.innerHTML = `<div class="text-center text-muted py-4">No centers found.</div>`; return; }

  area.innerHTML = `<div class="row g-3">` + data.map(c => `
    <div class="col-lg-6">
      <div class="panel h-100">
        <div class="d-flex justify-content-between align-items-start mb-2">
          <div>
            <div style="font-weight:700;">${c.center_name}</div>
            <span class="code-chip">${c.center_code}</span>
          </div>
          ${c.latitude && c.longitude
            ? `<a class="btn btn-erp btn-sm" target="_blank" href="https://www.google.com/maps?q=${c.latitude},${c.longitude}"><i class="bi bi-geo-alt"></i> View map</a>`
            : `<span class="text-muted" style="font-size:11.5px;">No coordinates set</span>`}
        </div>
        <div style="font-size:13px;color:var(--gray-700);line-height:1.8;">
          <div>${c.address || "—"}</div>
          <div class="breadcrumb-chip">
            ${[c.village, c.mandal, c.city, c.district, c.state, c.pincode].filter(Boolean).map(x => `<span>${x}</span>`).join("")}
          </div>
          ${c.landmark ? `<div style="margin-top:6px;"><i class="bi bi-signpost-2"></i> Landmark: ${c.landmark}</div>` : ""}
          ${c.nearby_bus_station ? `<div><i class="bi bi-bus-front"></i> Bus: ${c.nearby_bus_station}</div>` : ""}
          ${c.nearby_railway_station ? `<div><i class="bi bi-train-front"></i> Rail: ${c.nearby_railway_station}</div>` : ""}
        </div>
      </div>
    </div>`).join("") + `</div>`;
}
