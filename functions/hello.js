const { MongoClient, Logger } = require("mongodb");
var mongodb = require('mongodb');
require('dotenv').config();
var  url = process.env.MONGODB_URL;
//MONGODB_URL = mongodb+srv://root:Tl6MtxLDfT96gAzO@cluster0.pjaqo.mongodb.net/myFirstDatabase?retryWrites=true&w=majority
//var url = MONGODB_URL = "mongodb+srv://root:Tl6MtxLDfT96gAzO@cluster0.pjaqo.mongodb.net/myFirstDatabase?retryWrites=true&w=majority";

async function getUniversities(){
  const client = new MongoClient(url, { useNewUrlParser: true });
  try {
      // Connect to the MongoDB cluster
      await client.connect();

      const agg = [
          {'$project': 
              //{'_id': 1, 'university_name': 1, 'university_full_name': 1, 'latitude': 1,                      'longitude': 1, 'm6_data_scope':1, 'm6_average_robbery':1, 'm6_average_burglary':1}
              {'crime':0}
          },{'$sort': {'university_name':1}}];

      const cursor = client.db("ucrime").collection("universities").aggregate(agg)
      
      return cursor.toArray();
  } catch (e) {
      console.error(e);
  } finally {
      // Close the connection to the MongoDB cluster
      console.log("client.close() in finally");
      client.close()
      .then(r => console.log('db successfully closed'));
      
  }
};



exports.handler = async (event, context, callback) => {
    try {
      // your logic here
      var temp = await getUniversities();
     callback(null, { 
        statusCode: 200, 
         //body: "Hello World" 
         body: JSON.stringify(temp)
     });
    } catch (err) {
      callback(err);
    }
  };