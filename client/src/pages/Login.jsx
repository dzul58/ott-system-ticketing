import Swal from "sweetalert2";
import axios from "axios";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ottLogo from "../assets/ott_logo.png";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
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
      setLoading(true);
      const dataLogin = { username, password };
      let { data } = await axios.post(`http://localhost:3000/login`, dataLogin);
      localStorage.setItem("access_token", data.access_token);

      Swal.fire({
        icon: "success",
        title: "Login Successful",
        text: "Welcome to OTT System Work Order",
        timer: 1500,
        showConfirmButton: false,
      });

      navigate("/");
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Login Failed",
        text: error.response?.data?.error || "Invalid username or password",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <img src={ottLogo} alt="OTT Logo" className="h-16 w-auto" />
        </div>

        <h1 className="text-2xl font-semibold text-blue-600 text-center mb-6">
          OTT System Work Order
        </h1>

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="h-2 bg-blue-600"></div>
          <div className="px-8 py-6">
            <h2 className="text-xl font-medium text-gray-800 mb-6 text-center">
              Sign In
            </h2>

            <form onSubmit={handleLogin}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  placeholder="Enter your username"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  onChange={usernameOnChange}
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  placeholder="Enter your password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  onChange={passwordOnChange}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>
          </div>
        </div>

        <div className="text-center mt-4 text-sm text-gray-600">
          &copy; {new Date().getFullYear()} OTT System Work Order
        </div>
      </div>
    </div>
  );
};

export default Login;
