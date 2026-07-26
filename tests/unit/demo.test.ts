import { describe, expect, it } from "vitest";
import { DEMO_TEST_ID, DEMO_USER_ID } from "@/lib/demo/constants";
import { DemoStoreSchema, emptyDemoStore, newId } from "@/lib/demo/store";
import { isDemoWritingAvailable } from "@/lib/demo/session-state";

describe("demo writing mode", () => {
  it("exposes a stable test id and demo user", () => {
    expect(DEMO_TEST_ID).toBe("test-writer");
    expect(DEMO_USER_ID).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it("builds a valid empty store", () => {
    const store = emptyDemoStore();
    const parsed = DemoStoreSchema.parse(store);
    expect(parsed.version).toBe(1);
    expect(parsed.userId).toBe(DEMO_USER_ID);
    expect(parsed.projects).toEqual([]);
  });

  it("creates uuid ids for demo entities", () => {
    const id = newId();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it("offers demo writing when supabase env is absent", () => {
    expect(isDemoWritingAvailable()).toBe(true);
  });
});
