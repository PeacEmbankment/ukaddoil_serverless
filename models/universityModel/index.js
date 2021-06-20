const { MongoClient, Logger, ObjectId} = require("mongodb");
var mongodb = require('mongodb');
var  url = process.env.MONGODB_URL;
const assert = require('assert');

async function deleteUniversityCrime(uid){
    const client = new MongoClient(url, { useNewUrlParser: true });
    try {
        // Connect to the MongoDB cluster
        await client.connect();
        const coll = client.db('ucrime').collection('universities');
        console.log("uniModel - deleteCrime")
        var filter = { _id : new mongodb.ObjectID(uid)};
        var options = { upsert: true };
        var updateDoc = {$unset: {
            "crime":1
           }};
        await coll.updateOne(filter, updateDoc , options);
    } catch (e) {
        console.error(e);
    } finally {
        // Close the connection to the MongoDB cluster
        await client.close();
    }
}

async function deleteUniversityYearMonthCrime(uid, loadYear, loadMonth){
    const client = new MongoClient(url, { useNewUrlParser: true });
    try {
        // Connect to the MongoDB cluster
        await client.connect();
        const coll = client.db('ucrime').collection('universities');
        var query = { _id : new mongodb.ObjectID(uid)};
        var loadYearMonth = loadYear + "-" + loadMonth;
        var deleteValues = { $pull: {"crime": {"year_month": loadYearMonth} } };
        var options = {};
        var result = await client.db("ucrime").collection("universities").updateOne(query, deleteValues, options);
        console.log(
            `Model.deleteUniversityCrime - ${result.matchedCount} document(s) matched the filter, pull ${result.modifiedCount} document(s)`,
        );

    } catch (e) {
        console.error(e);
    } finally {
        // Close the connection to the MongoDB cluster
        await client.close();
    }
}

async function getUniversityBasicInfo2(uid){
    const client = new MongoClient(url, { useNewUrlParser: true});
  try {
      // Connect to the MongoDB cluster
      await client.connect();

       const agg7 = [
        {
          '$match': {
            '_id': new mongodb.ObjectId(uid)
          }
        }, {
          '$project': {
            'crime':0
          }
        }];
 
      console.log("uniModel - getUniversityBasicInfo2 - aggregate statement: " + JSON.stringify(agg7));
      const cursor = client.db("ucrime").collection("universities").aggregate(agg7);
      return cursor.toArray();
  } catch (e) {
      console.error(e);
  } finally {
      client.close();          
  }
}

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

