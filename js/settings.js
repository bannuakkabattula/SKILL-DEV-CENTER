// ============================================================================
// SETTINGS — edit own profile, change password
// ============================================================================
async function initSettingsPage() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  document.getElementById("settingsEmail").value = session.user.email;

  const { data: profile } = await supabaseClient.from("profiles").select("*").eq("id", session.user.id).single();
  if (profile) {
    document.getElementById("settingsFullName").value = profile.full_name || "";
    document.getElementById("settingsPhone").value = profile.phone || "";
    document.getElementById("settingsRole").value = (profile.role || "admin").replace("_", " ");
  }

  document.getElementById("profileForm").addEventListener("submit", saveProfile);
  document.getElementById("passwordForm").addEventListener("submit", changePassword);
}

async function saveProfile(event) {
  event.preventDefault();
  const { data: { session } } = await supabaseClient.auth.getSession();
  const btn = document.getElementById("profileSaveBtn");
  btn.disabled = true; btn.textContent = "Saving…";

  const { error } = await supabaseClient.from("profiles").update({
    full_name: document.getElementById("settingsFullName").value,
    phone: document.getElementById("settingsPhone").value || null,
  }).eq("id", session.user.id);

  btn.disabled = false; btn.textContent = "Save changes";
  if (error) { alert("Could not save: " + error.message); return; }
  alert("Profile updated.");
  loadCurrentUserBadge();
}

async function changePassword(event) {
  event.preventDefault();
  const newPass = document.getElementById("settingsNewPassword").value;
  const confirmPass = document.getElementById("settingsConfirmPassword").value;
  if (newPass.length < 8) { alert("Password must be at least 8 characters."); return; }
  if (newPass !== confirmPass) { alert("Passwords do not match."); return; }

  const btn = document.getElementById("passwordSaveBtn");
  btn.disabled = true; btn.textContent = "Updating…";
  const { error } = await supabaseClient.auth.updateUser({ password: newPass });
  btn.disabled = false; btn.textContent = "Update password";

  if (error) { alert("Could not update password: " + error.message); return; }
  document.getElementById("passwordForm").reset();
  alert("Password updated.");
}
