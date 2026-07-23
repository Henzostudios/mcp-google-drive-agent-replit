/**
 * ============================================================
 * Code.gs — Google Apps Script backend for the Asset Tagging Agent
 * ------------------------------------------------------------
 * Copyright (c) 2026 Nikko Griffin. All rights reserved.
 * ------------------------------------------------------------
 * WHAT THIS SCRIPT DOES (plain-English):
 *   Runs in your own Google account and exposes two actions over
 *   a plain web URL that index.html / the standalone demo can call:
 *     ?action=list&folderId=...    -> lists files in a folder
 *     ?action=update&fileId=...    -> stars a file + writes a
 *                                     description onto it
 *
 * ⚠️ SECURITY — WHY THIS VERSION IS DIFFERENT FROM WHAT YOU HAD:
 *   The original script trusted whatever folderId or fileId it was
 *   given. That's a real problem the moment this URL is public
 *   (which is the whole point of this demo): anyone with the URL —
 *   not just visitors to your page — could list the contents of
 *   ANY folder you have access to, or star + overwrite the
 *   description of ANY file you can edit. "Secret" URLs aren't
 *   secret once they're sitting in a public GitHub repo.
 *
 *   This version fixes that with a hard boundary: everything is
 *   restricted to ONE folder you approve below (ALLOWED_FOLDER_ID).
 *   No folderId or fileId outside that folder can be read or
 *   changed, no matter what gets sent to this URL.
 * ============================================================
 */

// ⚠️ SET THIS to the ONE folder you're comfortable making public.
// Get it from the folder's share link:
//   https://drive.google.com/drive/folders/THIS_PART_HERE
// This example is set to the folder from your screenshot — confirm
// it's actually the folder you want the public demo to use.
var ALLOWED_FOLDER_ID = "1f99UXQuTZoqrLPZE0aTvk3frUjNjsgxH";

// Optional extra layer. Honest note: this is NOT strong protection
// on its own — anyone reading script.js in a public repo can see
// this same value, so it won't stop a determined person. Its real
// value is filtering out automated bots/scanners that hit the URL
// blindly without ever opening your source code. ALLOWED_FOLDER_ID
// above is the boundary that actually matters.
var SHARED_TOKEN = "53ce486d8b466d41fb75cbac";

function doGet(e) {
  var output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);

  try {
    if (e.parameter.token !== SHARED_TOKEN) {
      throw new Error("Not authorized.");
    }

    var action = e.parameter.action || "list";

    // Action 1: List the files in the one approved folder.
    if (action === "list") {
      var folderId = e.parameter.folderId;
      if (!folderId) throw new Error("No folder ID provided.");

      // COMMON TROUBLE SPOT: this check is the whole point of the
      // fix above. It must come before DriveApp ever touches the ID.
      if (folderId !== ALLOWED_FOLDER_ID) {
        throw new Error("This folder isn't authorized for this demo.");
      }

      var folder = DriveApp.getFolderById(folderId);
      var files = folder.getFiles();
      var fileList = [];

      var count = 0;
      while (files.hasNext() && count < 15) {
        var file = files.next();
        fileList.push({ id: file.getId(), name: file.getName() });
        count++;
      }
      return output.setContent(JSON.stringify({ success: true, files: fileList }));
    }

    // Action 2: Star a file and write the tags into its description
    // — but only if that file actually lives inside the approved
    // folder. A fileId alone is never trusted on its own.
    if (action === "update") {
      var fileId = e.parameter.fileId;
      var description = e.parameter.description;
      if (!fileId) throw new Error("No file ID provided.");

      var file = DriveApp.getFileById(fileId);

      var parents = file.getParents();
      var inApprovedFolder = false;
      while (parents.hasNext()) {
        if (parents.next().getId() === ALLOWED_FOLDER_ID) {
          inApprovedFolder = true;
          break;
        }
      }
      if (!inApprovedFolder) {
        throw new Error("This file isn't inside the authorized folder.");
      }

      file.setStarred(true);
      if (description) {
        file.setDescription(description);
      }

      return output.setContent(JSON.stringify({ success: true }));
    }

    throw new Error("Unknown action.");

  } catch (err) {
    return output.setContent(JSON.stringify({ success: false, error: err.message }));
  }
}
