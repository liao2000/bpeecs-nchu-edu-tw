function stripHtml(html) {
  var tmp = document.createElement("div");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
}

function hash(str) {
  var h = 0;

  for (var i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }

  return h;
} // input: string(json)
// output: string(html code)


function loadAttchment(str) {
  // load attachment
  if (str === "") {
    return "";
  }

  try {
    var attachment = "";
    var parse = JSON.parse(str);
    var len = parse.clientName.length;

    for (var i = 0; i < len; i++) {
      attachment += '<li><a href="' + parse.path[i] + '">' + parse.clientName[i] + '</a></li>';
    }

    return attachment;
  } catch (e) {
    return "";
  }
}

function appendMoreInfo(obj) {
  $(obj).next().slideToggle();
}

function articleTypeDecoder(key) {
  var dict = {
    "normal": "一般消息",
    "activity": "演講 & 活動",
    "course": "課程 & 招生",
    "scholarships": "獎學金",
    "recruit": "徵才資訊"
  };
  return dict[key];
}

function loadNews(scope, type, from, to) {
  if (type === undefined) type = 'normal';
  if (from === undefined) from = '';
  if (to === undefined) to = '';

  return new Promise(function (resolve, reject) {
    $.ajax({
      url: '/function/get_news',
      data: {
        'scope': scope,
        'type': type,
        'from': from,
        'to': to
      },
      type: 'GET',
      success: function success(data) {
        resolve(data);
      },
      error: function error(err) {
        reject(err);
      },
      dataType: 'json'
    });
  });
}

