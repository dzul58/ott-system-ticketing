import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import FileViewer from "react-file-viewer";
import { saveAs } from "file-saver";

const DetailTicket = () => {
  const [ticket, setTicket] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newComment, setNewComment] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [editingComment, setEditingComment] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [commentAttachments, setCommentAttachments] = useState({});
  const [selectedFile, setSelectedFile] = useState(null);
  const [showViewer, setShowViewer] = useState(false);
  const [currentUserName, setCurrentUserName] = useState("");
  const navigate = useNavigate();
  const { id } = useParams();

  useEffect(() => {
    // Ambil nama pengguna dari token
    const token = localStorage.getItem("access_token");
    if (token) {
      try {
        // Decode token untuk mendapatkan payload
        const payload = JSON.parse(atob(token.split(".")[1]));
        setCurrentUserName(payload.name);
      } catch (error) {
        console.error("Error decoding token:", error);
      }
    }
    fetchTicket();
  }, [id]);

  useEffect(() => {
    if (comments && comments.length > 0) {
      comments.forEach((comment) => {
        fetchCommentAttachments(comment.comment_id);
      });
    }
  }, [comments]);

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

  // Calculate duration between two dates in days, hours, minutes
  const calculateDuration = (startDate, endDate) => {
    if (!startDate || !endDate) return "-";

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) return "-";

    // Calculate difference in milliseconds
    const diff = end - start;

    // Convert to days, hours, minutes
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    // Format the duration string
    let durationStr = "";
    if (days > 0) durationStr += `${days} day${days > 1 ? "s" : ""} `;
    if (hours > 0 || days > 0)
      durationStr += `${hours} hour${hours > 1 ? "s" : ""} `;
    durationStr += `${minutes} minute${minutes > 1 ? "s" : ""}`;

    return durationStr.trim();
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

  const fetchTicket = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `http://ott-system-activity-be.gslb.oss.myrepublic.co.id/api/tickets/${id}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.access_token}`,
          },
        }
      );

      setTicket(response.data.data.ticket);
      setComments(response.data.data.comments || []);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching ticket:", err);
      setError("Failed to load ticket data");
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 5) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Maximum 5 files can be uploaded",
      });
      return;
    }
    setSelectedFiles(files);
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() && selectedFiles.length === 0) return;

    try {
      setCommentLoading(true);

      // Upload komentar terlebih dahulu
      const commentResponse = await axios.post(
        "http://ott-system-activity-be.gslb.oss.myrepublic.co.id/api/comments",
        {
          ticket_id: id,
          comment: newComment,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.access_token}`,
          },
        }
      );

      const commentId = commentResponse.data.data.comment_id;

      // Upload file-file yang dipilih
      if (selectedFiles.length > 0) {
        setUploadingFiles(true);
        const uploadPromises = selectedFiles.map(async (file) => {
          const formData = new FormData();
          formData.append("file", file);

          await axios.post(
            `http://ott-system-activity-be.gslb.oss.myrepublic.co.id/api/comments/${commentId}/attachments`,
            formData,
            {
              headers: {
                Authorization: `Bearer ${localStorage.access_token}`,
                "Content-Type": "multipart/form-data",
              },
            }
          );
        });

        await Promise.all(uploadPromises);
        setUploadingFiles(false);
      }

      // Refresh komentar setelah menambahkan
      fetchTicket();
      setNewComment("");
      setSelectedFiles([]);
      setCommentLoading(false);
    } catch (err) {
      console.error("Error posting comment:", err);
      Swal.fire({
        icon: "error",
        title: "Failed!",
        text: "Failed to add comment",
      });
      setCommentLoading(false);
      setUploadingFiles(false);
    }
  };

  const checkUserAuthorization = async () => {
    try {
      const response = await axios.get("http://ott-system-activity-be.gslb.oss.myrepublic.co.id/update-access", {
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

  const handleEditComment = async (comment) => {
    const currentUserName = await checkUserAuthorization();
    if (currentUserName !== comment.user_name) {
      Swal.fire({
        icon: "error",
        title: "Access Denied",
        text: "You do not have permission to edit this comment",
      });
      return;
    }
    setEditingComment({
      id: comment.comment_id,
      text: comment.comment,
      user_name: comment.user_name,
    });
  };

  const handleSaveEditedComment = async () => {
    const currentUserName = await checkUserAuthorization();
    if (currentUserName !== editingComment.user_name) {
      Swal.fire({
        icon: "error",
        title: "Access Denied",
        text: "You do not have permission to edit this comment",
      });
      return;
    }

    try {
      const response = await axios.put(
        `http://ott-system-activity-be.gslb.oss.myrepublic.co.id/api/comments/${editingComment.id}`,
        {
          comment: editingComment.text,
          user_name: currentUserName,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.access_token}`,
          },
        }
      );

      // Refresh komentar setelah mengedit
      fetchTicket();
      setEditingComment(null);
    } catch (err) {
      console.error("Error editing comment:", err);
      Swal.fire({
        icon: "error",
        title: "Failed!",
        text: "Failed to update comment",
      });
    }
  };

  const handleDeleteComment = async (commentId, userName) => {
    const currentUserName = await checkUserAuthorization();
    if (currentUserName !== userName) {
      Swal.fire({
        icon: "error",
        title: "Access Denied",
        text: "You do not have permission to delete this comment",
      });
      return;
    }

    try {
      const result = await Swal.fire({
        title: "Are you sure?",
        text: "This comment cannot be recovered!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Yes, delete it!",
        cancelButtonText: "Cancel",
      });

      if (result.isConfirmed) {
        await axios.delete(`http://ott-system-activity-be.gslb.oss.myrepublic.co.id/api/comments/${commentId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.access_token}`,
          },
          data: {
            user_name: currentUserName,
          },
        });

        // Refresh komentar setelah menghapus
        fetchTicket();
        Swal.fire("Deleted!", "Comment has been deleted.", "success");
      }
    } catch (err) {
      console.error("Error deleting comment:", err);
      Swal.fire({
        icon: "error",
        title: "Failed!",
        text: "Failed to delete comment",
      });
    }
  };

  const fetchCommentAttachments = async (commentId) => {
    try {
      const response = await axios.get(
        `http://ott-system-activity-be.gslb.oss.myrepublic.co.id/api/comments/${commentId}/attachments`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.access_token}`,
          },
        }
      );
      setCommentAttachments((prev) => ({
        ...prev,
        [commentId]: response.data.data,
      }));
    } catch (error) {
      console.error("Error fetching attachments:", error);
    }
  };

  const handleOpenAttachment = (fileLink, fileName, fileType) => {
    // Buka file di tab baru
    window.open(fileLink, "_blank");
  };

  const handleCloseViewer = () => {
    setShowViewer(false);
    setSelectedFile(null);
  };

  const handleDownload = () => {
    if (selectedFile) {
      saveAs(selectedFile.url, selectedFile.name);
    }
  };

  const getFileIcon = (fileType) => {
    if (fileType.startsWith("image/")) {
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
            clipRule="evenodd"
          />
        </svg>
      );
    } else if (fileType.startsWith("video/")) {
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
        </svg>
      );
    } else if (fileType.includes("pdf")) {
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
            clipRule="evenodd"
          />
          <path d="M8 7h4v2H8V7z" />
        </svg>
      );
    } else if (fileType.includes("word") || fileType.includes("document")) {
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
            clipRule="evenodd"
          />
          <path d="M8 11h4v1H8v-1zm0-3h8v1H8V8z" />
        </svg>
      );
    } else if (fileType.includes("sheet") || fileType.includes("excel")) {
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
            clipRule="evenodd"
          />
          <path d="M8 8h1v1H8V8zm2 0h1v1h-1V8zm2 0h1v1h-1V8z" />
        </svg>
      );
    } else {
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
            clipRule="evenodd"
          />
        </svg>
      );
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
        {error}
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
        Ticket not found
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Ticket Details</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => navigate(`/edit-ticket/${id}`)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-1"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
            Update Ticket
          </button>
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
      </div>

      {/* Ticket Details Card */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-lg font-medium text-gray-800 mb-4">
              Ticket Information
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Created By</p>
                <p className="font-medium">{ticket.created_by_name || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Creator Email</p>
                <p className="font-medium">{ticket.created_by_email || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Category</p>
                <p className="font-medium">{ticket.category}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Type</p>
                <p className="font-medium">{ticket.type}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Start Date</p>
                <p className="font-medium">{formatDate(ticket.start_date)}</p>
              </div>
            </div>
          </div>

          <div>
            <div className="space-y-3 mt-11">
              <div>
                <p className="text-sm text-gray-500">Executor</p>
                <p className="font-medium">
                  {ticket.user_name_executor || "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Executor Email</p>
                <p className="font-medium">{ticket.user_email || "-"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <div className="flex items-center mt-1">
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${getStatusColor(
                      ticket.status
                    )}`}
                  >
                    {ticket.status}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500">End Date</p>
                <p className="font-medium">
                  {ticket.end_date && ticket.status === "Closed"
                    ? formatDate(ticket.end_date)
                    : "-"}
                </p>
              </div>
              {ticket.end_date && ticket.status === "Closed" && (
                <div>
                  <p className="text-sm text-gray-500">Duration</p>
                  <p className="font-medium">
                    {calculateDuration(ticket.start_date, ticket.end_date)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-md font-medium text-gray-800 mb-2">
            Activity Title
          </h3>
          <p className="text-gray-700 font-medium">{ticket.activity}</p>
        </div>

        <div className="mt-4">
          <h3 className="text-md font-medium text-gray-800 mb-2">
            Activity Description
          </h3>
          <div className="bg-gray-50 p-4 rounded-md">
            <p className="text-gray-700 whitespace-pre-line">
              {ticket.detail_activity || "No activity details available"}
            </p>
          </div>
        </div>
      </div>

      {/* Comments Section */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Comments</h2>

        {/* New Comment Form */}
        <form onSubmit={handleSubmitComment} className="mb-8">
          <textarea
            className="w-full px-3 py-2 border border-gray-300 rounded-md mb-2"
            rows="3"
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
          ></textarea>

          {/* File Upload Section */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Files (Max 5 files)
            </label>
            <input
              type="file"
              multiple
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
            />
            {selectedFiles.length > 0 && (
              <div className="mt-2">
                <p className="text-sm text-gray-600">Selected files:</p>
                <ul className="list-disc list-inside text-sm text-gray-600">
                  {selectedFiles.map((file, index) => (
                    <li key={index}>{file.name}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={
              commentLoading ||
              uploadingFiles ||
              (!newComment.trim() && selectedFiles.length === 0)
            }
            className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center ${
              !newComment.trim() &&
              selectedFiles.length === 0 &&
              "opacity-50 cursor-not-allowed"
            }`}
          >
            {commentLoading || uploadingFiles ? (
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
                {uploadingFiles ? "Uploading files..." : "Sending..."}
              </>
            ) : (
              "Submit Comment"
            )}
          </button>
        </form>

        {/* Comments List */}
        {comments.length === 0 ? (
          <div className="text-gray-500 text-center py-4">No comments yet</div>
        ) : (
          <div className="space-y-6">
            {comments.map((comment) => (
              <div
                key={comment.comment_id}
                className="bg-gray-50 p-4 rounded-md"
              >
                {editingComment && editingComment.id === comment.comment_id ? (
                  <div className="mb-4">
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 rounded-md mb-2"
                      rows="3"
                      value={editingComment.text}
                      onChange={(e) =>
                        setEditingComment({
                          ...editingComment,
                          text: e.target.value,
                        })
                      }
                    ></textarea>
                    <div className="flex space-x-2">
                      <button
                        onClick={handleSaveEditedComment}
                        className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingComment(null)}
                        className="px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium">{comment.user_name}</p>
                        <p className="text-xs text-gray-500">
                          {formatDate(comment.created_at)}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditComment(comment)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Edit Comment"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                        </button>
                        <button
                          onClick={() =>
                            handleDeleteComment(
                              comment.comment_id,
                              comment.user_name
                            )
                          }
                          className="text-red-600 hover:text-red-800"
                          title="Delete Comment"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
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
                    </div>
                    <p className="text-gray-700 whitespace-pre-line mb-2">
                      {comment.comment}
                    </p>

                    {/* Attachments Section */}
                    {commentAttachments[comment.comment_id] &&
                      commentAttachments[comment.comment_id].length > 0 && (
                        <div className="mt-3">
                          <p className="text-sm text-gray-500 mb-2">
                            Attachments:
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {commentAttachments[comment.comment_id].map(
                              (attachment) => (
                                <div
                                  key={attachment.attachment_id}
                                  onClick={() =>
                                    handleOpenAttachment(
                                      attachment.file_link,
                                      attachment.file_name,
                                      attachment.file_type
                                    )
                                  }
                                  className="flex items-center p-2 bg-white rounded-md border border-gray-200 hover:border-blue-500 cursor-pointer transition-colors"
                                >
                                  <div className="mr-3 text-blue-500">
                                    {getFileIcon(attachment.file_type)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                      {attachment.file_name}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {formatFileSize(attachment.file_size)}
                                    </p>
                                  </div>
                                  <div className="ml-2 text-gray-400">
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      className="h-5 w-5"
                                      viewBox="0 0 20 20"
                                      fill="currentColor"
                                    >
                                      <path
                                        fillRule="evenodd"
                                        d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default DetailTicket;
