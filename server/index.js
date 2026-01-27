import express from "express";
import mpRoutes from "./mp.js";

const app = express();
app.use(express.json());

app.use("/api/mp", mpRoutes);

app.listen(3000, () => console.log("server on 3000"));
