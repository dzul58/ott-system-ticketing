import { useNavigate } from "react-router-dom";
import ottLogo from "../assets/ott_logo.png";

const Navbar = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    navigate("/login");
  };

  return (
    <nav className="bg-white shadow-sm px-6 py-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-0 mr-2">
          <img src={ottLogo} alt="OTT Logo" className="h-12 w-auto" />
          <h1 className="text-2xl font-semibold text-blue-600 -ml-1">
            OTT System Work Order
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
