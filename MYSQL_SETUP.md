# MySQL Setup Guide for Glucoguard

Quick instructions to get MySQL running and database created.

---

## 1. Install MySQL

### Windows
- Download: [MySQL Community Server](https://dev.mysql.com/downloads/mysql/)
- Run installer, follow setup wizard
- Default port: `3306`
- Default user: `root` (can set password during install)

### macOS (Homebrew)
```bash
brew install mysql
brew services start mysql
mysql_secure_installation  # (optional, sets root password)
```

### Linux (Ubuntu/Debian)
```bash
sudo apt-get install mysql-server
sudo systemctl start mysql
sudo mysql_secure_installation  # (optional, sets root password)
```

---

## 2. Verify MySQL is Running

```bash
mysql --version
```

Should show something like: `mysql  Ver 8.0.x for win64 on x86_64`

---

## 3. Create Database and User

### Quick Setup (Using root with no password)

If you have MySQL installed with default settings (root user, no password):

```bash
# Connect to MySQL
mysql -u root

# Inside MySQL prompt:
CREATE DATABASE glucoguard_dev;
EXIT;
```

### Setup with Password

If you set a root password:

```bash
# Connect to MySQL
mysql -u root -p
# (it will ask for your password)

# Inside MySQL prompt:
CREATE DATABASE glucoguard_dev;
CREATE USER 'glucoguard_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON glucoguard_dev.* TO 'glucoguard_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

---

## 4. Update Backend `.env` File

Edit `backend/.env`:

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=glucoguard_dev
DB_USER=root
DB_PASSWORD=
JWT_SECRET=glucoguard_mvp_secret_key_change_in_production
NODE_ENV=development
PORT=5000
```

- If you created a user, change `DB_USER=glucoguard_user` and set `DB_PASSWORD=your_password`
- If using default root with no password, leave `DB_PASSWORD=` empty

---

## 5. Verify Setup

```bash
# Test MySQL connection
mysql -u root -e "SHOW DATABASES;"

# Should show:
# | glucoguard_dev |
```

---

## 6. Start Backend Server

```bash
cd backend
npm run setup-db   # Creates tables automatically
npm start
```

Expected output:
```
✓ Database connection verified
✓ Database schema initialized
✓ Server running on http://localhost:5000
```

---

## Troubleshooting

### "MySQL is not running"
- Windows: Start MySQL service from Services app
- macOS: `brew services start mysql`
- Linux: `sudo systemctl start mysql`

### "Can't connect to MySQL server on 'localhost'"
- Check MySQL is running (see above)
- Check port 3306 is not blocked

### "Access denied for user 'root'@'localhost'"
- You likely have a password set
- Edit `.env` to add `DB_PASSWORD=your_password`
- Or remove the password: `mysql -u root -e "ALTER USER 'root'@'localhost' IDENTIFIED BY '';"`

### "No tables in database"
- Run `npm run setup-db` in backend folder
- The server auto-creates tables on startup

---

## Quick Verification

```bash
# Check if database exists
mysql -u root -e "SHOW DATABASES;" | grep glucoguard_dev

# Check tables
mysql -u root glucoguard_dev -e "SHOW TABLES;"

# Should show:
# | glucose_readings |
# | insulin_logs     |
# | meals            |
# | users            |
```

---

That's it! You're ready to run the backend.
