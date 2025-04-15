## 1. Pembuatan Tabel

```sql
-- Tabel Users (mengambil user existing dari NISA)

-- Tabel Tickets
CREATE TABLE Tickets (
    ticket_id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status ENUM('Open', 'In Progress', 'Resolved', 'Closed') DEFAULT 'Open',
    priority ENUM('Low', 'Medium', 'High') DEFAULT 'Low',
    created_by VARCHAR(255),
    assigned_to VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES Users(email) ON DELETE SET NULL,
    FOREIGN KEY (assigned_to) REFERENCES Users(email) ON DELETE SET NULL
);

-- Tabel Ticket_Comments
CREATE TABLE Ticket_Comments (
    comment_id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT,
    user_email VARCHAR(255),
    comment TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES Tickets(ticket_id) ON DELETE CASCADE,
    FOREIGN KEY (user_email) REFERENCES Users(email) ON DELETE SET NULL
);

-- Indeks untuk performa
CREATE INDEX idx_ticket_status ON Tickets(status);
CREATE INDEX idx_ticket_assigned_to ON Tickets(assigned_to);
CREATE INDEX idx_comment_ticket_id ON Ticket_Comments(ticket_id);
```

## 2. Query Operasi Dasar

### a. Insert Data

```sql
-- Menambahkan pengguna ke tabel Users
INSERT INTO Users (email, name, password)
VALUES ('user1@example.com', 'User Satu', 'hashed_password_here');

-- Menambahkan tiket baru
INSERT INTO Tickets (title, description, status, priority, created_by, assigned_to)
VALUES (
    'Masalah Login',
    'Pengguna tidak bisa login ke sistem',
    'Open',
    'High',
    'user1@example.com',
    'user2@example.com'
);

-- Menambahkan komentar ke tiket
INSERT INTO Ticket_Comments (ticket_id, user_email, comment)
VALUES (
    1,
    'user1@example.com',
    'Sudah coba reset password, tetapi masih gagal.'
);
```

### b. Select Data

```sql
-- Mendapatkan semua tiket
SELECT 
    t.ticket_id,
    t.title,
    t.description,
    t.status,
    t.priority,
    t.created_by,
    u1.name AS creator_name,
    t.assigned_to,
    u2.name AS assignee_name,
    t.created_at,
    t.updated_at
FROM Tickets t
LEFT JOIN Users u1 ON t.created_by = u1.email
LEFT JOIN Users u2 ON t.assigned_to = u2.email;

-- Mendapatkan tiket berdasarkan ID
SELECT 
    t.ticket_id,
    t.title,
    t.description,
    t.status,
    t.priority,
    t.created_by,
    u1.name AS creator_name,
    t.assigned_to,
    u2.name AS assignee_name,
    t.created_at,
    t.updated_at
FROM Tickets t
LEFT JOIN Users u1 ON t.created_by = u1.email
LEFT JOIN Users u2 ON t.assigned_to = u2.email
WHERE t.ticket_id = 1;

-- Mendapatkan semua komentar untuk tiket tertentu
SELECT 
    c.comment_id,
    c.ticket_id,
    c.user_email,
    u.name AS commenter_name,
    c.comment,
    c.created_at
FROM Ticket_Comments c
LEFT JOIN Users u ON c.user_email = u.email
WHERE c.ticket_id = 1
ORDER BY c.created_at ASC;
```

### c. Update Data

```sql
-- Memperbarui status atau penugasan tiket
UPDATE Tickets
SET 
    status = 'In Progress',
    assigned_to = 'user3@example.com',
    updated_at = CURRENT_TIMESTAMP
WHERE ticket_id = 1;

-- Memperbarui komentar
UPDATE Ticket_Comments
SET 
    comment = 'Sudah diperbarui: coba lagi setelah restart.'
WHERE comment_id = 1;
```

### d. Delete Data

```sql
-- Menghapus tiket (komentar akan terhapus otomatis karena ON DELETE CASCADE)
DELETE FROM Tickets
WHERE ticket_id = 1;

-- Menghapus komentar tertentu
DELETE FROM Ticket_Comments
WHERE comment_id = 1;
```

## Catatan

- **Users**: Tabel ini diasumsikan sudah ada. Query pembuatan disertakan untuk kelengkapan, tetapi Anda bisa menyesuaikan jika struktur berbeda.
- **Foreign Key**: Menggunakan `ON DELETE SET NULL` untuk **Tickets** agar tiket tetap ada meskipun pengguna dihapus. Untuk **Ticket_Comments**, `ON DELETE CASCADE` memastikan komentar terhapus jika tiket dihapus.
- **Password**: Kolom `password` harus diisi dengan nilai terenkripsi (misal: menggunakan bcrypt).
- **Indeks**: Ditambahkan untuk kolom yang sering digunakan dalam query (`status`, `assigned_to`, `ticket_id`) agar performa lebih baik.
- **Timestamp**: Kolom `created_at` dan `updated_at` otomatis mencatat waktu, memudahkan pelacakan.

Jika Anda membutuhkan query tambahan (misal: filter tiket berdasarkan status atau prioritas, atau laporan), silakan beri tahu!