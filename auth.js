// var attributeList = [];
// var dataEmail = {
//     Name : 'email',
//     Value : 'alexandergudmundsson@gmail.com' // your email here
// };
// var dataPhoneNumber = {
//     Name : 'phone_number',
//     Value : '...' // your phone number here with +country code and no delimiters in front
// };

// var dataEmailDomain = {
//     Name: "custom:domain",
//     Value: "example.com"
// }
// var attributeEmail = 
// new AmazonCognitoIdentity.CognitoUserAttribute(dataEmail);
// var attributePhoneNumber = 
// new AmazonCognitoIdentity.CognitoUserAttribute(dataPhoneNumber);
// var attributeEmailDomain = 
// new AmazonCognitoIdentity.CognitoUserAttribute(dataEmailDomain);
 
// attributeList.push(attributeEmail);
// attributeList.push(attributePhoneNumber);
// attributeList.push(attributeEmailDomain);
 
// var cognitoUser;
// userPool.signUp('username', 'password', attributeList, null, function(err, result){
//     if (err) {
//         alert(err);
//         return;
//     }
//     cognitoUser = result.user;
//     console.log('user name is ' + cognitoUser.getUsername());
// });


module.exports.confirmSignUp = (event, context, callback) => {

    // Confirm the user
        event.response.autoConfirmUser = true;

    // Set the email as verified if it is in the request
    if (event.request.userAttributes.hasOwnProperty("email")) {
        event.response.autoVerifyEmail = true;
    }

    // Set the phone number as verified if it is in the request
    if (event.request.userAttributes.hasOwnProperty("phone_number")) {
        event.response.autoVerifyPhone = true;
    }

    // Return to Amazon Cognito
    callback(null, event);
};