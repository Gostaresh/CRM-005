const fs = require("fs");
const path = require("path");

const sourceDir = path.join(__dirname, "../node_modules/@fullcalendar");
const targetDir = path.join(__dirname, "../src/public");

// Create directories if they don't exist
if (!fs.existsSync(path.join(targetDir, "js"))) {
  fs.mkdirSync(path.join(targetDir, "js"), { recursive: true });
}
if (!fs.existsSync(path.join(targetDir, "css"))) {
  fs.mkdirSync(path.join(targetDir, "css"), { recursive: true });
}

// Copy core files
fs.copyFileSync(
  path.join(sourceDir, "core/main.min.js"),
  path.join(targetDir, "js/fullcalendar-main.min.js")
);

fs.copyFileSync(
  path.join(sourceDir, "core/main.min.css"),
  path.join(targetDir, "css/fullcalendar-main.min.css")
);

// Copy daygrid plugin
fs.copyFileSync(
  path.join(sourceDir, "daygrid/main.min.js"),
  path.join(targetDir, "js/fullcalendar-daygrid.min.js")
);

// Copy timegrid plugin
fs.copyFileSync(
  path.join(sourceDir, "timegrid/main.min.js"),
  path.join(targetDir, "js/fullcalendar-timegrid.min.js")
);

console.log("FullCalendar files copied successfully!");
