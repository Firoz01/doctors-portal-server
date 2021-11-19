const express = require("express");
require("dotenv").config();
const { MongoClient } = require("mongodb");
const admin = require("firebase-admin");
const app = express();
const corse = require("cors");
const fileUpload = require("express-fileupload");
const port = process.env.PORT || 5000;

//firebase admin sdk

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

//middleware
app.use(corse());
app.use(express.json());
app.use(fileUpload());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.mbv6h.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function verifyToken(req, res, next) {
  if (req.headers?.authorization?.startsWith("Bearer ")) {
    const token = req.headers.authorization.split(" ")[1];
    try {
      const decodedUser = await admin.auth().verifyIdToken(token);
      req.decodedEmail = decodedUser.email;
    } catch (error) {
    } finally {
    }
  }

  next();
}

async function run() {
  try {
    await client.connect();
    const database = client.db("doctors_portal");
    const appointmentsCollection = database.collection("appointments");
    const usersCollection = database.collection("users");
    const doctorsCollection = database.collection("doctors");

    app.post("/appointments", async (req, res) => {
      const appointment = req.body;
      const result = await appointmentsCollection.insertOne(appointment);
      res.json(result);
    });

    app.get("/appointments", verifyToken, async (req, res) => {
      const email = req.query.email;
      const date = new Date(req.query.date).toDateString();
      // console.log(email, date);
      const query = { email: email, date: date };
      const appointments = await appointmentsCollection.find(query).toArray();
      res.json(appointments);
    });

    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      let isAdmin = false;
      if (user?.role === "admin") {
        isAdmin = true;
      }
      res.json({ admin: isAdmin });
    });

    app.get('/doctors', async (req, res) => {
      const doctors = await doctorsCollection.find({}).toArray();
      res.json(doctors);
    })

    app.post("/doctors", async (req, res) => {
      const name = req.body.name;
      const email = req.body.email;
      const image = req.files.image;
      const imageData = image.data;
      const encodedImage = imageData.toString("base64");
      const imageBuffer = Buffer.from(encodedImage, "base64");
      const doctor = {
        name,
        email,
        image: imageBuffer,
      }
      const result = await doctorsCollection.insertOne(doctor);
      res.json(result);
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      //console.log(user);
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
      const result = await usersCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.json(result);
    });

    app.put("/users/admin", verifyToken, async (req, res) => {
      const user = req.body;
      const requester = req.decodedEmail;

      console.log(requester);

      if (requester) {
        const requesterAccount = await usersCollection.findOne({
          email: requester,
        });
        if (requesterAccount?.role === "admin") {
          const filter = { email: user.email };
          const updateDoc = {
            $set: { role: "admin" },
          };
          const result = await usersCollection.updateOne(filter, updateDoc);
          res.json(result);
        }
      } else {
        res.status(401).json({ message: "Unauthorized" });
      }
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
