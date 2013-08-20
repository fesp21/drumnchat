"use strict";

var Player = {
    init: function(){
        Player.playingHandle = DNC.Tracks.find({playing: true}).observe({
            added: function(track){
                playTrack(track);
            }
        });

        Player.muted = false;
        Session.set("player.muted", Player.muted);
    },

    toggleMute: function(){
        if(Player.track){
            if(Player.track.type === "sc"){
                Player.stream.toggleMute();
            }
            else if(Player.track.type === "yt"){
                Player.ytplayer[Player.muted? "unMute": "mute"]();
            }
        }

        Player.muted = !Player.muted;
        Session.set("player.muted", Player.muted);
    },

    stop : function(){
        Player.muted = false;
        Session.set("player.muted", Player.muted);
        stopPlayback();
    }
};

function playTrack(track){
    stopPlayback();

    Meteor.call("onAirOffset", Session.get("roomId"), function(error,result){
        console.log("Playing track offset is "+ result + "ms");
        track._offset = result;

        startPlayback(track);
    });

    console.log("Playing track", track.serviceData.title, track);
    if(track.type === "sc"){
        loadSoundcloudTrack(track);
    }
    else if(track.type === "yt"){
        loadYoutubeTrack(track);
    }

    Player.track = track;
    Session.set("player.track", track);
}

function loadSoundcloudTrack(track){
    var opts = {
        autoLoad: true,
        whileloading: function(){
            deferPlayAtRequiredOffset.call(this, track);
            Player.onLoading && Player.onLoading.call(this, track);
        },
        whileplaying:function(){
            Player.onPlaying && Player.onPlaying.call(this, track);
        }
    };

    SC.stream("/tracks/"+track.serviceData.id, opts, function(stream){
        if(Player.muted){
            stream.mute();
        }

        track._loadstart = Date.now();
        Player.stream = stream;
    });
}

function deferPlayAtRequiredOffset(track){
    if(!track._playing && track._offset!== null){
        var latencyComp = Date.now() - track._loadstart;
        if(this.duration > track._offset + latencyComp){
            console.log("Playing track caught up at " + (track._offset + latencyComp) + "ms (comp "+latencyComp+"ms)");

            track._playing = true;

            this.setPosition(track._offset + latencyComp);
            this.play();
        }
    }
}

function loadYoutubeTrack(track){
    Player.ytplayer.cueVideoById(track.serviceData.id, 0, "large");
    setYoutubeMute();
}

function setYoutubeMute(){
    Player.ytplayer[!Player.muted? "unMute": "mute"]();
}

function startPlayback(track){
    if(track.type === "yt"){
        Player.ytplayer.seekTo(track._offset / 1000);
        Player.ytplayer.playVideo();
    }
}

function stopPlayback(){
    if(Player.stream){
        Player.stream.destruct();
    }
    if(Player.ytplayer){
        Player.ytplayer.pauseVideo();
    }

    //Unregister callback only if the player was in playback mode,
    //otherwise we could unregister useful callbacks
    if(Player.playing){
        Player.onLoading = null;
        Player.onPlaying = null;
    }

    Player.track = null;
    Session.set("player.track", null);
}

//Load 3rd party players
Session.set("youtube.domready", false);
Session.set("youtube.apiready", false);
Session.set("youtube.ready", false);

Template.ytplayer.created = function(){
    Session.set("youtube.domready", true);
};

window.onYouTubeIframeAPIReady = function(playerid){
    Session.set("youtube.apiready", true);
};

Deps.autorun(function(){
    if(!Session.equals("youtube.domready", true) || !Session.equals("youtube.apiready", true)){
        return;
    }

    var ytplayer = new YT.Player("yt-player", {
      width: "640",
      height: "480",
      videoId: "",
      events: {
        "onReady": function(){
            Player.ytplayer = ytplayer;
            Player.ytplayer.setVolume(100);

            Session.set("youtube.ready", true);
        },
        "onError": function(error){
            console.log("Youtube error: ", error);
        }
      }
    });
});


Deps.autorun(function(){
    if(Session.get("youtube.ready") && Soundcloud.ready()){
        Player.init();
    }
});

Deps.autorun(function(){
    Router.current();
    Player.stop();
});

DNC.Player = Player;
