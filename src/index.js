const express = require("express");
const session = require("express-session");
const env = require("./config/env");
const logger = require("./utils/logger");
const routes = require("./routes");
const errorMiddleware = require("./middleware/errorMiddleware");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: env.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === "production" },
  })
);
app.set("view engine", "ejs");
app.set("views", "src/views");

// Custom layout rendering
app.use((req, res, next) => {
  const originalRender = res.render.bind(res);
  res.render = function (view, options, callback) {
    const opts = { ...options };
    const layout = opts.layout || "layouts/main";
    opts.content = undefined; // Reset content

    // Render the child template first
    originalRender(view, opts, (err, childContent) => {
      if (err) return callback ? callback(err) : next(err);
      opts.content = childContent; // Set the child content as 'content' for the layout
      originalRender(layout, opts, callback);
    });
  };
  next();
});

app.use(express.static("src/public"));
app.use("/", routes);
app.use(errorMiddleware);

const PORT = env.port || 3000;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
