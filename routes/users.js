const express = require('express');
const router = express.Router();
const AWS = require('aws-sdk');
const config = require('../config.js');
const bodyParser=require('body-parser');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');


function generateSessionId() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
  }
/* GET users listing. */
  // Gets all users
  router.get('/', (req, res, next) => {
    console.log('heyyyyy 1');
      AWS.config.update(config.aws_remote_config);
    const docClient = new AWS.DynamoDB.DocumentClient();
    const params = {
      TableName: config.aws_table_name
    };
    docClient.scan(params, (err, data) => {
      if (err) {
        res.statusCode = 500;
        res.send({
          success: false,
          message: 'Server error'
        });
      } else {
        const { Items } = data;
        console.log('heyyyyy 2', Items);
        res.send({
          success: true,
          users: Items
        });
      }
    });
  }); // end of app.get(/)

  //get user by email

  router.get('/:email', (req, res, next) => {
    console.log('heyyyyy 1', req.headers);
    const sessionId = req.headers.sessionid;
    if(sessionId) {
    const email = req.params.email;
      AWS.config.update(config.aws_remote_config);
    const docClient = new AWS.DynamoDB.DocumentClient();
    const params = {
      TableName: config.aws_table_name,
      Key: {
        "username": email,
      }
    };
    docClient.get(params, function(err, data) {
      if (err) {
        res.statusCode = 500;
        res.send({
          success: false,
          message: 'Server error'
        });
      } else {
        const { Item } = data;
        console.log('heyyyyy 2', data);
        res.send({
          success: true,
          user: Item
        });
      }
    });
  } else {
    res.send({
      success: false,
      status: 500,
      message: 'Session expired'
    });
  }
  }); 

  router.post('/register', function(req, res, next){
    AWS.config.update(config.aws_remote_config);
    const docClient = new AWS.DynamoDB.DocumentClient();
    /* Paramaters */
      const userEmail = req.body.email;
      const password = req.body.password;
      const firstname = req.body.firstname;
      const lastname = req.body.lastname;
      const isAdmin = req.body.admin;
     
      console.log("Heyyyyy1", req.body);
      if(!userEmail || !password || !firstname || !lastname) {
        res.json({success: false, data:{message:"Required parameters are missing"}});
      } else {
    //Read for current user.
    
    const params = {
        TableName: config.bucketName,
        Key:{
            "username": userEmail,
        }
    };
        // create hash
       const hash = crypto.createHmac('sha512', config.hashKey);
       hash.update(password);
       const hashed_pass = hash.digest('hex').toString();
    
    /* INTO DATABASE */
    const userInfo = {
        TableName: config.aws_table_name,
        Item:{
            "password_SHA512": hashed_pass,
            "userId": uuidv4(),
            "firstname": firstname,
            "lastname":lastname,
            "isAdmin": isAdmin,
            "username": userEmail,
            "files": [],
        }
    };
    console.log('Heyyy 2', userInfo)
    docClient.put(userInfo, (err, data) => {
        if (err) {
        res.statusCode = 500;
            res.json({ success: false, data:{message:"Unable to write user"+err}});
        } else {
            res.json({success: true, data: {message: "Thanks for signing up!  Please login to proceed.."}});
        }
    });
             
    
  }
    });
    
    router.post('/login', function(req, res, next){
      AWS.config.update(config.aws_remote_config);
    const docClient = new AWS.DynamoDB.DocumentClient();
      const email = req.body.email;
      const password= req.body.password;
    
    //Generate password from header submission
      const hash = crypto.createHmac('sha512', config.hashKey);
      hash.update(password);
      const hashed_pass = hash.digest('hex').toString();
    
        const query = {
            TableName: config.aws_table_name,
            Key:{
                "username": email
            }
        };
        
        console.log("params", query)
      docClient.get(query, function(err, data) {
        if (err) {
        res.statusCode = 500;

            res.json({success: false, data:{message:"Unable to read item. "+err}});
        } else {
          console.log("data", data)
            actualPassword = data.Item.password_SHA512;
            if (hashed_pass === actualPassword){
              const sessionID = generateSessionId()
              res.send({"success": true, data:{"sessionID":sessionID}});
              
          } else {
            res.json({"success":false, data:{message:"Login failed, credentials are incorrect."}});
            // Commit IP to the BLOCK DB after 10 attempts
          }
        }
    });
    });

module.exports = router;
