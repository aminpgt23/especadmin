# E-Spec Manager 📋⚡
for testing aplication : https://especadminfrontend.vercel.app/dashboard
**Production Spec Management System** — Full-stack app built with React + Express + MySQL.

---

## 🛠 Tech Stack

- **Frontend**: React 18, React Router v6, Recharts, Socket.IO Client, react-hot-toast, Lucide Icons
- **Backend**: Node.js, Express, Socket.IO, MySQL2, JWT Auth, Multer
- **Database**: MySQL 8.0 (existing `production` schema)

---

## 🚀 Quick Start

### 1. Database Setup

```bash
# Import your existing schema first
mysql -u root -p production < espec.sql

# Then run the setup script for additional tables
mysql -u root -p production < setup.sql
```

### 2. Backend Setup

```bash
cd backend
npm install

# Configure your database connection
cp .env .env.local
# Edit .env with your MySQL credentials:
# DB_HOST=127.0.0.1
# DB_USER=root
# DB_PASSWORD=your_password
# DB_NAME=production
# JWT_SECRET=your_secret_key
# PORT=5000

npm run dev   # development with nodemon
# OR
npm start     # production
```

### 3. Frontend Setup

```bash
cd frontend
npm install
npm start     # runs on http://localhost:3000
```

The frontend proxies `/api` requests to `http://localhost:5000`.

---

## 👥 User Roles & Permissions

| Feature | Admin | Tech | PPC |
|---------|-------|------|-----|
| View all specs | ✅ | ✅ | ✅ |
| Add/Edit spec | ✅ | ✅ | ❌ |
| Delete spec → History | ✅ | ✅ | ❌ |
| Annotate (Coret) | ✅ | ✅ | ❌ |
| Release spec (active=1) | ✅ | ❌ | ✅ |
| Unrelease spec (active=0) | ✅ | ❌ | ✅ |
| Restore from History | ✅ | ✅ | ❌ |
| Chat on specs | ✅ | ✅ | ✅ |
| Tag users in chat | ✅ | ✅ | ✅ |

---

## 📱 Features

### Master (Spec Management)
- **Table view** & **Card/Grid view** with toggle
- Search by itemcode, speccode, GITI, process, type
- Filter by status (Active/Inactive) and type
- Sort by any column
- Quick action buttons per row (release/unrelease/delete)
- Full spec detail modal with tabs

### Spec Detail Modal (5 tabs)
1. **Info** — all metadata in grid layout
2. **Spec Image** — view uploaded JPG/PNG spec image
3. **Memo Doc** — view PDF or image memo with inline preview
4. **Annotation (Coret)** — view/create annotations on spec image
5. **Chat** — real-time conversation with @mention tagging

### Annotation Tools (CoretCanvas)
- ✏️ Free-hand Pen
- 🖊 Highlighter
- ➖ Line
- ➡️ Arrow with arrowhead
- ⬜ Rectangle
- ⭕ Ellipse/Circle
- 🔺 Triangle
- 🔤 Text input
- 🖱️ Select tool
- 8 color presets + custom stroke width
- Undo/Redo history
- Clear annotations
- Download annotated image

### Chat / Messaging
- Real-time chat per spec via Socket.IO
- **@mention** users by typing `@`
- Tagged users receive instant notification
- Supports TECH ↔ PPC conversations

### Smart Alerts (Real-time)
| Event | Who sends | Who receives |
|-------|-----------|--------------|
| New spec uploaded | TECH | PPC |
| Spec released | PPC | TECH |
| Spec UNRELEASED | PPC | TECH (24h delete alert) |
| Spec annotated | TECH | PPC |
| @mention in chat | Any | Tagged user |

> ⚠️ The 24-hour delete alert only fires for specs that were **previously released** and then **unreleased** — NOT for brand new uploads.

### History
- Full audit trail of deleted specs
- View spec detail including image
- **Restore** back to Master (TECH/Admin only)

### Dashboard
- Total / Active / Inactive / Duplicate counts
- Active rate progress bar
- Bar chart: Specs by Type
- Pie chart: Active vs Inactive
- Bar chart: Specs by Process
- ⚠️ Duplicate active spec warnings (same itemcode)
- Timeline: Recent annotations with quick view

### Notifications Header
- Bell icon with unread count badge
- Click any notification to open that spec
- Mark all as read
- Urgent 24h deadline display

---

## 🎨 UI/UX
- **Color palette**: Yellow (#F5C518) + Amber + Gold
- **Font**: Sora (display) + JetBrains Mono (code)
- **Light / Dark mode** toggle (persisted)
- iOS-inspired card/modal design
- Responsive sidebar (collapsible)
- Animated toasts, transitions, micro-interactions

---

## 🗄 Database Tables

### Existing (from espec.sql)
- `espec` — main specs table
- `historyespec` — deleted specs archive
- `masterlogin` — user accounts

### Added by setup.sql
- `spec_messages` — per-spec chat messages
- `spec_alerts` — persistent notification queue

---

## 🔐 Default Test Accounts

| NIP | Name | Role | Password |
|-----|------|------|----------|
| ADM001 | Admin User | Admin | admin123 |
| TCH001 | Tech User 1 | Tech | tech123 |
| TCH002 | Tech User 2 | Tech | tech123 |
| PPC001 | PPC User 1 | PPC | ppc123 |
| PPC002 | PPC User 2 | PPC | ppc123 |

> 🔒 Role is determined by the `dept` field in `masterlogin`. Values containing "admin" → Admin, "tech" → Tech, "ppc" → PPC.

---

## 📁 Project Structure

```
espec-app/
├── backend/
│   ├── config/db.js          # MySQL connection pool
│   ├── middleware/auth.js     # JWT + role middleware
│   ├── routes/
│   │   ├── auth.js            # Login, user list
│   │   ├── spec.js            # CRUD, release, coret, dashboard
│   │   ├── history.js         # History list, restore
│   │   └── chat.js            # Messages, alerts
│   ├── server.js              # Express + Socket.IO server
│   ├── .env                   # Config (edit this!)
│   └── package.json
├── frontend/
│   ├── public/index.html
│   └── src/
│       ├── context/AppContext.jsx   # Auth, socket, notifications
│       ├── pages/
│       │   ├── Login.jsx
│       │   ├── Dashboard.jsx
│       │   ├── Master.jsx
│       │   └── History.jsx
│       ├── components/
│       │   ├── Layout.jsx            # Sidebar + header
│       │   ├── NotificationPanel.jsx
│       │   ├── CoretCanvas.jsx       # Annotation tools
│       │   ├── SpecChat.jsx          # Real-time chat
│       │   └── modals/
│       │       ├── SpecModal.jsx     # View spec detail
│       │       └── SpecForm.jsx      # Add/edit spec
│       ├── App.jsx
│       ├── index.js
│       └── index.css
├── espec.sql         # Your original schema
├── setup.sql         # Additional tables + sample data
└── README.md
```
