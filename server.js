var express = require("express");
var logger = require("morgan");
var mongoose = require("mongoose");
var path = require("path");

// Our scraping tools
var axios = require("axios");
var cheerio = require("cheerio");

// Require all models
var db = require("./models");

var PORT = process.env.PORT || 3000;

// Initialize Express
var app = express();

// Configure middleware
// Use morgan logger for logging requests
app.use(logger("dev"));
// Parse request body as JSON
///set to false to fix bug
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
// Make public a static folder
app.use(express.static("public"));

//set up handlebars
var exphbs = require("express-handlebars");
app.engine("handlebars", exphbs({
  defaultLayout: "main",
  partialsDir: path.join(__dirname, "/views/layouts/partials")
}));
app.set("view engine", "handlebars");

// If deployed, use the deployed database. Otherwise use the local mongoHeadlines database
var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/mongoHeadlines";
mongoose.connect(MONGODB_URI);

// =============================Routes==================================================

//===================================GET "/scrape"=========================================
// A GET route for scraping the npr website website
app.get("/scrape", function (req, res) {

  // First, we grab the body of the html with axios
  axios.get("https://www.npr.org/sections/world/").then(function (response) {
    // Then, we load that into cheerio and save it to $ for a shorthand selector
    var $ = cheerio.load(response.data);

    // Now, pull information from html within an article tag, and do the following:
    $("div.item-info ").each(function (i, element) {
      // Save an empty result object
      var result = {};

      // Add the text and href of every link, and save them as properties of the result object
      result.title = $(this)
        .children("h2")
        .children("a")
        .text();
      result.link = $(this)
        .children("p")
        .children("a")
        .attr("href");
      result.summary = $(this)
        .children("p")
        .children("a")
        .text();

      // Create a new Article using the `result` object built from scraping
      db.Article.create(result)
        .then(function (dbArticle) {
          // View the added result in the console
          console.log(dbArticle);
        })
        .catch(function (err) {
          // If an error occurred, log it
          console.log(err);
        });
    });

    // Send a message to the client
    res.send("Scrape Complete");
  });
});

//===================================GET "/saved"=========================================
//Get att the saved articles
app.get("/saved", function (req, res) {
  db.Article.find({ saved: true })
 // .populate("notes")
  .then(function (articles) {
    console.log(articles);
    var hbsObject = {
      article: articles
    };
    res.render("saved", hbsObject);
  });
});


//==================================="/articles"=========================================
// Route for getting all Articles from the db
app.get("/articles", function (req, res) {
  // Grab every document in the Articles collection
  db.Article.find({})
    .then(function (dbArticle) {
      // If we were able to successfully find Articles, send them back to the client
      res.json(dbArticle);
    })
    .catch(function (err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

//==================================="GET /articles/:id"=========================================
// Route for grabbing a specific Article by id, populate it with it's note
app.get("/articles/:id", function (req, res) {
  // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
  db.Article.findOne({ _id: req.params.id })
    // ..and populate all of the notes associated with it
    .populate("note")
    .then(function (dbArticle) {
      // If we were able to successfully find an Article with the given id, send it back to the client
      res.json(dbArticle);
    })
    .catch(function (err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

//==================================="POST /articles/save/:id"=========================================
// Route alter the article entry to indicate that it is "saved"
app.post("/articles/save/:id", function (req, res) {
  console.log("save route hit");
  db.Article.findOneAndUpdate({ _id: req.params.id }, { saved: true, notes: [] },{new:true})
    .then(function (dbArticle) {
      res.json(dbArticle);
    })
    .catch(function (err) {
      res.json(err);
    });
});

//=============================================="/"===================================================
//A GET route to render the home page using handlebars
app.get("/", function (req, res) {
  db.Article.find({ "saved": false }, function (error, data) {
    var hbsObject = {
      article: data
    };
    //console.log(hbsObject);
    res.render("home", hbsObject);
  });
});

//========================================POST "/articles/delete/:id"===================================================
// Delete an article
app.post("/articles/delete/:id", function (req, res) {
  db.Article.findOneAndUpdate({ "_id": req.params.id }, { "saved": false, "notes": [] })
    .then(function (dbArticle) {
      res.json(dbArticle);
    })
    .catch(function (err) {
      res.json(err);
    });
});

//========================================POST "/articles/save/:id"===================================================
// Route for saving/updating an Article's associated Note
app.post("/notes/save/:id", function (req, res) {
  // Create a new note and pass the req.body to the entry
  db.Note.create(req.body)
    .then(function (dbNote) {
      // If a Note was created successfully, find one Article with an `_id` equal to `req.params.id`. Update the Article to be associated with the new Note
      // { new: true } tells the query that we want it to return the updated User -- it returns the original by default
      // Since our mongoose query returns a promise, we can chain another `.then` which receives the result of the query
      return db.Article.findOneAndUpdate({ _id: req.params.id }, { $push: { notes: dbNote._id } }, { new: true });
    })
    .then(function (dbArticle) {
      // If we were able to successfully update an Article, send it back to the client
      res.json(dbArticle);
    })
    .catch(function (err) {
      // If an error occurred, send it to the client
      res.json(err);
    });

});

//========================================POST ""/notes/delete/:note_id/:article_id"===================================================
//!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// Delete a note
app.delete("/notes/delete/:note_id/:article_id", function (req, res) {
  db.Note.findOneAndRemove({ "_id": req.params.note_id }, function (err) { })
    .then(function (dbNote) {
      //return dbArticle.findOneAndUpdate({ "_id": req.params.article_id }, {$pull: {"notes": req.params.note_id}}, { new: true })
      if (err) {
        console.log(err);
        res.send(err);
      }
      else {
        Article.findOneAndUpdate({ "_id": req.params.article_id }, { $pull: { "notes": req.params.note_id } }, { new: true })
          .then(function (err) {
            if (err) {
              console.log(err);
              res.send(err);
            }
            else {
              res.send("Note Deleted");
            }
          });
      }
    });
});

// Start the server
app.listen(PORT, function () {
  console.log("App running on port " + PORT + "!");
});


