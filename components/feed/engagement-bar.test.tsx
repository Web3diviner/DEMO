import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EngagementBar } from "./engagement-bar";

function setup(overrides: Partial<React.ComponentProps<typeof EngagementBar>> = {}) {
  const props = {
    liked: false,
    likeCount: 1200,
    commentCount: 40,
    shareCount: 12,
    onLike: vi.fn(),
    onComment: vi.fn(),
    onShare: vi.fn(),
    ...overrides,
  };
  render(<EngagementBar {...props} />);
  return props;
}

describe("EngagementBar", () => {
  it("exposes accessible labels with counts", () => {
    setup();
    expect(screen.getByRole("button", { name: /Like \(1200\)/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Comment \(40\)/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Share \(12\)/ })).toBeInTheDocument();
  });

  it("reflects liked state via aria-pressed and label", () => {
    setup({ liked: true });
    const like = screen.getByRole("button", { name: /Unlike/ });
    expect(like).toHaveAttribute("aria-pressed", "true");
  });

  it("compacts large counts", () => {
    setup({ likeCount: 12_400 });
    expect(screen.getByText("12.4K")).toBeInTheDocument();
  });

  it("fires intent callbacks on tap", async () => {
    const user = userEvent.setup();
    const props = setup();
    await user.click(screen.getByRole("button", { name: /Like/ }));
    expect(props.onLike).toHaveBeenCalledOnce();
  });
});
