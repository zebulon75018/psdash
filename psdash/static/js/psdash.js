
function filesizeformat  (bytes) {
  if (bytes == 0) { return "0.00 B"; }
  var e = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes/Math.pow(1024, e)).toFixed(2)+' '+' KMGTP'.charAt(e)+'B';
}

function fromtimestamp(d) {
    var date = new Date(d*1000);

    var month = date.getMonth() + 1;
    var day = date.getDate();
    var hour = date.getHours();
    var min = date.getMinutes();
    var sec = date.getSeconds();

    month = (month < 10 ? "0" : "") + month;
    day = (day < 10 ? "0" : "") + day;
    hour = (hour < 10 ? "0" : "") + hour;
    min = (min < 10 ? "0" : "") + min;
    sec = (sec < 10 ? "0" : "") + sec;

    var str = date.getFullYear() + "-" + month + "-" + day + "_" +  hour + ":" + min + ":" + sec;

    return str;
 }

function escape_regexp(str) {
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}

function replace_all(find, replace, str) {
  return str.replace(new RegExp(escape_regexp(find), 'g'), replace);
}

function init_log() {
    var $log = $("#log");
    function scroll_down($el) {
        $el.scrollTop($el[0].scrollHeight);
    }

    function read_log() {
        var $el = $("#log-content");
        var mode = $el.data("mode");
        if(mode != "tail") {
            return;
        }

        $.get($log.data("read-log-url"), function (resp) {
            // only scroll down if the scroll is already at the bottom.
            if(($el.scrollTop() + $el.innerHeight()) >= $el[0].scrollHeight) {
                $el.append(resp);
                scroll_down($el);
            } else {
                $el.append(resp);
            }
        });
    }

    function exit_search_mode() {
        var $el = $("#log-content");
        $el.data("mode", "tail");
        var $controls = $("#log").find(".controls");
        $controls.find(".mode-text").text("Tail mode (Press s to search)");
        $controls.find(".status-text").hide();

        $.get($log.data("read-log-tail-url"), function (resp) {
            $el.text(resp);
            scroll_down($el);
            $("#search-input").val("").blur();
        });
    }

    $("#scroll-down-btn").click(function() {
        scroll_down($el);
    });

    $("#search-form").submit(function(e) {
        e.preventDefault();

        var val = $("#search-input").val();
        if(!val) return;

        var $el = $("#log-content");
        var filename = $el.data("filename");
        var params = {
            "filename": filename,
            "text": val
        };

        $el.data("mode", "search");
        $("#log").find(".controls .mode-text").text("Search mode (Press enter for next, escape to exit)");

        $.get($log.data("search-log-url"), params, function (resp) {
            var $log = $("#log");
            $log.find(".controls .status-text").hide();
            $el.find(".found-text").removeClass("found-text");

            var $status = $log.find(".controls .status-text");

            if(resp.position == -1) {
                $status.text("EOF Reached.");
            } else {
                // split up the content on found pos.
                var content_before = resp.content.slice(0, resp.buffer_pos);
                var content_after = resp.content.slice(resp.buffer_pos + params["text"].length);

                // escape html in log content
                resp.content = $('<div/>').text(resp.content).html();

                // highlight matches
                var matched_text = '<span class="matching-text">' + params['text'] + '</span>';
                var found_text = '<span class="found-text">' + params["text"] + '</span>';
                content_before = replace_all(params["text"], matched_text, content_before);
                content_after = replace_all(params["text"], matched_text, content_after);
                resp.content = content_before + found_text + content_after;
                $el.html(resp.content);

                $status.text("Position " + resp.position + " of " + resp.filesize + ".");
            }

            $status.show();
        });
    });
    
    $(document).keyup(function(e) {
        var mode = $el.data("mode");
        if(mode != "search" && e.which == 83) {
            $("#search-input").focus();
        }
        // Exit search mode if escape is pressed.
        else if(mode == "search" && e.which == 27) {
            exit_search_mode();
        }
    });

    setInterval(read_log, 1000);
    var $el = $("#log-content");
    scroll_down($el);
}

