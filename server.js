const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.static(path.join(__dirname, "view", "dist")));
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
	res.sendFile(path.join(__dirname, "view", "dist", "index.html"));
});
app.get("/tweaks", (req, res) => {
	res.sendFile(path.join(__dirname, "tweaks", "tweaks.json"));
});

// app.use((req, res) => {
// 	if (req.url.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)$/i)) return res.status(404);
// 	console.log(`Proxying ${req.url}`);
// 	res.redirect("https://tweakcord.nmll.xyz");
// });

app.listen(PORT, () => {
	console.log(`Frontend server running at http://localhost:${PORT}`);
});
