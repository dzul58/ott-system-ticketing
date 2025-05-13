import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";
import loadingGif from "../assets/loading_image.gif";

const AutoLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search.replace(/&amp;/g, "&"));
    const username = params.get("username");
    const password = params.get("password");

    if (username && password) {
      handleAutoLogin(username, password);
    } else {
      navigate("/login");
    }
  }, []);

  const handleAutoLogin = async (username, password) => {
    try {
      const { data } = await axios.get(
        `https://ott-system-activity-be.gslb.oss.myrepublic.co.id/auto-login?username=${encodeURIComponent(
          username
        )}&password=${encodeURIComponent(password)}`
      );
      localStorage.setItem("access_token", data.access_token);

      Swal.fire({
        icon: "success",
        title: "Login Successful",
      });

      navigate("/");
    } catch (error) {
      console.error("Auto-login error:", error);
      Swal.fire({
        icon: "error",
        title: error.response?.data?.error || "Login failed",
        text: `Error details: ${error.message}`,
      });
      navigate("/login");
    }
  };

  return (
    <div className="flex justify-center items-center h-screen">
      <img src={loadingGif} alt="Loading..." className="w-16 h-16" />
    </div>
  );
};

export default AutoLogin;
