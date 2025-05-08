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

    // Initialize Select2 for owner filter
    const $ownerFilter = $("#ownerFilter");
    
    // First fetch the data
    fetch('/api/crm/systemusers/dropdown')
      .then(response => response.json())
      .then(data => {
        $ownerFilter.select2({
          placeholder: "انتخاب مالک",
          allowClear: true,
          multiple: true,
          data: data,
          templateResult: function(user) {
            if (!user.id) {
              return $('<div class="select2-result-department">' + user.text + '</div>');
            }
            return $('<div class="select2-result-user">' + user.text + '</div>');
          },
          templateSelection: function(user) {
            if (!user.id) {
              return user.text;
            }
            return user.text;
          },
          escapeMarkup: function(markup) {
            return markup;
          }
        });

        // Add custom CSS for Select2
        const style = document.createElement('style');
        style.textContent = `
          .select2-container--default .select2-results__group {
            background-color: #f8f9fa;
            padding: 8px;
            font-weight: bold;
            border-bottom: 1px solid #dee2e6;
          }
          .select2-container--default .select2-results__option {
            padding: 8px 12px;
          }
          .select2-container--default .select2-results__option--highlighted[aria-selected] {
            background-color: #007bff;
          }
          .select2-container--default .select2-selection--multiple .select2-selection__choice {
            background-color: #007bff;
            color: white;
            border: none;
            padding: 4px 8px;
            margin: 2px;
          }
          .select2-container--default .select2-selection--multiple .select2-selection__choice__remove {
            color: white;
            margin-right: 5px;
          }
          .select2-container--default .select2-selection--multiple .select2-selection__choice__remove:hover {
            color: #fff;
            background-color: #0056b3;
          }
          .select2-dropdown {
            border-color: #dee2e6;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
        `;
        document.head.appendChild(style);
      })
      .catch(error => {
        console.error('Error loading users:', error);
        Utils.showErrorToast('خطا در بارگذاری لیست کاربران');
      });

    // Handle filter change
    $ownerFilter.on('change', () => {
      const selected = $ownerFilter.val();
      if (specificMode) {
        this.calendarManager.clearCalendar();
        this.calendarManager.addActivitiesForOwners(selected);
      } else {
        this.calendarManager.filterByOwners(selected);
      }
    });

    // Tab button logic
    const allTab = document.getElementById("allActivitiesTab");
    const myTab = document.getElementById("myActivitiesTab");
    const specificTab = document.getElementById("specificActivitiesTab");

    const $ownerFilterContainer = $("#ownerFilterContainer");
    let specificMode = false;

    if (allTab && myTab && specificTab) {
      allTab.addEventListener("click", () => {
        allTab.classList.add("btn-primary");
        allTab.classList.remove("btn-outline-primary");
        myTab.classList.add("btn-outline-primary");
        myTab.classList.remove("btn-primary");
        specificTab.classList.add("btn-outline-primary");
        specificTab.classList.remove("btn-primary");
        $ownerFilter.val(null).trigger("change");
        specificMode = false;
        $ownerFilterContainer.hide();
        this.calendarManager.fetchActivities(false, "all");
      });
      myTab.addEventListener("click", () => {
        myTab.classList.add("btn-primary");
        myTab.classList.remove("btn-outline-primary");
        allTab.classList.add("btn-outline-primary");
        allTab.classList.remove("btn-primary");
        specificTab.classList.add("btn-outline-primary");
        specificTab.classList.remove("btn-primary");
        $ownerFilter.val(null).trigger("change");
        specificMode = false;
        $ownerFilterContainer.hide();
        this.calendarManager.fetchActivities(false, "my");
      });
      specificTab.addEventListener("click", () => {
        specificTab.classList.add("btn-primary");
        specificTab.classList.remove("btn-outline-primary");
        allTab.classList.add("btn-outline-primary");
        allTab.classList.remove("btn-primary");
        myTab.classList.add("btn-outline-primary");
        myTab.classList.remove("btn-primary");
        $ownerFilter.val(null).trigger("change");
        specificMode = true;
        this.calendarManager.clearCalendar();
        $ownerFilterContainer.show();
      });
    }

    // On page load, hide Select2 unless specific tab is active
    if (!specificMode) $ownerFilterContainer.hide();

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
        // Convert Jalali to Gregorian for API
        const convertToGregorian = (jalaliDate) => {
          if (!jalaliDate) return null;
          return moment(jalaliDate, "jYYYY/jMM/jDD HH:mm").format(
            "YYYY-MM-DDTHH:mm"
          );
        };
        const payload = {
          subject: form.subject.value,
          description: form.description.value,
          scheduledstart: convertToGregorian(form.scheduledstart.value),
          scheduledend: convertToGregorian(form.scheduledend.value),
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
          const data = await res.json();
          if (res.ok) {
            Utils.showSuccessToast("وظیفه با موفقیت ایجاد شد");
            const modal = bootstrap.Modal.getInstance(
              document.getElementById("createTaskModal")
            );
            if (modal) {
              modal.hide();
            }
            window.CalendarManager.fetchActivities(false);
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
  // Initialize babakhani Persian Datepicker for all date fields
  $(function () {
    $(".persian-datepicker").persianDatepicker({
      format: "YYYY/MM/DD HH:mm",
      timePicker: {
        enabled: true,
        meridiem: { enabled: false },
      },
      initialValue: false,
      autoClose: true,
    });
  });
});
