# Backend

Backend service for the **G1 Hackathon (GDG)** project.

## Tech stack
- **Node.js** / **Express.js** (API server)
- **MongoDB** (database)
- **Mongoose** (ODM)



## Getting started

### 1) Prerequisites
- Node.js (LTS recommended)
- npm or yarn
- MongoDB (local or Atlas)

### 2) Install dependencies
```bash
npm install
```

### 3) Configure environment variables
Create a `.env` file in the backend root:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/your-db
JWT_SECRET=replace_me
```

Add any other variables required by the project (e.g. `CLOUDINARY_URL`, `EMAIL_HOST`, etc.).

### 4) Run the server
```bash
npm run dev
```

If there is no `dev` script, use:
```bash
npm start
```

## Scripts (common)
- `npm run dev` — start in watch mode (nodemon)
- `npm start` — start in production mode
- `npm test` — run tests (if configured)

## API
- Base URL: `http://localhost:<PORT>`
- Health check (example): `GET /health`

> Update this section with real endpoints once finalized.

## Project structure (typical)
```
backend/
  src/
    routes/
    controllers/
    models/
    middleware/
    utils/
  .env
  package.json
  README.md
```

## Contributing
1. Create a feature branch
2. Commit your changes
3. Open a Pull Request

## License
Add a license if/when the project is ready for open source.
