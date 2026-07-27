import assert from "node:assert/strict";
import test from "node:test";
import { TOOL_REGISTRY } from "../app/tools.js";

test("publishes complete, ordered, uniquely routed home tools", () => {
  assert.deepEqual(
    TOOL_REGISTRY.map(({ id, href, visual }) => ({ id, href, visual })),
    [
      { id: "slot-pole", href: "/slot-pole", visual: "slotPole" },
      { id: "wire-layout", href: "/wire-layout", visual: "wirePacking" },
      { id: "coil-resistance", href: "/coil-resistance", visual: "resistance" },
    ],
  );

  for (const [position, tool] of TOOL_REGISTRY.entries()) {
    assert.deepEqual(Object.keys(tool).sort(), ["description", "href", "id", "index", "name", "visual"]);
    assert.equal(tool.index, position + 1);
    assert.ok(tool.name.trim());
    assert.ok(tool.description.trim());
  }

  assert.equal(new Set(TOOL_REGISTRY.map(({ href }) => href)).size, TOOL_REGISTRY.length);
});
