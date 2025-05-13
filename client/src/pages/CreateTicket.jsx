import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const CreateTicket = () => {
  const [loading, setLoading] = useState(false);
  const [executors, setExecutors] = useState([]);
  const [formData, setFormData] = useState({
    category: "",
    user_name_executor: "",
    user_email: "",
    activity: "",
    detail_activity: "",
    type: "",
    status: "Open",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showExecutorDropdown, setShowExecutorDropdown] = useState(false);
  const [filteredExecutors, setFilteredExecutors] = useState([]);

  // Tambahkan ref untuk dropdown container
  const dropdownRef = useRef(null);

  const navigate = useNavigate();

  useEffect(() => {
    fetchExecutors();

    // Tambahkan event listener untuk menutup dropdown jika user klik di luar
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowExecutorDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (formData.user_name_executor) {
      const filtered = executors.filter((executor) => {
        const executorNameLower = executor.muse_name.toLowerCase();
        const inputLower = formData.user_name_executor.toLowerCase();

        return executorNameLower.includes(inputLower);
      });
      setFilteredExecutors(filtered);
    } else {
      setFilteredExecutors([]);
    }
  }, [formData.user_name_executor, executors]);

  const fetchExecutors = async () => {
    try {
      const response = await axios.get(
        "https://ott-system-activity-be.gslb.oss.myrepublic.co.id/api/users/noc-ott",
        {
          headers: {
            Authorization: `Bearer ${localStorage.access_token}`,
          },
        }
      );
      setExecutors(response.data.data);
    } catch (error) {
      console.error("Error fetching executors:", error);
      setError("Failed to load ticket data");
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Show dropdown when typing in executor field
    if (name === "user_name_executor") {
      setShowExecutorDropdown(true);
    }

    // Auto-fill user_email when selecting user_name_executor
    if (name === "user_name_executor") {
      const selectedExecutor = executors.find(
        (executor) => executor.muse_name === value
      );
      if (selectedExecutor) {
        setFormData((prev) => ({
          ...prev,
          user_email: selectedExecutor.muse_email,
        }));
      }
    }
  };

  const handleExecutorSelect = (executor) => {
    setFormData((prev) => ({
      ...prev,
      user_name_executor: executor.muse_name,
      user_email: executor.muse_email,
    }));
    setShowExecutorDropdown(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // Validate required fields
      const requiredFields = [
        "category",
        "user_name_executor",
        "user_email",
        "activity",
        "type",
        "status",
      ];
      const missingFields = requiredFields.filter((field) => !formData[field]);

      if (missingFields.length > 0) {
        setError(`Field berikut wajib diisi: ${missingFields.join(", ")}`);
        setLoading(false);
        return;
      }

      const response = await axios.post(
        "https://ott-system-activity-be.gslb.oss.myrepublic.co.id/api/tickets",
        formData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.access_token}`,
          },
        }
      );

      setSuccess("Tiket berhasil dibuat!");
      setLoading(false);

      // Langsung navigasi ke halaman home tanpa delay
      navigate("/");
    } catch (error) {
      console.error("Error creating ticket:", error);
      setError(
        error.response?.data?.message || "Terjadi kesalahan saat membuat tiket"
      );
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">
          Create New Ticket
        </h1>
        <button
          onClick={() => navigate("/")}
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-1"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
              clipRule="evenodd"
            />
          </svg>
          Back
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  name="category"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white appearance-none"
                  value={formData.category}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select Category</option>
                  <option value="Tshoot">Tshoot</option>
                  <option value="Support">Support</option>
                  <option value="Configure">Configure</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                  <svg
                    className="fill-current h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                  </svg>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  name="type"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white appearance-none"
                  value={formData.type}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select Type</option>
                  <option value="OTT">OTT</option>
                  <option value="ZTE">ZTE</option>
                  <option value="SDMC">SDMC</option>
                  <option value="System">System</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                  <svg
                    className="fill-current h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                  </svg>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Executor <span className="text-red-500">*</span>
              </label>
              <div className="relative" ref={dropdownRef}>
                <input
                  type="text"
                  name="user_name_executor"
                  placeholder="Type executor name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={formData.user_name_executor}
                  onChange={handleInputChange}
                  onFocus={() => setShowExecutorDropdown(true)}
                  autoComplete="off"
                  required
                />
                {showExecutorDropdown && filteredExecutors.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                    {filteredExecutors.map((executor) => (
                      <div
                        key={executor.muse_email}
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                        onClick={() => handleExecutorSelect(executor)}
                      >
                        {executor.muse_name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Executor Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="user_email"
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
                value={formData.user_email}
                onChange={handleInputChange}
                readOnly
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Activity <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="activity"
                placeholder="Activity title"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={formData.activity}
                onChange={handleInputChange}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  name="status"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white appearance-none"
                  value={formData.status}
                  onChange={handleInputChange}
                  required
                >
                  <option value="Open">Open</option>
                  <option value="On Progress">On Progress</option>
                  <option value="Closed">Closed</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                  <svg
                    className="fill-current h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Activity Details
              </label>
              <textarea
                name="detail_activity"
                rows="5"
                placeholder="Enter activity details"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={formData.detail_activity}
                onChange={handleInputChange}
              ></textarea>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 mr-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
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
                  Saving...
                </>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-1"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Create Ticket
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default CreateTicket;
