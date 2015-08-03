var exports = module.exports = {};

// Produce short write-up of a single incident; primarily for use in plaintext notification mails.
function incidentToText(incident){
	var bioInfo = incident.name + " (Age " + incident.age + ", " + incident.gender + ", " + incident.raceethnicity +")";
	var armamentinfo = incident.armed=="No"?"Unarmed":"Armed with " + incident.armed;
	var killingInfo =  armamentinfo + ". Killed by " + incident.lawenforcementagency + " in " +incident.city + ", " + incident.state + " on " + incident.month + " " + incident.day + ". Cause of death: " + incident.cause + "."; 
	var textVersion = bioInfo + "\n" + killingInfo;
	return textVersion;
}

exports.incidentToText = incidentToText;