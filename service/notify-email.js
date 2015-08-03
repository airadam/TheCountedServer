var email = require("emailjs");
var exports = module.exports = {};

var server  = email.server.connect({
   user:    "USERNAME", 
   password:"PASSWORD", 
   host:    "SMTPSERVER", 
   ssl:     true, // This and following line depend on your particular server settings
   port: 	465 
});

function send(messageRecipient,messageSubject,messageBody){
	console.log(messageRecipient);
	console.log(messageSubject);
	console.log(messageBody);
	server.send({
	   text:    messageBody, 
	   from:    "The Counted Data Server <EMAIL ADDRESS FOR CREDENTIALS ABOVE>", 
	   bcc:      messageRecipient,
	   subject:  messageSubject
	}, function(err, message) { console.log(err || message); });
}

exports.send = send;


