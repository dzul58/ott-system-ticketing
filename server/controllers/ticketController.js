const poolNisa = require("../config/config");
const { upload, handleMulterError } = require("../middlewares/multer");
const UploadController = require("./uploadController");
const XLSX = require("xlsx");

class TicketController {
  // Get all tickets with search and pagination
  static async getAllTickets(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        category,
        user_name_executor,
        activity,
        type,
        status,
        created_by_name,
      } = req.query;

      const offset = (page - 1) * limit;

      // Build where clause for search
      let whereClause = "";
      const params = [];
      let paramCount = 1;

      if (
        category ||
        user_name_executor ||
        activity ||
        type ||
        status ||
        created_by_name
      ) {
        whereClause = "WHERE ";

        if (category) {
          whereClause += `category ILIKE $${paramCount++} `;
          params.push(`%${category}%`);
        }

        if (user_name_executor) {
          if (params.length > 0) whereClause += "AND ";
          whereClause += `user_name_executor ILIKE $${paramCount++} `;
          params.push(`%${user_name_executor}%`);
        }

        if (activity) {
          if (params.length > 0) whereClause += "AND ";
          whereClause += `activity ILIKE $${paramCount++} `;
          params.push(`%${activity}%`);
        }

        if (type) {
          if (params.length > 0) whereClause += "AND ";
          whereClause += `type ILIKE $${paramCount++} `;
          params.push(`%${type}%`);
        }

        if (status) {
          if (params.length > 0) whereClause += "AND ";
          whereClause += `status ILIKE $${paramCount++} `;
          params.push(`%${status}%`);
        }

        if (created_by_name) {
          if (params.length > 0) whereClause += "AND ";
          whereClause += `created_by_name ILIKE $${paramCount++} `;
          params.push(`%${created_by_name}%`);
        }
      }

      // Count total tickets for pagination
      const countQuery = `SELECT COUNT(*) FROM ott_system_tickets_activity ${whereClause}`;
      const countResult = await poolNisa.query(countQuery, params);
      const totalTickets = parseInt(countResult.rows[0].count);

      // Query tickets with pagination
      const query = `
        SELECT * FROM ott_system_tickets_activity 
        ${whereClause} 
        ORDER BY 
          CASE 
            WHEN status = 'Open' THEN 1
            WHEN status = 'On Progress' THEN 2
            WHEN status = 'Closed' THEN 3
            ELSE 4
          END,
          ticket_id DESC
        LIMIT $${paramCount++} OFFSET $${paramCount}
      `;

      const queryParams = [...params, limit, offset];
      const result = await poolNisa.query(query, queryParams);

