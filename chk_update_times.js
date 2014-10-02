require(fs);

class_posts_dir = '../statistics-002/lists';
posts_last_updt_ts = [];
posts_prev_updt_ts = [];

list_files = fs.readdirSync(class_posts_dir);
for(i = 0;i < list_files.length;i++) {
    if (list_files[i].endsWith('.json')) {
        arr = list_files[i].split('.');
        var lst_json_str = fs.readFileSync(list_file[i]);
        var lst_json_obj = JSON.parse(lst_json_str);
		posts = lst_json_obj['threads']
		for(var j=0;j < posts.length;j++) {
            var post_url = posts[j]['_link'];
            var last_upd_time = posts[j]['last_updated_time'];
            var post_id = post_url.substr(post_url.lastIndexOf('=')+1);
		    //Get the list of post URLs & return the array of URLs
        }
    }
}

