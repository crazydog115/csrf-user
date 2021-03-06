var crypto      = require('crypto'),
    _           = require('underscore');

module.exports = function(secret, usernameVar, disableCSRF, sessionVar, timeout){
    return function(req, res, next){

        //Set the default argument values, and throw errors for the required ones
        if(undefined == secret)         throw("csrf-user: Secret is required!");
        if(undefined == usernameVar)    throw("csrf-user: Username is required!");
        if(undefined == disableCSRF)    disableCSRF = [];
        if(undefined == sessionVar)     sessionVar = 'signed';
        if(undefined == timeout)        timeout = 60;

        if(req.method == "GET"){
            //If this is a GET request, generate a new CSRF token.
            //Concatenates the username, current timestamp, and a  random string, and converts the resulting string to hex
            var token   = toHex(req.session[usernameVar])+'.'+Date.now()+'.'+Math.random().toString(36).substring(7);
            //Token is created by hashing the above string with the secret key provided for the app.
            var hash    = crypto.createHmac('sha1', secret).update(token).digest('hex');
            //Escapes the token to enable for injection into the web page.
            req.session[sessionVar] = _.escape(token+'-'+hash);
            next();
        }else if(req.method == "POST" || req.method == "PUT" || req.method == "DELETE"){
            //If this path is in the disableCSRF array, ignore this request.
            if(disableCSRF.indexOf(req.url) != -1){
                next();
            }else{
                try{
                    //Otherwise, check the token for all POST, PUT, or DELETE requests.
                    var signed = req.get('x-csrf-token');

                    //Get the original token and the hash encrypted with the secret key.
                    var parts = signed.split('-');
                    if(parts.length == 2){
                        var token   = parts[0];
                        var hash    = parts[1];
                    }
                    //Split the token into its respective parts (userID, time, random string)
                    var tokenParts = token.split('.');
                    //Ensure the token hasn't expired, and that the hash matches one generated by this app.
                    if(parseInt(tokenParts[1])+(timeout*60*1000) >= Date.now() && hash === crypto.createHmac('sha1', secret).update(token).digest('hex')){
                        next();
                    }else{
                        //If the token is bad, return forbidden.
                        res.send(403);
                    }
                }catch(e){
                    console.log(e.message);
                    console.log(e.stack);
                    res.send(403);
                }
            }
        }
    }
};

/*
 * Helper function to convert a string to hex.
 */
function toHex(str) {
    var hex = '';
    for(var i=0;i<str.length;i++) {
        hex += ''+str.charCodeAt(i).toString(16);
    }
    return hex;
}