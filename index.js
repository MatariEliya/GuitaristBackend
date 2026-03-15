const express = require("express");
const cors = require("cors");
const path = require('path');
const pool = require('./dataBase');


const app = express();
const PORT = 3001;

// middleware
app.use(cors()); // מאפשר ל-React לגשת לשרת
app.use(express.json()); // כדי שנוכל לשלוח JSON

app.use('/images', express.static(path.join(__dirname, 'images')));// קישור לתמונות

app.use("/login", require("./routes/login"))
app.use("/signup", require("./routes/signup"))
app.use("/uploadImages", require("./routes/uploadImages").router)
app.use("/creators", require("./routes/creatorsRouts/creatorsMain"))
app.use("/chords", require("./routes/chords"))
app.use("/songs", require("./routes/songs"))

// נתיב בדיקה בסיסי
app.get("/", (req, res) => {
  res.send("🎉");
});

app.get('/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
