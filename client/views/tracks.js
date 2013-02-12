Template.playlist.tracks = function () {
    return DNC.Tracks.playlist();
};

Template.track.artwork = function(){
    return this.sc.artwork_url || this.sc.user.avatar_url;
};

Template.track.voters = function(){
    return Meteor.users.find({_id : {$in: this.votes}});
};

Template.track.events({
    "click .track-vote": function(event, template){
        Meteor.call("vote", this._id, function(error){
            if(error){
                alert(error.reason);
            }
        });
    }
});

Template.form.events({
    "submit": function(event, template){
        event.preventDefault();
        Meteor.call("addTrack", template.find("input:text").value, function(error){
            if(error){
                alert(error.reason);
            }
        });

        event.target.reset();
    }
});