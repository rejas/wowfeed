var http = require('http'),
    rss = require('rss'),
    url = require('url'),
    qs = require('querystring'),
    htmlparser = require('htmlparser');

/////////// Create and start the server to handle requests
http.createServer(function (request, response)
{
    // Extract the searchquery from the querystring
    var url_parts = url.parse(request.url,true);
    var character = url_parts.query.character;
    var realm = url_parts.query.realm;
    var region = url_parts.query.region;

    if (!region || !realm || !character) {
        // Tell the client the search params were not correct
        response.writeHead(200, {'Content-Type':'text/html'});
        response.end('Invalid call, please specify character, realm and region!\n');
    }
    else {
        // Tell the client that return value is of rss type
        response.writeHead(200, {'Content-Type':'application/rss+xml'});
        processquery(region, realm, character, response);
    }
}).listen(8080);

console.log('Server running at http://localhost:8080/');

function processitem(item)
{
    var rss = {};
    rss.date = item.timestamp;
    rss.categories = [item.type];

    rss.description = 'todo desc';
    rss.title = item.type;
    rss.guid = 0;
    rss.author = 'todo author';
    rss.url = 'todo url';

    switch (item.type)
    {
        case ("ACHIEVEMENT"):
            rss.title = item.achievement.title;
            rss.description = "Earned the achievement '" + item.achievement.description +"' for " + item.achievement.points +" points.";
            break;

        case ("CRITERIA"):
            rss.title = item.achievement.title;
            rss.description = "Completed step '" + item.criteria.description + "' of achievement '" + item.achievement.description +"'.";
            break;

        case ("LOOT"):
            rss.title = "Loot";
            rss.description = "Obtained '" + item.itemId +"'.";
            break;

        case ("BOSSKILL"):
            rss.title = item.name;
            rss.description = item.quantity + " " + item.achievement.title;
            break;

        default:
            console.log("Unhandled type: " + item.type);
            break;
    }

    return rss;
}

function processquery(region, realm, character, responseObj)
{
    var options = {
        host:region+'.battle.net',
        path:'/api/wow/character/'+realm+'/'+character+'?fields=feed'
    };

    var handler = new htmlparser.DefaultHandler(function (error, dom) {
        if (error) {
        }
        else {
            ///////////// Generate RSS feed
            var feed = new rss({
                title:'RSS feed for '+character+' on '+realm,
                description:'RSS feed generated from blizzards json feed-api',
                feed_url:'http://'+options.host+options.path,
                site_url:'http://'+options.host+'/wow/character/'+realm+'/'+character+'/feed',
                author:'rejas'
            });

            // Parse JSON we get from blizzard
            var js = JSON.parse(dom[0].data);

            // Loop over data and add to feed
            js.feed.forEach(function (item) {
                feed.item(processitem(item));
            });

            //Print the RSS feed out as response
            responseObj.write(feed.xml());
            responseObj.end();
        }
    });
    var html_parser = new htmlparser.Parser(handler);

    var req = http.request(options, function (res) {
        console.log('STATUS: ' + res.statusCode);
        //console.log('HEADERS: ' + JSON.stringify(res.headers));

        var alldata = "";
        res.on('data', function (chunk) {
            alldata = alldata + chunk;
        });
        res.on('error', function (e) {
            console.log('problem with request: ' + e.message);
        });
        res.on('end', function () {
            html_parser.parseComplete(alldata);
        });
    });

    req.on('error', function (e) {
        console.log('problem with request: ' + e.message);
    });

    req.end();
}