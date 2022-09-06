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
  "Text": "Text/"
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
    Text: data.text,
    VoiceId: "Karl"
  };

  const pollyParams2 = {
    OutputFormat: "mp3",
    Text: data.text,
    VoiceId: "Dora"
  };
  // 1. Getting the audio stream for the text that user entered
  polly.synthesizeSpeech(pollyParams1)
    .on("success", function (response) {
      let s3Bucket = 'lesapp-data';

      let data_Karl = response.data;
      let audioStream_Karl = data_Karl.AudioStream;
      let key_Karl = prefix + typeOfData[pollyParams1.VoiceId] + context.awsRequestId + '_Karl' + '.mp3';
      let key_Text = prefix + typeOfData["Text"] + context.awsRequestId + '_Text' + '.txt';
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
            Body: pollyParams1.Text
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
                      // 3. Getting a signed URL for the saved mp3 file and text
                      let url_Karl = s3.getSignedUrl("getObject", s3params_Karl);
                      let url_Dora = s3.getSignedUrl("getObject", s3params_Dora);
                      let url_Text = s3.getSignedUrl("getObject", s3params_Text);
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

                      let result = [result_Karl, result_Dora, result_Text];

                      callback(null, {
                        statusCode: 200,
                        headers: {
                          "Access-Control-Allow-Origin": "*"
                        },
                        body: JSON.stringify(result)
                      });
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

  // data.then((res) => {
  //   return {
  //   headers: {
  //     "Access-Control-Allow-Origin": "*",
  //     "Content-Type": 'application/json',
  //     "charset": "utf-8"
  //   },
  //   statusCode: 200,
  //   body: JSON.stringify(res.Contents)
  // }
  // });

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
          "Text": ""
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

  await Promise.all(promiseArr).then(function (d) {
    for (let i = 0; i < filenames.length; i++) {
      let content = output[filenames[i]];
      content.Text = d[i].Body.toString('utf8');

      console.log("contant is ===<", content);
      finalArr.push(content);
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
  } catch(err) {
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
