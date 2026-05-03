const express = require("express");
const cors = require("cors");
const path = require('path');
const pool = require('./dataBase');


require('dotenv').config();




const app = express();

// middleware
app.use(cors({
  origin: process.env.CLIENT_URL, // מאפשר רק לכתובת זו לגשת לשרת
})); // מאפשר ל-React לגשת לשרת
app.use(express.json()); // כדי שנוכל לשלוח JSON

app.use('/images', express.static(path.join(__dirname, 'images')));// קישור לתמונות

app.use("/login", require("./routes/login"))
app.use("/signup", require("./routes/signup"))
app.use("/uploadImages", require("./routes/uploadImages").router)
app.use("/creators", require("./routes/creatorsRoutes/creatorsMain"))
app.use("/chords", require("./routes/chords"))
app.use("/songs", require("./routes/songs"))

app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: "Server error" });
});


app.listen(process.env.PORT, () => {
  console.log(`Server started on port ${process.env.PORT}`);
});
