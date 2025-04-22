const express = require("express");
const cors = require("cors");
const app = express();
const port = 3000;
const TicketController = require("./controllers/ticketController");
const LoginController = require("./controllers/loginController");
const authentication = require("./middlewares/authentication");

app.use(
  cors({
    origin: ["http://172.17.42.177:5173", "http://localhost:5173"],
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/auto-login", LoginController.autoLogin);
app.post("/login", LoginController.login);

app.use(authentication);

// Routes untuk Ticket
app.get("/api/tickets", TicketController.getAllTickets);
app.get("/api/tickets/:id", TicketController.getTicketById);
app.post("/api/tickets", TicketController.createTicket);
app.put("/api/tickets/:id", TicketController.updateTicket);
app.delete("/api/tickets/:id", TicketController.deleteTicket);

// Routes untuk Comment
app.post("/api/comments", TicketController.addComment);
app.get("/api/tickets/:id/comments", TicketController.getComments);
app.put("/api/comments/:comment_id", TicketController.updateComment);
app.delete("/api/comments/:comment_id", TicketController.deleteComment);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
