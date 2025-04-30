document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");

  if (loginForm) {
    console.log("Login form found, binding submit event");
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      console.log("Login form submitted");
      const username = document.getElementById("username")?.value.trim();
      const password = document.getElementById("password")?.value;

      if (!username || !password) {
        showErrorToast("لطفاً نام کاربری و رمز عبور را وارد کنید.");
        return;
      }

      try {
        console.log("Sending POST to /api/auth/login");
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });
        const data = await response.json();
        if (response.ok) {
          console.log("Login successful, redirecting to /dashboard");
          window.location.href = "/dashboard";
        } else {
          console.error("Login failed:", data.error);
          showErrorToast(data.error || "خطا در ورود");
        }
      } catch (err) {
        console.error("Login error:", err);
        showErrorToast("خطا در ارتباط با سرور");
      }
    });
  } else {
    console.warn("Login form not found on this page");
  }
});
