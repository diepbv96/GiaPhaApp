import { createBrowserRouter } from "react-router-dom";
import Login from "@/pages/Login";
import Home from "@/pages/Home";
import TreeManagement from "@/pages/Admin/TreeManagement";
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
      // Admin-only tree management (create/delete trees, set default) — FR-020
      path: "/quan-tri/cay-gia-pha",
      element: (
        <RequireRole allow={["admin"]}>
          <TreeManagement />
        </RequireRole>
      ),
    },
  ],
  // Matches Vite's `base` (set to "/<repo-name>/" by the GitHub Pages deploy workflow,
  // "/" otherwise) so client-side routes resolve correctly under a project-pages subpath.
  { basename: import.meta.env.BASE_URL },
);
