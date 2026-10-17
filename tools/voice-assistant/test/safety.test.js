import test from "node:test";
import assert from "node:assert/strict";
import { executeApprovedCommand, matchApprovedCommand } from "../src/index.js";
import { commandCriteria } from "../src/jev.js";
import { routeUrl } from "../src/config.js";

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

test("applications route uses the verified staff/admin applications route", () => {
  assert.equal(routeUrl("show_applications"), "https://unidoxia.com/dashboard/applications");
});

test("Jev is restricted to approved command keys plus none", () => {
  const criteria = commandCriteria();
  assert.ok(criteria.open_admin_home);
  assert.ok(criteria.show_students);
  assert.ok(criteria.show_applications);
  assert.ok(criteria.show_notifications);
  assert.ok(criteria.send_or_submit);
  assert.ok(criteria.none);
  assert.equal(criteria.transfer_money, undefined);
});
