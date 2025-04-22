import Swal from "sweetalert2";
import axios from "axios";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  function usernameOnChange(event) {
    setUsername(event.target.value);
  }

  function passwordOnChange(event) {
    setPassword(event.target.value);
  }

  async function handleLogin(e) {
    e.preventDefault();
    try {
      const dataLogin = { username, password };
      let { data } = await axios.post(
        `http://localhost:3000/login`,
        dataLogin
      );
      localStorage.setItem("access_token", data.access_token);
      // console.log(data.access_token);
      Swal.fire({
        icon: "success",
        title: "Success Login",
      });

      navigate("/");
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: error.response.data.error,
      });
    }
  }

  return (
    <div className="relative flex min-h-screen text-gray-800 antialiased flex-col justify-center overflow-hidden bg-gray-50 py-6 sm:py-12">
      <div className="relative py-3 sm:w-96 mx-auto text-center">
        <span className="text-2xl font-light"></span>
        <div className="mt-4 bg-white shadow-md rounded-lg text-left">
          <div className="h-2 bg-purple-400 rounded-t-md"></div>
          <div className="px-8 py-6">
            <form onSubmit={handleLogin}>
              <label className="block font-semibold">Username</label>
              <input
                type="text"
                placeholder="Username"
                className="border w-full pl-1 h-5 px-3 py-5 mt-2 hover:outline-none focus:outline-none focus:ring-indigo-500 focus:ring-1 rounded-md"
                required
                onChange={usernameOnChange}
              />
              <label className="block mt-3 font-semibold">Password</label>
              <input
                type="password"
                placeholder="Password"
                className="border w-full pl-1 h-5 px-3 py-5 mt-2 hover:outline-none focus:outline-none focus:ring-indigo-500 focus:ring-1 rounded-md"
                required
                onChange={passwordOnChange}
              />
              <div className="flex justify-between items-baseline">
                <button
                  type="submit"
                  className="mt-4 bg-purple-500 text-white py-2 px-6 rounded-md hover:bg-purple-600"
                >
                  Login
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
