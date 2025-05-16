import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

const Home = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useState({
    user_name_executor: "",
    created_by_name: "",
    category: "",
    activity: "",
    type: "",
    status: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTickets, setTotalTickets] = useState(0);
  const [error, setError] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    fetchTickets();
  }, [currentPage]);

  const fetchTickets = async (params = {}) => {
    try {
      setLoading(true);
      // Membuat query parameters
      const queryParams = new URLSearchParams({
        page: currentPage,
        limit: 6,
        ...params,
      });

      // Filter out empty values
      Object.keys(queryParams).forEach(
        (key) => !queryParams.get(key) && queryParams.delete(key)
      );

      const response = await axios.get(
        `https://ott-system-activity-be.gslb.oss.myrepublic.co.id/api/tickets?${queryParams.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.access_token}`,
          },
        }
      );
      setTickets(response.data.data);
      setTotalPages(response.data.pagination.totalPages);
      setTotalTickets(response.data.pagination.total);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching tickets:", error);
      setLoading(false);
      setError("Failed to load ticket data");
      Swal.fire({
        icon: "error",
        title: "Failed",
        text: "Failed to load ticket data",
      });
    }
  };

  const handleSearch = () => {
    // Filter empty values
    const filteredParams = Object.fromEntries(
      Object.entries(searchParams).filter(([_, value]) => value !== "")
    );

    // Reset to page 1 when searching
    setCurrentPage(1);

    // Call fetchTickets with search parameters
    fetchTickets(filteredParams);
  };

  const handleClear = () => {
    setSearchParams({
      user_name_executor: "",
      created_by_name: "",
      category: "",
      activity: "",
      type: "",
      status: "",
    });

    // Reset to page 1 and fetch all tickets
    setCurrentPage(1);
    fetchTickets();
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSearchParams((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Open":
        return "bg-red-100 text-red-800";
      case "On Progress":
        return "bg-blue-100 text-blue-800";
      case "Closed":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleViewTicket = (id) => {
    navigate(`/detail-ticket/${id}`);
  };

  const handleEditTicket = (id) => {
    navigate(`/edit-ticket/${id}`);
  };

  const checkUserAuthorization = async () => {
    try {
      const response = await axios.get("https://ott-system-activity-be.gslb.oss.myrepublic.co.id/update-access", {
        headers: {
          Authorization: `Bearer ${localStorage.access_token}`,
        },
      });
      return response.data.name;
    } catch (error) {
      console.error("Error checking authorization:", error);
      return null;
    }
  };

  const handleDeleteTicket = async (id, createdBy) => {
    const currentUserName = await checkUserAuthorization();
    if (currentUserName !== createdBy) {
      Swal.fire({
        icon: "error",
        title: "Access Denied",
        text: "You do not have permission to delete this ticket",
      });
      return;
    }

    try {
      const result = await Swal.fire({
        title: "Are you sure?",
        text: "This ticket cannot be recovered!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Yes, delete it!",
        cancelButtonText: "Cancel",
      });

      if (result.isConfirmed) {
        await axios.delete(`https://ott-system-activity-be.gslb.oss.myrepublic.co.id/api/tickets/${id}`, {
          headers: {
            Authorization: `Bearer ${localStorage.access_token}`,
          },
        });

        // Refresh data setelah penghapusan
        fetchTickets();

        Swal.fire({
          icon: "success",
          title: "Success",
          text: "Ticket successfully deleted",
        });
      }
    } catch (error) {
      console.error("Error deleting ticket:", error);
      Swal.fire({
        icon: "error",
        title: "Failed",
        text: "Failed to delete ticket",
      });
    }
  };

  // Format tanggal ke format yang lebih mudah dibaca
  const formatDate = (dateString) => {
    if (!dateString) return "-";

    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;

    // Format tanggal: DD MMM YYYY HH:MM WIB
    const options = {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };

    return date.toLocaleDateString("id-ID", options) + " WIB";
  };

  const handleDownload = async () => {
    try {
      // Membuat query parameters dari state pencarian
      const queryParams = new URLSearchParams();
      Object.entries(searchParams).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });

      const response = await axios.get(
        `https://ott-system-activity-be.gslb.oss.myrepublic.co.id/api/tickets/download?${queryParams.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.access_token}`,
          },
          responseType: "blob",
        }
      );

      // Buat URL untuk file yang didownload
      const url = window.URL.createObjectURL(
        new Blob([response.data], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        })
      );

      // Buat dan klik link download
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "OTT System Report.xlsx");
      document.body.appendChild(link);
      link.click();

      // Cleanup
      link.remove();
      window.URL.revokeObjectURL(url);

      Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: "File berhasil diunduh!",
      });
    } catch (error) {
      console.error("Error downloading file:", error);
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: "Gagal mengunduh file",
      });
    }
  };

  return (
    <>
      {/* Search Filters */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Created By
            </label>
            <input
              type="text"
              name="created_by_name"
              placeholder="Search by creator"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              value={searchParams.created_by_name}
              onChange={handleInputChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <input
              type="text"
              name="category"
              placeholder="Search by category"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              value={searchParams.category}
              onChange={handleInputChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <input
              type="text"
              name="type"
              placeholder="Search by type"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              value={searchParams.type}
              onChange={handleInputChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Activity
            </label>
            <input
              type="text"
              name="activity"
              placeholder="Search by activity"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              value={searchParams.activity}
              onChange={handleInputChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Executor Name
            </label>
            <input
              type="text"
              name="user_name_executor"
              placeholder="Search by executor"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              value={searchParams.user_name_executor}
              onChange={handleInputChange}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              name="status"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              value={searchParams.status}
              onChange={handleInputChange}
            >
              <option value="">All Status</option>
              <option value="Open">Open</option>
              <option value="On Progress">On Progress</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
        </div>

        <div className="flex justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => navigate("/create-ticket")}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center"
            >
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
              Create New Ticket
            </button>

            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-1"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
              Download Excel
            </button>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleClear}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Clear
            </button>
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ticket
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created By
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                Activity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Executor
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Start Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan="9" className="px-6 py-4 text-center">
                  Loading...
                </td>
              </tr>
            ) : tickets.length === 0 ? (
              <tr>
                <td colSpan="9" className="px-6 py-4 text-center">
                  No tickets found
                </td>
              </tr>
            ) : (
              tickets.map((ticket) => (
                <tr key={ticket.ticket_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {ticket.ticket_id}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {ticket.created_by_name || "-"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {ticket.category}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{ticket.type}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div
                      className="text-sm text-gray-900 break-words"
                      title={ticket.activity}
                    >
                      {ticket.activity}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {ticket.user_name_executor || ticket.user_name || "-"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatDate(ticket.start_date)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${getStatusColor(
                          ticket.status
                        )}`}
                      >
                        {ticket.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center justify-center space-x-2">
                      {/* View Icon */}
                      <button
                        onClick={() => handleViewTicket(ticket.ticket_id)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Lihat Detail"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                          <path
                            fillRule="evenodd"
                            d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>

                      {/* Edit Icon */}
                      <button
                        onClick={() => handleEditTicket(ticket.ticket_id)}
                        className="text-yellow-600 hover:text-yellow-900"
                        title="Edit Tiket"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                      </button>

                      {/* Delete Icon */}
                      <button
                        onClick={() =>
                          handleDeleteTicket(
                            ticket.ticket_id,
                            ticket.created_by_name
                          )
                        }
                        className="text-red-600 hover:text-red-900"
                        title="Delete Ticket"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between bg-white px-4 py-3 rounded-lg shadow-sm">
        <div className="flex-1 flex justify-between sm:hidden">
          <button
            onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
              currentPage === 1
                ? "text-gray-400 bg-gray-100"
                : "text-gray-700 bg-white hover:bg-gray-50"
            }`}
          >
            Previous
          </button>
          <button
            onClick={() =>
              handlePageChange(Math.min(totalPages, currentPage + 1))
            }
            disabled={currentPage === totalPages}
            className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
              currentPage === totalPages
                ? "text-gray-400 bg-gray-100"
                : "text-gray-700 bg-white hover:bg-gray-50"
            }`}
          >
            Next
          </button>
        </div>
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Page <span className="font-medium">{currentPage}</span> of{" "}
              <span className="font-medium">{totalPages}</span>
            </p>
          </div>
          <div>
            <nav
              className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
              aria-label="Pagination"
            >
              <button
                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                  currentPage === 1
                    ? "text-gray-300"
                    : "text-gray-500 hover:bg-gray-50"
                }`}
              >
                <span className="sr-only">Previous</span>
                &lt;
              </button>

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={i}
                    onClick={() => handlePageChange(pageNum)}
                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                      currentPage === pageNum
                        ? "z-10 bg-blue-600 border-blue-600 text-white"
                        : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                onClick={() =>
                  handlePageChange(Math.min(totalPages, currentPage + 1))
                }
                disabled={currentPage === totalPages}
                className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                  currentPage === totalPages
                    ? "text-gray-300"
                    : "text-gray-500 hover:bg-gray-50"
                }`}
              >
                <span className="sr-only">Next</span>
                &gt;
              </button>
            </nav>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
