import { describe, expect, it } from "vitest";
import { z } from "zod";

const ProductNameSchema = z.literal("Writing");

describe("bootstrap", () => {
  it("uses Writing as the product name", () => {
    expect(ProductNameSchema.parse("Writing")).toBe("Writing");
  });
});
