// node packages
var http = require('http');
var express = require('express');
var later = require('later');
var url = require('url');
var fs = require('fs');
var AdmZip = require('adm-zip');
var jsonConverter=require('csvtojson').core.Converter;
var crypto = require('crypto');
var program = require('commander');

// Local modules written as part of the project
var db = require('./db');
var sender = require('./notify-email');
var incidentTransformer = require('./incident-transform');

var app = express();
var DOWNLOAD_DIR = './downloads/';
var notificationEmail = "";
var downloadInterval = 60;

// Source and destinations for data. For a future year, updating these variables will be
// enough to switch over to a new table/file - leaving any 2015 data present untouched.
var DATA_URL='http://interactive.guim.co.uk/2015/the-counted/thecounted-data.zip';
var targetCsvFilename = "the-counted.csv";
var incidentTablename = "counted2015";

// TODO check https://www.npmjs.com/package/

// Parse command-line options
program
	.option('-p, --port <number>', 'Set listening port [3030]', 3030)
	.option('-e, --email [address]','Email address for update notifications','')
	.option('-i, --interval <minutes>','Interval (in minutes) for updates [60]',parseInt)
	.parse(process.argv);

notificationEmail = program.email;
if(program.interval){
	downloadInterval = program.interval;
}

// Adapted from http://www.hacksparrow.com/using-node-js-to-download-files.html
// Saves a file directly from a URL to a local file of the same name
function download_file_http(file_url, onSuccessfulDownload) {
	var options = {
		host: url.parse(file_url).host,
		port: 80,
		path: url.parse(file_url).pathname
	};

	var file_name = url.parse(file_url).pathname.split('/').pop();
	var file = fs.createWriteStream(DOWNLOAD_DIR + file_name);
	
	// set up callback for when file is finally closed - straight after
	// 'end' is written is not as safe as the beginner may think!
	file.on('finish', function(){
		onSuccessfulDownload(DOWNLOAD_DIR + file_name);
	});

	http.get(options, function(res) {
		res.on('data', function(data) {
				file.write(data);
		}).on('end', function() {
				file.end();
		});
	});
}

// Checksumming - taken from http://blog.tompawlak.org/calculate-checksum-hash-nodejs-javascript
// This will be used to detect if the contents of the actual CSV data have changed from one download to the next.
function generateChecksum (str, algorithm, encoding) {
    return crypto
        .createHash(algorithm || 'md5')
        .update(str, 'utf8')
        .digest(encoding || 'hex')
}


// trigger point for downloading data
function downloadData(){
	download_file_http(DATA_URL, zipHandler);
}

// Specific handler for the zip file layout used for the Guardian data
function zipHandler(zipPath){
	var zip = new AdmZip(zipPath);
    var zipEntries = zip.getEntries(); // an array of ZipEntry records
	zipEntries.forEach(function(element,index,arr){
		zipEntryHandler(element, index, arr, zip);
	});
}

// Check and handle individual entries in a zip file
function zipEntryHandler(element, index, arr, zip){
	if (element.entryName == targetCsvFilename) {
		 var csvContent = zip.readAsText(element.entryName);
		 var checksum = generateChecksum(csvContent);
		 
		 // Read existing checksum - if same, do nothing
		 db.collection("countedMetadata").find({"table":incidentTablename}).limit(1, function(err, result){
			if(err){
				// log a database read error and return
				console.log("Metadata read error");
				console.log(err);
			}
			else {
				if(result.length == 0 || (result[0].checksum != checksum)){ 
					// if  a value exists, it must be replaced. If absent, must be inserted // TODO extract this whole DB write area to named function?
					db.collection("countedMetadata").update({"table":incidentTablename},{"updateTime": new Date(), "table":incidentTablename,"checksum":checksum},{upsert:true},function(err, count, status){
						if(err){
							console.log("Metadata update error.");
						}
						else{
							// if changed, get the new data converted to JSON and into the db - each row as a document
							var csvToJsonConversionParams = {};
							var csvToJsonConverter = new jsonConverter(csvToJsonConversionParams);
							csvToJsonConverter.fromString(csvContent,function(error, jsonObj){
								if(!error){
									writeIncidents(jsonObj);
									if(notificationEmail!=""){
										var lastIncidentText = incidentTransformer.incidentToText(jsonObj[jsonObj.length-1]);
										var plainBodyText =  "Last entry:\n\n" + lastIncidentText + "\n\n"+"Powered by The Counted Data Server. Source data from http://www.theguardian.com/thecounted";
										sender.send(notificationEmail,jsonObj.length+" killed.",plainBodyText); 
									}
								}
								else{
									console.log(error);
								}
							});
							console.log(new Date().toUTCString() + " | Data changed.");
						}
					});
				}
				else{
					console.log(new Date().toUTCString() + " | Data unchanged.");
				}
			}
		 });
	}
}
// Write JSON-decoded incident data to DB
// TODO consider taking table name as an argument here
function writeIncidents(incidentsData) {
	// TODO consider locking DB from being read until this method completes
	db.collection(incidentTablename).drop(function(err) {
			db.collection(incidentTablename).insert(incidentsData);
			console.log(incidentsData.length + " incidents written.");
	});
}

// Download scheduling setup - force UTC time, then configure timer interval and set data download function to be called on expiry.
later.date.UTC();

var downloadSchedule = later.parse.recur().every(downloadInterval).minute();
var downloadTimer = later.setInterval(downloadData, downloadSchedule);

// TODO WEB SERVICE - the only method available here is for development purposes
// Then configure Express to serve index.html and any other static pages stored in the home directory
app.use(express['static'](__dirname ));
app.enable('json spaces');

// Temporary endpoint for retrieving debug data written with nohup
app.get('/debug', function(req,res){
	fs.readFile('nohup.out','utf8',function(err,data){
		if(err){
			res.status(500).send('Error retrieving debug info');
		}
		else
		{
			res.send(data);
		}
	});
});

// Express route for any other unrecognised incoming requests
app.get('*', function(req, res){ res.status(404).send('Unrecognised call');});

app.listen(program.port);
var startTime = new Date();
var logmessage = startTime.toUTCString() + ' | The Counted server running at port ' + program.port;
console.log(logmessage);
