require('dotenv').config();


const {
  performance
} = require('perf_hooks');

let AWS = require("aws-sdk");
const {
  assert
} = require('console');
let polly = new AWS.Polly();
let s3 = new AWS.S3();
let folder = "data/";
let typeOfGame = {
  "letters": "letters/",
  "sentences": "sentences/",
  "words": "words/"
};
let typeOfDifficulty = {
  "easy": "easy/",
  "medium": "medium/",
  "hard": "hard/"
};

let typeOfData = {
  "Karl": "Karl/",
  "Dora": "Dora/",
  "Text": "Text/",
  "TextKey": "TextKey/"
}

const axios = require('axios'); // for making requests to the API

module.exports.generateImage = async (event, context, callback) => {
  const text = JSON.parse(event.body).text; // Assume the text to be turned into an image is sent in the request body

  // Call the OpenAI API
  const openAiResponse = await axios.post(
    'https://api.openai.com/v1/images/generations',
    {
      model: "image-generation-model-id", // Replace with the actual model ID
      prompt: text,
      n: 1,
      size: "1024x1024"
    },
    {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` // Replace with your actual OpenAI API key
      }
    }
  );

  console.log("openAiResponse", openAiResponse);

  const imageBuffer = openAiResponse.data.data[0].url; // Adjust according to the actual response structure

  // Save the image to S3
  const s3 = new AWS.S3();
  const s3params = {
    Bucket: 'lesapp-data', // Your S3 Bucket name
    Key: `generated_images/${context.awsRequestId}.png`, // Example Key
    Body: Buffer.from(imageBuffer, 'base64'), // Assuming the image is returned as base64
    ContentType: 'image/png'
  };

  try {
    await s3.upload(s3params).promise();
    callback(null, {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "Image generated and uploaded successfully!" })
    });
  } catch (err) {
    console.error('Upload failed:', err);
    callback(null, {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "Failed to upload image" })
    });
  }
};



module.exports.delete = async (event, context, callback) => {
  let s3Bucket = 'lesapp-data';
  let query = event.queryStringParameters;
  let id = query.id;
  let typeofgame = query.typeofgame;
  let typeofdifficulty = query.typeofdifficulty;
  let doraLoc = ``;
  let karlLoc = ``;
  let textLoc = ``;
  let textKeyLoc = ``;

  if (typeofgame === 'letters') {
    doraLoc = `data/${typeofgame}/Dora/${id}_Dora.mp3`;
    karlLoc = `data/${typeofgame}/Karl/${id}_Karl.mp3`;
    textLoc = `data/${typeofgame}/Text/${id}_Text.txt`;
    textKeyLoc = `data/${typeofgame}/TextKey/${id}_TextKey.txt`;
  } else {
    doraLoc = `data/${typeofgame}/${typeofdifficulty}/Dora/${id}_Dora.mp3`;
    karlLoc = `data/${typeofgame}/${typeofdifficulty}/Karl/${id}_Karl.mp3`;
    textLoc = `data/${typeofgame}/${typeofdifficulty}/Text/${id}_Text.txt`;
    textKeyLoc = `data/${typeofgame}/${typeofdifficulty}/TextKey/${id}_TextKey.txt`;
  }



  let paramsDora = {
    Bucket: s3Bucket,
    Key: doraLoc
  };
  let paramsKarl = {
    Bucket: s3Bucket,
    Key: karlLoc
  };
  let paramsText = {
    Bucket: s3Bucket,
    Key: textLoc
  };
  let paramsTextKey = {
    Bucket: s3Bucket,
    Key: textKeyLoc
  };



  try {
    await Promise.all([
      s3.getObject(paramsDora).promise(),
      s3.getObject(paramsKarl).promise(),
      s3.getObject(paramsText).promise(),
      s3.getObject(paramsTextKey).promise()
    ]).then(async (data) => {
      console.log("data is =>", data);
      await Promise.all([
        s3.deleteObject(paramsDora).promise(),
        s3.deleteObject(paramsKarl).promise(),
        s3.deleteObject(paramsText).promise(),
        s3.deleteObject(paramsTextKey).promise()
      ]).then((deletedata) => {
        console.log(deletedata);
        callback(null, {
          headers: {
            "Access-Control-Allow-Origin": "*"
          },
          body: JSON.stringify(deletedata)
        });
      }).catch(async (err) => {
        let paramsDoraBody = {
          Bucket: s3Bucket,
          Key: doraLoc,
          Body: data[0].Body
        };
        let paramsKarlBody = {
          Bucket: s3Bucket,
          Key: karlLoc,
          Body: data[1].Body
        };
        let paramsTextBody = {
          Bucket: s3Bucket,
          Key: textLoc,
          Body: data[2].Body.toString('utf8')
        };
        let paramsTextKeyBody = {
          Bucket: s3Bucket,
          Key: textKeyLoc,
          Body: data[3].Body.toString('utf8')
        };




        await Promise.all([
          s3.putObject(paramsDoraBody).promise(),
          s3.putObject(paramsKarlBody).promise(),
          s3.putObject(paramsTextBody).promise(),
          s3.putObject(paramsTextKeyBody).promise()
        ]).then((putdata) => {
          console.log(putdata);
          callback(null, {
            statusCode: 400,
            headers: {
              "Access-Control-Allow-Origin": "*"
            },
            body: JSON.stringify(putdata)
          });
        }).catch((err) => {
          console.log(err);
          callback(null, {
            statusCode: 500,
            headers: {
              "Access-Control-Allow-Origin": "*"
            },
            body: JSON.stringify("Villa gat ekki lagfært sig sjálf, látið vita!")
          });
        });

        console.log(err);
        callback(null, {
          statusCode: 500,
          headers: {
            "Access-Control-Allow-Origin": "*"
          },
          body: JSON.stringify(err)
        });
      });
    }).catch((err) => {

      console.log(err);
      callback(null, {
        statusCode: 500,
        headers: {
          "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify(err)
      });
    });
  } catch (err) {
    console.log("there was an error deleting s3 object", err);
    let response = {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": 'application/json',
        "charset": "utf-8"
      },
      statusCode: 400,
      body: JSON.stringify({
        "message": "Þetta tókst ekki"
      })
    }

    return response;
  }

  let response = {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": 'application/json',
      "charset": "utf-8"
    },
    statusCode: 200,
    body: JSON.stringify({
      "message": "Þetta tókst"
    })
  }


  return response;


}

module.exports.update = async (event, context, callback) => {
  console.log("predata");
  let s3Bucket = 'lesapp-data';
  let data = JSON.parse(event.body);
  let id = data.id;
  let typeofgame = data.typeofgame;
  let typeofdifficulty = data.typeofdifficulty;
  let text = data.text;
  console.log("text is =>", text);
  let textKey = data.textkey;
  console.log("textKey is =>", textKey);
  let doraLoc = ``;
  let karlLoc = ``;
  let textLoc = ``;
  let textKeyLoc = ``;

  if (typeofgame === 'letters') {
    doraLoc = `data/${typeofgame}/Dora/${id}_Dora.mp3`;
    karlLoc = `data/${typeofgame}/Karl/${id}_Karl.mp3`;
    textLoc = `data/${typeofgame}/Text/${id}_Text.txt`;
    textKeyLoc = `data/${typeofgame}/TextKey/${id}_TextKey.txt`;
  } else {
    doraLoc = `data/${typeofgame}/${typeofdifficulty}/Dora/${id}_Dora.mp3`;
    karlLoc = `data/${typeofgame}/${typeofdifficulty}/Karl/${id}_Karl.mp3`;
    textLoc = `data/${typeofgame}/${typeofdifficulty}/Text/${id}_Text.txt`;
    textKeyLoc = `data/${typeofgame}/${typeofdifficulty}/TextKey/${id}_TextKey.txt`;
  }

  let paramsDora = {
    Bucket: s3Bucket,
    Key: doraLoc
  };
  let paramsKarl = {
    Bucket: s3Bucket,
    Key: karlLoc
  };
  let paramsText = {
    Bucket: s3Bucket,
    Key: textLoc
  };
  let paramsTextKey = {
    Bucket: s3Bucket,
    Key: textKeyLoc
  };



  const pollyParams1 = {
    OutputFormat: "mp3",
    Text: '<speak>' + data.textkey + '</speak>',
    VoiceId: "Dora",
    TextType: "ssml"
  };

  const pollyParams2 = {
    OutputFormat: "mp3",
    Text: '<speak>' + data.textkey + '</speak>',
    VoiceId: "Karl",
    TextType: "ssml"
  };



  await Promise.all([
    polly.synthesizeSpeech(pollyParams1).promise(),
    polly.synthesizeSpeech(pollyParams2).promise()
  ]).then(async (data) => {
    console.log("data is => ", data);
    let paramsDoraBody = {
      Bucket: s3Bucket,
      Key: doraLoc,
      Body: data[0].AudioStream
    };
    let paramsKarlBody = {
      Bucket: s3Bucket,
      Key: karlLoc,
      Body: data[1].AudioStream
    };
    let paramsTextBody = {
      Bucket: s3Bucket,
      Key: textLoc,
      Body: text
    };
    let paramsTextKeyBody = {
      Bucket: s3Bucket,
      Key: textKeyLoc,
      Body: textKey
    };
    await Promise.all([
      s3.putObject(paramsDoraBody).promise(),
      s3.putObject(paramsKarlBody).promise(),
      s3.putObject(paramsTextBody).promise(),
      s3.putObject(paramsTextKeyBody).promise()
    ]).then((putdata) => {
      
      // 3. Getting a signed URL for the saved mp3 file and text
      let doraUrl = s3.getSignedUrl('getObject', paramsDora);
      let karlUrl = s3.getSignedUrl('getObject', paramsKarl);
      let textUrl = s3.getSignedUrl('getObject', paramsText);
      let textKeyUrl = s3.getSignedUrl('getObject', paramsTextKey);



      callback(null, {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify({
          "doraUrl": doraUrl,
          "karlUrl": karlUrl,
          text: text,
          textKey: textKey,
        })
      });
    }).catch((err) => {
      console.log("Villa gat ekki lagfært sig sjálf, látið vita!",err);
      callback(null, {
        statusCode: 500,
        headers: {
          "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify("Villa gat ekki lagfært sig sjálf, látið vita!")
      });
    });
  }).catch((err) => {
    console.log("Villa að sækja hljóðbút frá Polly",err);
    callback(null, {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({
        "message": "villa að sækja hljóðbút frá polly"
      })
    });
  });
}


module.exports.createtextkey = async (event, context, callback) => {
  var promiseArr = [];
  var filenames = [];
  var finalArr = [];
  let response;
  let query = event.queryStringParameters;
  //define prefix where to save the file
  let s3Bucket = 'lesapp-data';

  let params1 = {
    Bucket: s3Bucket,
    Prefix: `data/letters/Text/`
  }
  let params2 = {
    Bucket: s3Bucket,
    Prefix: `data/words/easy/Text/`
  }

  let params3 = {
    Bucket: s3Bucket,
    Prefix: `data/words/medium/Text/`
  }
  let params4 = {
    Bucket: s3Bucket,
    Prefix: `data/sentences/easy/Text/`
  }
  let params5 = {
    Bucket: s3Bucket,
    Prefix: `data/sentences/medium/Text/`
  }

  let data1 = await s3.listObjectsV2(params1).promise();
  let data2 = await s3.listObjectsV2(params2).promise();
  let data3 = await s3.listObjectsV2(params3).promise();
  let data4 = await s3.listObjectsV2(params4).promise();
  let data5 = await s3.listObjectsV2(params5).promise();


  for (let i = 0; i < data1.Contents.length; i++) {
    const tempContent = data1.Contents[i].Key;
    let tempContentArr = tempContent.split("/");
    let key = tempContentArr[tempContentArr.length - 1];
    let filename_type = key.split(".");
    let filename = filename_type[0];
    let id = filename.split("_")[0];



    let postParams = {
      Bucket: s3Bucket,
      Key: 'data/letters/Text/' + key,
    }
    let value = s3.getObject(postParams).promise();
    let finalvalue = await Promise.resolve(value);
    let text = finalvalue.Body.toString('utf-8');


    let textKeyParams = {
      Bucket: s3Bucket,
      Key: 'data/letters/' + typeOfData.TextKey + id + '_TextKey' + '.txt',
      Body: text
    }

    console.log("textKeyParams is =>", textKeyParams);
    try {
      await s3.putObject(textKeyParams).promise();
      console.log("managed to put s3 object to the bucket");
    } catch (err) {
      console.log("there was an error putting s3 object to bucket", err);
    }


  }

  for (let i = 0; i < data2.Contents.length; i++) {
    const tempContent = data2.Contents[i].Key;
    let tempContentArr = tempContent.split("/");
    let key = tempContentArr[tempContentArr.length - 1];
    let filename_type = key.split(".");
    let filename = filename_type[0];
    let id = filename.split("_")[0];
    let postParams = {
      Bucket: s3Bucket,
      Key: 'data/words/easy/Text/' + key,
    }
    let value = s3.getObject(postParams).promise();
    let finalvalue = await Promise.resolve(value);
    let text = finalvalue.Body.toString('utf-8');
    console.log("text in words 1 are =>", text);

    let textKeyParams = {
      Bucket: s3Bucket,
      Key: 'data/words/easy/' + typeOfData.TextKey + id + '_TextKey' + '.txt',
      Body: text
    }
    try {
      await s3.putObject(textKeyParams).promise();
      console.log("managed to put s3 object to the bucket");
    } catch (err) {
      console.log("there was an error putting s3 object to bucket", err);
    }

  }

  for (let i = 0; i < data3.Contents.length; i++) {
    const tempContent = data3.Contents[i].Key;
    let tempContentArr = tempContent.split("/");
    let key = tempContentArr[tempContentArr.length - 1];
    let filename_type = key.split(".");
    let filename = filename_type[0];
    let id = filename.split("_")[0];

    let postParams = {
      Bucket: s3Bucket,
      Key: 'data/words/medium/Text/' + key,
    }
    let value = s3.getObject(postParams).promise();
    let finalvalue = await Promise.resolve(value);
    let text = finalvalue.Body.toString('utf-8');

    let textKeyParams = {
      Bucket: s3Bucket,
      Key: 'data/words/medium/' + typeOfData.TextKey + id + '_TextKey' + '.txt',
      Body: text
    }
    try {
      await s3.putObject(textKeyParams).promise();
      console.log("managed to put s3 object to the bucket");
    } catch (err) {
      console.log("there was an error putting s3 object to bucket", err);
    }

  }

  for (let i = 0; i < data4.Contents.length; i++) {
    const tempContent = data4.Contents[i].Key;
    let tempContentArr = tempContent.split("/");
    let key = tempContentArr[tempContentArr.length - 1];
    let filename_type = key.split(".");
    let filename = filename_type[0];
    let id = filename.split("_")[0];
    let postParams = {
      Bucket: s3Bucket,
      Key: 'data/sentences/easy/Text/' + key,
    }
    let value = s3.getObject(postParams).promise();
    let finalvalue = await Promise.resolve(value);
    let text = finalvalue.Body.toString('utf-8');

    let textKeyParams = {
      Bucket: s3Bucket,
      Key: 'data/sentences/easy/' + typeOfData.TextKey + id + '_TextKey' + '.txt',
      Body: text
    }
    try {
      await s3.putObject(textKeyParams).promise();
      console.log("managed to put s3 object to the bucket");
    } catch (err) {
      console.log("there was an error putting s3 object to bucket", err);
    }

  }

  for (let i = 0; i < data5.Contents.length; i++) {

    const tempContent = data5.Contents[i].Key;
    let tempContentArr = tempContent.split("/");
    let key = tempContentArr[tempContentArr.length - 1];
    let filename_type = key.split(".");
    let filename = filename_type[0];
    let id = filename.split("_")[0];


    let postParams = {
      Bucket: s3Bucket,
      Key: 'data/sentences/medium/Text/' + key,
    }
    let value = s3.getObject(postParams).promise();
    let finalvalue = await Promise.resolve(value);
    let text = finalvalue.Body.toString('utf-8');

    let textKeyParams = {
      Bucket: s3Bucket,
      Key: 'data/sentences/medium/' + typeOfData.TextKey + id + '_TextKey' + '.txt',
      Body: text
    }
    try {
      await s3.putObject(textKeyParams).promise();
      console.log("managed to put s3 object to the bucket");
    } catch (err) {
      console.log("there was an error putting s3 object to bucket", err);
    }
  }

  callback(null, {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*"
    },
    body: JSON.stringify({
      'success': 'successfully saved the files'
    })
  })



}

module.exports.listen = (event, context, callback) => {

  let data = JSON.parse(event.body);
  let audiostream;

  let pollyparams = {
    OutputFormat: "mp3",
    Text: '<speak>' + data.textkey + '</speak>',
    VoiceId: data.voiceid,
    TextType: "ssml"
  }
  polly.synthesizeSpeech(pollyparams)
    .on("success", function (response) {
      audiostream = response.data.AudioStream;
      callback(null, {
        headers: {
          "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify([audiostream])
      });

    })
    .on("error", function (err) {
      console.info("there was an error listening to text", err);
      console.log("there was an error listening to text", err);
      callback(null, {
        statusCode: 500,
        headers: {
          "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify({
          "there was an error listening to text": err
        })
      });
    })
    .send()

}



module.exports.speak = (event, context, callback) => {
  let data = JSON.parse(event.body);
  let prefix = folder + typeOfGame[data.typeofgame];
  //define prefix where to save the file
  if (data.typeofgame !== "letters") {
    prefix += typeOfDifficulty[data.typeofdifficulty];
  }


  const pollyParams1 = {
    OutputFormat: "mp3",
    Text: '<speak>' + data.textkey + '</speak>',
    VoiceId: "Karl",
    TextType: "ssml"
  };

  const pollyParams2 = {
    OutputFormat: "mp3",
    Text: '<speak>' + data.textkey + '</speak>',
    VoiceId: "Dora",
    TextType: "ssml"
  };
  // 1. Getting the audio stream from the text that user entered
  polly.synthesizeSpeech(pollyParams1)
    .on("success", function (response) {
      let s3Bucket = 'lesapp-data';

      let data_Karl = response.data;
      let audioStream_Karl = data_Karl.AudioStream;
      let key_Karl = prefix + typeOfData[pollyParams1.VoiceId] + context.awsRequestId + '_Karl' + '.mp3';
      let key_Text = prefix + typeOfData["Text"] + context.awsRequestId + '_Text' + '.txt';
      let key_TextKey = prefix + typeOfData["TextKey"] + context.awsRequestId + '_TextKey' + '.txt';
      polly.synthesizeSpeech(pollyParams2)
        .on("success", function (response) {

          let data_Dora = response.data;
          let audioStream_Dora = data_Dora.AudioStream;
          let key_Dora = prefix + typeOfData[pollyParams2.VoiceId] + context.awsRequestId + '_Dora' + '.mp3';


          let params_Karl = {
            Bucket: s3Bucket,
            Key: key_Karl,
            Body: audioStream_Karl
          };

          let params_Dora = {
            Bucket: s3Bucket,
            Key: key_Dora,
            Body: audioStream_Dora
          };

          let params_Text = {
            Bucket: s3Bucket,
            Key: key_Text,
            Body: data.text
          };
          let params_Text_Key = {
            Bucket: s3Bucket,
            Key: key_TextKey,
            Body: data.textkey
          };


          // uploadFile(prefix + key, audioStream, 'mp3')
          s3.putObject(params_Karl)
            .on("success", function (response) {
              console.log("S3 PUT audio KARL SUCCESS");
              s3.putObject(params_Dora)
                .on("success", function (response) {
                  console.log("S3 PUT audio DORA SUCCESS");
                  s3.putObject(params_Text)
                    .on("success", function (response) {
                      console.log("S3 PUT text SUCCESS");
                      s3.putObject(params_Text_Key)
                        .on("success", function (response) {
                          console.log("S3 PUT text key SUCCESS");
                        })
                        .on("complete", function () {
                          console.log("S3 PUT COMPLETE");
                          let s3params_Karl = {
                            Bucket: s3Bucket,
                            Key: key_Karl,
                          };
                          let s3params_Dora = {
                            Bucket: s3Bucket,
                            Key: key_Dora,
                          }
                          let s3params_Text = {
                            Bucket: s3Bucket,
                            Key: key_Text,
                          }
                          let s3params_Text_Key = {
                            Bucket: s3Bucket,
                            Key: key_TextKey,
                          }
                          // 3. Getting a signed URL for the saved mp3 file and text
                          let url_Karl = s3.getSignedUrl("getObject", s3params_Karl);
                          let url_Dora = s3.getSignedUrl("getObject", s3params_Dora);
                          let url_Text = s3.getSignedUrl("getObject", s3params_Text);
                          let url_TextKey = s3.getSignedUrl("getObject", s3params_Text_Key);
                          // Sending the result back to the user
                          console.info("these are the S3 PARAMS =>", s3params_Karl, s3params_Dora, s3params_Text);
                          console.info("this is the url", url_Karl, url_Dora, url_Text);
                          let result_Karl = {
                            bucket: s3Bucket,
                            key: key_Karl,
                            url: url_Karl
                          };

                          let result_Dora = {
                            bucket: s3Bucket,
                            key: key_Dora,
                            url: url_Dora
                          };

                          let result_Text = {
                            bucket: s3Bucket,
                            key: key_Text,
                            url: url_Text
                          };
                          let result_Text_Key = {
                            bucket: s3Bucket,
                            key: key_TextKey,
                            url: url_TextKey
                          };

                          let result = [result_Karl, result_Dora, result_Text, result_Text_Key];

                          callback(null, {
                            statusCode: 200,
                            headers: {
                              "Access-Control-Allow-Origin": "*"
                            },
                            body: JSON.stringify(result)
                          });
                        })
                        .on("error", function (err) {
                          console.info("there was an error putting text_key", err);
                          console.log("there was an error putting text_key", err);
                          callback(null, {
                            statusCode: 500,
                            headers: {
                              "Access-Control-Allow-Origin": "*"
                            },
                            body: JSON.stringify({
                              "there was an error putting text": err
                            })
                          });
                        })
                        .send()
                    })
                    .on("error", function (err) {
                      console.info("there was an error putting text", err);
                      console.log("there was an error putting text", err);
                      callback(null, {
                        statusCode: 500,
                        headers: {
                          "Access-Control-Allow-Origin": "*"
                        },
                        body: JSON.stringify({
                          "there was an error putting text": err
                        })
                      });
                    })
                    .send()
                })
                .on("error", function (err) {
                  console.info("there was an error putting audio Dora", err);
                  console.log("there was an error putting audio Dora", err);
                  callback(null, {
                    statusCode: 500,
                    headers: {
                      "Access-Control-Allow-Origin": "*"
                    },
                    body: JSON.stringify({
                      "there was an error putting audio Dora": err
                    })
                  });
                })
                .send();
            })
            .on("error", function (err) {
              console.info("there was an error putting audio Karl", err);
              console.log("there was an error putting audio Karl", err);
              callback(null, {
                statusCode: 500,
                headers: {
                  "Access-Control-Allow-Origin": "*"
                },
                body: JSON.stringify({
                  "there was an error putting audio": err
                })
              });
            })
            .send();
        })
        .on("error", function (err) {
          console.info("there was an error synthesizing Speech Dora", err);
          console.log("there was an error synthesizing Speech Dora", err);
          callback(null, {
            statusCode: 500,
            headers: {
              "Access-Control-Allow-Origin": "*"
            },
            body: JSON.stringify({
              "there was an error synthesizing Speech Dora": err
            })
          });
        })
        .send();
    })
    .on("error", function (err) {
      console.info("there was an error synthesizing Speech Karl", err);
      console.log("there was an error synthesizing Speech Karl", err);
      callback(null, {
        statusCode: 500,
        headers: {
          "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify({
          "there was an error synthesizing Speech Karl": err
        })
      });
    })
    .send();
};

module.exports.get = async (event) => {

  function messurePromise(fn) {
    let start = performance.now();
    fn();
    return performance.now() - start;
  }


  var promiseArr = [];
  var filenames = [];
  var finalArr = [];
  let response;
  let query = event.queryStringParameters;
  //define prefix where to save the file
  let s3Bucket = 'lesapp-data';

  var params = {}
  if (query.typeofgame === 'letters') {
    params = {
      Bucket: s3Bucket,
      Prefix: `data/${query.typeofgame}/`
      /* required */
    };
  } else {
    params = {
      Bucket: s3Bucket,
      Prefix: `data/${query.typeofgame}/${query.typeofdifficulty}/`
    }
  }
  var output = {};

  var data;
  try {
    data = await s3.listObjectsV2(params).promise();
  } catch (err) {
    throw err;
  }



  for (let i = 0; i < data.Contents.length; i++) {
    const tempContent = data.Contents[i].Key; // 'data/<typeofgame>/<typeofdifficulty>/<dataDir>/<filename>_<datadir>.<file extension>',
    let tempContentArr = tempContent.split('/'); // ['data','<typeofgame>','<typeofdifficulty>','<dataDir>','<filename>_<datadir>.<file extension>']
    let key = tempContentArr[tempContentArr.length - 1]; // '<filename>_<datadir>.<file extension>'
    if (key) {
      let filename_type = key.split('.'); // ['<filename>_<datadir>', '<file extension>']
      let filename = filename_type[0]; // '<filename>_<datadir>'
      let id = filename.split('_'); // ['<filename>','<datadir>']
      // ids push

      if (!(id[0] in output)) {
        output[id[0]] = {
          "Dora": "",
          "Karl": "",
          "Text": "",
          "TextKey": ""
        }
      }

      if (id[1] === 'Text') {
        let s3params = {
          Bucket: s3Bucket,
          Key: params.Prefix + id[1] + '/' + key
        }
        let value = s3.getObject(s3params).promise();
        filenames.push(id[0]);
        promiseArr.push(value);
      } else {
        output[id[0]][id[1]] = 'https://lesapp-data.s3.eu-west-1.amazonaws.com/' + tempContent;
      }
    }
  }

  await Promise.all(promiseArr).then(async function (d) {
    for (let i = 0; i < filenames.length; i++) {
      let content = output[filenames[i]];
      content.Text = d[i].Body.toString('utf8');
      if (query.istextkey) {
        let dataArr = content.Dora.split('/');
        console.log("dataarr is", dataArr);
        dataArr[dataArr.length - 2] = 'TextKey';
        dataArr[dataArr.length - 1] = dataArr[dataArr.length - 1].split('_')[0] + '_TextKey.txt';
        let s3params = {
          Bucket: s3Bucket,
          Key: params.Prefix + 'TextKey/' + dataArr[dataArr.length - 1]
        }
        let k = await s3.getObject(s3params).promise();
        content.TextKey = k.Body.toString('utf8');
        finalArr.push(content);
      } else {
        console.log("contant is ===<", content);
        finalArr.push(content);
      }


    }
  })

  response = {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": 'application/json',
      "charset": "utf-8"
    },
    statusCode: 200,
    body: JSON.stringify(finalArr)
  }


  return response;

};


module.exports.save = async (event, context, callback) => {
  let data = JSON.parse(event.body);
  let username = data.username;
  let typeoffile = data.typeoffile; /// Correct, Incorrect, Manual_Correct, Manual_Incorrect
  let question = data.question;
  let answer = data.answer;
  let audio = data.audio;


  console.log("username is" + data);
  console.log("typeoffile is" + typeoffile);
  console.log("question is" + question);
  console.log("answer is" + answer);
  console.log("audio is" + audio);

  var file = File()

  let prefix = `users/${username}/${typeoffile}/`;
  let text = `question: ${question}\nanswer: ${answer}`;
  let audioKey = `${prefix}${context.awsRequestId}.wav`
  let textKey = `${prefix}${context.awsRequestId}.txt`

  let s3AudioParams = {
    Bucket: 'lesapp-data',
    Key: audioKey,
    Body: audio
  }

  let s3TextParams = {
    Bucket: 'lesapp-data',
    Key: textKey,
    Body: text
  }

  try {
    await s3.putObject(s3AudioParams).promise();
    await s3.putObject(s3TextParams).promise();
    callback(null, {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({
        'success': 'successfully saved the files'
      })
    })
  } catch (err) {
    callback(null, {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({
        "there was an error $err": err
      })
    })
  }

}