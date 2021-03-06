const express = require('express');
const bcrypt = require('bcryptjs');
const app = express();
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const Users = require('../models/users');
const Assignments = require('../models/assignments');
const ClassInformation = require('../models/classinformation');

var mongoDB = 'mongodb+srv://Emily_Vainberg:nreLh64ev12@cluster0.ldqdm.mongodb.net/total_class_information?retryWrites=true&w=majority';
app.use('/uploadquestion', bodyParser.urlencoded({ extended: false }));
app.use('/uploadquestion', bodyParser.json())
/////////DATES AND TIMES FOR DEADLINE COMPARISONS///////////
//our current date
//we turn the dates into string to make them easier to compare
//" '0'+... .slice(-2) " accounts for leading 0s.
function getCurrentDate() {
  var currentdate = new Date();
  var date = ('0' + currentdate.getDate()).slice(-2);
  var month = ('0'+(currentdate.getMonth()+1)).slice(-2);
  var year = currentdate.getFullYear();
  var hour = ('0' + currentdate.getHours()).slice(-2);
  var minutes = ('0' + currentdate.getMinutes()).slice(-2);
  var seconds = ('0' + currentdate.getSeconds()).slice(-2);
  var date_string=year+"-"+month+"-"+date+"T"+hour+":"+minutes+":"+seconds+".000+00:00";
  console.log("The current time is: "+ date_string)
  return date_string
}

date_string = getCurrentDate();

//function to compare deadlines
function compareDate(deadline) {
  var dldate = ('0' + deadline.getDate()).slice(-2);
  var dlmonth = ('0'+(deadline.getMonth()+1)).slice(-2);
  var dlyear = deadline.getFullYear();
  var dlhour = ('0' + deadline.getHours()).slice(-2);
  var dlminutes = ('0' + deadline.getMinutes()).slice(-2);
  var dlseconds = ('0' + deadline.getSeconds()).slice(-2);
  var dl_date_string=dlyear+"-"+dlmonth+"-"+dldate+"T"+dlhour+":"+dlminutes+":"+dlseconds+".000+00:00";
  console.log("Comparing deadline time is: "+ dl_date_string)

  //we use localeCompare for string comparison of the dates
  if (dl_date_string.localeCompare(date_string) == 1)
    return false;
  return true;
}
/////////DATES AND TIMES FOR DEADLINE COMPARISONS///////////

mongoose.connect(mongoDB, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log("Connection to database established.")
    })
    .catch(err => {
        console.log("Error connecting to database.")
        console.log(err)
    })

function parseMatches(a_matches, sort) {
  console.log("PARSEMATCHES received: ", sort);
  var matches =[]
  var ids = []
  if(sort === "Due Date") {
    a_matches.sort(function(a,b) {
      if (a.deadline > b.deadline) {
        return 1;
      }
      else if (a.deadline < b.deadline) {
        return -1;
      }
      else {
        return 0;
      }
    });
    for (let i of a_matches) {
      matches.push(i.title);
    }
  }
  else if (sort === "Grade Weightage") {
    a_matches.sort(function(a,b) {
      if (a.grade > b.grade) {
        return -1;
      }
      else if (a.grade < b.grade) {
        return 1;
      }
      else {
        return 0;
      }
    });
    for(let i of a_matches) {
      matches.push(i.title);
    }
  }
  else {
    for (let i of a_matches) {
      matches.push(i.title);
      ids.push(i._id);
    }
  }
  return matches;
}

app.get('/login', async function(req, res) {
  //const {email, password} = req.query;
  const email = req.query.email;
  const password = req.query.password;
  //console.log(q);
  console.log("Server side received: ", email, password);
  var a_matches = await Users.findOne({
    email: email
  })
  if(!a_matches) {
    a_matches = null;
  }
  if(a_matches) {
    bcrypt.compare(password, a_matches.hash)
    .then((result) => res.send({response: result}))
    .catch((failure) => res.send({response: failure}));
  }
  else
    res.send({response: false});
})

app.get('/search', async function(req, res){
    const q = req.query.q;
    const sort = req.query.sort;
    console.log("/SEARCH sort value: ", sort);
    console.log("Search string backend: ",q);
    const a_matches = await Assignments.find({
      title: {"$regex": q, "$options": "i"}
    });
    //console.log(a_matches);
    const matches = parseMatches(a_matches, sort);
    console.log(matches);
    res.send( {response: matches});
})

app.get('/', (req, res) => {
    res.redirect('/login');
})

app.listen(3000, () => {
  console.log("LISTENING!");
})

app.get('/description', async function(req, res){
  const {q} = req.query;
  console.log("called app.get for assignment description : " + q);
  const d_matches = await Assignments.find({
    title: q
  });
  console.log(d_matches);
  console.log("outputted description object");
  res.send( {response: d_matches} );
})

