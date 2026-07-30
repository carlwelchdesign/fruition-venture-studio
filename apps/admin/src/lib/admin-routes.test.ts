import { describe, expect, it } from "vitest";
import {
  adminSignInEndpoint,
  submitterExportEndpoint,
} from "./admin-routes";

describe("admin routes", () => {
  it("uses the namespaced sign-in endpoint", () => {
    expect(adminSignInEndpoint).toBe("/api/admin/sign-in");
  });

  it("builds a namespaced and encoded submitter export endpoint", () => {
    expect(submitterExportEndpoint("submitter/example")).toBe(
      "/api/admin/submitters/submitter%2Fexample/export",
    );
  });
});
