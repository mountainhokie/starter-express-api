const express = require("express");
const cors = require("cors");
const axios = require("axios");
const dotenv = require("dotenv");
dotenv.config();

const { connectClient } = require("./db.js");

const router = express.Router();
router.use(cors());
router.use(express.json());

// Test Vercel
router.get("/tests", async (req, res) => {
  const client = await connectClient();
  res.json({ message: "Hello, Test!" });
});

// Get All Issues
router.get("/issues", async (req, res) => {
  const pagination = req.body.pagination ? parseInt(req.body.pagination) : 10;
  const pageNumber = req.body.page ? parseInt(req.body.page) : 1;

  // get the data from MongoDB
  const client = await connectClient();
  const issues = await client
    .collection("issues")
    .find()
    .project({
      id: 1,
      volume: 1,
      name: 1,
      issue_number: 1,
      publisher: 1,
      _id: 0,
    })
    // .skip((pageNumber - 1) * pagination)
    .sort({ "volume": 1 })
    // .limit(pagination)
    .toArray();
  res.send({ issues });
});

// Get from MongoDB by Issue ID using Comic Vine's ID
// Note:  If not available from DB fetch from Comic Vine
router.get("/issue/:issueID", async (req, res) => {
  const client = await connectClient();
  const issue = await client
    .collection("issues")
    .findOne({ id: Number(req.params.issueID) });

  if (issue) {
    res.send({ issue });
  } else {
    // Pull from Comic Vine API
    const url = `${process.env.COMIC_BASE_URL}issue/4000-${req.params.issueID}/?api_key=${process.env.COMIC_API_KEY}&format=json`;

    axios({
      method: "get",
      url: url,
    })
      .then((response) => {
        const d = response.data;
        res.send({ d });
      })
      .catch((error) => {
        console.error(error);
      });
  }
});

// Get Collections

// -------- Search Results
router.get("/search-results/:searchType", async (req, res) => {
  let url;

  switch (req.query.searchType) {
    case "search-date":
      url = `${process.env.COMIC_BASE_URL}issues/?api_key=${process.env.COMIC_API_KEY}&format=json&sort=name:asc&filter=cover_date:${req.query.searchQuery.cover_date},issue_number:${req.query.searchQuery.issue_number}`;
      break;
    case "search-issue":
      url = `${process.env.COMIC_BASE_URL}issues/?api_key=${process.env.COMIC_API_KEY}&format=json&sort=name:asc&filter=name:${req.query.searchQuery.issue_name},issue_number:${req.query.searchQuery.issue_number}`;
      break;
    case "search-general":
      url = `${process.env.COMIC_BASE_URL}search/?api_key=${process.env.COMIC_API_KEY}&format=json&sort=name:asc&resources=issue&resource_type=issue&query=${req.query.searchQuery}`;
      break;
    default:
      url = `${process.env.COMIC_BASE_URL}search/?api_key=${process.env.COMIC_API_KEY}&format=json&sort=name:asc&resources=volume,issue&query=${req.query.searchQuery}`;
      break;
  }

  axios({
    method: "get",
    url: url,
  })
    .then((response) => {
      const d = response.data;
      res.send({ d });
    })
    .catch((error) => {
      console.error(error);
    });
});

router.get("/volume/:volumeID", async (req, res) => {
  const pageNum = req.query.page;
  const offset = (pageNum - 1) * 100;
  const url = `${process.env.COMIC_BASE_URL}issues/?api_key=${process.env.COMIC_API_KEY}&format=json&filter=volume:${req.params.volumeID}&sort=cover_date:asc&offset=${offset}`;

  axios({
    method: "get",
    url: url,
  })
    .then((response) => {
      const d = response.data;
      res.send({ d });
    })
    .catch((error) => {
      console.error(error);
    });
});

// Add issue from Comic Vine API to MongoDB
router.post("/add-issue", async (req, res) => {
  const client = await connectClient();
  let newIssue = {
    "id": req.body.issue.id,
    "name": req.body.issue.name,
    "volume": req.body.issue.volume.name,
    "cover_date": req.body.issue.cover_date,
    "issue_number": req.body.issue.issue_number,
    "publisher": "",
    "description": req.body.issue.description,
    "value": "",
    "date_acquired": "",
    "grade": "",
    "key": "",
    "variant": "",
    "image": {
      "small_url": req.body.issue.image.small_url,
      "screen_url": req.body.issue.image.screen_url,
    },
    "collections": [],
    "character_credits": req.body.issue.character_credits,
    "comicVineID": req.body.issue.id,
    "sold": false,
    "sale_price": "",
  };
  const doc = await client.collection("issues").insertOne(newIssue);
  res.send({ doc }).status(204);
});

// This section will help you delete a record
router.delete("/remove-issue/:issueID", async (req, res) => {
  const client = await connectClient();
  const doc = await client
    .collection("issues")
    .deleteOne({ id: Number(req.params.issueID) });
  res.send({ doc }).status(200);
});

// This section will help you update a record by id.
router.patch("/update-issue", async (req, res) => {
  const updates = {
    $set: {
      [req.body.issueField]: req.body.issueValue,
    },
  };
  const client = await connectClient();
  const doc = await client
    .collection("issues")
    .updateOne({ id: Number(req.body.issueID) }, updates);
  res.send({ doc }).status(200);
});

// Get All Collections
router.get("/collections", async (req, res) => {
  // get the data from MongoDB
  const client = await connectClient();
  const collections = await client
    .collection("issues")
    .aggregate([
      { $unwind: "$collections" },
      { $group: { _id: "$collections.label", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ])
    .toArray();
  console.log(collections);
  res.send({ collections });
});

// Get All Issues From a Particular Collection
router.get("/collection-issues/:collectionName", async (req, res) => {
  const client = await connectClient();
  const issues = await client
    .collection("issues")
    .find({
      collections: {
        $elemMatch: {
          label: req.params.collectionName,
        },
      },
    })
    .project({
      id: 1,
      volume: 1,
      name: 1,
      issue_number: 1,
      publisher: 1,
      _id: 0,
    })
    .sort({ "volume": 1 })
    .toArray();
  res.send({ issues });
});

// Get All Publishers
router.get("/publishers", async (req, res) => {
  // get the data from MongoDB
  const client = await connectClient();
  const publishers = await client
    .collection("issues")
    .aggregate([
      { $unwind: "$publisher" },
      { $group: { _id: "$publisher", count: { $sum: 1 } } },
      { $sort: { _id: -1 } },
    ])
    .toArray();
  res.send({ publishers });
});

// Get Comics that have the Horror label
router.get("/horror", async (req, res) => {
  // get the data from MongoDB
  const client = await connectClient();
  const collections = await client
    .collection("issues")
    //.find({ "collections.label": { $eq: "Horror" } })
    .aggregate([
      {
        $facet: {
          "categorizedByPublishers": [
            { $match: { "collections.label": "Horror" } },
            { $group: { _id: "$publisher", count: { $sum: 1 } } },
            { $sort: { _id: -1 } },
          ],
          "totalNumIssues": [
            {
              $count: "total",
            },
          ],
        },
      },
    ])
    .toArray();
  res.send({ collections });
});

module.exports = router;