app.get('/summary', async function(req, res){
  console.log("called app.get for assignment summary");
  const d_matches = await Assignments.find({});
  const matches = parseMatchesSummary(d_matches);

  // sorting matches by deadline
  var original_dueDates = matches[2];
  var sorted_dueDates = matches[2];
  sorted_dueDates.sort(function(a,b){
    if (a < b)         return -1;
    else if(a > b)     return  1;
    else               return 0;
  });
  var order = [];
  for (i in sorted_dueDates){
    for (let j = 0; j < original_dueDates.length; j++){
      if (sorted_dueDates[i] == original_dueDates[j]) {
        //console.log(sorted_dueDates[i])
        //console.log(original_dueDates[i])
        order.push(j)
        //console.log(j)
      }
    }
  }
  //console.log(original_dueDates)
  //console.log(sorted_dueDates)
  //console.log(order)
  console.log("outputted summary object");
  res.send( {response: matches, order: order} );
})

//This creates arrays of upcoming asssignments
function parseMatchesSummary(a_matches) {
  var classes = []
  var titles = []
  var dueDates = []
  var summaries = []
  for (let i of a_matches) {
    if (compareDate(i.deadline))
      continue;
    classes.push(i.class);
    titles.push(i.title);
    dueDates.push(i.deadline);
    summaries.push(i.description);
  }
  return [
    classes,
    titles,
    dueDates,
    summaries
  ];
}

// used for accessing database for the calendar discussion / lectures / OHs
app.get('/calendar', async function(req, res){
  console.log("called app.get for assignment calendar");
  const d_matches = await ClassInformation.find({});
  console.log("a");
  console.log(Object.getOwnPropertyNames(d_matches));
  console.log("b");
  const matches = parseMatchesCalendar(d_matches);
  console.log("outputted calendar object");
  res.send( {response: matches} );
})

// Post route gets the information from assignments question and
// you can uncomment the console.log statements to see how it works
app.post('/uploadquestion', function(req, res) {
  // var question = (req.body.slice(-1)[0]).question;
  // var assignment = (req.body.slice(-1)[0]).assignment;
  // var responses = (req.body.slice(-1)[0]).responses;
  var index = (req.body.index);
  // console.log((req.body.m_disc.slice()[index]))
  // console.log(index)
  if (index == 0) {
    var question = (req.body.m_disc.slice(-1)[0]).question;
    var assignment = (req.body.m_disc.slice(-1)[0]).assignment;
    var responses = (req.body.m_disc.slice(-1)[0]).responses;
  }
  else {
    var question = (req.body.m_disc.slice()[index]).question;
    var assignment = (req.body.m_disc.slice()[index]).assignment;
    var responses = (req.body.m_disc.slice()[index]).responses;
  }
  var response
  // making a question/response object to be passed in
  var question_object = {
    text: question.text,
    date: question.date
  }
  var question_response = {
    question: question_object,
    responses: responses
  }
  if(responses.length != 0) {
    response = responses[responses.length - 1]
  }
  
  mongoose.connect(mongoDB, function(err,db){
    if (err) { throw err; }
    else {
      var collection = db.collection("assignments");
      if (responses.length != 0) {
        //collection.updateOne({"title": assignment}, {$pull: {"discussion":{"question": question}}}, false, true);
        const obj = 'discussion.'+index+'.responses';
        collection.findOneAndUpdate({"title": assignment}, {$push: {[obj]: response}},  function(err,doc) {
          if (err) { throw err; }
          else { console.log("Updated"); }
        });  
      }
      else {
        collection.findOneAndUpdate({"title": assignment}, {$push: {"discussion": question_response}},  function(err,doc) {
          if (err) { throw err; }
          else { console.log("Updated"); }
        });  
      }
    }
  });
  console.log(question);
  console.log(assignment);
  console.log(responses);
  console.log(response);
  res.json(req.body)
})

//This creates array of upcoming discussions, lectures, OHs
function parseMatchesCalendar(a_matches) {
    return a_matches; 
    /*
  var classes = []
  var discussions = []
  var lectures = []
  var officeHours = []
  for (let i of a_matches) {
    console.log(i);
    classes.push(i.class_name);
    discussions.push(i.discussions);
    lectures.push(i.lecture_dates);
    officeHours.push(i.office_hours);
  }
  // console.log(1);
  // console.log(discussions);
  // console.log(lectures);
  // console.log(officeHours);
  return [
    classes,
    discussions,
    lectures,
    officeHours
  ];*/
}

//get asssignments for the calendar
app.get('/cal', async function(req, res){
  const d_matches = await Assignments.find({});
  const matches = parseMatchesAssign(d_matches);
  res.send( {response: matches} );
})

//This creates arrays of upcoming asssignments
function parseMatchesAssign(a_matches) {
  var classes = []
  var titles = []
  var dueDates = []
  var summaries = []
  for (let i of a_matches) {
    classes.push(i.class);
    titles.push(i.title);
    dueDates.push(i.deadline);
    summaries.push(i.description);
  }
  return [
    classes,
    titles,
    dueDates,
    summaries
  ];
}
