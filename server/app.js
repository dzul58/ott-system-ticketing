const express = require("express");
const cors = require("cors");
const app = express();
const port = 3000;
const TicketController = require("./controllers/ticketController");
const LoginController = require("./controllers/loginController");
const AuthorizationController = require("./controllers/authorizationController");
const authentication = require("./middlewares/authentication");
const { upload, handleMulterError } = require("./middlewares/multer");

app.use(
  cors({
    origin: [
      "http://172.17.42.146:5173",
      "http://localhost:5173",
      "https://ott-system-activity.gslb.oss.myrepublic.co.id",
    ],
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/auto-login", LoginController.autoLogin);
app.post("/login", LoginController.login);

app.use(authentication);

//update access
app.get("/update-access", AuthorizationController.updateAccess);

// Routes untuk Ticket
app.get("/api/tickets", TicketController.getAllTickets);
app.get("/api/tickets/download", TicketController.downloadTickets);
app.get("/api/tickets/:id", TicketController.getTicketByIdWithComments);
app.get("/api/tickets/:id/edit", TicketController.getTicketById);
app.post("/api/tickets", TicketController.createTicket);
app.put("/api/tickets/:id", TicketController.editTicket);
app.put("/api/tickets-engineer/:id", TicketController.updateTicket);
app.delete("/api/tickets/:id", TicketController.deleteTicket);

// Routes untuk Comment
app.post("/api/comments", TicketController.addComment);
app.post(
  "/api/comments/:comment_id/attachments",
  upload.single("file"),
  handleMulterError,
  TicketController.uploadCommentAttachment
);
app.get(
  "/api/comments/:comment_id/attachments",
  TicketController.getCommentAttachments
);
app.get("/api/tickets/:id/comments", TicketController.getComments);
app.put("/api/comments/:comment_id", TicketController.updateComment);
app.delete("/api/comments/:comment_id", TicketController.deleteComment);

// Routes untuk Users
app.get("/api/users/noc-ott", TicketController.getNocOttUsers);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
