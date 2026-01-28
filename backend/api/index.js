// backend/api/index.js
import app from "../app.js";

export default function handler(req, res) {
  return app(req, res);
}
