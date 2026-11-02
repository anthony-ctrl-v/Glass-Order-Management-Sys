import dotenv from "dotenv";

dotenv.config({ path: new URL("../.env", import.meta.url) });

const port = Number(process.env.PORT ?? 3001);

const { app } = await import("./app.js");
app.listen(port, () => {
  console.log(`Glass Order API listening on http://localhost:${port}`);
});
