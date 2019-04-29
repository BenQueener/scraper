# scraper
This project still has a known bug.  The notes are saved to the database, but they are not displayed correctly.  Additionally, the delete note button does not delete notes.

https://git.heroku.com/scraper-8765309.git
https://github.com/BenQueener/scraper


# All the News That's Fit to Scrape

### Overview

In this assignment, I created a web app that lets users view and leave comments on the latest news scraped from the NPR website using Mongoose and Cheerio. The project was then deployed on Heroku using mLab.

### Technologies
This project used the following npm packages:

   1. express

   2. express-handlebars

   3. mongoose

   4. cheerio

   5. axios


## Overview
Whenever a user visits youthe site, the app will allow them to scrape the latest stories from NPR. Each scraped article is saved to the application database. The app scrapes and displays the following information for each article:

     * Headline - the title of the article

     * Summary - a short summary of the article

     * URL - the url to the original article

 The user is also able to leave comments on the articles displayed and revisit them later. The comments are saved to the database as well and associated with their articles. Users can delete comments left on articles. All the stored comments are visible to every user.


