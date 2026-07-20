import { createBrowserRouter } from "react-router-dom";
import Login from "@/pages/Login";
import Home from "@/pages/Home";
import TreeManagement from "@/pages/Admin/TreeManagement";
import NotificationSettings from "@/pages/Admin/NotificationSettings";
import UpcomingEvents from "@/pages/UpcomingEvents";
import TreeBySlug from "@/pages/TreeBySlug";
import { RequireRole } from "@/features/auth/RequireRole";

export const router = createBrowserRouter(
  [
    { path: "/dang-nhap", element: <Login /> },
    {
      // No RequireRole here: an unauthenticated guest may view the home page when the
      // default tree has been published (is_public) — Home itself renders a sign-in
      // prompt instead of the tree for guests when it hasn't been.
      path: "/",
      element: <Home />,
    },
    {
      // Same guest-visibility rule as "/" — a public tree's Upcoming Events calendar
      // and lunar dates are visible without signing in (spec FR-021).
      path: "/su-kien-sap-toi",
      element: <UpcomingEvents />,
    },
    {
      // Admin-only tree management (create/delete trees, set default) — FR-020
      path: "/quan-tri/cay-gia-pha",
      element: (
        <RequireRole allow={["admin"]}>
          <TreeManagement />
        </RequireRole>
      ),
    },
    {
      // Admin-only event-reminder settings (template, days-before, recipients) — FR-009–FR-011b
      path: "/quan-tri/thong-bao",
      element: (
        <RequireRole allow={["admin"]}>
          <NotificationSettings />
        </RequireRole>
      ),
    },
    {
      // Same guest-visibility rule as "/su-kien-sap-toi" above, scoped to the
      // slug-named tree instead of the default one (spec FR-001). Declared before the
      // "/:slug" catch-all below so it's unambiguous which route a two-segment URL
      // matches, even though React Router's own ranking already prefers the more
      // specific route regardless of array order.
      path: "/:slug/su-kien-sap-toi",
      element: <UpcomingEvents />,
    },
    {
      // Any non-default tree, reached by its own slug (spec FR-017/FR-018). No
      // RequireRole: TreeBySlug itself decides guest access based on `is_public`,
      // same pattern as "/". React Router ranks static routes above this dynamic
      // segment regardless of array order, so it never shadows the routes above.
      path: "/:slug",
      element: <TreeBySlug />,
    },
  ],
  // Matches Vite's `base` (set to "/<repo-name>/" by the GitHub Pages deploy workflow,
  // "/" otherwise) so client-side routes resolve correctly under a project-pages subpath.
  { basename: import.meta.env.BASE_URL },
);
