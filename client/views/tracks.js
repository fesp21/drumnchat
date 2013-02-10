Template.playlist.tracks = function () {
    return DNC.Tracks.playlist();
};

Template.track.artwork = function(){
    return this.sc.artwork_url || this.sc.user.avatar_url;
};

Template.track.events({
    "click": function(event, template){
        Meteor.call("vote", this._id);
    }
});

Template.form.events({
    "submit": function(event, template){
        event.preventDefault();
        Meteor.call("addTrack", template.find("input:text").value);
    }
});