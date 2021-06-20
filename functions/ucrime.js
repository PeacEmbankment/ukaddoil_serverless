import serverless from 'serverless-http'
import express from 'express'
import cors from 'cors'
//const cors = require('../express/cors');
import morgan from 'morgan'
import bodyParser from 'body-parser'
const winstonLogger = require('../config/logger');
const { MongoClient, Logger, ObjectId} = require("mongodb");
var mongodb = require('mongodb');
var  url = process.env.MONGODB_URL;

var universityServices = require('../services/universityServices');

// We need to define our function name for express routes to set the correct base path
const functionName = 'ucrime'

const app = express()
const router = express.Router()
    
// Set router base path for local dev
const routerBasePath = process.env.NODE_ENV === 'dev' ? `/${functionName}` : `/.netlify/functions/${functionName}/`
  
const whitelist = ['http://localhost:3000', 'http://localhost:3001', 'https://localhost:3443'];
var corsOptionsDelegate = (req, callback) => {
  var corsOptions;
  console.log(req.header('Origin'));
  if(whitelist.indexOf(req.header('Origin')) !== -1) {
      //corsOptions = { origin: true };
      
      //corsOptions = { origin: 'http://localhost:3001' };
  }
  else {
      corsOptions = { origin: false };
  }
  callback(null, corsOptions);
};

router.use(cors()); 

// Apply express middlewares
router.use(bodyParser.json())
//router.use(bodyParser.urlencoded({ extended: true }))  

router.route('/')
// show all univereities
.get(cors(), async (req, res) => {
    res.send(await universityServices.getUniversities());
    //res.send("rout / get");
})
// add university
.post(cors(), async (req, res) => {
      let result = await createUniversity(req.body);
      res.send(result);    
});

router.route('/reloadall/')
// reload all crime data of all universities
.get(cors(), async (req, res) => {
  await universityServices.reloadAlUniCrimeData()
});

router.route('/LoadCrimeData/')
// reload crime data of a Uni of particular year-month
.options(cors(corsOptionsDelegate), (req, res) => { res.sendStatus(200); })
.post(cors(corsOptionsDelegate), async (req,res) => {
    console.log("in post /Ucrime/LoadCrimeData/ - req.body.university: " + req.body.university);
    //winstonLogger.info("in post /Ucrime/LoadCrimeData/ - req.body: " + JSON.stringify(req.body));
    let result =await universityServices.downloadUniversityCrimeYearMonth(req.body.university, req.body.year, req.body.month);
    console.log("result in /Ucrime/LoadCrimeData/ endpoint");
    console.log(result);
    res.send(result);
});

router.route('/LoadCrimeData2/')
// reload crime data of a Uni
.options(cors(corsOptionsDelegate), (req, res) => { res.sendStatus(200); })
.post(cors(corsOptionsDelegate), async (req,res) => {
    console.log("in post /Ucrime/LoadCrimeData2/ - req.body.university: " + req.body.university);
    //winstonLogger.info("in post /Ucrime/LoadCrimeData/ - req.body: " + JSON.stringify(req.body));
    let result =await universityServices.downloadUniversityCrime(req.body.university);
    console.log("result in /Ucrime/LoadCrimeData2/ endpoint");
    console.log(result);
    res.send(result);
});

router.route('/:uid')
//.options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
// show basic info of a uni
.get(cors(), async (req, res) => {
  //res.send(await getUniversityBasicInfo(req.params.uid));
  res.send(await universityServices.getUniversityBasicInfo2(req.params.uid))
})
// delete a university
.delete(cors(), async (req,res) => {
    let result = await deleteUniversity(req.params.uid);
    res.send(result);    
});

router.route('/:uid/crime')
//.options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
.get(cors(), async (req, res) => {
  res.send(await getUniversityCrime(req.params.uid));
});

router.route('/:uid/:year_month')
//For UCrime/uid/yyyy_mm (ie. return array of latlong of all crime of a uni in a particular yyyy-mm)
//.options(cors(), (req, res) => { res.sendStatus(200); })
.get(cors(), async (req, res) => {
  res.send(await getUniversityYearMonthLagLong(req.params.uid, req.params.year_month));
});

router.route('/:uid/:year_month/:lat/:long')
// Get the crime statistics of particular latong of a uni in a particular month
//.options(cors(), (req, res) => { res.sendStatus(200); })
.get(cors(), async (req, res) => {
  res.send(await getUniversityYearMonthLagLongStat(req.params.uid, req.params.year_month, req.params.lat, req.params.long));
});


// Attach logger
//  app.use(morgan(customLogger))
  
// Setup routes
app.use(routerBasePath, router)
  

// Export lambda handler
exports.handler = serverless(app)

