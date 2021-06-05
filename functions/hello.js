
exports.handler = async (event, context, callback) => {
    try {
      // your logic here
     callback(null, { 
        statusCode: 200, 
         body: "Hello World" 
     });
    } catch (err) {
      callback(err);
    }
  };