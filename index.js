const express = require("express");
require("dotenv").config();
const { MongoClient } = require("mongodb");
const app = express();
const corse = require("cors");
const port = process.env.PORT || 5000;

//middleware
app.use(corse());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.mbv6h.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function run() {
  try {
    await client.connect();
    const database = client.db("doctors_portal");
    const appointmentsCollection = database.collection("appointments");
    const usersCollection = database.collection("users");

    app.post("/appointments", async (req, res) => {
      const appointment = req.body;
      console.log(appointment);
      const result = await appointmentsCollection.insertOne(appointment);
      res.json(result);
    });

    app.get("/appointments", async (req, res) => {
      const email = req.query.email;
      const date = new Date(req.query.date).toDateString();
      // console.log(email, date);
      const query = { email: email, date: date };
      const appointments = await appointmentsCollection.find(query).toArray();
      res.json(appointments);
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      console.log(user);
      const result = await usersCollection.insertOne(user);
      res.json(result);
    });

    app.put("/users", async (req, res) => {
      const user = req.body;
      const filter = { email: user.email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await usersCollection.updateOne(filter, updateDoc, options);
      res.json(result);
    });
  } finally {
    //await client.close();
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello Doctors Portals!");
});

app.listen(port, () => {
  console.log(`Listening at: ${port}`);
});
