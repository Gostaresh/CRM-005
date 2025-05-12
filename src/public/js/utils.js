class Utils {
  static showErrorToast(message) {
    const toastEl = document.getElementById("errorToast");
    if (toastEl) {
      toastEl.querySelector(".toast-body").textContent = message;
      const toast = new bootstrap.Toast(toastEl);
      toast.show();
    } else {
      console.error("Error toast element not found");
      alert(message);
    }
  }

  static showSuccessToast(message) {
    const toastEl = document.getElementById("successToast");
    if (toastEl) {
      toastEl.querySelector(".toast-body").textContent = message;
      const toast = new bootstrap.Toast(toastEl);
      toast.show();
    } else {
      console.error("Success toast element not found");
      alert(message);
    }
  }

  static showLoader() {
    const loader = document.getElementById("globalLoader");
    if (loader) {
      loader.style.display = "flex";
    }
  }

  static hideLoader() {
    const loader = document.getElementById("globalLoader");
    if (loader) {
      loader.style.display = "none";
    }
  }
}

window.Utils = Utils;
