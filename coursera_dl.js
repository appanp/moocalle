// Script to get the forum posts for a coursera class
// NOTE: Need to be run using node.js
// TODO: Need to find out delay between requests

var fs = require('fs');
var request = require('request');
var zlib = require('zlib');

//Cookie to set in request header
//User-Agent = Mozilla / 5.0 (Macintosh; Intel Mac OS X 10.9; rv:31.0) Gecko/20100101 Firefox/31.0
//csrf_token & CAUTH tokens have to be set manually
//var cookie = 'csrf_token=FILL UP YOUR TOKEN; CAUTH=FILL UP YOUR TOKEN';

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
        console.log("Usage: node get_forum_posts.js <coursera class name>|ALL <req. delay> ");
        process.exit(1);
}
var class_name = process.argv[2];
var api_pg_url = 'https://class.coursera.org/'+class_name+'/api/forum/forums/0/threads?sort=lastupdated&page_size=25';
var api_post_url_pfx = 'https://class.coursera.org/'+class_name+'/api/forum/threads/';
var delay = process.argv[3]; //7 sec delay between requests
var class_dir = '../'+class_name
var class_posts_dir = '../'+class_name+'/posts';
var class_lists_dir = '../'+class_name+'/lists';

//New string function for endWith
String.prototype.endsWith = function(suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

function get_list_ids() {
    var list_files = fs.readdirSync(class_lists_dir);
    var max_ver = 0;
    var new_id = 0;
    var curr_file_ts = 0;
    for(var i=0;i < list_files.length;i++) {
      if (list_files[i].endsWith('.json')) {
        arr = list_files[i].split('.');
        //Using fs.stat is not reliable, so returning max single digit file
        //f_stat = fs.statSync(class_lists_dir+'/'+list_files[i]);
        //if (f_stat['ctime'].valueOf() > curr_file_ts) {
        //    curr_file_ts = f_stat['ctime'].valueOf();
        //    new_id = list_files[i];
        //}
        if (arr.length == 2 && (Number(arr[0]) > new_id) )
            new_id = Number(arr[0]);
        if (arr.length > 2 && (Number(arr[1]) > max_ver) )
            max_ver = Number(arr[1]);
        console.log("...file:"+list_files[i]+" has ts: "+curr_file_ts);
      }
    }
    console.log("......pg_id: "+new_id+",  max_ver: "+max_ver);
    return [new_id,max_ver];
}

function get_updates_from(page_id,max_pg_ver) {
    if (typeof get_updates_from.last_update_time == 'undefined') {
        var file = '';
        if (max_pg_ver == 0)
            file = class_lists_dir+'/'+page_id+'.json';
        else
            file = class_lists_dir+'/'+page_id+'.'+max_pg_ver+'.json';
        var data = fs.readFileSync(file);
        var lst_json_obj = JSON.parse(data);
        get_updates_from.last_update_time = lst_json_obj['threads'][0]['last_updated_time'];
    }
    //Now filter on posts which re newer than last_updated_time
    console.log("Local last updated time is: "+get_updates_from.last_update_time);
    get_posts_list(delay,page_id,max_pg_ver,get_updates_from.last_update_time);
}

function get_posts_in(urls,delay) {
  url = urls.shift();
  post_id = url.substr(url.lastIndexOf('=')+1);
  op_file = class_posts_dir+'/'+post_id+'.json';
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
				if (dezipped.length != 0) {
                    var json_obj = JSON.parse(json_str);
				    fs.writeFileSync(op_file, JSON.stringify(json_obj,undefined,2));
                }
                else {
                    console.log("...Ignoring post id: "+post_id+" 'coz of zero length");
                }
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
        console.log('...Error fetching post id: '+post_id+", Error is: "+err);
      }
  	});
}