var skip_updates = false;

function init_updater() {
    function update() {
        if (skip_updates) return;

        $.ajax({
            url: "/json"+location.pathname+location.search,
            cache: false,
            dataType: "html",
            success: function(resp){
              $(".spinner").hide();
              var data = JSON.parse(resp);
              if (data["type"]=="process") {
		ddata = [];
		for( var i= 0; i< data["data"].length; i++)
		{
		   d = data["data"][i];
		   ddata.push([ d["pid"],
				"<a href='/process/"+d["pid"]+"'>"+d["name"]+"</a>",
				d["user"],
				d["status"],
				fromtimestamp(d["created"]),
				filesizeformat(d["mem_rss"]),
				filesizeformat(d["mem_vms"]),
				d["mem_percent"].toFixed(2),d["cpu_percent"]]);

		}
		datatable.clear();
    		datatable.rows.add(ddata);
    		datatable.draw();
		return;
		}
              for(var key in data) {
		   if (typeof(data[key]) =="object")
                   { 
              		for(var key2 in data[key]) 
			{
		   		elm = $("."+key+key2);
				if (elm.length ==0) { continue; }
				if ( elm.attr("gauge") != undefined ) 
				{
					chartSpeed=allchart[key+key2];
 					point = chartSpeed.series[0].points[0];
    					newVal = parseFloat(data[key][key2]);
    					point.update(newVal);
				}
				if ( elm.attr("format") == "filesizeformat" ) {
		   		    elm.html(filesizeformat(data[key][key2]));
				} else {
		   		    elm.html(data[key][key2]);
				}
			}
	           }
		   if (typeof(data[key]) =="number")
		   {
		   		$("."+key).html(data[key]);
                   }
		   if (typeof(data[key]) =="string")
		   {
		   		$("."+key).html(data[key]);
                   }
		   if ( Array.isArray(data[key]) )
		   {
		   	elm = $(".list"+key);
			if (elm.length ==0) { 
					console.log(" list key not found " );
					continue;
				}
			if (typeof(elm.attr("data")) !="string")
			{
				console.log(" data not string " );
				continue;
			}
			allcol = elm.attr("data").split(" ")
			
			allformat = [];
			if ( elm.attr("format") !== undefined ) {
				allformat = elm.attr("format").split(" ")
			}
			//console.log(allformat);
			result = ""
			for (var i = 0; i < data[key].length; i++) { 
			  result += "<tr>"
			  n=0;
              		  for(var key2 in allcol) 
			  {
				value = data[key][i][allcol[key2]];
				if (allformat.length>n) {
				     funcformat = allformat[n];
				     if ( funcformat =="filesizeformat" ) {
					value = filesizeformat(value);
					}
				    if ( funcformat =="fromtimestamp" ) {
					value = fromtimestamp(value);
					}
				}
				n++;
                                result += "<td>"+value+"</td>\n"
			  }
                          result += "</tr>\n"
			}
			elm.html(result);
                   }
		}

              //  $("#psdash").find(".main-content").html(resp);
            }
        });
    }

    setInterval(update, 3000);
}

function init_connections_filter() {
    var $content = $("#psdash");
    $content.on("change", "#connections-form select", function () {
        $content.find("#connections-form").submit();
    });
    $content.on("focus", "#connections-form select, #connections-form input", function () {
        skip_updates = true;
    });
    $content.on("blur", "#connections-form select, #connections-form input", function () {
        skip_updates = false;
    });
    $content.on("keypress", "#connections-form input[type='text']", function (e) {
        if (e.which == 13) {
            $content.find("#connections-form").submit();
        }
    });
}

$(document).ready(function() {
    if ($("#jstree_browse").length !=0 ) return;
    init_connections_filter();

    if($("#log").length == 0) {
        init_updater();
    } else {
        init_log();
    }
});