async function createUniversity(newUniversity){
  const client = new MongoClient(url, { useNewUrlParser: true });
  try {
      // Connect to the MongoDB cluster
      await client.connect();
      const result = await client.db("ucrime").collection("universities").insertOne(newUniversity);
      console.log(`New University created with the following id: ${result.insertedId}`);
      //return result.insertedId;
      //return result;
      const agg = [{'$project': {'_id': 1, 'university_name': 1, 'university_full_name': 1, 'latitude': 1, 'longitude': 1}}];
      const cursor = client.db("ucrime").collection("universities").aggregate(agg)
      return cursor.toArray();

  } catch (e) {
      console.error(e);
  } finally {
      // Close the connection to the MongoDB cluster
      await client.close();
  }
};

async function deleteUniversity(uid){
  const client = new MongoClient(url, { useNewUrlParser: true });
  try {
      // Connect to the MongoDB cluster
      await client.connect();

      const query = { _id : new mongodb.ObjectID(uid)  };
      const result = await client.db("ucrime").collection("universities").deleteOne(query);
      if (result.deletedCount === 1) {
          console.dir("Successfully deleted one document.");
      } else {
          console.log("No documents matched the query. Deleted 0 documents.");
      }
      const agg = [{'$project': {'_id': 1, 'university_name': 1, 'university_full_name': 1, 'latitude': 1, 'longitude': 1}}];
      const cursor = client.db("ucrime").collection("universities").aggregate(agg)
      return cursor.toArray();
  } catch (e) {
      console.error(e);
  } finally {
      // Close the connection to the MongoDB cluster
      await client.close();
  }
};

async function getUniversityYearMonthLagLong(loadUniversity, year_month){
  const client = new MongoClient(url, { useNewUrlParser: true });
  try {
      // Connect to the MongoDB cluster
      await client.connect();

      var agg8 = [
        {
          '$match': {
            '_id': new mongodb.ObjectID(loadUniversity)
          }
        }, {
          '$unwind': {
            'path': '$crime'
          }
        }, {
          '$match': {
            'crime.year_month': year_month
          }
        }, {
          '$replaceRoot': {
            'newRoot': '$crime'
          }
        }, {
          '$project': {
            'crimes_street': 1
          }
        }, {
          '$unwind': {
            'path': '$crimes_street'
          }
        }, {
          '$replaceRoot': {
            'newRoot': '$crimes_street.location'
          }
        }
      ];

      const cursor = await client.db("ucrime").collection("universities").aggregate(agg8)
      return await cursor.toArray();
  } catch (e) {
      console.error(e);
  } finally {
      client.close();
  }
}

 
async function getUniversityYearMonthLagLongStat(loadUniversity, year_month, lat, long){
  const client = new MongoClient(url, { useNewUrlParser: true });
  try {
      // Connect to the MongoDB cluster
      await client.connect();

      var agg9 = [
        {
          '$match': {
            '_id': new mongodb.ObjectID(loadUniversity)
          }
        }, {
          '$unwind': {
            'path': '$crime'
          }
        }, {
          '$match': {
            'crime.year_month': year_month
          }
        }, {
          '$replaceRoot': {
            'newRoot': '$crime'
          }
        }, {
          '$project': {
            'crimes_street': 1
          }
        }, {
          '$unwind': {
            'path': '$crimes_street'
          }
        }, {
          '$match': {
            'crimes_street.location.latitude': lat, 
            'crimes_street.location.longitude': long
          }
        }, {
          '$group': {
            '_id': '$crimes_street.category', 
            'count': {
              '$sum': 1
            }
          }
        }
      ];

      const cursor = await client.db("ucrime").collection("universities").aggregate(agg9)
      return await cursor.toArray();
  } catch (e) {
      console.error(e);
  } finally {
      client.close();
  }
}


async function getUniversityCrime(loadUniversity){
  const client = new MongoClient(url, { useNewUrlParser: true });
  try {
      // Connect to the MongoDB cluster
      await client.connect();

      const agg6 = [
        {
          '$match': {
            '_id': new mongodb.ObjectID(loadUniversity)
          }
        }, {
          '$project': {
            '_id': 0, 
            'crime.year_month': 1, 
            'crime.crime_count': 1, 
            'crime.statistics': 1
          }
        }, {
          '$unwind': {
            'path': '$crime'
          }
        }, {
          '$replaceRoot': {
            'newRoot': '$crime'
          }
        }, {
          '$sort': {
            'year_month': -1
          }
        }, {
          '$limit': 6
        }
      ];

      
      const cursor = client.db("ucrime").collection("universities").aggregate(agg6)
      
      return cursor.toArray();
  } catch (e) {
      console.error(e);
  } finally {
      client.close();          
  }
};

