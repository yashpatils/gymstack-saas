import express from "express";

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 3000;

app.get("/", (_req, res) => {
  res.status(200).send("GymStack backend running");
});

app.listen(port, () => {
  console.log(`GymStack backend listening on port ${port}`);
});
