# 🚀 Simple Setup Guide - RedZone

## Quick Start (3 Steps)

### 1. Install Dependencies
```bash
npm install
```

### 2. Start MongoDB & Connect with mongosh
```bash
# Start MongoDB service
mongod

# In a new terminal, connect to database
mongosh redzoneadmin
```

### 3. Run the Application
```bash
npm run dev:full
```

That's it! 🎉

## What Happens Automatically

- ✅ Database connects automatically
- ✅ Demo users are created (if database is empty)
- ✅ Frontend and backend start together
- ✅ You can login immediately

## Demo Accounts (Auto-created)

- **Admin**: `admin@redzone.com` / `admin123`
- **User**: `user@redzone.com` / `user123`

## Access Your App

- **Website**: http://localhost:5173
- **Admin Panel**: http://localhost:5173/admin (login as admin first)

## Using mongosh to View Data

### Connect to Database
```bash
mongosh redzoneadmin
```

### View All Users
```bash
db.users.find().pretty()
```

### View Specific User
```bash
db.users.findOne({email: "admin@redzone.com"})
```

### Count Users
```bash
db.users.countDocuments()
```

### View Recent Users
```bash
db.users.find().sort({createdAt: -1}).limit(5)
```

### Exit mongosh
```bash
exit
```

## Need Help?

1. Make sure MongoDB is running (`mongod`)
2. Check the terminal for any error messages
3. Try connecting with mongosh: `mongosh redzoneadmin`
4. Try refreshing the browser

## Database Options

### Local MongoDB (Recommended)
- Install MongoDB locally
- Run `mongod` to start
- Use `mongosh redzoneadmin` to connect
- No internet required

### MongoDB Atlas (Cloud)
- Free cloud database
- No local installation needed
- Requires internet connection
- More secure for production

---

**That's all you need to know!** 🎯
