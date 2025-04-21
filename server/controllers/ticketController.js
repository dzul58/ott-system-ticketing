const poolNisa = require("../config/config");

class TicketController {
  // Get all tickets with search and pagination
  static async getAllTickets(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        category,
        user_name,
        activity,
        type,
        status,
      } = req.query;

      const offset = (page - 1) * limit;

      // Build where clause for search
      let whereClause = "";
      const params = [];
      let paramCount = 1;

      if (category || user_name || activity || type || status) {
        whereClause = "WHERE ";

        if (category) {
          whereClause += `category ILIKE $${paramCount++} `;
          params.push(`%${category}%`);
        }

        if (user_name) {
          if (params.length > 0) whereClause += "AND ";
          whereClause += `user_name ILIKE $${paramCount++} `;
          params.push(`%${user_name}%`);
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
      }

      // Count total tickets for pagination
      const countQuery = `SELECT COUNT(*) FROM ott_system_tickets_activity ${whereClause}`;
      const countResult = await poolNisa.query(countQuery, params);
      const totalTickets = parseInt(countResult.rows[0].count);

      // Query tickets with pagination
      const query = `
        SELECT * FROM ott_system_tickets_activity 
        ${whereClause} 
        ORDER BY ticket_id DESC 
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

  // Get ticket by ID
  static async getTicketById(req, res) {
    try {
      const { id } = req.params;

      const ticketQuery =
        "SELECT * FROM ott_system_tickets_activity WHERE ticket_id = $1";
      const ticketResult = await poolNisa.query(ticketQuery, [id]);

      if (ticketResult.rows.length === 0) {
        return res.status(404).json({
          status: "error",
          message: "Tiket tidak ditemukan",
        });
      }

      // Get comments for this ticket
      const commentsQuery =
        "SELECT * FROM ott_system_ticket_comments_activity WHERE ticket_id = $1 ORDER BY created_at DESC";
      const commentsResult = await poolNisa.query(commentsQuery, [id]);

      return res.status(200).json({
        status: "success",
        data: {
          ticket: ticketResult.rows[0],
          comments: commentsResult.rows,
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

  // Create new ticket
  static async createTicket(req, res) {
    try {
      const { name, email } = req.userAccount;
      const {
        category,
        end_date,
        user_name,
        user_email,
        activity,
        detail_activity,
        type,
        status,
      } = req.body;

      const query = `
        INSERT INTO ott_system_tickets_activity 
        (category, end_date, user_name, user_email, activity, detail_activity, type, status) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
        RETURNING *
      `;

      const values = [
        category,
        end_date,
        name,
        email,
        activity,
        detail_activity,
        type,
        status,
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
        message: "Terjadi kesalahan saat membuat tiket baru",
      });
    }
  }

  // Update ticket
  static async updateTicket(req, res) {
    try {
      const { id } = req.params;
      const {
        category,
        start_date,
        end_date,
        user_name,
        user_email,
        activity,
        detail_activity,
        type,
        status,
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
          start_date = COALESCE($2, start_date),
          end_date = COALESCE($3, end_date),
          user_name = COALESCE($4, user_name),
          user_email = COALESCE($5, user_email),
          activity = COALESCE($6, activity),
          detail_activity = COALESCE($7, detail_activity),
          type = COALESCE($8, type),
          status = COALESCE($9, status)
        WHERE ticket_id = $10
        RETURNING *
      `;

      const values = [
        category,
        start_date,
        finalEndDate, // Use our potentially updated end_date
        user_name,
        user_email,
        activity,
        detail_activity,
        type,
        status,
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

      // First delete all comments related to this ticket
      await poolNisa.query(
        "DELETE FROM ott_system_ticket_comments_activity WHERE ticket_id = $1",
        [id]
      );

      // Then delete the ticket
      const query =
        "DELETE FROM ott_system_tickets_activity WHERE ticket_id = $1 RETURNING *";
      const result = await poolNisa.query(query, [id]);

      return res.status(200).json({
        status: "success",
        message: "Tiket berhasil dihapus",
        data: result.rows[0],
      });
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

      // Delete the comment
      const query =
        "DELETE FROM ott_system_ticket_comments_activity WHERE comment_id = $1 RETURNING *";
      const result = await poolNisa.query(query, [comment_id]);

      return res.status(200).json({
        status: "success",
        message: "Komentar berhasil dihapus",
        data: result.rows[0],
      });
    } catch (error) {
      console.error("Error deleting comment:", error);
      return res.status(500).json({
        status: "error",
        message: "Terjadi kesalahan saat menghapus komentar",
      });
    }
  }
}

module.exports = TicketController;
