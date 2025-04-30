document.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.getElementById("logoutBtn");
  const createTaskForm = document.getElementById("createTaskForm");
  const editTaskForm = document.getElementById("editTaskForm");
  const createTaskModal = document.getElementById("createTaskModal")
    ? new bootstrap.Modal(document.getElementById("createTaskModal"))
    : null;
  const editTaskModal = document.getElementById("editTaskModal")
    ? new bootstrap.Modal(document.getElementById("editTaskModal"))
    : null;
  const taskRegarding = document.getElementById("taskRegarding");
  const editTaskRegarding = document.getElementById("editTaskRegarding");

  // Populate dropdowns for "Regarding"
  const populateRegardingDropdown = async (dropdown) => {
    try {
      const response = await fetch("/api/crm/accounts/dropdown");
      const accounts = await response.json();
      if (response.ok) {
        accounts.forEach((account) => {
          const option = document.createElement("option");
          option.value = account.accountid;
          option.textContent = account.name || "بدون نام";
          dropdown.appendChild(option);
        });
      } else {
        showErrorToast("خطا در بارگذاری حساب‌ها برای مرتبط با");
      }
    } catch (err) {
      showErrorToast("خطا در ارتباط با سرور");
    }
  };

  if (taskRegarding) {
    populateRegardingDropdown(taskRegarding);
  }

  if (editTaskRegarding) {
    populateRegardingDropdown(editTaskRegarding);
  }

  // Logout Button
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try {
        const response = await fetch("/api/auth/logout", { method: "POST" });
        if (response.ok) {
          window.location.href = "/";
        } else {
          showErrorToast("خطا در خروج");
        }
      } catch (err) {
        showErrorToast("خطا در ارتباط با سرور");
      }
    });
  }

  // Create Task Form
  if (createTaskForm) {
    createTaskForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = new FormData(createTaskForm);
      const taskData = {
        subject: formData.get("subject"),
        description: formData.get("description"),
        scheduledstart: formData.get("scheduledstart"),
        scheduledend: formData.get("scheduledend"),
        prioritycode: formData.get("prioritycode"),
        regardingobjectid: formData.get("regardingobjectid"),
      };

      try {
        const response = await fetch("/api/crm/activities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(taskData),
        });
        const data = await response.json();
        if (response.ok) {
          showSuccessToast("وظیفه با موفقیت ایجاد شد");
          createTaskForm.reset();
          createTaskModal.hide();
          if (typeof window.fetchActivities === "function") {
            window.fetchActivities(false, "my");
            document.getElementById("myActivitiesBtn")?.click();
          }
        } else {
          showErrorToast(data.error || "خطا در ایجاد وظیفه");
        }
      } catch (err) {
        showErrorToast("خطا در ارتباط با سرور");
      }
    });
  }

  // Edit Task Button (in Activity Details Modal)
  const editTaskBtn = document.getElementById("editTaskBtn");
  if (editTaskBtn) {
    editTaskBtn.addEventListener("click", () => {
      if (currentTaskData) {
        // Populate the edit form with the current task data
        document.getElementById("editTaskId").value =
          currentTaskData.activityid || "";
        document.getElementById("editTaskSubject").value =
          currentTaskData.subject || "";
        document.getElementById("editTaskDescription").value =
          currentTaskData.description || "";
        document.getElementById("editTaskPriority").value =
          currentTaskData.prioritycode || "1";

        // Format dates for datetime-local input
        if (currentTaskData.scheduledstart) {
          document.getElementById("editTaskStartDate").value = new Date(
            currentTaskData.scheduledstart
          )
            .toLocaleString("sv", { timeZone: "Asia/Tehran" })
            .slice(0, 16);
        }
        if (currentTaskData.scheduledend) {
          document.getElementById("editTaskDueDate").value = new Date(
            currentTaskData.scheduledend
          )
            .toLocaleString("sv", { timeZone: "Asia/Tehran" })
            .slice(0, 16);
        }

        // Set the Regarding field
        const regardingId = currentTaskData.regardingobjectid
          ? currentTaskData.regardingobjectid.accountid
          : "";
        document.getElementById("editTaskRegarding").value = regardingId || "";

        // Show the edit modal
        editTaskModal.show();
      }
    });
  }

  // Edit Task Form
  if (editTaskForm) {
    editTaskForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = new FormData(editTaskForm);
      const taskData = {
        activityId: formData.get("activityId"),
        subject: formData.get("subject"),
        description: formData.get("description"),
        scheduledstart:
          formData.get("scheduledstart") || currentTaskData.scheduledstart, // Preserve original if unchanged
        scheduledend:
          formData.get("scheduledend") || currentTaskData.scheduledend, // Preserve original if unchanged
        prioritycode: formData.get("prioritycode"),
        regardingobjectid: formData.get("regardingobjectid"),
      };

      try {
        const response = await fetch(
          `/api/crm/activities/${taskData.activityId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(taskData),
          }
        );
        const data = await response.json();
        if (response.ok) {
          showSuccessToast("وظیفه با موفقیت به‌روزرسانی شد");
          editTaskForm.reset();
          editTaskModal.hide();
          if (typeof window.fetchActivities === "function") {
            window.fetchActivities(false, currentActivityView);
          }
        } else {
          showErrorToast(data.error || "خطا در به‌روزرسانی وظیفه");
        }
      } catch (err) {
        showErrorToast("خطا در ارتباط با سرور");
      }
    });
  }
});
