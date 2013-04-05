// common
Dumbs = new Meteor.Collection("dumbs");

// client
if (Meteor.isClient) {

  Template.counter.counter = function () {
    add_to_chart( Dumbs.find({}).count() );
    return Dumbs.find({}).count();
  };

  Template.online_users_list.online_users = function () {
    return Dumbs.find({});
  };

  Template.online_users_list.events({
    'click a': function () {
      var sid = Meteor.default_connection._lastSessionId
      Dumbs.update({_id:sid },
        {$inc:{ clicks: 1 }
      });
    }
  });

  function add_to_chart(value) {
    if (typeof random !== 'undefined') {
      random.append(new Date().getTime(), value );
    }
  }

  setTimeout(function () {
      random = new TimeSeries();
      // manual
      // random.append(new Date().getTime(), Math.random() * 10000);
      function createTimeline() {
        var chart = new SmoothieChart();
        chart.addTimeSeries(random, { strokeStyle: 'rgba(0, 255, 0, 1)', fillStyle: 'rgba(0, 255, 0, 0.2)', lineWidth: 4 });
        chart.streamTo(document.getElementById("chart"), 500);
        // HACK: because the chart needs some init data
        random.append(new Date().getTime(), 0);
        random.append(new Date().getTime(), 1);
        random.append(new Date().getTime(), 1);
      }

      createTimeline();
  }, 2000); // HACK


    Meteor.startup(function () {
      // HACK: sid isn't ready yet :(
      setTimeout(function() {
        var sid = Meteor.default_connection._lastSessionId

        if (localStorage.getItem('username') !== null) {
          Dumbs.update({_id:sid },
            {$set:{
              username: localStorage.getItem('username'),
            }
          });
        } else {
          localStorage.setItem('username', Dumbs.find({_id:sid }).collection.docs[sid].username);
        }

        console.log("Welcome "+localStorage.getItem('username'))
      }, 2000);
    });

  // Subscribe
  Meteor.autorun(function() {
    Meteor.subscribe('dumbs' );
  });


}


// server
if (Meteor.isServer) {
  Meteor.startup(function () {


    // Permissions
    Dumbs.allow({
      update: function(userId, docs, fields, modifier) {
        return true;
      }
    });

    // Publishing
    Meteor.publish("dumbs", function(){
      return Dumbs.find({});
    });


    // Online checks
    // via: https://github.com/murilopolese/howmanypeoplearelooking
    Dumbs.remove({});
      Meteor.default_server.stream_server.register( Meteor.bindEnvironment( function(socket) {
        var intervalID = Meteor.setInterval(function() {
          if (socket.meteor_session) {

            var connection = {
                _id: socket.meteor_session.id,
                username: "guest"+_.random(10,99),
                clicks: 0
            };

            console.log(">> add "+socket.meteor_session.id)
            socket.id = socket.meteor_session.id;
            Dumbs.insert(connection); 
            Meteor.clearInterval(intervalID);
          }
        }, 1000);

        socket.on('close', Meteor.bindEnvironment(function () {
          console.log(">> remove "+socket.id)
          Dumbs.remove({
            _id: socket.id
          });
        }, function(e) {
            Meteor._debug("Exception from connection close callback:", e);
        }));
      }, function(e) {
          Meteor._debug("Exception from connection registration callback:", e);
      }));



  });
}
