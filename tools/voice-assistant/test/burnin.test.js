import test from "node:test";
import assert from "node:assert/strict";
import { executeApprovedCommand } from "../src/index.js";

const BURNIN_STUDENT = {
  id: "test-student-burnin",
  name: "Voice Assistant Test Student",
};

test("burn-in fixture is explicitly synthetic", () => {
  assert.match(BURNIN_STUDENT.id, /^test-/);
  assert.match(BURNIN_STUDENT.name.toLowerCase(), /test/);
});

test("burn-in navigation commands remain read-only/planned without a browser", async () => {
  const commands = [
    "open unidoxia",
    "show students",
    "show applications",
    "show notifications",
  ];

  for (let i = 0; i < 50; i += 1) {
    for (const command of commands) {
      const result = await executeApprovedCommand(command);
      assert.equal(result.ok, true);
      assert.equal(result.status, "planned");
    }
  }
});

test("burn-in repeatedly blocks unknown or destructive requests without confirmation", async () => {
  for (let i = 0; i < 50; i += 1) {
    const unknown = await executeApprovedCommand("change the real student's visa decision");
    assert.equal(unknown.status, "blocked");

    const destructive = await executeApprovedCommand("delete this student");
    assert.equal(destructive.status, "confirmation_required");
  }
});
