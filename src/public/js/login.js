class LoginManager {
  constructor() {
    this.loginForm = document.getElementById("loginForm");
  }

  initialize() {
    if (this.loginForm) {
      console.log("Login form found, binding submit event");
      this.loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        console.log("Login form submitted");
        const username = document.getElementById("username")?.value.trim();
        const password = document.getElementById("password")?.value;

        if (!username || !password) {
          Utils.showErrorToast("لطفاً نام کاربری و رمز عبور را وارد کنید.");
          return;
        }

        try {
          console.log("Sending POST to /api/auth/login");
          const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ username, password }),
          });
          const data = await response.json();
          if (response.ok) {
            console.log("Login successful, redirecting to /dashboard");
            window.location.href = "/dashboard";
          } else {
            console.error("Login failed:", data.error);
            Utils.showErrorToast(data.error || "خطا در ورود");
          }
        } catch (err) {
          console.error("Login error:", err);
          Utils.showErrorToast("خطا در ارتباط با سرور");
        }
      });
    } else {
      console.warn("Login form not found on this page");
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const loginManager = new LoginManager();
  loginManager.initialize();
});
