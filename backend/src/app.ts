import express from "express";
import cors from "cors";
import helmet from "helmet";

import authRoutes from "./routes/auth.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import cirurgiasRoutes from "./routes/cirurgias.routes.js";
import opmeRoutes from "./routes/opme.routes.js";
import equipamentosRoutes from "./routes/equipamentos.routes.js";
import distribuicaoRoutes from "./routes/distribuicao.routes.js";

const app = express();

app.use(helmet());

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173"
  })
);

app.use(express.json({ limit: "10kb" }));

app.use("/auth", authRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/cirurgias", cirurgiasRoutes);
app.use("/opme", opmeRoutes);
app.use("/equipamentos", equipamentosRoutes);
app.use("/distribuicao", distribuicaoRoutes);

export default app;