function loadNewsForWhat(what, scope, type, from, to) {
  var self = this;
  this.from = from;
  this.to = to;
  this.len = to - from + 1;

  this.load = function () {
    return new Promise(function (resolve, reject) {
      loadNews(scope, type, self.from, self.to).then(function (data) {
        var ret = self.render(data.NewsList);

        if (data.HasNext) {
          ret += "<div><button style=\"margin:0px auto;\" onclick=\"loadNext(this)\">More</button></div>";
        }

        resolve(ret);
      }).catch(function (err) {
        reject(err);
      });
    });
  };

  if (what == 'management') {
    this.render = function (data) {
      if (data == null) return "No articles";
      var len = data.length;
      var ret = '';

      for (var i = 0; i < len; i++) {
        var isDraft = data[i].PublishTime === 0 ? true : false;
        data[i].CreateTime = $.format.date(new Date(data[i].CreateTime * 1000), "yyyy-MM-dd HH : mm");
        data[i].LastModified = data[i].LastModified === 0 ? '-' : $.format.date(new Date(data[i].LastModified * 1000), "yyyy-MM-dd HH : mm");
        data[i].PublishTime = data[i].PublishTime === 0 ? '-' : $.format.date(new Date(data[i].PublishTime * 1000), "yyyy-MM-dd HH : mm");
        var newContent = stripHtml(data[i].Content);

        if (newContent.length > 50) {
          newContent = newContent.slice(0, 80);
          newContent += "<a href=\"/news?id=".concat(data[i].ID, "\">...More</a><p></p>");
        }

        var attachment = loadAttchment(data[i].Attachment);
        var draftIcon = isDraft ? '<div class="draftIcon">draft</div>' : '';
        var draftColor = isDraft ? 'border-color:#fe6c6c;' : 'border-color:#14a1ff;';
        ret += "<div class=\"article\" data-id=\"".concat(data[i].ID, "\" style=\"").concat(draftColor, "\">\n                    <h2 class=\"title\">").concat(draftIcon).concat(data[i].Title, "</h2>");
        ret += "<div class=\"header\" onclick=\"javascript:appendMoreInfo(this)\">";
        ret += "    <div class=\"candy-header\"><span>\u5206\u985E</span><span>".concat(articleTypeDecoder(data[i].Type), "</span></div>");
        ret += "    <div class=\"candy-header\"><span>\u6700\u5F8C\u7DE8\u8F2F</span><span class=\"orange\">".concat(data[i].LastModified, "</span></div>");
        ret += "</div>";
        ret += "<div style=\"display: none;\">";
        ret += "  <div class=\"candy-header hide-less-500px\"><span>\u5EFA\u7ACB\u65BC</span><span class=\"red\">".concat(data[i].CreateTime, "</span></div>");
        ret += "  <div class=\"candy-header hide-less-500px\"><span>\u767C\u4F48\u65BC</span><span class=\"green\">".concat(data[i].PublishTime, "</span></div>");
        ret += "</div>";
        ret += "\n                    <div class=\"content\">\n                        ".concat(newContent, "\n                    </div>\n                    <div id=\"attachmentArea\">\n                        <ul>").concat(attachment, "</ul>\n                    </div>\n                    <div class=\"buttonArea\" style=\"text-align: right;\">\n                        <button id=\"read\" onclick=\"window.location='/news?id=").concat(data[i].ID, "'\"\" class=\"border\">\u95B1\u8B80</button>\n                        <button id=\"delete\" onclick=\"javascript:delete_what(this, 'news', ").concat(data[i].ID, ")\" class=\"red\">\u522A\u9664</button>\n                        <button id=\"publish\" onclick=\"javascript:edit_news(").concat(data[i].ID, ")\" class=\"blue\">\u7DE8\u8F2F</button>\n                    </div>\n                </div>\n                ");
      }

      return ret;
    };
  } else if (what == 'brief') {
    this.render = function (data) {
      if (data == null) return "No articles";
      var len = data.length;
      var ret = "";

      for (var i = 0; i < len; i++) {
        data[i].PublishTime = $.format.date(new Date(data[i].PublishTime * 1000), "yyyy-MM-dd");
        var newContent = stripHtml(data[i].Content);

        if (newContent.length > 30) {
          newContent = newContent.slice(0, 80);
          newContent += "...<a href=\"/news?id=".concat(data[i].ID, "\">\u7565</a>");
        }

        var attachment = loadAttchment(data[i].Attachment);
        ret += "\n                <div class=\"article\" data-id=\"".concat(data[i].ID, "\">\n                    <h2 class=\"title\">").concat(data[i].Title, "</h2>\n                    <div class=\"header\" onclick=\"javascript:appendMoreInfo(this)\">\n                        <div class=\"candy-header\"><span>\u767C\u4F48\u65BC</span><span>").concat(data[i].PublishTime, "</span></div>\n                    </div>\n                    <div style=\"display:none;\">\n                ");
        ret += "<div class=\"candy-header\"><span>\u5206\u985E</span><span class=\"green\">".concat(articleTypeDecoder(data[i].Type), "</span></div>");
        ret += "<div class=\"candy-header\"><span>\u767C\u6587</span><span class=\"cyan\">@".concat(data[i].User, "</span></div>");
        ret += "\n                    </div>\n                    <div class=\"content\">\n                        ".concat(newContent, "\n                    </div>\n                    <div id=\"attachmentArea\">\n                        <ul>").concat(attachment, "</ul>\n                    </div>\n                    <p></p>\n                    <div class=\"buttonArea\" style=\"text-align: right;\">\n                        <button id=\"attachment\" onclick=\"window.location='/news?id=").concat(data[i].ID, "'\"\n                                style=\"display: inline-block;\">\u95B1\u8B80\u5168\u6587</button>\n                    </div>\n                </div>\n                ");
      }

      return ret;
    };
  }

  this.next = function () {
    self.from = self.to + 1;
    self.to += self.len;
    return self.load();
  };
}

function notice(msg){
    $("#notice").html(msg);
    $("#notice").slideDown(100,function(){
        setTimeout(function(){
            $("#notice").slideUp(500);
        },10000);
    });
}

function slideToggole(id){
    $('#'+id).slideToggle();
}

$(window).on('resize', function(){
    var win = $(this); //this = window
    if(win.width() > 900) {
        $("#button-over-900px").show();
    }
});
