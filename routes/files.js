var express = require('express');
var router = express.Router();
const AWS = require('aws-sdk');
const fs = require('fs');
const config = require('../config.js');
const { S3 } = require('aws-sdk');


 function uploadFile(filename, fileDirectoryPath) {
    AWS.config.update(config.aws_remote_config);
    const s3 = new AWS.S3();
  
    
    return new Promise(function (resolve, reject) {
      fs.readFile(fileDirectoryPath.toString(), function (err, data) {
        if (err) { reject(err); }
        s3.putObject({
          Bucket: config.bucketName,
          Key: filename,
          Body: data
        }, function (err, data) {
          if (err) reject(err);
          resolve(data);

        });
      });
    });
  }

  function deleteFile(filename) {
    AWS.config.update(config.aws_remote_config);
    const s3 = new AWS.S3();
        return new Promise((resolve, reject) => {
                s3.deleteObject(
                    {Bucket: config.bucketName,
                    Key: filename
                }, function (err, data) {
                    if (err) reject(err);
                    resolve(data);      
                })
        });
  }

/* GET home page. */
router.post('/upload/:email', async function(req, res, next) {
    console.log(req.file)
    const size = req.file.size/1024/1024;

    if(size <= 10) {
    let response = await uploadFile(req.file.originalname, req.file.path);
    if(response){
        AWS.config.update(config.aws_remote_config);
       const docClient = new AWS.DynamoDB.DocumentClient();
       const userEmail = req.params.email;
       const date = new Date();
       const file = {
           fileName: req.file.originalname,
           downloadUrl: config.cloudFrontUrl+req.file.originalname,
           modifiedDate: date.toString(),
           uploadedDate: date.toString(),
           description: req.file.description
       }
       const params = {
        TableName: config.aws_table_name,
        Key:{
            "username": userEmail,
        }
    };
    docClient.get(params, (err, data)  => {
        if (err) {
        res.statusCode = 500;
            res.json({success: false, data:{message:"Unable to connect"+err}});
        } else if(data){
           const files = data.Item.files;
            files.push(file);
            const params1 = {
                TableName: config.aws_table_name,
                Key:{
                "username": userEmail,
                },
                UpdateExpression: "set files = :x",
                ExpressionAttributeValues: {
                    ":x": files,
                }
            };
        
            docClient.update(params1, function(err, data) {
                if (err) {
                    res.statusCode = 500;
                    res.json({success: false, data:{message:"Error occured while uploading"+err}});
                } else {
                    res.send({
                        success: true,
                        data: {message: "File uploaded successfully!"}
                    });

                }
            });
        }


    });
    } else {
        res.statusCode = 500;
        res.json({success: false, data:{message:"Server error"}});
    }
} else {
    res.statusCode = 500;
    res.json({success: false, data:{message:"File size should be less than 10MB"}});
}
});

router.put('/delete/:email/:fileName', function(req,res,next) {
    const response = deleteFile(req.params.fileName);
    if(response) {
    AWS.config.update(config.aws_remote_config);
    const docClient = new AWS.DynamoDB.DocumentClient();
    const params = {
        TableName: config.aws_table_name,
        Key:{
            "username": req.params.email,
        }
    };
    docClient.get(params, (err, data)  => {
        if (err) {
        res.statusCode = 500;
            res.json({success: false, data:{message:"Unable to connect"+err}});
        } else {
            const files = data.Item.files;
            const index = files.findIndex(file => file.fileName === req.params.fileName);
            files.splice(index,1);
            const params1 = {
                TableName: config.aws_table_name,
                Key:{
                "username": req.params.email,
                },
                UpdateExpression: "set files = :x",
                ExpressionAttributeValues: {
                    ":x": files,
                }
            };
        
            docClient.update(params1, function(err, data) {
                if (err) {
                    res.statusCode = 500;
                    res.json({success: false, data:{message:"Error occured while deleting from DB"+err}});
                } else {
                    res.send({
                        success: true,
                        data: {message: "File deleted successfully!"}
                    });

                }
            });
        }
    });
} else {
    res.statusCode = 500;
    res.json({success: false, data:{message:"Error occured while deleting from bucket"+err}});
}
});

router.put('/edit/:email/:filename', async function(req,res,next) {
    console.log(req.file)
    const size = req.file.size/1024/1024;

    if(size <= 10) {
    let response = await uploadFile(req.file.originalname, req.file.path);
    if(response){
        AWS.config.update(config.aws_remote_config);
       const docClient = new AWS.DynamoDB.DocumentClient();
       const userEmail = req.params.email;
       const date = new Date();
       const params = {
        TableName: config.aws_table_name,
        Key:{
            "username": userEmail,
        }
    };
    docClient.get(params, (err, data)  => {
        if (err) {
        res.statusCode = 500;
            res.json({success: false, data:{message:"User not found"+err}});
        } else if(data){
            const files = data.Item.files;
            const index = files.findIndex(file => file.fileName === req.params.filename);
            files[index].description = req.body.description;
            files[index].modifiedDate = date.toString();
            const params1 = {
                TableName: config.aws_table_name,
                Key:{
                "username": req.params.email,
                },
                UpdateExpression: "set files = :x",
                ExpressionAttributeValues: {
                    ":x": files,
                }
            }
            docClient.update(params1, function(err, data) {
                if (err) {
                    res.statusCode = 500;
                    res.json({success: false, data:{message:"Error occured while editing"+err}});
                } else {
                    res.send({
                        success: true,
                        data: {message: "File Edited successfully!"}
                    });

                }
            });
        }


    });
    } else {
        res.statusCode = 500;
        res.json({success: false, data:{message:"Server error"}});
    }
} else {
    res.statusCode = 500;
    res.json({success: false, data:{message:"File size should be less than 10MB"}});
}

});





module.exports = router;