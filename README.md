# Resume Builder

A PHP-free Resume Builder using HTML/CSS/Vanilla JavaScript, Node.js, Express and MySQL.

## Requirements

- Windows 10/11
- Node.js 18+
- MySQL 8+
- VS Code

## Setup

1. Install Node.js and MySQL.
2. Open MySQL Workbench (or MySQL command line).
3. Run `database.sql`.
4. Copy `.env.example` to `.env`.
5. Set your MySQL password in `.env`.
6. Open this folder in VS Code.
7. Open the terminal and run:

```bash
npm install
npm start
```

8. Open:

`http://localhost:3000`

## Features

- Registration/login with bcrypt
- Session authentication
- Profile management
- Education CRUD
- Skills CRUD
- Projects CRUD
- Experience CRUD
- Resume preview
- Two template choices
- Real PDF generation
- MySQL persistence
- Responsive UI

## Troubleshooting

### Cannot connect to MySQL
Make sure MySQL is running and `.env` has the correct DB password.

### Database does not exist
Run `database.sql` in MySQL.

### Port 3000 is busy
Change `PORT=3000` in `.env` to another free port such as 3001.

## Important

This project intentionally does not use PHP. It implements the SRS functionality with Node.js/Express.
