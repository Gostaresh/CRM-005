class CalendarManager {
  constructor() {
    this.calendar = null;
    this.currentTaskData = null;
    this.currentActivityView = "my"; // Default view
    this.nextLink = null;
    this.pageSize = 50;
    this.hasMoreActivities = true;
    this.activityDetailsModal = document.getElementById("activityDetailsModal")
      ? new bootstrap.Modal(document.getElementById("activityDetailsModal"))
      : null;
    this.DateTime = moment; // Use Moment.js for timezone handling
    this.selectionStart = null;
    this.selectionEnd = null;
    this.isSelecting = false;
  }

  initializeCalendar() {
    const calendarEl = document.getElementById("calendar");
    if (!calendarEl) return;

    // Handle window resize
    const handleResize = () => {
      if (this.calendar) {
        this.calendar.updateSize();
      }
    };
    window.addEventListener('resize', handleResize);

    // Handle edit form submission
    const editTaskForm = document.getElementById("editTaskForm");
    if (editTaskForm) {
      editTaskForm.addEventListener("submit", async (e) => {
          e.preventDefault();
          const activityId = document.getElementById("editTaskId").value;
          const startDate = document.getElementById("editTaskStartDate").value;
          const dueDate = document.getElementById("editTaskDueDate").value;
  
          const dateRegex = /^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}$/;
          if (!startDate || !dueDate || !dateRegex.test(startDate) || !dateRegex.test(dueDate)) {
              Utils.showErrorToast('تاریخ شروع و پایان باید در فرمت YYYY/MM/DD HH:mm:ss با ارقام لاتین باشد');
              return;
          }
  
          const formData = {
              subject: document.getElementById("editTaskSubject").value,
              description: document.getElementById("editTaskDescription").value,
              scheduledstart: startDate,
              scheduledend: dueDate,
              prioritycode: document.getElementById("editTaskPriority").value,
              statecode: document.getElementById("editTaskStatus").value
          };
  
          console.log('Form Data:', JSON.stringify(formData, null, 2));
  
          try {
              const response = await fetch(`/api/crm/activities/${activityId}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(formData)
              });
  
              const data = await response.json();
              if (response.ok) {
                  Utils.showSuccessToast("وظیفه با موفقیت به‌روزرسانی شد");
                  const modal = bootstrap.Modal.getInstance(document.getElementById("editTaskModal"));
                  modal.hide();
                  this.fetchActivities(false, this.currentActivityView);
              } else {
                  console.error('Server Response:', data);
                  Utils.showErrorToast(data.error || "خطا در به‌روزرسانی وظیفه");
              }
          } catch (err) {
              console.error('Fetch Error:', err);
              Utils.showErrorToast("خطا در ارتباط با سرور");
          }
      });
  }

    this.calendar = new FullCalendar.Calendar(calendarEl, {
      initialView: "timeGridDay",
      height: '100%',
      contentHeight: 'auto',
      expandRows: true,
      timeZone: 'Asia/Tehran', // Set timezone to Iran
      editable: true,
      eventTimeFormat: {
        hour: '2-digit',
        minute: '2-digit',
        meridiem: false,
        hour12: false
      },
      slotLabelFormat: {
        hour: '2-digit',
        minute: '2-digit',
        meridiem: false,
        hour12: false
      },
      headerToolbar: {
        left: "prev,next today",
        center: "title",
        right: "dayGridMonth,timeGridWeek,timeGridDay",
      },
      locale: "fa", // Set locale to Persian
      direction: "rtl",
      firstDay: 6,
      buttonText: {
        today: "امروز",
        month: "ماه",
        week: "هفته",
        day: "روز",
      },
      slotMinTime: "00:00:00",
      slotMaxTime: "24:00:00",
      slotDuration: "00:30:00",
      slotLabelInterval: "01:00",
      allDaySlot: true,
      allDayText: "تمام روز",
      eventDisplay: "block",
      eventMinHeight: 25,
      eventShortHeight: 30,
      views: {
        timeGridWeek: {
          titleFormat: { year: 'numeric', month: 'long', day: 'numeric' },
          dayHeaderFormat: { weekday: 'long' }
        },
        timeGridDay: {
          titleFormat: { year: 'numeric', month: 'long', day: 'numeric' },
          dayHeaderFormat: { weekday: 'long' }
        }
      },
      selectable: true,
      selectMirror: true,
      select: (info) => {
        const createTaskModal = new bootstrap.Modal(document.getElementById("createTaskModal"));
        document.getElementById("taskStartDate").value = moment(info.start).tz('UTC').format('YYYY-MM-DDTHH:mm:ss');
        document.getElementById("taskDueDate").value = moment(info.end).tz('UTC').format('YYYY-MM-DDTHH:mm:ss');
        createTaskModal.show();
      },
      dateClick: (info) => {
        if (info.allDay) {
          const createTaskModal = new bootstrap.Modal(document.getElementById("createTaskModal"));
          const clickedDate = moment(info.date).startOf('day').add(9, 'hours');
          document.getElementById("taskStartDate").value = clickedDate.tz('UTC').format('YYYY-MM-DDTHH:mm:ss');
          document.getElementById("taskDueDate").value = moment(clickedDate).add(1, 'hour').tz('UTC').format('YYYY-MM-DDTHH:mm:ss');
          createTaskModal.show();
        }
      },
      eventClick: (info) => {
        const event = info.event;
        console.log('Event Data:', {
            id: event.id,
            title: event.title,
            start: event.start,
            end: event.end,
            extendedProps: event.extendedProps
        });
        document.getElementById("editTaskId").value = event.id;
        document.getElementById("editTaskSubject").value = event.title;
        document.getElementById("editTaskDescription").value = event.extendedProps.description || '';
        // Set Gregorian dates for hidden inputs
        document.getElementById("editTaskStartDate").value = moment(event.start).tz('UTC').format('YYYY-MM-DDTHH:mm:ss');
        document.getElementById("editTaskDueDate").value = moment(event.end).tz('UTC').format('YYYY-MM-DDTHH:mm:ss');
        document.getElementById("editTaskPriority").value = event.extendedProps.priority || '1';
        
        const editTaskModal = new bootstrap.Modal(document.getElementById("editTaskModal"));
        editTaskModal.show();
    },
      eventDrop: async (info) => {
        const event = info.event;
        const activityId = event.id;
        
        try {
          const response = await fetch(`/api/crm/activities/${activityId}/update-dates`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              scheduledstart: moment(event.start).tz('UTC').format(),
              scheduledend: moment(event.end).tz('UTC').format()
            })
          });
          const data = await response.json();
          if (response.ok) {
            Utils.showSuccessToast("زمان‌بندی وظیفه با موفقیت به‌روزرسانی شد");
            this.fetchActivities(false, this.currentActivityView);
          } else {
            Utils.showErrorToast(data.error || "خطا در به‌روزرسانی زمان‌بندی وظیفه");
            info.revert();
          }
        } catch (err) {
          Utils.showErrorToast("خطا در ارتباط با سرور");
          info.revert();
        }
      },
      eventResize: async (info) => {
        const event = info.event;
        const activityId = event.id;
        
        try {
          const response = await fetch(`/api/crm/activities/${activityId}/update-dates`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              scheduledstart: moment(event.start).tz('UTC').format(),
              scheduledend: moment(event.end).tz('UTC').format()
            })
          });
          const data = await response.json();
          if (response.ok) {
            Utils.showSuccessToast("زمان‌بندی وظیفه با موفقیت به‌روزرسانی شد");
            this.fetchActivities(false, this.currentActivityView);
          } else {
            Utils.showErrorToast(data.error || "خطا در به‌روزرسانی زمان‌بندی وظیفه");
            info.revert();
          }
        } catch (err) {
          Utils.showErrorToast("خطا در ارتباط با سرور");
          info.revert();
        }
      },
      eventDidMount: (info) => {
        // Add tooltip
        $(info.el).tooltip({
          title: info.event.title,
          placement: "top",
          trigger: "hover",
          container: "body",
        });
      },
    });

    this.calendar.render();
  }

  clearCalendar() {
    if (this.calendar) {
      this.calendar.removeAllEvents();
      this.nextLink = null;
      this.hasMoreActivities = true;
    }
  }

  async fetchActivities(loadMore = false, view = "my") {
    if (!loadMore) {
      this.clearCalendar();
      this.currentActivityView = view;
    }

    if (!this.hasMoreActivities && loadMore) {
      return;
    }

    try {
      let url = "/api/crm/activities/all";
      if (view === "my") {
        url = "/api/crm/activities/my";
      }

      const params = new URLSearchParams({
        pageSize: this.pageSize
      });
      
      if (this.nextLink) {
        params.append('nextLink', this.nextLink);
      }

      const response = await fetch(`${url}?${params.toString()}`);
      const data = await response.json();

      if (data.value && data.value.length > 0) {
        // Use Gregorian fields for calendar event timing
        const activities = data.value;
        this.addActivitiesToCalendar(activities);
        
        // Update nextLink for pagination
        this.nextLink = data['@odata.nextLink'];
        this.hasMoreActivities = !!this.nextLink;
        
        // Show/hide load more button
        const loadMoreBtn = document.getElementById('loadMoreActivitiesBtn');
        if (loadMoreBtn) {
          loadMoreBtn.style.display = this.hasMoreActivities ? 'block' : 'none';
        }
      } else {
        this.hasMoreActivities = false;
      }

    } catch (error) {
      console.error("Error fetching activities:", error);
      Utils.showErrorToast("خطا در بارگذاری فعالیت‌ها");
    }
  }

  async addActivitiesForOwners(ownerIds) {
    if (!ownerIds || ownerIds.length === 0) {
      return;
    }

    try {
      const params = new URLSearchParams({
        owners: ownerIds.join(','),
        pageSize: this.pageSize
      });
      
      if (this.nextLink) {
        params.append('nextLink', this.nextLink);
      }

      const response = await fetch(`/api/crm/activities/by-owners?${params.toString()}`);
      const data = await response.json();

      if (data.value && data.value.length > 0) {
        this.addActivitiesToCalendar(data.value);
        this.nextLink = data.nextLink;
        this.hasMoreActivities = !!data.nextLink;
      } else {
        this.hasMoreActivities = false;
      }

      // Update load more button visibility
      const loadMoreBtn = document.getElementById("loadMoreActivitiesBtn");
      if (loadMoreBtn) {
        loadMoreBtn.style.display = this.hasMoreActivities ? "block" : "none";
      }

    } catch (error) {
      console.error("Error fetching activities for owners:", error);
      Utils.showErrorToast("خطا در بارگذاری فعالیت‌های انتخاب شده");
    }
  }

  addActivitiesToCalendar(activities) {
    if (!this.calendar) return;

    const events = activities.map((activity) => ({
      id: activity.activityid,
      title: activity.subject,
      start: activity.scheduledstart,
      end: activity.scheduledend,
      backgroundColor: this.getActivityColor(activity),
      borderColor: this.getActivityColor(activity),
      textColor: "#ffffff",
      extendedProps: {
        description: activity.description,
        priority: activity.prioritycode,
        owner: activity._ownerid_value,
        regarding: activity._regardingobjectid_value,
        scheduledstart_jalali: activity.scheduledstart_jalali,
        scheduledend_jalali: activity.scheduledend_jalali,
      },
    }));

    this.calendar.addEventSource(events);
  }

  getActivityColor(activity) {
    const priority = activity.prioritycode;
    switch (priority) {
      case "0": // Low
        return "#28a745";
      case "1": // Normal
        return "#17a2b8";
      case "2": // High
        return "#ffc107";
      case "3": // Urgent
        return "#dc3545";
      default:
        return "#6c757d";
    }
  }

  showActivityDetails(event) {
    if (!this.activityDetailsModal) return;

    const activity = event.extendedProps;
    document.getElementById("activitySubject").textContent = event.title;
    document.getElementById("activityDescription").textContent = activity.description || '';
    document.getElementById("activityStartDate").textContent = activity.scheduledstart_jalali || event.start;
    document.getElementById("activityDueDate").textContent = activity.scheduledend_jalali || event.end;
    document.getElementById("activityPriority").textContent = this.getPriorityText(activity.priority);

    // Store current activity data for edit form
    this.currentTaskData = {
      id: event.id,
      subject: event.title,
      description: activity.description,
      startDate: event.start,
      endDate: event.end,
      priority: activity.priority,
      status: activity.status,
      owner: activity.owner
    };

    this.activityDetailsModal.show();
  }

  getPriorityText(priority) {
    switch (priority) {
      case "0":
        return "کم";
      case "1":
        return "عادی";
      case "2":
        return "زیاد";
      case "3":
        return "فوری";
      default:
        return "نامشخص";
    }
  }

  addMyActivities() {
    this.fetchActivities(false, "my");
  }

  addAllActivities() {
    this.fetchActivities(false, "all");
  }

  addActivitiesForOwners(ownerIds) {
    this.fetchActivities(false, "specific", ownerIds);
  }
}

// Make CalendarManager available globally
window.CalendarManager = CalendarManager;

// Initialize calendar when document is ready
document.addEventListener('DOMContentLoaded', () => {
  window.calendarManager = new CalendarManager();
  window.calendarManager.initializeCalendar();
});
