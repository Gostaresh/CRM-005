class DashboardManager {
  constructor() {
    this.calendarManager = new CalendarManager();
    this.allActivitiesBtn = document.getElementById("allActivitiesBtn");
    this.myActivitiesBtn = document.getElementById("myActivitiesBtn");
    this.loadMoreActivitiesBtn = document.getElementById(
      "loadMoreActivitiesBtn"
    );
    this.accounts = []; // Store accounts data
  }

  async fetchAccounts() {
    try {
      const response = await fetch("/api/crm/accounts/dropdown");
      const data = await response.json();
      this.accounts = data;

      // Populate both create and edit task regarding dropdowns
      const createRegardingSelect = document.getElementById("taskRegarding");
      const editRegardingSelect = document.getElementById("editTaskRegarding");

      const options =
        '<option value="">انتخاب کنید...</option>' +
        this.accounts
          .map((acc) => `<option value="${acc.accountid}">${acc.name}</option>`)
          .join("");

      if (createRegardingSelect) {
        createRegardingSelect.innerHTML = options;
      }
      if (editRegardingSelect) {
        editRegardingSelect.innerHTML = options;
      }
    } catch (err) {
      console.error("Error fetching accounts:", err);
      Utils.showErrorToast("خطا در بارگذاری لیست حساب‌ها");
    }
  }

  setOwnerFields() {
    // Set owner for create task form
    const createTaskOwner = document.getElementById("taskOwner");
    if (createTaskOwner && window.currentUser) {
      createTaskOwner.innerHTML = `<option value="${window.currentUser.id}" selected>${window.currentUser.fullname}</option>`;
    }

    // Set owner for edit task form
    const editTaskOwner = document.getElementById("editTaskOwner");
    if (editTaskOwner && window.currentUser) {
      editTaskOwner.innerHTML = `<option value="${window.currentUser.id}" selected>${window.currentUser.fullname}</option>`;
    }
  }

  initialize() {
    console.log("Initializing dashboard");
    this.calendarManager.initializeCalendar();
    this.calendarManager.fetchActivities();
    this.fetchAccounts(); // Fetch accounts when dashboard initializes
    this.setOwnerFields(); // Set owner fields

    if (this.allActivitiesBtn) {
      this.allActivitiesBtn.addEventListener("click", () => {
        this.allActivitiesBtn.classList.add("btn-primary");
        this.allActivitiesBtn.classList.remove("btn-outline-primary");
        this.myActivitiesBtn.classList.add("btn-outline-primary");
        this.myActivitiesBtn.classList.remove("btn-primary");
        this.calendarManager.currentActivityView = "all";
        this.calendarManager.activitiesNextLink = null;
        this.calendarManager.hasMoreActivities = true;
        if (this.loadMoreActivitiesBtn) {
          this.loadMoreActivitiesBtn.disabled = false;
          this.loadMoreActivitiesBtn.classList.add("btn-primary");
          this.loadMoreActivitiesBtn.classList.remove("btn-secondary");
          this.loadMoreActivitiesBtn.textContent = "بارگذاری فعالیت‌های بیشتر";
        }
        this.calendarManager.fetchActivities(false, "all");
      });
    }

    if (this.myActivitiesBtn) {
      this.myActivitiesBtn.addEventListener("click", () => {
        this.myActivitiesBtn.classList.add("btn-primary");
        this.myActivitiesBtn.classList.remove("btn-outline-primary");
        this.allActivitiesBtn.classList.add("btn-outline-primary");
        this.allActivitiesBtn.classList.remove("btn-primary");
        this.calendarManager.currentActivityView = "my";
        this.calendarManager.activitiesNextLink = null;
        this.calendarManager.hasMoreActivities = true;
        if (this.loadMoreActivitiesBtn) {
          this.loadMoreActivitiesBtn.disabled = false;
          this.loadMoreActivitiesBtn.classList.add("btn-primary");
          this.loadMoreActivitiesBtn.classList.remove("btn-secondary");
          this.loadMoreActivitiesBtn.textContent = "بارگذاری فعالیت‌های بیشتر";
        }
        this.calendarManager.fetchActivities(false, "my");
      });
    }

    if (this.loadMoreActivitiesBtn) {
      this.loadMoreActivitiesBtn.addEventListener("click", () => {
        this.calendarManager.fetchActivities(
          true,
          this.calendarManager.currentActivityView
        );
      });
    }

    document
      .getElementById("editTaskBtn")
      .addEventListener("click", function () {
        const data = window.CalendarManager.currentTaskData;
        if (!data) {
          Utils.showErrorToast("اطلاعات وظیفه در دسترس نیست");
          return;
        }

        // Hide the details modal
        const detailsModal = bootstrap.Modal.getInstance(
          document.getElementById("activityDetailsModal")
        );
        if (detailsModal) {
          detailsModal.hide();
        }

        // Set form values
        document.getElementById("editTaskId").value = data.activityid;
        document.getElementById("editTaskSubject").value = data.subject || "";
        document.getElementById("editTaskDescription").value =
          data.description || "";

        // Format dates for datetime-local input
        const formatDate = (dateStr) => {
          if (!dateStr) return "";
          const date = moment(dateStr).tz("Asia/Tehran");
          return date.format("YYYY-MM-DDTHH:mm");
        };

        document.getElementById("editTaskStartDate").value = formatDate(
          data.scheduledstart
        );
        document.getElementById("editTaskDueDate").value = formatDate(
          data.scheduledend
        );
        document.getElementById("editTaskPriority").value =
          data.prioritycode || "1";

        // Show the edit modal
        const editModalEl = document.getElementById("editTaskModal");
        const editModal = bootstrap.Modal.getOrCreateInstance(editModalEl);
        editModal.show();
      });

    document
      .getElementById("editTaskForm")
      .addEventListener("submit", async function (e) {
        e.preventDefault();

        const activityId = document.getElementById("editTaskId").value;
        const payload = {
          subject: document.getElementById("editTaskSubject").value,
          description: document.getElementById("editTaskDescription").value,
          scheduledstart: document.getElementById("editTaskStartDate").value,
          scheduledend: document.getElementById("editTaskDueDate").value,
          prioritycode: document.getElementById("editTaskPriority").value,
          regardingobjectid: document.getElementById("editTaskRegarding").value,
          originalScheduledstart:
            window.CalendarManager.currentTaskData.scheduledstart,
          originalScheduledend:
            window.CalendarManager.currentTaskData.scheduledend,
        };

        try {
          const response = await fetch(`/api/crm/activities/${activityId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const result = await response.json();
          if (response.ok) {
            // Success: close modal, refresh calendar, show toast
            const editModal = bootstrap.Modal.getInstance(
              document.getElementById("editTaskModal")
            );
            if (editModal) {
              editModal.hide();
            }
            window.CalendarManager.fetchActivities(false); // reload events
            Utils.showSuccessToast("وظیفه با موفقیت به‌روزرسانی شد");
          } else {
            Utils.showErrorToast(result.error || "خطا در ویرایش وظیفه");
          }
        } catch (err) {
          console.error("Error updating task:", err);
          Utils.showErrorToast("خطا در ارتباط با سرور");
        }
      });

    // Add create task form submission handler
    const createTaskForm = document.getElementById("createTaskForm");
    if (createTaskForm) {
      console.log("Found create task form, adding submit handler");
      createTaskForm.addEventListener("submit", async function (e) {
        e.preventDefault();
        console.log("Create task form submitted");
        const form = e.target;
        const payload = {
          subject: form.subject.value,
          description: form.description.value,
          scheduledstart: form.scheduledstart.value,
          scheduledend: form.scheduledend.value,
          prioritycode: form.prioritycode.value,
          ownerid: window.currentUser.id,
          // Only include regardingobjectid if selected
          ...(form.regardingobjectid && form.regardingobjectid.value
            ? { regardingobjectid: form.regardingobjectid.value }
            : {}),
        };

        console.log("Sending payload:", payload);

        try {
          const res = await fetch("/api/crm/activities", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          console.log("Response status:", res.status);
          const data = await res.json();
          console.log("Response data:", data);

          if (res.ok) {
            Utils.showSuccessToast("وظیفه با موفقیت ایجاد شد");
            const modal = bootstrap.Modal.getInstance(
              document.getElementById("createTaskModal")
            );
            if (modal) {
              modal.hide();
            }
            // Refresh the calendar to show the new task
            window.CalendarManager.fetchActivities(false);
            // Reset the form
            form.reset();
          } else {
            Utils.showErrorToast(data.error || "خطا در ایجاد وظیفه");
          }
        } catch (err) {
          console.error("Error creating task:", err);
          Utils.showErrorToast("خطا در ارتباط با سرور");
        }
      });
    } else {
      console.error("Create task form not found!");
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const dashboardManager = new DashboardManager();
  dashboardManager.initialize();
});
