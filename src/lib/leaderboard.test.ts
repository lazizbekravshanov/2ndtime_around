import { describe, expect, it } from "vitest";
import {
  buildContributorBoard,
  buildMajorBoard,
  rankOfUser,
  type CompletedItem,
} from "@/lib/leaderboard";

// One row per completed (kept-in-circulation) item — the shape the DB layer
// hands the pure builders.
const item = (
  ownerId: string,
  displayName: string | null,
  major: string | null
): CompletedItem => ({ ownerId, displayName, major });

const SAMPLE: CompletedItem[] = [
  item("u1", "Maya C.", "Information Technology"),
  item("u1", "Maya C.", "Information Technology"),
  item("u1", "Maya C.", "Information Technology"),
  item("u2", "Jordan R.", "Mechanical Engineering"),
  item("u2", "Jordan R.", "Mechanical Engineering"),
  item("u3", "Sam N.", "Marketing"),
  item("u4", "Priya P.", "Information Technology"),
  item("u4", "Priya P.", "Information Technology"),
  item("uX", null, "Biology"), // no display name — excluded from the people board
  item("uY", "Ghost", null), // no major — excluded from the major board
];

describe("buildContributorBoard", () => {
  it("returns [] for empty input", () => {
    expect(buildContributorBoard([])).toEqual([]);
  });

  it("groups by owner and counts items kept, highest first", () => {
    const board = buildContributorBoard(SAMPLE);
    expect(board[0]).toMatchObject({
      userId: "u1",
      displayName: "Maya C.",
      itemsKept: 3,
      rank: 1,
    });
  });

  it("excludes owners with no display name", () => {
    const board = buildContributorBoard(SAMPLE);
    expect(board.some((r) => r.userId === "uX")).toBe(false);
  });

  it("uses competition ranking with alphabetical tie-break", () => {
    // u2 and u4 both have 2 items → tied at rank 2; alphabetical (Jordan
    // before Priya) breaks display order. u3 (1 item) is then rank 4.
    const board = buildContributorBoard(SAMPLE);
    const byId = Object.fromEntries(board.map((r) => [r.userId, r]));
    expect(byId["u2"]).toMatchObject({ rank: 2, itemsKept: 2 });
    expect(byId["u4"]).toMatchObject({ rank: 2, itemsKept: 2 });
    expect(board.findIndex((r) => r.userId === "u2")).toBeLessThan(
      board.findIndex((r) => r.userId === "u4")
    );
    expect(byId["u3"]).toMatchObject({ rank: 4, itemsKept: 1 });
  });

  it("applies a limit after ranking", () => {
    expect(buildContributorBoard(SAMPLE, 2)).toHaveLength(2);
  });
});

describe("buildMajorBoard", () => {
  it("sums items per major and counts distinct contributors", () => {
    const board = buildMajorBoard(SAMPLE);
    const it = board.find((m) => m.major === "Information Technology");
    // u1 (3) + u4 (2) = 5 items across 2 contributors.
    expect(it).toMatchObject({ itemsKept: 5, contributors: 2, rank: 1 });
  });

  it("excludes items with no major", () => {
    const board = buildMajorBoard(SAMPLE);
    expect(board.some((m) => m.major === null)).toBe(false);
    // Biology's only item has a null display name but a real major — still counts.
    expect(board.find((m) => m.major === "Biology")?.itemsKept).toBe(1);
  });

  it("orders majors by items kept, highest first", () => {
    const board = buildMajorBoard(SAMPLE);
    expect(board[0].major).toBe("Information Technology");
  });
});

describe("rankOfUser", () => {
  it("returns the user's competition rank across the full board", () => {
    expect(rankOfUser(SAMPLE, "u1")).toBe(1);
    expect(rankOfUser(SAMPLE, "u4")).toBe(2);
    expect(rankOfUser(SAMPLE, "u3")).toBe(4);
  });

  it("returns null for a user with nothing kept in circulation", () => {
    expect(rankOfUser(SAMPLE, "nobody")).toBeNull();
  });

  it("returns null for an excluded (no display name) contributor", () => {
    expect(rankOfUser(SAMPLE, "uX")).toBeNull();
  });
});
