import { formatDuration } from "../src/utils/format";

describe("formatDuration", () => {
  it("formats seconds to mm:ss", () => {
    expect(formatDuration(125)).toBe("2:05");
  });

  it("pads single digit seconds", () => {
    expect(formatDuration(61)).toBe("1:01");
  });

  it("handles nullish or invalid input", () => {
    expect(formatDuration(undefined)).toBe("--:--");
    expect(formatDuration(null)).toBe("--:--");
    expect(formatDuration(Number.NaN)).toBe("--:--");
  });
});
