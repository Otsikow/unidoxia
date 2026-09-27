import test from "node:test";
import assert from "node:assert/strict";
import { executeApprovedCommand, matchApprovedCommand } from "../src/index.js";

test("matches approved UniDoxia navigation command", () => {
  assert.equal(matchApprovedCommand("show applications")?.key, "show_applications");
});

test("blocks unknown commands", async () => {
  const result = await executeApprovedCommand("transfer money now");
  assert.equal(result.status, "blocked");
});

test("requires confirmation for destructive actions", async () => {
  const result = await executeApprovedCommand("delete this student");
  assert.equal(result.status, "confirmation_required");
});

test("plans safe navigation without a browser page", async () => {
  const result = await executeApprovedCommand("show students");
  assert.equal(result.status, "planned");
  assert.equal(result.url, "https://unidoxia.com/admin/students");
});
