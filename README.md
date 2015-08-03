The Counted
===========

Introduction
------------
This project is a Node.JS service which will periodically download the data file of US police killing incidents published by The Guardian (http://www.theguardian.com/thecounted) and;

	* Maintain a MongoDB database of the details
	* (Optionally) Send a mail to a designated address every time the database is updated

I am a newcomer to Node, so no claim is made of optimal project structure! 

Licensing
---------
This software is distributed under the GNU General Public License v2.0.

Dependencies
------------
### Node packages (via npm)  
Versions listed indicate those developed against - more recent releases may also work.  

	* express (4.12.4)
	* later (1.1.6)
	* adm-zip (0.4.7)
	* csvtojson(0.3.21)
	* mongojs (1.4.32)
	* emailjs (0.3.16)
	* commander (2.8.1)

### Other
	* MongoDB instance with read/write permissions; if you don't have anywhere to host one, try MongoLab (http://mongolab.com)

Configuration
-------------
Database connection credentials should be added to the variable `databaseURI` in the file `service/db.js` in a string of the following format;  
`<scheme>://<username>:<password>@<servername>:<port>/<dbname>`  
If the database has no authentication, you can just use;  
`<scheme>://<servername>:<port>/<dbname>`  
The database user must have write permissions to the database specified.

If you want to send notification emails, you must have credentials for an SMTP account and fill in the requisite fields in `service/notify-email.js`.

Deployment/Launch
-----------------
The service is most simply executed by going to the `service` directory and running;
`node thecounted.js`
There are several command-line options which can be added;

	* -p, --port <number>       Set listening port [default 3030]
	* -e, --email [address]     Email address for update notifications [omit this setting to disable]
	* -i, --interval <minutes>  Interval (in minutes) for updates [default/maximum 60]
	
So a typical command line might be;

	* node thecounted.js -e user@domain.com -p 3030 -i 60

Output
------
After the first download occurs, the following tables will be created in the configured database  

	* countedMetadata - for housekeeping, logs when the database was last updated by the service
	* counted2015 - contains the actual incident documents
When an upload occurs, all records are replaced as the source data does not have unique IDs, and may have duplicate names, temporarily unknown victims, and so on. As such, you *must not* rely on the `_id` field of each document to identify a particular incident.