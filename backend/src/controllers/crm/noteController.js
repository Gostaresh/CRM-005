const CrmService = require("../../services/crmService");
const logger = require("../../utils/logger");
const { decrypt } = require("../../utils/crypto");

/**
 * Build basic credentials object from session once
 */
function getCredentials(req) {
  if (!req.session.user || !req.session.encryptedPassword) {
    throw new Error("Unauthenticated");
  }
  return {
    username: req.session.user.username.split("\\")[1],
    password: decrypt(req.session.encryptedPassword),
  };
}

/**
 * GET /api/crm/activities/:id/notes
 * Returns every annotation linked to the given task (text + file meta only).
 */
exports.fetchNotes = async (req, res) => {
  try {
    const { activityId } = req.params;
    const credentials = getCredentials(req);

    const rawNotes = await CrmService.fetchNotes(activityId, credentials);

    const notes = rawNotes.map((n) => ({
      annotationid: n.annotationid,
      subject: n.subject ?? null,
      notetext: n.notetext ?? null,
      filename: n.filename ?? null,
      mimetype: n.mimetype ?? null,
      createdon: n.createdon,
      createdby: n.createdby?.fullname ?? null,
    }));

    res.json(notes);
  } catch (err) {
    logger.error(`fetchNotes error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
};

/**
 * POST /api/crm/activities/:id/notes
 * Body: { subject?, notetext?, filename?, mimetype?, documentbody? }
 *
 * If filename + documentbody are present we treat it as an attachment.
 */
exports.createNote = async (req, res) => {
  try {
    const { activityId } = req.params;
    const {
      subject = "",
      notetext = "",
      filename,
      mimetype,
      documentbody,
    } = req.body;

    // If Multer supplied a file we build attachment fields from it
    const file = req.file;
    let filePayload = {};
    if (file) {
      filePayload = {
        filename: file.originalname,
        mimetype: file.mimetype,
        documentbody: file.buffer.toString("base64"),
      };
    }

    const credentials = getCredentials(req);

    // Basic validation
    if (!notetext && !documentbody && !file) {
      return res
        .status(400)
        .json({ error: "Either notetext or attachment must be provided." });
    }

    const note = await CrmService.createNote(
      activityId,
      {
        subject,
        notetext,
        // from body when sent as JSON (fallback)
        filename,
        mimetype,
        documentbody,
        // from multipart when sent as file
        ...filePayload,
      },
      credentials
    );

    res.status(201).json(note);
  } catch (err) {
    logger.error(`createNote error: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/crm/notes/:noteId/download
 * Streams the attachment for the given annotation.
 */
exports.downloadNote = async (req, res) => {
  try {
    const { noteId } = req.params;
    const credentials = getCredentials(req);

    const note = await CrmService.fetchNoteAttachment(noteId, credentials);
    if (!note || !note.documentbody) {
      return res.status(404).json({ error: "Attachment not found" });
    }

    const buffer = Buffer.from(note.documentbody, "base64");
    res.setHeader("Content-Type", note.mimetype || "application/octet-stream");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(
        note.filename || "attachment"
      )}"`
    );
    res.send(buffer);
  } catch (err) {
    logger.error(`downloadNote error: ${err.message}`);
    res.status(500).json({ error: "Failed to download attachment" });
  }
};
