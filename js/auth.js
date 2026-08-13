// ============================================================================
// AUTH — login, logout, session guard
// ============================================================================

async function requireSession() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    window.location.href = "index.html";
    return null;
  }
  return session;
}

async function handleLogin(event) {
  event.preventDefault();
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;
  const errorBox = document.getElementById("loginError");
  errorBox.classList.add("d-none");

  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) {
    errorBox.textContent = error.message;
    errorBox.classList.remove("d-none");
    return;
  }
  window.location.href = "dashboard.html";
}

async function handleForgotPassword() {
  const email = document.getElementById("loginEmail").value.trim();
  if (!email) {
    alert("Enter your email above first, then click 'Forgot password'.");
    return;
  }
  const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + window.location.pathname.replace("index.html", "reset-password.html")
  });
  if (error) {
    alert(error.message);
  } else {
    alert("Password reset email sent to " + email);
  }
}

async function handleLogout() {
  await supabaseClient.auth.signOut();
  window.location.href = "index.html";
}

async function loadCurrentUserBadge() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) return;
  const { data: profile } = await supabaseClient
    .from("profiles")
    .select("full_name, role")
    .eq("id", session.user.id)
    .single();
  const nameEl = document.getElementById("currentUserName");
  const roleEl = document.getElementById("currentUserRole");
  if (nameEl) nameEl.textContent = profile?.full_name || session.user.email;
  if (roleEl) roleEl.textContent = (profile?.role || "admin").replace("_", " ");
}
