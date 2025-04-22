import { createBrowserRouter, redirect } from "react-router-dom";
import Parent from "../pages/Parent";
import Login from "../pages/Login";
import Home from "../pages/Home";

const aunthBeforeLogin = () => {
  const access_token = localStorage.access_token;
  if (!access_token) {
    throw redirect("/login");
  }
  return null;
};

const aunthAfterLogin = () => {
  const access_token = localStorage.access_token;
  if (access_token) {
    throw redirect("/");
  }
  return null;
};

const router = createBrowserRouter([
  // {
  //   path: "/auto-login",
  //   element: <AutoLogin />,
  //   errorElement: <ErrorPage />,
  // },
  {
    path: "/login",
    element: <Login />,
    loader: aunthAfterLogin,
  },
  {
    element: <Parent />,
    children: [
      {
        path: "/",
        element: <Home />,
      },
    ],
    loader: aunthBeforeLogin,
  },
]);

export default router;
