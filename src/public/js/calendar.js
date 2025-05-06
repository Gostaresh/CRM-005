class CalendarManager {
  constructor() {
    this.calendar = null;
    this.activitiesNextLink = null;
    this.hasMoreActivities = true;
    this.currentActivityView = "my";
    this.activityDetailsModal = document.getElementById("activityDetailsModal")
      ? new bootstrap.Modal(document.getElementById("activityDetailsModal"))
      : null;
    this.currentTaskData = null;
    this.DateTime = luxon.DateTime; // Use Luxon for timezone handling
  }

  initializeCalendar() {
    const calendarEl = document.getElementById("calendar");
    if (!calendarEl) {
      console.error("Calendar element not found on the page");
      return;
    }

    console.log("Initializing FullCalendar");
    this.calendar = new FullCalendar.Calendar(calendarEl, {
      initialView: "dayGridMonth",
      headerToolbar: {
        left: "prev,next today",
        center: "title",
        right: "dayGridMonth,timeGridWeek,timeGridDay",
      },
      locale: "fa",
      direction: "rtl",
      nowIndicator: true,
      buttonText: {
        today: "امروز",
        month: "ماه",
        week: "هفته",
        day: "روز",
      },
      firstDay: 6,
      timeZone: "local",
      slotMinTime: "07:00:00",
      slotMaxTime: "22:00:00",
      allDaySlot: false,
      slotDuration: "00:30:00",
      slotLabelInterval: "01:00",
      slotLabelFormat: {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      },
      editable: true,
      droppable: true,
      selectable: true,
      events: [],
      eventResize: async (info) => {
        const event = info.event;
        const activityId = event.id;

        // Round the start and end times to nearest 30 minutes
        const roundToNearest30 = (date) => {
          const minutes = date.getMinutes();
          const roundedMinutes = Math.round(minutes / 30) * 30;
          date.setMinutes(roundedMinutes);
          date.setSeconds(0);
          date.setMilliseconds(0);
          return date;
        };

        const newStart = event.start
          ? roundToNearest30(new Date(event.start))
          : null;
        const newEnd = event.end
          ? roundToNearest30(new Date(event.end))
          : newStart;

        // Convert to UTC ISO string for API
        const newStartUTC = newStart
          ? this.DateTime.fromJSDate(newStart, { zone: "Asia/Tehran" })
              .setZone("utc")
              .toISO()
          : null;
        const newEndUTC = newEnd
          ? this.DateTime.fromJSDate(newEnd, { zone: "Asia/Tehran" })
              .setZone("utc")
              .toISO()
          : newStartUTC;

        try {
          console.log(`Updating activity dates for ID: ${activityId}`);
          const response = await fetch(
            `/api/crm/activities/${activityId}/update-dates`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                scheduledstart: newStartUTC,
                scheduledend: newEndUTC,
              }),
            }
          );
          const data = await response.json();
          if (response.ok) {
            Utils.showSuccessToast("زمان‌بندی وظیفه با موفقیت به‌روزرسانی شد");
            // Refresh all events to ensure consistency
            await this.fetchActivities(false, this.currentActivityView);
          } else {
            console.error(`Failed to update activity dates: ${data.error}`);
            Utils.showErrorToast(
              data.error || "خطا در به‌روزرسانی زمان‌بندی وظیفه"
            );
            info.revert();
          }
        } catch (err) {
          console.error(`Error updating activity dates: ${err.message}`);
          Utils.showErrorToast("خطا در ارتباط با سرور");
          info.revert();
        }
      },
      eventDrop: async (info) => {
        const event = info.event;
        const activityId = event.id;

        // Round the start and end times to nearest 30 minutes
        const roundToNearest30 = (date) => {
          const minutes = date.getMinutes();
          const roundedMinutes = Math.round(minutes / 30) * 30;
          date.setMinutes(roundedMinutes);
          date.setSeconds(0);
          date.setMilliseconds(0);
          return date;
        };

        const newStart = event.start
          ? roundToNearest30(new Date(event.start))
          : null;
        const newEnd = event.end
          ? roundToNearest30(new Date(event.end))
          : newStart;

        // Convert to UTC ISO string for API
        const newStartUTC = newStart
          ? this.DateTime.fromJSDate(newStart, { zone: "Asia/Tehran" })
              .setZone("utc")
              .toISO()
          : null;
        const newEndUTC = newEnd
          ? this.DateTime.fromJSDate(newEnd, { zone: "Asia/Tehran" })
              .setZone("utc")
              .toISO()
          : newStartUTC;

        try {
          console.log(`Updating activity dates for ID: ${activityId}`);
          const response = await fetch(
            `/api/crm/activities/${activityId}/update-dates`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                scheduledstart: newStartUTC,
                scheduledend: newEndUTC,
              }),
            }
          );
          const data = await response.json();
          if (response.ok) {
            Utils.showSuccessToast("زمان‌بندی وظیفه با موفقیت به‌روزرسانی شد");
            // Refresh all events to ensure consistency
            await this.fetchActivities(false, this.currentActivityView);
          } else {
            console.error(`Failed to update activity dates: ${data.error}`);
            Utils.showErrorToast(
              data.error || "خطا در به‌روزرسانی زمان‌بندی وظیفه"
            );
            info.revert();
          }
        } catch (err) {
          console.error(`Error updating activity dates: ${err.message}`);
          Utils.showErrorToast("خطا در ارتباط با سرور");
          info.revert();
        }
      },
      eventClick: async (info) => {
        if (!this.activityDetailsModal) {
          console.error("Activity details modal not found");
          return;
        }
        try {
          console.log(`Fetching activity details for ID: ${info.event.id}`);
          const response = await fetch(`/api/crm/activities/${info.event.id}`);
          const data = await response.json();
          if (response.ok) {
            // Store the task data in both the instance and window object
            this.currentTaskData = {
              activityid: data.activityid,
              subject: data.subject,
              description: data.description || "",
              scheduledstart: data.scheduledstart,
              scheduledend: data.scheduledend,
              activitytypecode: data.activitytypecode,
              prioritycode: data.prioritycode || "1",
              ownerid: data.ownerid,
            };
            // Also store in window.CalendarManager for the edit button
            window.CalendarManager.currentTaskData = this.currentTaskData;

            document.getElementById("activitySubject").textContent =
              data.subject || "-";
            document.getElementById("activityType").textContent =
              data.activitytypecode || "-";

            const startDateJalali = moment(data.scheduledstart)
              .tz("Asia/Tehran")
              .format("jYYYY/jMM/jDD HH:mm");
            const startDateGregorian = moment(data.scheduledstart)
              .tz("Asia/Tehran")
              .format("YYYY/MM/DD HH:mm");
            document.getElementById(
              "activityStart"
            ).innerHTML = `${startDateJalali} <span class="text-muted">(${startDateGregorian})</span>`;
            document.getElementById("activityEnd").textContent =
              data.scheduledend
                ? moment(data.scheduledend)
                    .tz("Asia/Tehran")
                    .format("jYYYY/jMM/jDD HH:mm")
                : "-";
            document.getElementById("activityOwner").textContent =
              data.ownerid?.name || data.owner?.name || "-";
            document.getElementById("activityDescription").textContent =
              data.description || "-";
            document.getElementById("activityId").textContent =
              data.activityid || "-";

            this.activityDetailsModal.show();
          } else {
            console.error(`Failed to load activity details: ${data.error}`);
            Utils.showErrorToast(
              `خطا در بارگذاری جزئیات فعالیت: ${data.error || "خطا ناشناخته"}`
            );
          }
        } catch (err) {
          console.error(`Error fetching activity details: ${err.message}`);
          Utils.showErrorToast("خطا در ارتباط با سرور");
        }
      },
    });
    this.calendar.render();
    console.log("FullCalendar initialized and rendered");
  }

  async fetchActivities(append = false, view = this.currentActivityView) {
    const loadMoreActivitiesBtn = document.getElementById(
      "loadMoreActivitiesBtn"
    );
    const calendarEl = document.getElementById("calendar");
    if (!calendarEl) {
      console.error("Calendar element not found during fetchActivities");
      return;
    }

    try {
      const url = this.activitiesNextLink
        ? `/api/crm/activities/${view}?nextLink=${encodeURIComponent(
            this.activitiesNextLink
          )}`
        : `/api/crm/activities/${view}?pageSize=200`;
      console.log(`Fetching activities: ${url}`);
      const response = await fetch(url);
      const data = await response.json();
      console.log(`Activities response: ${JSON.stringify(data)}`);
      console.log(`Next link received: ${data.nextLink || "none"}`);
      if (response.ok) {
        const events = (data.value || [])
          .map((activity) => {
            // Convert UTC times to Tehran timezone for display
            const startDate = activity.scheduledstart
              ? this.DateTime.fromISO(activity.scheduledstart, { zone: "utc" })
                  .setZone("Asia/Tehran")
                  .toJSDate()
              : this.DateTime.now().setZone("Asia/Tehran").toJSDate();
            const endDate = activity.scheduledend
              ? this.DateTime.fromISO(activity.scheduledend, { zone: "utc" })
                  .setZone("Asia/Tehran")
                  .toJSDate()
              : startDate;

            const jalaliStart = moment(startDate)
              .tz("Asia/Tehran")
              .format("jYYYY/jMM/jDD HH:mm");

            const eventColor =
              activity.activitytypecode === "task" ? "#1976d2" : "#43a047";
            const event = {
              id: activity.activityid,
              title: `${activity.subject || "بدون عنوان"} - ${jalaliStart}`,
              start: startDate,
              end: endDate,
              extendedProps: {
                activityType: activity.activitytypecode,
                originalStart: activity.scheduledstart, // Store original UTC time
                originalEnd: activity.scheduledend, // Store original UTC time
              },
              color: eventColor,
            };
            console.log(`Adding event to calendar: ${JSON.stringify(event)}`);
            return event;
          })
          .filter((event) => event.id);

        console.log("Events to add:", events);

        // Update nextLink before modifying calendar
        this.activitiesNextLink = data.nextLink;
        this.hasMoreActivities = !!this.activitiesNextLink;

        if (!append) {
          this.calendar.removeAllEvents();
        }

        if (events.length === 0 && !append) {
          calendarEl.innerHTML +=
            '<div class="text-center mt-3 text-muted">فعالیتی برای نمایش وجود ندارد.</div>';
        } else {
          // Add new events to the calendar
          this.calendar.addEventSource(events);
          console.log(`Added ${events.length} events to the calendar`);
        }

        // Update load more button state
        if (loadMoreActivitiesBtn) {
          if (!this.hasMoreActivities) {
            loadMoreActivitiesBtn.disabled = true;
            loadMoreActivitiesBtn.classList.add("btn-secondary");
            loadMoreActivitiesBtn.classList.remove("btn-primary");
            loadMoreActivitiesBtn.textContent = "هیچ فعالیت دیگری وجود ندارد";
          } else {
            loadMoreActivitiesBtn.disabled = false;
            loadMoreActivitiesBtn.classList.add("btn-primary");
            loadMoreActivitiesBtn.classList.remove("btn-secondary");
            loadMoreActivitiesBtn.textContent = "بارگذاری فعالیت‌های بیشتر";
          }
        }
      } else {
        console.error(`Failed to fetch activities: ${data.error}`);
        Utils.showErrorToast(
          `خطا در بارگذاری فعالیت‌ها: ${data.error || "خطا ناشناخته"}`
        );
        if (loadMoreActivitiesBtn) loadMoreActivitiesBtn.disabled = true;
      }
    } catch (err) {
      console.error(`Error fetching activities: ${err.message}`);
      Utils.showErrorToast("خطا در ارتباط با سرور");
      if (loadMoreActivitiesBtn) loadMoreActivitiesBtn.disabled = true;
    }
  }
}

window.CalendarManager = CalendarManager;
