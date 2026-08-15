import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

    render(<RouterProvider router={router} />);
    fireEvent.click(screen.getByRole("link", { name: "Open course" }));
    fireEvent.click(await screen.findByRole("button", { name: "Browse courses" }));

    expect(await screen.findByText("Course list restored")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Browser back" }));
    await waitFor(() => expect(router.state.location.pathname).toBe("/courses"));
    expect(screen.queryByRole("button", { name: "Browse courses" })).not.toBeInTheDocument();
  });
});
