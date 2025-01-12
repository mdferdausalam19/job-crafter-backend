const express = require("express");
const cors = require("cors");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

// Middleware setup for CORS and JSON parsing
const corsOptions = {
  origin: ["http://localhost:5173", "https://job-crafter-frontend.vercel.app"],
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
};

// MongoDB dependencies and client initialization
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.kmxsq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a new MongoDB client with configuration
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Middleware to verify JWT token and extract user data
const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: "Unauthorized access" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "Unauthorized access" });
    }
    req.user = decoded;
    next();
  });
};

async function run() {
  try {
    const database = client.db("jobCrafter");
    const jobsCollection = database.collection("jobs");
    const bidsCollection = database.collection("bids");

    // API route to generate JWT token and set it as a cookie
    app.post("/jwt", (req, res) => {
      const email = req.body;
      const token = jwt.sign(email, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "7d",
      });
      res.cookie("token", token, cookieOptions).send({ success: true });
    });

    // API route to clear JWT token cookie for sign-out
    app.get("/sign-out", (req, res) => {
      res
        .clearCookie("token", {
          ...cookieOptions,
          maxAge: 0,
        })
        .send({ success: true });
    });

    // API route to fetch all job listings
    app.get("/jobs", async (req, res) => {
      const result = await jobsCollection.find().toArray();
      res.send(result);
    });

    // API route to fetch details of a specific job by ID
    app.get("/jobs/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobsCollection.findOne(query);
      res.send(result);
    });

    // API route to fetch jobs posted by a specific buyer
    app.get("/my-posted-jobs", verifyToken, async (req, res) => {
      const email = req.query?.email;
      const tokenEmail = req?.user?.email;
      if (email !== tokenEmail) {
        return res.status(403).send({ message: "Forbidden access" });
      }
      const query = { "buyer.email": email };
      const result = await jobsCollection.find(query).toArray();
      res.send(result);
    });

    // API route to add a new job
    app.post("/jobs", async (req, res) => {
      const jobInfo = req.body;
      const result = await jobsCollection.insertOne(jobInfo);
      res.send(result);
    });

    // API route to update a job by ID
    app.put("/jobs/:id", async (req, res) => {
      const id = req.params.id;
      const jobInfo = req.body;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateJob = {
        $set: {
          ...jobInfo,
        },
      };
      const result = await jobsCollection.updateOne(filter, updateJob, options);
      res.send(result);
    });

    // API route to delete a job by ID
    app.delete("/jobs/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobsCollection.deleteOne(query);
      res.send(result);
    });

    // API route to submit a bid for a specific job
    app.post("/bids", async (req, res) => {
      const bidsInfo = req.body;
      const result = await bidsCollection.insertOne(bidsInfo);
      res.send(result);
    });

    // API route to fetch all bids placed by a specific user
    app.get("/my-bids", verifyToken, async (req, res) => {
      const email = req.query?.email;
      const tokenEmail = req?.user?.email;
      if (email !== tokenEmail) {
        return res.status(403).send({ message: "Forbidden access" });
      }
      const query = { email: email };
      const result = await bidsCollection.find(query).toArray();
      res.send(result);
    });

    // API route to fetch bid requests for jobs posted by a buyer
    app.get("/bid-requests", verifyToken, async (req, res) => {
      const email = req.query?.email;
      const tokenEmail = req?.user?.email;
      if (email !== tokenEmail) {
        return res.status(403).send({ message: "Forbidden access" });
      }
      const query = {
        buyerEmail: email,
      };
      const result = await bidsCollection.find(query).toArray();
      res.send(result);
    });

    // API route to update the status of a bid by its ID
    app.patch("/bid-status/:id", async (req, res) => {
      const id = req?.params?.id;
      const status = req.body;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: status,
      };
      const result = await bidsCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    console.log("Connected to MongoDB successfully!");
  } catch (err) {
    // Log any errors during connection or runtime
    console.error("Error connecting to MongoDB: ", err.message);
  }
}

// Run the async function to initialize the database connection and routes
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Welcome to the JobCrafter server! 🚀");
});

app.listen(port, () => {
  console.log(`JobCrafter server is running on port ${port}`);
});
