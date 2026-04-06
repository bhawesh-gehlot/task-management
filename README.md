# TaskFlow - Task Management Application

A full-stack task management app built with **Angular** and **Node.js/Express** using **MongoDB**.

## Live Demo

**[Open TaskFlow](https://task-management-eight-ashy.vercel.app/)**

## Local Setup

### Prerequisites

- Node.js (v20+)
- npm
- MongoDB Atlas account (or a local MongoDB instance)

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/task-management.git
cd task-management
```

### 2. Setup MongoDB Atlas

1. Go to [MongoDB Atlas](https://cloud.mongodb.com/) and create a free cluster.
2. Click **Connect** > **Drivers** and copy the connection string.
3. Replace `<username>` and `<password>` in the connection string with your database user credentials.

### 3. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend` directory:

```
PORT=3000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/task-management
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h
NODE_ENV=development
CLIENT_URL=http://localhost:4200
```

Replace `MONGODB_URI` with your Atlas connection string and set a strong `JWT_SECRET`.

Start the backend:

```bash
npm run dev
```

### 4. Frontend Setup

```bash
cd frontend
npm install
npm start
```

The app will be available at **http://localhost:4200**.
