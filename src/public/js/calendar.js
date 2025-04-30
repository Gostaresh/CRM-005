let calendar;
let activitiesNextLink = null;
let hasMoreActivities = true;
let currentActivityView = "all";
const activityDetailsModal = document.getElementById("activityDetailsModal")
  ? new bootstrap.Modal(document.getElementById("activityDetailsModal"))
  : null;

// Expose fetchActivities to be called from other scripts
window.fetchActivities = fetchActivities;

// Store the current task data for editing
let currentTaskData = null;

function initializeCalendar() {
  const calendarEl = document.getElementById("calendar");
  if (!calendarEl) return;

  console.log("Initializing FullCalendar");
  calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    locale: "fa",
    timeZone: "Asia/Tehran",
    direction: "rtl",
    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "dayGridMonth,timeGridWeek,timeGridDay",
    },
    buttonText: {
      today: "امروز",
      month: "ماه",
      week: "هفته",
      day: "روز",
    },
    firstDay: 6,
    editable: true,
    events: [],
    eventClick: async function (info) {
      if (!activityDetailsModal) return;
      try {
        const response = await fetch(`/api/crm/activities/${info.event.id}`);
        const data = await response.json();
        if (response.ok) {
          document.getElementById("activitySubject").textContent =
            data.subject || "-";
          document.getElementById("activityType").textContent =
            data.activitytypecode || "-";
          document.getElementById("activityStart").textContent =
            data.scheduledstart
              ? new Date(data.scheduledstart).toLocaleString("fa-IR")
              : "-";
          document.getElementById("activityEnd").textContent = data.scheduledend
            ? new Date(data.scheduledend).toLocaleString("fa-IR")
            : "-";
          document.getElementById("activityOwner").textContent =
            data.owner?.name || "-";
          document.getElementById("activityDescription").textContent =
            data.description || "-";
          document.getElementById("activityId").textContent =
            data.activityid || "-";

          // Store task data for editing
          currentTaskData = data;
          activityDetailsModal.show();
        } else {
          showErrorToast(
            `خطا در بارگذاری جزئیات فعالیت: ${data.error || "خطا ناشناخته"}`
          );
        }
      } catch (err) {
        showErrorToast("خطا در ارتباط با سرور");
      }
    },
    eventDrop: async function (info) {
      const event = info.event;
      const activityId = event.id;
      const newStart = event.start ? event.start.toISOString() : null;
      const newEnd = event.end
        ? event.end.toISOString()
        : event.start.toISOString();

      try {
        const response = await fetch(
          `/api/crm/activities/${activityId}/update-dates`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              scheduledstart: newStart,
              scheduledend: newEnd,
            }),
          }
        );
        const data = await response.json();
        if (response.ok) {
          showSuccessToast("زمان‌بندی وظیفه با موفقیت به‌روزرسانی شد");
        } else {
          showErrorToast(data.error || "خطا در به‌روزرسانی زمان‌بندی وظیفه");
          info.revert();
        }
      } catch (err) {
        showErrorToast("خطا در ارتباط با سرور");
        info.revert();
      }
    },
  });
  calendar.render();
}

async function fetchActivities(append = false, view = currentActivityView) {
  const loadMoreActivitiesBtn = document.getElementById(
    "loadMoreActivitiesBtn"
  );
  const calendarEl = document.getElementById("calendar");
  try {
    const url = activitiesNextLink
      ? `/api/crm/activities/${view}?nextLink=${encodeURIComponent(
          activitiesNextLink
        )}`
      : `/api/crm/activities/${view}?pageSize=50`;
    console.log(`Fetching activities: ${url}`);
    const response = await fetch(url);
    const data = await response.json();
    console.log(`Activities response: ${JSON.stringify(data)}`);
    console.log(`Next link received: ${data.nextLink || "none"}`);
    if (response.ok) {
      const events = (data.value || [])
        .map((activity) => {
          const startDate = activity.scheduledstart || new Date().toISOString();
          const endDate = activity.scheduledend || startDate;
          const event = {
            id: activity.activityid,
            title: activity.subject || "بدون عنوان",
            start: startDate,
            end: endDate,
            extendedProps: {
              activityType: activity.activitytypecode,
            },
          };
          console.log(`Adding event to calendar: ${JSON.stringify(event)}`);
          return event;
        })
        .filter((event) => event.id);
      activitiesNextLink = data.nextLink;
      if (!append) {
        calendar.removeAllEvents();
      }
      if (events.length === 0 && !append) {
        calendarEl.innerHTML +=
          '<div class="text-center mt-3 text-muted">فعالیتی برای نمایش وجود ندارد.</div>';
      } else {
        calendar.addEventSource(events);
      }

      hasMoreActivities = !!activitiesNextLink;
      console.log(`Has more activities: ${hasMoreActivities}`);
      if (loadMoreActivitiesBtn) {
        if (!hasMoreActivities) {
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
      showErrorToast(
        `خطا در بارگذاری فعالیت‌ها: ${data.error || "خطا ناشناخته"}`
      );
      if (loadMoreActivitiesBtn) loadMoreActivitiesBtn.disabled = true;
    }
  } catch (err) {
    showErrorToast("خطا در ارتباط با سرور");
    if (loadMoreActivitiesBtn) loadMoreActivitiesBtn.disabled = true;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const allActivitiesBtn = document.getElementById("allActivitiesBtn");
  const myActivitiesBtn = document.getElementById("myActivitiesBtn");
  const loadMoreActivitiesBtn = document.getElementById(
    "loadMoreActivitiesBtn"
  );

  initializeCalendar();
  fetchActivities();

  if (allActivitiesBtn) {
    allActivitiesBtn.addEventListener("click", () => {
      allActivitiesBtn.classList.add("btn-primary");
      allActivitiesBtn.classList.remove("btn-outline-primary");
      myActivitiesBtn.classList.add("btn-outline-primary");
      myActivitiesBtn.classList.remove("btn-primary");
      currentActivityView = "all";
      activitiesNextLink = null;
      hasMoreActivities = true;
      if (loadMoreActivitiesBtn) {
        loadMoreActivitiesBtn.disabled = false;
        loadMoreActivitiesBtn.classList.add("btn-primary");
        loadMoreActivitiesBtn.classList.remove("btn-secondary");
        loadMoreActivitiesBtn.textContent = "بارگذاری فعالیت‌های بیشتر";
      }
      fetchActivities(false, "all");
    });
  }

  if (myActivitiesBtn) {
    myActivitiesBtn.addEventListener("click", () => {
      myActivitiesBtn.classList.add("btn-primary");
      myActivitiesBtn.classList.remove("btn-outline-primary");
      allActivitiesBtn.classList.add("btn-outline-primary");
      allActivitiesBtn.classList.remove("btn-primary");
      currentActivityView = "my";
      activitiesNextLink = null;
      hasMoreActivities = true;
      if (loadMoreActivitiesBtn) {
        loadMoreActivitiesBtn.disabled = false;
        loadMoreActivitiesBtn.classList.add("btn-primary");
        loadMoreActivitiesBtn.classList.remove("btn-secondary");
        loadMoreActivitiesBtn.textContent = "بارگذاری فعالیت‌های بیشتر";
      }
      fetchActivities(false, "my");
    });
  }

  if (loadMoreActivitiesBtn) {
    loadMoreActivitiesBtn.addEventListener("click", () => {
      fetchActivities(true, currentActivityView);
    });
  }
});
