import { createBrowserRouter, redirect } from "react-router-dom";

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
      },
    ],
    loader: aunthBeforeLogin,
  },
]);

export default router;
