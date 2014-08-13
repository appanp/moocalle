// Script to get the forum posts for a coursera class
// NOTE: Need to be run using node.js
// TODO: Need to find out delay between requests

var fs = require('fs');
var request = require('request');
var zlib = require('zlib');

//Cookie to set in request header
//User-Agent = Mozilla / 5.0 (Macintosh; Intel Mac OS X 10.9; rv:31.0) Gecko/20100101 Firefox/31.0
//csrf_token & CAUTH tokens have to be set manually
var cookie = 'csrf_token=FILL UP YOUR TOKEN; CAUTH=FILL UP YOUR TOKEN';

var default_headers = {
  'User-Agent': 'Mozilla/5.0 (X11; Linux i686; rv:7.0.1) Gecko/20100101 Firefox/31.0',
  'Accept': '*/*',
  //'Accept-Language': 'en-us,en;q=0.5',
  'Accept-Encoding': 'gzip, deflate',
  'Accept-Charset': 'ISO-8859-1,utf-8;q=0.7,*;q=0.7',
  'Connection': 'keep-alive',
  //'Cache-Control': 'max-age=0',
  'Cache-Control': 'no-cache',
  'Cookie': cookie
};

if (process.argv.length < 4) {
        console.log("Usage: node get_forum_posts.js <coursera class name> <req. delay>");
        process.exit(1);
}
var class_name = process.argv[2];
var api_pg_url = 'https://class.coursera.org/'+class_name+'/api/forum/forums/0/threads?sort=lastupdated&page_size=25';
var api_post_url_pfx = 'https://class.coursera.org/'+class_name+'/api/forum/threads/';
var delay = process.argv[3]; //7 sec delay between requests
var strt_page_id = 1;
if (process.argv.length >=5) {
    strt_page_id = process.argv[4];
}
function get_posts_in(urls,delay) {
  url = urls.shift();
  post_id = url.substr(url.lastIndexOf('=')+1);
  op_file = '../'+class_name+'/posts/'+post_id+'.json';
  post_url = api_post_url_pfx + post_id +'?sort=null';
  request({
  	url: post_url,
  	//timeout: req_to,
  	headers: default_headers,
  	encoding: null,
  	method: 'GET'
  	//body: JSON.stringify({ user:'my_user', password:'my_pass' })
  	},
  	function (err, rsp, body) {
      //console.log('Error code: '+err);
      if (!err && rsp.statusCode == 200) {
		if (rsp.headers['content-encoding'] == 'gzip') {
			zlib.gunzip(body, function(err2, dezipped) {
            	var json_str = dezipped.toString('utf-8');
				var json_obj = JSON.parse(json_str);
				//console.log('...JSON Rsp.: ');
				fs.writeFileSync(op_file, JSON.stringify(json_obj,undefined,2));
				if (urls.length == 0) {
					get_posts_list(delay);
				}
				else {
					setTimeout(function() {
                        get_posts_in(urls,delay);
                        },delay);
				}
			  });
  			//fs.writeFile('rsp_json.gz',body);
        }
		else {
			console.log("...No gzip encoding"+body.toString('utf-8'));
		}
      }
      else {
        console.log('...Error fetching post id: '+post_id);
      }
  	});
}

// Function to get the URL of a page of forum posts
// url is just a string of an existing URL of a posts page
// Returns the loist of URLs of the posts in the page
function get_posts_list(delay, pg_id) {
  if ( typeof get_posts_list.page_id == 'undefined') {
    get_posts_list.page_id = Number(pg_id);
    get_posts_list.timestamp = Date.now();
	get_posts_list.max_page_id = 500;
	}
  else {
    console.log("...Time to fetch 25 posts: " + (Date.now() - get_posts_list.timestamp));
    get_posts_list.timestamp = Date.now();
  	get_posts_list.page_id += 1;
	}

  op_file = '../'+class_name+'/lists/'+get_posts_list.page_id+'.json';
  if ( get_posts_list.page_id <= get_posts_list.max_page_id ) {
   	request({
  		url: api_pg_url+'&page='+get_posts_list.page_id,
  		//timeout: req_to,
  		headers: default_headers,
  		encoding: null,
  		method: 'GET'
  		//body: JSON.stringify({ user:'my_user', password:'my_pass' })
  		},
  		function (err, rsp, body) {
      	  console.log('Fetching posts page: '+get_posts_list.page_id);
	  	  var urls = [];
      	  if (!err && rsp.statusCode == 200) {
			if (rsp.headers['content-encoding'] == 'gzip') {
				zlib.gunzip(body, function(err2, dezipped) {
            		var json_str = dezipped.toString('utf-8');
					var json_obj = JSON.parse(json_str);
					//console.log('...JSON Rsp.: ');
					fs.writeFileSync(op_file, JSON.stringify(json_obj,undefined,2));
					get_posts_list.max_page_id = json_obj['max_pages'];
					//Get the list of post URLs & return the array of URLs
					posts = json_obj['threads']
					for(var i=0;i < posts.length;i++) {
						urls.push(posts[i]['_link']);
					}
					setTimeout(function() {
                        get_posts_in(urls,delay);
                        },delay);
					});
  			//fs.writeFile('rsp_json.gz',body);
        	}
			else {
				console.log("...No gzip encoding"+body.toString('utf-8'));
			}
      	  }
          else {
            console.log('...Error fetching posts page');
          }
  		});
  }
  else {
      console.log("...Terminating since reached max: "+get_posts_list.page_id+"/"+get_posts_list.max_page_id);
  }
}

// START of the MAIN program
// Do the initialization of creating required dirs & 
// reading in the state stored from previous run

// Format the initial request and get the first page of posts
get_posts_list(delay,strt_page_id);

