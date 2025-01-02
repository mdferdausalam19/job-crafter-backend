const express = require("express");
const cors = require("cors");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

// Middleware setup for CORS and JSON parsing
const corsOptions = {
  origin: ["http://localhost:5173", "https://job-crafter-frontend.vercel.app"],
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json());

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

async function run() {
  try {
    const database = client.db("jobCrafter");
    const jobsCollection = database.collection("jobs");
    const bidsCollection = database.collection("bids");

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

    // API route to submit a bid for a specific job
    app.post("/bids", async (req, res) => {
      const bidsInfo = req.body;
      const result = await bidsCollection.insertOne(bidsInfo);
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