      return res.status(200).json({
        status: "success",
        data: result.rows,
        pagination: {
          total: totalTickets,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(totalTickets / limit),
        },
      });
    } catch (error) {
      console.error("Error getting tickets:", error);
      return res.status(500).json({
        status: "error",
        message: "Terjadi kesalahan saat mengambil data tiket",
      });
    }
  }

  // Get ticket by ID With Comments
  static async getTicketByIdWithComments(req, res) {
    try {
      const { id } = req.params;

      // Query to get both ticket and comments in one database call
      const query = `
        SELECT 
          t.*,
          c.comment_id,
          c.user_name AS comment_user_name,
          c.user_email AS comment_user_email,
          c.comment,
          c.created_at AS comment_created_at
        FROM 
          ott_system_tickets_activity t
        LEFT JOIN 
          ott_system_ticket_comments_activity c ON t.ticket_id = c.ticket_id
        WHERE 
          t.ticket_id = $1
        ORDER BY 
          c.created_at DESC
      `;

      const result = await poolNisa.query(query, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          status: "error",
          message: "Tiket tidak ditemukan",
        });
      }

      // Format the response data
      const ticket = {
        ticket_id: result.rows[0].ticket_id,
        category: result.rows[0].category,
        start_date: result.rows[0].start_date,
        end_date: result.rows[0].end_date,
        created_by_name: result.rows[0].created_by_name,
        created_by_email: result.rows[0].created_by_email,
        user_name: result.rows[0].user_name,
        user_name_executor: result.rows[0].user_name_executor,
        user_email: result.rows[0].user_email,
        activity: result.rows[0].activity,
        detail_activity: result.rows[0].detail_activity,
        type: result.rows[0].type,
        status: result.rows[0].status,
      };

      // Prepare comments array
      const comments = result.rows[0].comment_id
        ? result.rows.map((row) => ({
            comment_id: row.comment_id,
            ticket_id: row.ticket_id,
            user_name: row.comment_user_name,
            user_email: row.comment_user_email,
            comment: row.comment,
            created_at: row.comment_created_at,
          }))
        : [];

      return res.status(200).json({
        status: "success",
        data: {
          ticket,
          comments,
        },
      });
    } catch (error) {
      console.error("Error getting ticket by ID:", error);
      return res.status(500).json({
        status: "error",
        message: "Terjadi kesalahan saat mengambil data tiket",
      });
    }
  }

  // Get ticket by ID
  static async getTicketById(req, res) {
    try {
      const { id } = req.params;

      // Query untuk hanya mendapatkan data ticket tanpa comments
      const query = `
          SELECT * FROM ott_system_tickets_activity
          WHERE ticket_id = $1
        `;

      const result = await poolNisa.query(query, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          status: "error",
          message: "Tiket tidak ditemukan",
        });
      }

      return res.status(200).json({
        status: "success",
        data: result.rows[0],
      });
    } catch (error) {
      console.error("Error getting ticket by ID:", error);
      return res.status(500).json({
        status: "error",
        message: "Terjadi kesalahan saat mengambil data tiket",
      });
    }
  }

  // Create new ticket
  static async createTicket(req, res) {
    try {
      const { name, email } = req.userAccount;
      const {
        category,
        user_name_executor,
        user_email,
        activity,
        detail_activity,
        type,
        status,
        end_date,
      } = req.body;

      let finalEndDate = end_date;

      // If status is "Closed", set end_date to current time in Jakarta timezone
      if (status === "Closed") {
        const jakartaTimeQuery =
          "SELECT NOW() AT TIME ZONE 'Asia/Jakarta' as current_time";
        const timeResult = await poolNisa.query(jakartaTimeQuery);
        finalEndDate = timeResult.rows[0].current_time;
      }

      // Get current date in Jakarta timezone for ticket_id
      const dateQuery =
        "SELECT NOW() AT TIME ZONE 'Asia/Jakarta' as current_date";
      const dateResult = await poolNisa.query(dateQuery);
      const currentDate = new Date(dateResult.rows[0].current_date);

      // Format date components for ticket_id
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, "0");
      const day = String(currentDate.getDate()).padStart(2, "0");
      const dateString = `${year}${month}${day}`;

      // Get the last ticket number for today
      const lastTicketQuery = `
        SELECT ticket_id 
        FROM ott_system_tickets_activity 
        WHERE ticket_id LIKE $1 
        ORDER BY ticket_id DESC 
        LIMIT 1
      `;
      const lastTicketResult = await poolNisa.query(lastTicketQuery, [
        `TA${dateString}%`,
      ]);

      // Generate new ticket number (2 digits)
      let sequenceNumber = "01";
      if (lastTicketResult.rows.length > 0) {
        const lastSequence = parseInt(
          lastTicketResult.rows[0].ticket_id.slice(-2)
        );
        if (lastSequence >= 99) {
          throw new Error(
            "Maksimum nomor urut tiket untuk hari ini telah tercapai"
          );
        }
        sequenceNumber = String(lastSequence + 1).padStart(2, "0");
      }

      // Create final ticket_id
      const ticket_id = `TA${dateString}${sequenceNumber}`;

      const query = `
        INSERT INTO ott_system_tickets_activity 
        (ticket_id, created_by_name, created_by_email, category, user_name_executor, user_email, activity, detail_activity, type, status, end_date) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
        RETURNING *
      `;

      const values = [
        ticket_id,
        name,
        email,
        category,
        user_name_executor,
        user_email,
        activity,
        detail_activity,
        type,
        status,
        finalEndDate,
      ];

      const result = await poolNisa.query(query, values);

      return res.status(201).json({
        status: "success",
        message: "Tiket berhasil dibuat",
        data: result.rows[0],
      });
    } catch (error) {
      console.error("Error creating ticket:", error);
      return res.status(500).json({
        status: "error",
        message: error.message || "Terjadi kesalahan saat membuat tiket baru",
      });
    }
  }

  // Edit ticket
  static async editTicket(req, res) {
    try {
      const { id } = req.params;
      const {
        category,
        user_name_executor,
        user_email,
        activity,
        detail_activity,
        type,
        status,
        start_date,
        end_date,
      } = req.body;

      // Check if ticket exists
      const checkQuery =
        "SELECT * FROM ott_system_tickets_activity WHERE ticket_id = $1";
      const checkResult = await poolNisa.query(checkQuery, [id]);

      if (checkResult.rows.length === 0) {
        return res.status(404).json({
          status: "error",
          message: "Tiket tidak ditemukan",
        });
      }

      let finalEndDate = end_date;

      // If status is being updated to "Closed", set end_date to current time in Jakarta timezone
      if (status === "Closed") {
        const jakartaTimeQuery =
          "SELECT NOW() AT TIME ZONE 'Asia/Jakarta' as current_time";
        const timeResult = await poolNisa.query(jakartaTimeQuery);
        finalEndDate = timeResult.rows[0].current_time;
      }

      const query = `
        UPDATE ott_system_tickets_activity 
        SET 
          category = COALESCE($1, category),
          user_name_executor = COALESCE($2, user_name_executor),
          user_email = COALESCE($3, user_email),
          activity = COALESCE($4, activity),
          detail_activity = COALESCE($5, detail_activity),
          type = COALESCE($6, type),
          status = COALESCE($7, status),
          start_date = COALESCE($8, start_date),
          end_date = CASE 
                        WHEN $7 = 'Closed' THEN $9
                        ELSE COALESCE($9, end_date)
                     END
        WHERE ticket_id = $10
        RETURNING *
      `;

      const values = [
        category,
        user_name_executor,
        user_email,
        activity,
        detail_activity,
        type,
        status,
        start_date,
        finalEndDate,
        id,
      ];

      const result = await poolNisa.query(query, values);

      return res.status(200).json({
        status: "success",
        message: "Tiket berhasil diperbarui",
        data: result.rows[0],
      });
    } catch (error) {
      console.error("Error updating ticket:", error);
      return res.status(500).json({
        status: "error",
        message: "Terjadi kesalahan saat memperbarui tiket",
      });
    }
  }

  // Update ticket
  static async updateTicket(req, res) {
    try {
      const { id } = req.params;
      const { name, email } = req.userAccount;
      const {
        category,
        activity,
        detail_activity,
        type,
        status,
        start_date,
        end_date,
      } = req.body;

      // Check if ticket exists
      const checkQuery =
        "SELECT * FROM ott_system_tickets_activity WHERE ticket_id = $1";
      const checkResult = await poolNisa.query(checkQuery, [id]);

      if (checkResult.rows.length === 0) {
        return res.status(404).json({
          status: "error",
          message: "Tiket tidak ditemukan",
        });
      }

      let finalEndDate = end_date;

      // If status is being updated to "Closed", set end_date to current time in Jakarta timezone
      if (status === "Closed") {
        const jakartaTimeQuery =
          "SELECT NOW() AT TIME ZONE 'Asia/Jakarta' as current_time";
        const timeResult = await poolNisa.query(jakartaTimeQuery);
        finalEndDate = timeResult.rows[0].current_time;
      }

      const query = `
        UPDATE ott_system_tickets_activity 
        SET 
          category = COALESCE($1, category),
          user_name_executor = COALESCE($2, user_name_executor),
          user_email = COALESCE($3, user_email),
          activity = COALESCE($4, activity),
          detail_activity = COALESCE($5, detail_activity),
          type = COALESCE($6, type),
          status = COALESCE($7, status),
          start_date = COALESCE($8, start_date),
          end_date = CASE 
                        WHEN $7 = 'Closed' THEN $9
                        ELSE COALESCE($9, end_date)
                     END
        WHERE ticket_id = $10
        RETURNING *
      `;

      const values = [
        category,
        name,
        email,
        activity,
        detail_activity,
        type,
        status,
        start_date,
        finalEndDate,
        id,
      ];

      const result = await poolNisa.query(query, values);

      return res.status(200).json({
        status: "success",
        message: "Tiket berhasil diperbarui",
        data: result.rows[0],
      });
    } catch (error) {
      console.error("Error updating ticket:", error);
      return res.status(500).json({
        status: "error",
        message: "Terjadi kesalahan saat memperbarui tiket",
      });
    }
  }

  // Delete ticket
  static async deleteTicket(req, res) {
    try {
      const { id } = req.params;

      // Check if ticket exists
      const checkQuery =
        "SELECT * FROM ott_system_tickets_activity WHERE ticket_id = $1";
      const checkResult = await poolNisa.query(checkQuery, [id]);

      if (checkResult.rows.length === 0) {
        return res.status(404).json({
          status: "error",
          message: "Tiket tidak ditemukan",
        });
      }

      // Mulai transaksi
      await poolNisa.query("BEGIN");

      try {
        // Hapus semua attachment yang terkait dengan komentar tiket ini
        const deleteAttachmentsQuery = `
          DELETE FROM ott_system_comment_attachments 
          WHERE comment_id IN (
            SELECT comment_id 
            FROM ott_system_ticket_comments_activity 
            WHERE ticket_id = $1
          )
          RETURNING *
        `;
        await poolNisa.query(deleteAttachmentsQuery, [id]);

        // Hapus semua komentar yang terkait dengan tiket
        const deleteCommentsQuery = `
          DELETE FROM ott_system_ticket_comments_activity 
          WHERE ticket_id = $1
          RETURNING *
        `;
        await poolNisa.query(deleteCommentsQuery, [id]);

        // Hapus tiket
        const deleteTicketQuery = `
          DELETE FROM ott_system_tickets_activity 
          WHERE ticket_id = $1 
          RETURNING *
        `;
        const result = await poolNisa.query(deleteTicketQuery, [id]);

        // Commit transaksi
        await poolNisa.query("COMMIT");

        return res.status(200).json({
          status: "success",
          message: "Tiket dan semua data terkait berhasil dihapus",
          data: result.rows[0],
        });
      } catch (error) {
        // Rollback transaksi jika terjadi error
        await poolNisa.query("ROLLBACK");
        throw error;
      }
    } catch (error) {
      console.error("Error deleting ticket:", error);
      return res.status(500).json({
        status: "error",
        message: "Terjadi kesalahan saat menghapus tiket",
      });
    }
  }

  // Add comment to ticket
  static async addComment(req, res) {
    try {
      const { name, email } = req.userAccount;
      const { ticket_id, comment } = req.body;

      if (!ticket_id || !comment) {
        return res.status(400).json({
          status: "error",
          message: "Ticket ID dan comment diperlukan",
        });
      }

      // Check if ticket exists
      const checkQuery =
        "SELECT * FROM ott_system_tickets_activity WHERE ticket_id = $1";
      const checkResult = await poolNisa.query(checkQuery, [ticket_id]);

      if (checkResult.rows.length === 0) {
        return res.status(404).json({
          status: "error",
          message: "Tiket tidak ditemukan",
        });
      }

      const query = `
        INSERT INTO ott_system_ticket_comments_activity 
        (ticket_id, comment, user_name, user_email) 
        VALUES ($1, $2, $3, $4) 
        RETURNING *
      `;

      const result = await poolNisa.query(query, [
        ticket_id,
        comment,
        name,
        email,
      ]);

      return res.status(201).json({
        status: "success",
        message: "Komentar berhasil ditambahkan",
        data: result.rows[0],
      });
    } catch (error) {
      console.error("Error adding comment:", error);
      return res.status(500).json({
        status: "error",
        message: "Terjadi kesalahan saat menambahkan komentar",
      });
    }
  }

  // Get comments for a ticket
  static async getComments(req, res) {
    try {
      const { id } = req.params;

      const query =
        "SELECT * FROM ott_system_ticket_comments_activity WHERE ticket_id = $1 ORDER BY created_at DESC";
      const result = await poolNisa.query(query, [id]);

      return res.status(200).json({
        status: "success",
        data: result.rows,
      });
    } catch (error) {
      console.error("Error getting comments:", error);
      return res.status(500).json({
        status: "error",
        message: "Terjadi kesalahan saat mengambil komentar",
      });
    }
  }

  // Update comment
  static async updateComment(req, res) {
    try {
      const { comment_id } = req.params;
      const { comment, user_name } = req.body;

      if (!comment_id || !comment || !user_name) {
        return res.status(400).json({
          status: "error",
          message: "Comment ID, comment, dan user_name diperlukan",
        });
      }

      // Check if comment exists and verify user_name
      const checkQuery =
        "SELECT * FROM ott_system_ticket_comments_activity WHERE comment_id = $1";
      const checkResult = await poolNisa.query(checkQuery, [comment_id]);

      if (checkResult.rows.length === 0) {
        return res.status(404).json({
          status: "error",
          message: "Komentar tidak ditemukan",
        });
      }

      // Verify user_name matches
      if (checkResult.rows[0].user_name !== user_name) {
        return res.status(403).json({
          status: "error",
          message: "Anda tidak memiliki izin untuk mengubah komentar ini",
        });
      }

      // Update only the comment field
      const query = `
        UPDATE ott_system_ticket_comments_activity 
        SET 
          comment = $1,
          created_at = NOW() AT TIME ZONE 'Asia/Jakarta'
        WHERE comment_id = $2
        RETURNING *
      `;

      const result = await poolNisa.query(query, [comment, comment_id]);

      return res.status(200).json({
        status: "success",
        message: "Komentar berhasil diperbarui",
        data: result.rows[0],
      });
    } catch (error) {
      console.error("Error updating comment:", error);
      return res.status(500).json({
        status: "error",
        message: "Terjadi kesalahan saat memperbarui komentar",
      });
    }
  }

  // Delete comment
  static async deleteComment(req, res) {
    try {
      const { comment_id } = req.params;
      const { user_name } = req.body;

      if (!comment_id || !user_name) {
        return res.status(400).json({
          status: "error",
          message: "Comment ID dan user_name diperlukan",
        });
      }

      // Check if comment exists and verify user_name
      const checkQuery =
        "SELECT * FROM ott_system_ticket_comments_activity WHERE comment_id = $1";
      const checkResult = await poolNisa.query(checkQuery, [comment_id]);

      if (checkResult.rows.length === 0) {
        return res.status(404).json({
          status: "error",
          message: "Komentar tidak ditemukan",
        });
      }

      // Verify user_name matches
      if (checkResult.rows[0].user_name !== user_name) {
        return res.status(403).json({
          status: "error",
          message: "Anda tidak memiliki izin untuk menghapus komentar ini",
        });
      }

      // Mulai transaksi
      await poolNisa.query("BEGIN");

      try {
        // Hapus semua attachment yang terkait dengan komentar
        const deleteAttachmentsQuery = `
          DELETE FROM ott_system_comment_attachments 
          WHERE comment_id = $1
          RETURNING *
        `;
        await poolNisa.query(deleteAttachmentsQuery, [comment_id]);

        // Hapus komentar
        const deleteCommentQuery = `
          DELETE FROM ott_system_ticket_comments_activity 
          WHERE comment_id = $1 
          RETURNING *
        `;
        const result = await poolNisa.query(deleteCommentQuery, [comment_id]);

        // Commit transaksi
        await poolNisa.query("COMMIT");

        return res.status(200).json({
          status: "success",
          message: "Komentar dan lampirannya berhasil dihapus",
          data: result.rows[0],
        });
      } catch (error) {
        // Rollback transaksi jika terjadi error
        await poolNisa.query("ROLLBACK");
        throw error;
      }
    } catch (error) {
      console.error("Error deleting comment:", error);
      return res.status(500).json({
        status: "error",
        message: "Terjadi kesalahan saat menghapus komentar",
      });
    }
  }

  // Get NOC OTT & System Full users
  static async getNocOttUsers(req, res) {
    try {
      const query = `
SELECT
    u.muse_name,
    u.muse_email
FROM
    mst_user u
JOIN
    mst_user_group g ON u.muse_code = g.mugr_muse_code
JOIN
    mst_user_profile p ON g.mugr_mupf_code = p.mupf_code
WHERE
    p.mupf_name LIKE '%NOC OTT &amp; System Full%'
    
   ORDER BY
            u.muse_name asc;
      `;

      const result = await poolNisa.query(query);

      return res.status(200).json({
        status: "success",
        data: result.rows,
      });
    } catch (error) {
      console.error("Error getting NOC OTT users:", error);
      return res.status(500).json({
        status: "error",
        message: "Terjadi kesalahan saat mengambil data user NOC OTT & System",
      });
    }
  }

  static async uploadCommentAttachment(req, res) {
    try {
      const { comment_id } = req.params;
      const uploadedFile = req.file;

      if (!uploadedFile) {
        return res.status(400).json({
          status: "error",
          message: "Tidak ada file yang diunggah",
        });
      }

      // Tentukan fungsi upload berdasarkan tipe file
      let uploadResult;
      if (
        uploadedFile.mimetype.startsWith("image/") ||
        uploadedFile.mimetype.startsWith("video/")
      ) {
        uploadResult = await UploadController.uploadMediaFile(req, res);
      } else {
        uploadResult = await UploadController.uploadDocumentFile(req, res);
      }

      if (!uploadResult || !uploadResult.imageUrl) {
        throw new Error("Gagal mendapatkan URL file yang diunggah");
      }

      // Simpan informasi file ke database
      const query = `
        INSERT INTO ott_system_comment_attachments 
        (comment_id, file_name, file_link, file_type, file_size)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;

      const values = [
        comment_id,
        uploadedFile.originalname,
        uploadResult.imageUrl,
        uploadedFile.mimetype,
        uploadedFile.size,
      ];

      const result = await poolNisa.query(query, values);

      return res.status(201).json({
        status: "success",
        data: result.rows[0],
      });
    } catch (error) {
      console.error("Error uploading comment attachment:", error);
      return res.status(500).json({
        status: "error",
        message: error.message || "Gagal mengunggah file",
      });
    }
  }

  static async getCommentAttachments(req, res) {
    try {
      const { comment_id } = req.params;

      const query = `
        SELECT * FROM ott_system_comment_attachments
        WHERE comment_id = $1
        ORDER BY uploaded_at DESC
      `;

      const result = await poolNisa.query(query, [comment_id]);

      res.status(200).json({
        status: "success",
        data: result.rows,
      });
    } catch (error) {
      console.error("Error getting comment attachments:", error);
      res.status(500).json({
        status: "error",
        message: "Gagal mendapatkan attachment komentar",
      });
    }
  }

  // Download tickets
  static async downloadTickets(req, res) {
    try {
      const {
        category,
        user_name_executor,
        activity,
        type,
        status,
        created_by_name,
      } = req.query;

      // Build where clause for search
      let whereClause = "";
      const params = [];
      let paramCount = 1;

      if (
        category ||
        user_name_executor ||
        activity ||
        type ||
        status ||
        created_by_name
      ) {
        whereClause = "WHERE ";

        if (category) {
          whereClause += `category ILIKE $${paramCount++} `;
          params.push(`%${category}%`);
        }

        if (user_name_executor) {
          if (params.length > 0) whereClause += "AND ";
          whereClause += `user_name_executor ILIKE $${paramCount++} `;
          params.push(`%${user_name_executor}%`);
        }

        if (activity) {
          if (params.length > 0) whereClause += "AND ";
          whereClause += `activity ILIKE $${paramCount++} `;
          params.push(`%${activity}%`);
        }

        if (type) {
          if (params.length > 0) whereClause += "AND ";
          whereClause += `type ILIKE $${paramCount++} `;
          params.push(`%${type}%`);
        }

        if (status) {
          if (params.length > 0) whereClause += "AND ";
          whereClause += `status ILIKE $${paramCount++} `;
          params.push(`%${status}%`);
        }

        if (created_by_name) {
          if (params.length > 0) whereClause += "AND ";
          whereClause += `created_by_name ILIKE $${paramCount++} `;
          params.push(`%${created_by_name}%`);
        }
      }

      // Query untuk mendapatkan semua tiket sesuai filter
      const query = `
        SELECT 
          ticket_id,
          created_by_name,
          created_by_email,
          category,
          user_name_executor,
          user_email,
          activity,
          detail_activity,
          type,
          status,
          start_date AT TIME ZONE 'Asia/Jakarta' as start_date,
          end_date AT TIME ZONE 'Asia/Jakarta' as end_date
        FROM ott_system_tickets_activity 
        ${whereClause} 
        ORDER BY ticket_id DESC
      `;

      const result = await poolNisa.query(query, params);

      // Format data untuk Excel
      const formattedData = result.rows.map((ticket) => ({
        "Ticket ID": ticket.ticket_id,
        "Created By": ticket.created_by_name,
        Category: ticket.category,
        Executor: ticket.user_name_executor,
        Activity: ticket.activity,
        "Detail Activity": ticket.detail_activity,
        Type: ticket.type,
        Status: ticket.status,
        "Start Date": ticket.start_date
          ? new Date(ticket.start_date).toLocaleString("id-ID", {
              timeZone: "Asia/Jakarta",
            })
          : "-",
        "End Date": ticket.end_date
          ? new Date(ticket.end_date).toLocaleString("id-ID", {
              timeZone: "Asia/Jakarta",
            })
          : "-",
      }));

      // Buat workbook baru
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(formattedData, {
        origin: "A1",
      });

      // Dapatkan range sel yang digunakan
      const range = XLSX.utils.decode_range(ws["!ref"]);

      // Buat style untuk border
      const borderStyle = {
        style: "thin",
        color: { auto: 1 },
      };

      // Terapkan border ke setiap sel
      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cell = XLSX.utils.encode_cell({ r: R, c: C });
          if (!ws[cell]) ws[cell] = { v: "", t: "s" };
          if (!ws[cell].s) ws[cell].s = {};
          ws[cell].s.border = {
            top: borderStyle,
            left: borderStyle,
            bottom: borderStyle,
            right: borderStyle,
          };
        }
      }

      // Style untuk header
      const headerStyle = {
        font: { bold: true },
        fill: { fgColor: { rgb: "CCCCCC" } },
        alignment: { horizontal: "center" },
      };

      // Terapkan style header
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const headerCell = XLSX.utils.encode_cell({ r: 0, c: C });
        ws[headerCell].s = headerStyle;
      }

      // Atur lebar kolom
      const colWidths = [
        { wch: 15 }, // Ticket ID
        { wch: 20 }, // Created By
        { wch: 15 }, // Category
        { wch: 20 }, // Executor
        { wch: 50 }, // Activity
        { wch: 80 }, // Detail Activity
        { wch: 15 }, // Type
        { wch: 15 }, // Status
        { wch: 20 }, // Start Date
        { wch: 20 }, // End Date
      ];
      ws["!cols"] = colWidths;

      // Tambahkan worksheet ke workbook
      XLSX.utils.book_append_sheet(wb, ws, "OTT System Report");

      // Generate buffer
      const buffer = XLSX.write(wb, {
        type: "buffer",
        bookType: "xlsx",
      });

      // Set header response
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="OTT System Report.xlsx"'
      );

      // Kirim file
      res.send(buffer);
    } catch (error) {
      console.error("Error downloading tickets:", error);
      return res.status(500).json({
        status: "error",
        message: "Terjadi kesalahan saat mengunduh data tiket",
      });
    }
  }
}

module.exports = TicketController;