async function insertUniversityYearMonthCrime(uid, loadYear, loadMonth, crime){
    // insert crime data of a Uni in a paritcular year-month, and update all pre-calculated fields 
    const client = new MongoClient(url, { useNewUrlParser: true });
    try {
        // Connect to the MongoDB cluster
        await client.connect();
        const coll = client.db('ucrime').collection('universities');
        var query = { _id : new mongodb.ObjectID(uid)};
        var loadYearMonth = loadYear + "-" + loadMonth;
        var newvalues = { $push: {"crime": {
            "year_month": loadYearMonth, 
            "crimes_street": crime} } };
        var options = {upsert: true};
        var result = await client.db("ucrime").collection("universities").updateOne(query, newvalues, options);
        console.log(
            `model.insertUniversityYearMonthCrime: ${result.matchedCount} document(s) matched the filter, push ${result.modifiedCount} document(s)`,
        );

        // calculate crime count
        const agg2 = [
            {
                '$match': {
                '_id': new mongodb.ObjectID(uid)
                }
            }, {
                '$project': {
                    'university_name': 1, 
                    'crime': {
                    '$filter': {
                        'input': '$crime', 
                        'as': 'selectedCrime', 
                        'cond': {
                        '$eq': [
                            '$$selectedCrime.year_month', loadYear + '-' + loadMonth
                        ]
                        }
                    }
                    }
                }
                }, {
                '$project': {
                    'university_name': 1, 
                    'selectedCrime': {
                    '$arrayElemAt': [
                        '$crime', 0
                    ]
                    }
                }
                }, {
                '$project': {
                    'university_name': 1, 
                    'year_month': '$selectedCrime.year_month', 
                    'crime_count': {
                    '$size': '$selectedCrime.crimes_street'
                    }
                }
                }
            ];

        //const coll = client.db('ucrime').collection('universities');
        var resultCount = await coll.aggregate(agg2).toArray();
        //console.log(resultCount);
        var projection = { crime_count: 1, university_name: 1 };
        var cursor = coll.aggregate(agg2).project(projection);
        //console.log("crime_count");

        // update the result to crime_count
        var document;
        var result_crime_count;
        var university_name;
        while ((document = await cursor.next())) {
            //console.log(document.crime_count);
            var filter = { _id : new mongodb.ObjectID(uid),
                "crime.year_month" : loadYearMonth};
                options = { upsert: true };
                var updateDoc = {$set: {"crime.$.crime_count": document.crime_count}};
                result_crime_count = document.crime_count;
                university_name = document.university_name;
                await coll.updateOne(filter, updateDoc, options);
        }
        
        // Count crime  group by category
        const agg3 = [
            {
                '$match': {
                '_id': new mongodb.ObjectID(uid)
                }
            }, {
                '$project': {
                'university_name': 1, 
                'crime': {
                    '$filter': {
                    'input': '$crime', 
                    'as': 'selectedCrime', 
                    'cond': {
                        '$eq': [
                        '$$selectedCrime.year_month', loadYear + '-' + loadMonth
                        ]
                    }
                    }
                }
                }
            }, {
                '$project': {
                'university_name': 1, 
                'selectedCrime': {
                    '$arrayElemAt': [
                    '$crime', 0
                    ]
                }
                }
            }, {
                '$replaceRoot': {
                'newRoot': '$selectedCrime'
                }
            }, {
                '$unwind': {
                'path': '$crimes_street'
                }
            }, {
                '$group': {
                '_id': '$crimes_street.category', 
                'count': {
                    '$sum': 1
                }
                }
            }, {
                '$sort': {
                '_id': 1
                }
            }
            ]

        var resultCountGroupByCategory = await coll.aggregate(agg3).toArray();

        // update the result to statistics

        var filter = { _id : new mongodb.ObjectID(uid),
                        "crime.year_month" : loadYearMonth};
        options = { upsert: true };
        var updateDoc = {$set: {"crime.$.statistics": resultCountGroupByCategory}};
        const resultUpdateStat = await coll.updateOne(filter, updateDoc, options);
        console.log(
        `model.insertUniversityYearMonthCrime - update result to statistics: ${resultUpdateStat.matchedCount} document(s) matched the filter, updated ${resultUpdateStat.modifiedCount} document(s)`,
        );
        
        // calculate average crime of all categories in last 6 months

        const agg4 = [
            {
                '$match': {
                '_id': new mongodb.ObjectID(uid)
                }
            }, {
                '$unwind': {
                'path': '$crime'
                }
            }, {
                '$sort': {
                'crime.year_month': -1
                }
            }, {
                '$limit': 6
            }, {
                '$unwind': {
                'path': '$crime.statistics'
                }
            }, {
                '$group': {
                '_id': '$crime.statistics._id', 
                'sum': {
                    '$sum': '$crime.statistics.count'
                }
                }
            }, {
                '$project': {
                'category': '$_id', 
                'averageWithoutRound': { $divide: [ "$sum", 6 ] }
                }
            }, {
                '$project': {
                'category': '$_id', 
                'average': { $round : [ "$averageWithoutRound", 1 ] }
                }
            }
            ]
    
        var cursor = coll.aggregate(agg4);

        // update the result to monthly_*_last_6m
        var document;
        var filter = { _id : new mongodb.ObjectID(uid),
        "crime.year_month" : loadYearMonth};
        options = { upsert: true };

        // set all m6_average_* to 0, because if no update, the value will be zero
        var updateDoc = {$set: 
                            {"m6_average_anti_social_behaviour": 0,
                            "m6_average_bicycle_theft": 0,    
                            "m6_average_burglary": 0,
                            "m6_average_criminal_damage_arson": 0,
                            "m6_average_drugs": 0,
                            "m6_average_other_crime": 0,
                            "m6_average_other_theft": 0,
                            "m6_average_possession_of_weapons": 0,
                            "m6_average_public_order": 0,
                            "m6_average_robbery": 0,
                            "m6_average_shoplifting": 0,
                            "m6_average_theft_from_the_person": 0,
                            "m6_average_vehicle_crime": 0,
                            "m6_average_violent_crime": 0}};
        await coll.updateOne(filter, updateDoc, options);
        
        while ((document = await cursor.next())) {
    
            if (document.category == "anti-social-behaviour") {
                var updateDoc = {$set: {"m6_average_anti_social_behaviour": document.average}};
                await coll.updateOne(filter, updateDoc, options);
            }

            if (document.category == "bicycle-theft") {
                var updateDoc = {$set: {"m6_average_bicycle_theft": document.average}};
                await coll.updateOne(filter, updateDoc, options);
            }
    
            if (document.category == "burglary") {
                var updateDoc = {$set: {"m6_average_burglary": document.average}};
                await coll.updateOne(filter, updateDoc, options);
            }

            if (document.category == "criminal-damage-arson") {
                var updateDoc = {$set: {"m6_average_criminal_damage_arson": document.average}};
                await coll.updateOne(filter, updateDoc, options);
            }

            if (document.category == "drugs") {
                var updateDoc = {$set: {"m6_average_drugs": document.average}};
                await coll.updateOne(filter, updateDoc, options);
            }

            if (document.category == "other-crime") {
                var updateDoc = {$set: {"m6_average_other_crime": document.average}};
                await coll.updateOne(filter, updateDoc, options);
            }

            if (document.category == "other-other-theft") {
                var updateDoc = {$set: {"m6_average_other_theft": document.average}};
                await coll.updateOne(filter, updateDoc, options);
            }

            if (document.category == "possession-of-weapons") {
                var updateDoc = {$set: {"m6_average_possession_of_weapons": document.average}};
                await coll.updateOne(filter, updateDoc, options);
            }

            if (document.category == "public-order") {
                var updateDoc = {$set: {"m6_average_public_order": document.average}};
                await coll.updateOne(filter, updateDoc, options);
            }
    
            if (document.category == "robbery") {
                var updateDoc = {$set: {"m6_average_robbery": document.average}};
                await coll.updateOne(filter, updateDoc, options);
            }

            if (document.category == "shoplifting") {
                var updateDoc = {$set: {"m6_average_shoplifting": document.average}};
                await coll.updateOne(filter, updateDoc, options);
            }

            if (document.category == "theft-from-the-person") {
                var updateDoc = {$set: {"m6_average_theft_from_the_person": document.average}};
                await coll.updateOne(filter, updateDoc, options);
            }

            if (document.category == "vehicle-crime") {
                var updateDoc = {$set: {"m6_average_vehicle_crime": document.average}};
                await coll.updateOne(filter, updateDoc, options);
            }

            if (document.category == "violent-crime") {
                var updateDoc = {$set: {"m6_average_violent_crime": document.average}};
                await coll.updateOne(filter, updateDoc, options);
            }
    
        }

        // add last update
        let date_ob = new Date();

        // adjust 0 before single digit date
        let date = ("0" + date_ob.getDate()).slice(-2);

        // current month
        let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);

        // current year
        let year = date_ob.getFullYear();

        // current hours
        let hours = date_ob.getHours();

        // current minutes
        let minutes = date_ob.getMinutes();

        // current seconds
        let seconds = date_ob.getSeconds();

        // prints date & time in YYYY-MM-DD HH:MM:SS format
        //console.log(year + "-" + month + "-" + date + " " + hours + ":" + minutes + ":" + seconds);
        var updateDoc = {$set: {"last_update": year + "-" + month + "-" + date + " " + hours + ":" + minutes + ":" + seconds}};
        await coll.updateOne(filter, updateDoc, options);

        // concatenate year_month range in last 6 months

        const agg5 = [
            {
                '$match': {
                '_id': new mongodb.ObjectID(uid)
                }
            }, {
                '$unwind': {
                'path': '$crime'
                }
            }, {
                '$sort': {
                'crime.year_month': -1
                }
            }, {
                '$limit': 6
            }, {
                '$group': {
                '_id': '$id', 
                'data_scope': {
                    '$push': {
                    '$concat': [
                        '$crime.year_month'
                    ]
                    }
                }
                }
            }, {
                '$project': {
                'data_scope_last_6m': {
                    '$reduce': {
                    'input': '$data_scope', 
                    'initialValue': '', 
                    'in': {
                        '$concat': [
                        '$$value', ', ', '$$this'
                        ]
                    }
                    }
                }
                }
            }
         ]

        var cursor = await coll.aggregate(agg5);

        // update the result to statistics

        var document;
        while ((document = await cursor.next())) {
            var filter = { _id : new mongodb.ObjectID(uid),
                "crime.year_month" : loadYearMonth};
                options = { upsert: true };
                var updateDoc = {$set: {"m6_data_scope": document.data_scope_last_6m.substring(2)}};
                await coll.updateOne(filter, updateDoc, options);
        }  
          
        // delete unnecessary field to reduce db size
        await coll.updateMany({}, {$unset: {
            "crime.$[].crimes_street.$[].location_type":1,
             "crime.$[].crimes_street.$[].context":1,
             "crime.$[].crimes_street.$[].outcome_status":1,
             "crime.$[].crimes_street.$[].persistent_id":1,
             "crime.$[].crimes_street.$[].location_subtype":1,
             "crime.$[].crimes_street.$[].month":1,            
             "crime.$[].crimes_street.$[].id":1,
             "crime.$[].crimes_street.$[].location.street":1
           }} , {multi: true});  



    } catch (e) {
        console.error(e);
    } finally {
        // Close the connection to the MongoDB cluster
        await client.close();
    }
}


module.exports = {
    deleteUniversityCrime,
    getUniversityBasicInfo2,
    deleteUniversityYearMonthCrime,
    insertUniversityYearMonthCrime,
    getUniversities
}