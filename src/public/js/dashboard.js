class DashboardManager {
  constructor() {
    this.calendarManager = new CalendarManager();
    this.allActivitiesTab = document.getElementById("allActivitiesTab");
    this.myActivitiesTab = document.getElementById("myActivitiesTab");
    this.specificActivitiesTab = document.getElementById("specificActivitiesTab");
    this.loadMoreActivitiesBtn = document.getElementById("loadMoreActivitiesBtn");
    this.ownerFilterContainer = document.getElementById("ownerFilterContainer");
    this.ownerFilter = $("#ownerFilter");
    this.accounts = []; // Store accounts data
    this.specificMode = false;
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

  async initialize() {
    // Initialize calendar
    this.calendarManager.initializeCalendar();
    
    // Initialize owner filter
    await this.initializeOwnerFilter();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Fetch accounts for dropdowns
    await this.fetchAccounts();
    
    // Set owner fields
    this.setOwnerFields();

    // Initialize regarding dropdowns
    this.initializeRegardingDropdowns();
  }

  initializeOwnerFilter() {
    return new Promise((resolve, reject) => {
      // Initialize Select2 for owner filter
      fetch('/api/crm/systemusers/dropdown')
        .then(response => response.json())
        .then(data => {
          this.ownerFilter.select2({
            placeholder: "انتخاب مالک",
            allowClear: true,
            multiple: true,
            data: data.map(user => ({
              id: user.systemuserid,
              text: user.fullname
            })),
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
          resolve();
        })
        .catch(error => {
          console.error('Error loading users:', error);
          Utils.showErrorToast('خطا در بارگذاری لیست کاربران');
          reject(error);
        });
    });
  }

  setupEventListeners() {
    // Handle filter change
    this.ownerFilter.on('change', () => {
      const selected = this.ownerFilter.val();
      if (this.specificMode) {
        this.calendarManager.clearCalendar();
        this.calendarManager.addActivitiesForOwners(selected);
      }
    });

    // Tab click handlers
    this.allActivitiesTab.addEventListener("click", () => {
      this.specificMode = false;
      this.ownerFilterContainer.style.display = "none";
      this.calendarManager.clearCalendar();
      this.calendarManager.addAllActivities();
      this.updateTabStyles(this.allActivitiesTab);
    });

    this.myActivitiesTab.addEventListener("click", () => {
      this.specificMode = false;
      this.ownerFilterContainer.style.display = "none";
      this.calendarManager.clearCalendar();
      this.calendarManager.addMyActivities();
      this.updateTabStyles(this.myActivitiesTab);
    });

    this.specificActivitiesTab.addEventListener("click", () => {
      this.specificMode = true;
      this.ownerFilterContainer.style.display = "block";
      this.calendarManager.clearCalendar();
      this.updateTabStyles(this.specificActivitiesTab);
    });

    // Load more button click handler
    this.loadMoreActivitiesBtn.addEventListener("click", () => {
      this.calendarManager.loadMoreActivities();
    });
  }

  updateTabStyles(activeTab) {
    [this.allActivitiesTab, this.myActivitiesTab, this.specificActivitiesTab].forEach(
      (tab) => {
        tab.classList.remove("btn-primary");
        tab.classList.add("btn-outline-primary");
      }
    );
    activeTab.classList.remove("btn-outline-primary");
    activeTab.classList.add("btn-primary");
  }

  initializeTabSwitching() {
    if (this.allActivitiesTab && this.myActivitiesTab && this.specificActivitiesTab) {
      this.allActivitiesTab.addEventListener("click", () => {
        this.switchToAllActivities();
      });

      this.myActivitiesTab.addEventListener("click", () => {
        this.switchToMyActivities();
      });

      this.specificActivitiesTab.addEventListener("click", () => {
        this.switchToSpecificActivities();
      });
    }
  }

  switchToAllActivities() {
    this.allActivitiesTab.classList.add("btn-primary");
    this.allActivitiesTab.classList.remove("btn-outline-primary");
    this.myActivitiesTab.classList.add("btn-outline-primary");
    this.myActivitiesTab.classList.remove("btn-primary");
    this.specificActivitiesTab.classList.add("btn-outline-primary");
    this.specificActivitiesTab.classList.remove("btn-primary");
    
    this.ownerFilter.val(null).trigger("change");
    this.specificMode = false;
    this.ownerFilterContainer.style.display = "none";
    
    this.calendarManager.clearCalendar();
    this.calendarManager.fetchActivities(false, "all");
  }

  switchToMyActivities() {
    this.myActivitiesTab.classList.add("btn-primary");
    this.myActivitiesTab.classList.remove("btn-outline-primary");
    this.allActivitiesTab.classList.add("btn-outline-primary");
    this.allActivitiesTab.classList.remove("btn-primary");
    this.specificActivitiesTab.classList.add("btn-outline-primary");
    this.specificActivitiesTab.classList.remove("btn-primary");
    
    this.ownerFilter.val(null).trigger("change");
    this.specificMode = false;
    this.ownerFilterContainer.style.display = "none";
    
    this.calendarManager.clearCalendar();
    this.calendarManager.fetchActivities(false, "my");
  }

  switchToSpecificActivities() {
    this.specificActivitiesTab.classList.add("btn-primary");
    this.specificActivitiesTab.classList.remove("btn-outline-primary");
    this.allActivitiesTab.classList.add("btn-outline-primary");
    this.allActivitiesTab.classList.remove("btn-primary");
    this.myActivitiesTab.classList.add("btn-outline-primary");
    this.myActivitiesTab.classList.remove("btn-primary");
    
    this.ownerFilter.val(null).trigger("change");
    this.specificMode = true;
    this.ownerFilterContainer.style.display = "block";
    
    this.calendarManager.clearCalendar();
  }

  async fetchSystemUsers() {
    try {
      const response = await fetch('/api/crm/systemusers/dropdown');
      const users = await response.json();
      return users;
    } catch (err) {
      console.error('Error fetching users:', err);
      Utils.showErrorToast('خطا در بارگذاری لیست کاربران');
      return [];
    }
  }

  async setEditModalFields(data) {
    // Set basic fields
    document.getElementById("editTaskId").value = data.activityid;
    document.getElementById("editTaskSubject").value = data.subject || "";
    document.getElementById("editTaskDescription").value = data.description || "";
    // Use Jalali fields from backend for display
    document.getElementById("editTaskStartDate").value = data.scheduledstart_jalali || data.scheduledstart || "";
    document.getElementById("editTaskDueDate").value = data.scheduledend_jalali || data.scheduledend || "";
    document.getElementById("editTaskPriority").value = data.prioritycode || "1";
    document.getElementById("editTaskRegarding").value = data._regardingobjectid_value || "";

    // Set status
    document.getElementById("editTaskStatus").value = data.statuscode || "0";

    // Set previous owner (display only)
    document.getElementById("editPreviousOwner").value = data.new_lastownerid_name || "";

    // Set seen
    document.getElementById("editTaskSeen").checked = !!data.new_seen;

    // Populate and set assigned to
    const assignedToSelect = document.getElementById("editTaskAssignedTo");
    const users = await this.fetchSystemUsers();
    assignedToSelect.innerHTML = '<option value="">انتخاب کنید...</option>' +
      users.map(u => `<option value="${u.systemuserid}">${u.fullname}</option>`).join("");
    assignedToSelect.value = data.ownerid || "";
  }

  setupEditTaskButton() {
    document.getElementById("editTaskBtn").addEventListener("click", async () => {
      const data = window.CalendarManager.currentTaskData;
      if (!data) {
        Utils.showErrorToast("اطلاعات وظیفه در دسترس نیست");
        return;
      }
      await this.setEditModalFields(data);
      const editModalEl = document.getElementById("editTaskModal");
      const editModal = bootstrap.Modal.getOrCreateInstance(editModalEl);
      editModal.show();
    });
  }

  setupEditTaskFormSubmit() {
    document.getElementById("editTaskForm").addEventListener("submit", async function (e) {
      e.preventDefault();
      const activityId = document.getElementById("editTaskId").value;
      // Send Jalali dates as-is to backend
      const jalaliStart = document.getElementById("editTaskStartDate").value;
      const jalaliEnd = document.getElementById("editTaskDueDate").value;
      const payload = {
        subject: document.getElementById("editTaskSubject").value,
        description: document.getElementById("editTaskDescription").value,
        scheduledstart: jalaliStart,
        scheduledend: jalaliEnd,
        prioritycode: document.getElementById("editTaskPriority").value,
        regardingobjectid: document.getElementById("editTaskRegarding").value,
        statuscode: document.getElementById("editTaskStatus").value,
        ownerid: document.getElementById("editTaskAssignedTo").value,
        new_seen: document.getElementById("editTaskSeen").checked
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
          const editModal = bootstrap.Modal.getInstance(document.getElementById("editTaskModal"));
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
  }

  initializeRegardingDropdowns() {
    // Initialize regarding dropdowns when modals open
    $('#createTaskModal').on('show.bs.modal', () => {
      regardingDropdown.populateDropdown('taskRegarding');
    });

    $('#editTaskModal').on('show.bs.modal', (event) => {
      const button = $(event.relatedTarget);
      const taskId = button.data('task-id');
      const regardingId = button.data('regarding-id');
      const regardingType = button.data('regarding-type');
      
      regardingDropdown.populateDropdown('editTaskRegarding', regardingId, regardingType);

      // Ensure the selected value is set in the form
      const editRegardingSelect = document.getElementById('editTaskRegarding');
      if (editRegardingSelect) {
        editRegardingSelect.value = regardingId || '';
      }

      // Ensure the selected value is visible in the dropdown
      const selectedOption = Array.from(editRegardingSelect.options).find(
        (option) => option.value === regardingId
      );
      if (selectedOption) {
        selectedOption.selected = true;
      } else {
        // If the value is not in the dropdown, add it as a temporary option
        const tempOption = new Option('Selected Regarding', regardingId, true, true);
        editRegardingSelect.add(tempOption);
      }
    });

    // Handle form submissions
    $('#createTaskForm').on('submit', (e) => {
      e.preventDefault();
      const regardingValues = regardingDropdown.getSelectedValues('taskRegarding');
      if (regardingValues) {
        $('#regardingType').val(regardingValues.type);
        $('#regardingId').val(regardingValues.id);
      }
      // ... rest of your form submission code ...
    });

    $('#editTaskForm').on('submit', (e) => {
      e.preventDefault();
      const regardingValues = regardingDropdown.getSelectedValues('editTaskRegarding');
      if (regardingValues) {
        $('#editRegardingType').val(regardingValues.type);
        $('#editRegardingId').val(regardingValues.id);
      }
      // ... rest of your form submission code ...
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.dashboardManager = new DashboardManager();
  window.dashboardManager.initialize();
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
