var fs = require('fs');

//New string function for endWith
String.prototype.endsWith = function(suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

//class_lists_dir = '../statistics-002/lists/';
var class_name = process.argv[2];
class_lists_dir = '../'+class_name+'/lists/';
function get_list_len() {
    var list_files = fs.readdirSync(class_lists_dir);
    var max_ver_ids = [];
    //var curr_file_ts = 0;
    for(var i=0;i < list_files.length;i++) {
      if (list_files[i].endsWith('.json')) {
        arr = list_files[i].split('.');
        if (arr.length == 2) {
			var pg_id = Number(arr[0]);
            if (typeof max_ver_ids[0] == 'undefined')
				max_ver_ids[0] = pg_id;
			else if (max_ver_ids[0] < pg_id)
				max_ver_ids[0] = pg_id;
        }
        else {
        	var curr_id = Number(arr[0]);
            var curr_ver = Number(arr[1]);
            if (typeof max_ver_ids[curr_ver] == 'undefined')
				max_ver_ids[curr_ver] = curr_id;
			else if (max_ver_ids[curr_ver] < curr_id)
				max_ver_ids[curr_ver] = curr_id;
        }
      }
    }
    console.log("...Num. of versions: "+max_ver_ids.length);
    return max_ver_ids;
}

//Start of the main program
//post_last_updt_ts = {};
post_prev_updt_ts = {};

lst_len = get_list_len();
for(i = 0;i < lst_len.length;i++) {
	console.log("...Array len:"+lst_len[i]);
}

for(i = 0;i < lst_len.length-1;i++) {
	//Maintain some stats
    console.log("Comparing versions: "+(i+1)+" & "+(i+2));
	var new_posts = 0;
	var updt_posts = 0;
    var updt_posts_after = 0;
	for(j = 1;j < lst_len[i];j++) {
		var f_name = class_lists_dir;
		if(i == 0)
			f_name += j+'.json';
		else
			f_name += j+'.'+i+'.json';
        var lst_json_str = fs.readFileSync(f_name);
        var lst_json_obj = JSON.parse(lst_json_str);
		posts = lst_json_obj['threads']
		for(var k=0;k < posts.length;k++) {
            var post_url = posts[k]['_link'];
            var last_upd_time = posts[k]['last_updated_time'];
            var post_id = post_url.substr(post_url.lastIndexOf('=')+1);
			post_prev_updt_ts[post_id] = last_upd_time;
        }
    }
	var found_un_updt = false;
    var num_posts_reDLed = 0;
	for(j = 1;j < lst_len[i+1];j++) {
		var f_name = class_lists_dir+j+'.'+(i+1)+'.json';
        var lst_json_str = fs.readFileSync(f_name);
        var lst_json_obj = JSON.parse(lst_json_str);
		posts = lst_json_obj['threads']
		for(var k=0;k < posts.length;k++) {
          var post_url = posts[k]['_link'];
          var last_upd_time = posts[k]['last_updated_time'];
          var post_id = post_url.substr(post_url.lastIndexOf('=')+1);
		  if(!found_un_updt) {
			if(post_id in post_prev_updt_ts) {
				var prev_ts = post_prev_updt_ts[post_id];
				if(prev_ts < last_upd_time) {
					updt_posts += 1;
					post_prev_updt_ts[post_id] = last_upd_time;
				}
				else if(prev_ts == last_upd_time) {
					console.log("--- Found un-updated post id: "+
							post_id+" in list file: "+f_name);
					found_un_updt = true;
				}
				else
					console.log("****** STRANGE: Found a post with older timestamp (before)");
			}
			else {
				new_posts += 1;
				post_prev_updt_ts[post_id] = last_upd_time;
			}
		  }
		  else {
			if(post_id in post_prev_updt_ts) {
				var prev_ts = post_prev_updt_ts[post_id];
				if (prev_ts < last_upd_time) {
                    updt_posts += 1;
                    updt_posts_after += 1;
                }
                else if (prev_ts == last_upd_time)
                    num_posts_reDLed += 1;
                else
					console.log("****** STRANGE: Found a post with older timestamp (after)");
		  	}
		  }
        }
    }
    console.log("----Num. of posts re-DLed: "+num_posts_reDLed);
	console.log("----Num. of new posts: "+new_posts);
    console.log("----Num. of updated posts: "+updt_posts);
    console.log("----Num. of updated posts after: "+updt_posts_after);
}