// Function to get the URL of a page of forum posts
// url is just a string of an existing URL of a posts page
// Returns the loist of URLs of the posts in the page
function get_posts_list(delay, pg_id, max_pg_ver, last_update_time) {
  function stop_fetching() {
    if ( get_posts_list.last_update_time == 0 ) {
        if (get_posts_list.page_id <= get_posts_list.max_page_id)
            return false;
        else
            return true;
    }
    else
        return get_posts_list.found_non_updated;
  }

  //Start of this function
  if ( typeof get_posts_list.page_id == 'undefined') {
    if (typeof pg_id != 'undefined') {
        get_posts_list.page_id = Number(pg_id);
        get_posts_list.max_pg_ver = max_pg_ver;
    }
    else {
        get_posts_list.page_id = 1;
        get_posts_list.max_pg_ver = 0;
    }
    get_posts_list.timestamp = Date.now();
	get_posts_list.max_page_id = 500;
	get_posts_list.fetched_posts = 0;
    get_posts_list.found_non_updated = false;
    if ( typeof last_update_time != 'undefined' )
        get_posts_list.last_update_time = last_update_time;
    else
        get_posts_list.last_update_time = 0;
    console.log('Starting with list ID: '+get_posts_list.page_id+' & page version: '+get_posts_list.max_pg_ver);
	}
  else {
    console.log("...Time to fetch "+get_posts_list.fetched_posts+" posts: "
                + (Date.now() - get_posts_list.timestamp));
    get_posts_list.timestamp = Date.now();
  	if (typeof pg_id == 'undefined')
            get_posts_list.page_id += 1;
    else
            get_posts_list.page_id = pg_id;
    if ( typeof last_update_time != 'undefined' )
        get_posts_list.last_update_time = last_update_time;
  }

  var op_file ='';
  if (get_posts_list.last_update_time != 0)
        op_file = class_lists_dir+'/'+get_posts_list.page_id+'.'+(get_posts_list.max_pg_ver+1)+'.json';
  else
        op_file = class_lists_dir+'/'+get_posts_list.page_id+'.json';
  //if ( get_posts_list.page_id <= get_posts_list.max_page_id ) {
  if ( !stop_fetching() ) {
   var urls = [];
   if (typeof pg_id != 'undefined' && typeof last_update_time == 'undefined') {
        var json_file = '';
        if (get_posts_list.max_pg_ver == 0)
            json_file = class_lists_dir+'/'+pg_id+'.json';
        else {
            if (typeof last_update_time == 'undefined')
                json_file = class_lists_dir+'/'+pg_id+'.json';
            else
                json_file = class_lists_dir+'/'+pg_id+'.'+get_posts_list.max_pg_ver+'.json';
        }
        var lst_json_str = fs.readFileSync(json_file);
        var lst_json_obj = JSON.parse(lst_json_str);
		get_posts_list.max_page_id = lst_json_obj['max_pages'];
        console.log("...Max. pages to read: "+get_posts_list.max_page_id);
		//Get the list of post URLs & return the array of URLs
		posts = lst_json_obj['threads']
        list_files = fs.readdirSync(class_posts_dir);
		for(var i=list_files.length % 25;i < posts.length;i++) {
            var last_upd_time = posts[i]['last_updated_time'];
            if (last_upd_time > get_posts_list.last_update_time)
                urls.push(posts[i]['_link']);
            else
                get_posts_list.found_non_updated = true;
		}
		get_posts_list.fetched_posts = urls.length;
        console.log("...urls array length: "+urls.length);
        if (urls.length != 0) {
            //Extract the post id & chk if it is already there
            urls_last = urls[urls.length - 1];
            post_id = urls_last.substr(urls_last.lastIndexOf('=')+1);
            file = class_posts_dir+'/'+post_id+'.json';
            console.log("...Trying to read post file: "+file);
            try {
                var data = fs.readFileSync(file);
                console.log("...Nothing left to resume, but new posts found ...");
                urls = [];
                get_updates_from(1,get_posts_list.max_pg_ver);
            } catch(e) {
                if ( e.code == 'ENOENT' ) {
                    console.log("...Resuming from post id: "+urls[0]);
                    get_posts_in(urls,delay);
                }
                else throw e;
            }
        }
        else {
            console.log("...Fetched everything - nothing left to resume");
            console.log("......There could be some updates - checking ...");
            get_updates_from(1,get_posts_list.max_pg_ver);
        }
   }
   else {
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
                    console.log("Current last updated time of 1st post: "+ 
                                posts[0]['last_updated_time']);
                    console.log("Current last updated time of 25th post: "+ 
                                posts[posts.length-1]['last_updated_time']);
					for(var i=0;i < posts.length;i++) {
                        var last_upd_time = posts[i]['last_updated_time'];
                        if (last_upd_time > get_posts_list.last_update_time)
                            urls.push(posts[i]['_link']);
                        else
                            get_posts_list.found_non_updated = true;
					}
					get_posts_list.fetched_posts = urls.length;
                    console.log("...urls array length: "+urls.length);
                    if (urls.length != 0) {
					    setTimeout(function() {
                            get_posts_in(urls,delay);
                            },delay);
                    }
                    else
                        console.log("...Updated everything - Ending");
				    });
  			//fs.writeFile('rsp_json.gz',body);
        	}
			else {
				console.log("...No gzip encoding"+body.toString('utf-8'));
			}
      	  }
          else {
            if (!err)
                    console.log('...Error fetching posts page, error is: '+err);
            else 
                    console.log('...Error is null: could be tokens are invalid');
          }
  		});
       }
  }
  else {
      console.log("...Terminating since reached max: "+get_posts_list.page_id+"/"+get_posts_list.max_page_id);
  }
}

// START of the MAIN program
// Do the initialization of creating required dirs & 
// reading in the state stored from previous run
try {
    fs.mkdirSync(class_dir);
    fs.mkdirSync(class_posts_dir);
    fs.mkdirSync(class_lists_dir);
    get_posts_list(delay);
  } catch(e) {
    if ( e.code == 'EEXIST' ) {
        var max_ids = get_list_ids();
        if (max_ids[0] == 0)
            get_posts_list(delay);
        else
            get_posts_list(delay,max_ids[0],max_ids[1]);
        }
    else throw e;
  }

// Format the initial request and get the first page of posts

