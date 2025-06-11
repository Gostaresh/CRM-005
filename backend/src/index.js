const compression = require("compression");
const express = require("express");
const session = require("express-session");
const cors = require("cors");
const env = require("./config/env");
const logger = require("./utils/logger");
const routesFactory = require("./routes");
const errorMiddleware = require("./middleware/errorMiddleware");
const config = require("./config/config");
// const MetadataLoader = require("./core/metadata/MetadataLoader");
// const FormGenerator = require("./core/metadata/FormGenerator");
const DynamicsService = require("./core/services/DynamicsService");
const expressLayouts = require("express-ejs-layouts");

const app = express();
const BODY_LIMIT = "20mb";
const RAW_BODY_LIMIT = "20mb";

// Essential middleware that must come first
app.use(express.json({ limit: BODY_LIMIT }));
app.use(express.urlencoded({ limit: BODY_LIMIT, extended: true }));
app.use(
  express.raw({
    type: () => true, // accept all content-types
    limit: RAW_BODY_LIMIT,
  })
);
app.set("trust proxy", 1); // respect X-Forwarded-Proto
// Decide if session cookies must be "secure"
const cookieSecure =
  process.env.COOKIE_SECURE === "true" ||
  (process.env.NODE_ENV === "production" && process.env.FORCE_HTTPS === "true");
app.use(
  session({
    secret: env.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: cookieSecure,
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

// Gzip-compress all JSON / HTML responses
app.use(compression());

app.use(expressLayouts);
app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        "http://192.168.1.22",
        "https://192.168.1.22",
        "http://192.168.1.22:5173",
        "https://192.168.1.22:5173",
        "http://localhost:5173",
        "https://localhost:5173",
      ];

      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("CORS not allowed from origin: " + origin));
      }
    },
    credentials: true,
  })
);

// Debug middleware to log session information (after session middleware)
app.use((req, res, next) => {
  logger.debug(
    `Request URL: ${req.url}, Session ID: ${
      req.sessionID
    }, User: ${JSON.stringify(req.session.user)}`
  );
  next();
});

app.set("view engine", "ejs");
// app.set("views", "src/views");

app.set("views", "/var/www/crm-005-views");

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

// Initialize dependencies
// const metadataLoader = new MetadataLoader(config.metadataPaths);
// metadataLoader.load();

const dynamicsService = new DynamicsService(config.apiBaseUrl);
// const formGenerator = new FormGenerator(metadataLoader, dynamicsService);

// Mount routes
const routes = routesFactory();
app.use("/", routes);

app.use(errorMiddleware);

const PORT = env.port || 3000;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
