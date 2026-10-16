import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, Link, Outlet, RouterProvider, useLocation, useNavigate } from "react-router-dom";
import { describe, expect, it } from "vitest";
import BackButton from "@/components/BackButton";
import { NavigationHistoryProvider } from "@/hooks/useNavigationHistory";

const Shell = () => (
  <NavigationHistoryProvider>
    <Outlet />
  </NavigationHistoryProvider>
);

const CourseList = () => {
  const location = useLocation();
  return (
    <>
      <p>Course list{location.state?.restored ? " restored" : ""}</p>
      <Link
        to="/courses/course-1"
        state={{ marketplaceBack: { href: "/courses", label: "Browse courses", previousState: { restored: true } } }}
      >
        Open course
      </Link>
    </>
  );
};

const CourseDetail = () => <BackButton fallback="/courses" label="Browse courses" showHistoryMenu={false} />;

const BrowserBack = () => {
  const navigate = useNavigate();
  return <button onClick={() => navigate(-1)}>Browser back</button>;
};

describe("BackButton", () => {
  it("replaces a contextual detail page so browser back cannot reopen it", async () => {
    const router = createMemoryRouter(
      [
        {
          element: <Shell />,
          children: [
            { path: "/courses", element: <><CourseList /><BrowserBack /></> },
            { path: "/courses/:id", element: <CourseDetail /> },
          ],
        },
      ],
      { initialEntries: ["/courses"] },
    );

    const originalListKey = router.state.location.key;
    render(<RouterProvider router={router} />);
    await act(async () => {
      fireEvent.click(screen.getByRole("link", { name: "Open course" }));
    });
    const backButton = await screen.findByRole("button", { name: "Browse courses" });
    await act(async () => {
      fireEvent.click(backButton);
    });

    expect(await screen.findByText("Course list restored")).toBeInTheDocument();
    expect(router.state.historyAction).toBe("REPLACE");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Browser back" }));
    });
    // Both list entries have the same pathname. Check the key to prove Back
    // reached the original entry rather than asserting before navigation settles.
    await waitFor(() => expect(router.state.location.key).toBe(originalListKey));
    expect(router.state.historyAction).toBe("POP");
    await waitFor(() => expect(router.state.location.pathname).toBe("/courses"));
    expect(screen.queryByRole("button", { name: "Browse courses" })).not.toBeInTheDocument();
  });
});
