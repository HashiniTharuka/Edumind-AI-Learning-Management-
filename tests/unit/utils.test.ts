import { describe, expect, it } from "vitest";
import { formatDuration, slugify } from "@/lib/utils";
import { getVideoSource, getYouTubeId } from "@/lib/video";

describe("getYouTubeId", () => {
  it.each([
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://youtube.com/watch?feature=share&v=dQw4w9WgXcQ&t=10", "dQw4w9WgXcQ"],
    ["https://youtu.be/dQw4w9WgXcQ?si=abc", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/embed/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/shorts/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
  ])("parses %s", (url, id) => {
    expect(getYouTubeId(url)).toBe(id);
  });

  it("returns null for non-YouTube URLs", () => {
    expect(getYouTubeId("https://example.com/video.mp4")).toBeNull();
    expect(getYouTubeId(undefined)).toBeNull();
  });
});

describe("getVideoSource", () => {
  it("embeds YouTube via the privacy-enhanced domain", () => {
    expect(getVideoSource("https://youtu.be/dQw4w9WgXcQ")).toEqual({
      kind: "youtube",
      embedUrl: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    });
  });
  it("treats other URLs as video files", () => {
    expect(getVideoSource("https://res.cloudinary.com/x/video.mp4")).toEqual({ kind: "file", src: "https://res.cloudinary.com/x/video.mp4" });
    expect(getVideoSource("")).toBeNull();
  });
});

describe("slugify", () => {
  it("creates URL-safe slugs", () => {
    expect(slugify("Intro to MongoDB & Atlas!")).toBe("intro-to-mongodb-atlas");
    expect(slugify("  --Hello   World--  ")).toBe("hello-world");
    expect(slugify("C++ / C#")).toBe("c-c");
  });
});

describe("formatDuration", () => {
  it("formats minutes", () => {
    expect(formatDuration(45)).toBe("45m");
    expect(formatDuration(60)).toBe("1h");
    expect(formatDuration(95)).toBe("1h 35m");
  });
});
