let AWS = require("aws-sdk");
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
  if (data.typeofgame !== "words") {
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
      let key_Text = prefix + typeOfData["Text"] + context.awsRequestId + '_text' + 'txt';
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