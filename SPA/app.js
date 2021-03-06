var lock = new Auth0Lock(
  // All these properties are set in auth0-variables.js
  AUTH0_CLIENT_ID,
  AUTH0_DOMAIN
);

/*
* App login using Lock in Redirect Mode
*/
function login(){
  lock.show();
}

/*
* App login using a one time code via SMS
*/
function loginPasswordlessSMS(){
  // Initialize Passwordless Lock instance
  var lock = new Auth0LockPasswordless( AUTH0_CLIENT_ID, AUTH0_DOMAIN );

  // Open the lock in SMS mode with the ability to handle the authentication in page
  lock.sms( { autoclose: true } ,function (err, profile, id_token) {
    if (!err){
      localStorage.setItem('id_token', id_token);
      localStorage.setItem('user_id', profile.user_id);
      showLoggedInUser(profile);
    }
  });
}

/*
* App using a one time code via Email
*/
function loginPasswordlessEmailCode(){
  // Initialize Passwordless Lock instance
  var lock = new Auth0LockPasswordless( AUTH0_CLIENT_ID , AUTH0_DOMAIN );

  // Open the lock in SMS mode with the ability to handle the authentication in page
  lock.emailcode( {autoclose: true} ,function (err, profile, id_token) {
    if (!err){
      localStorage.setItem('id_token', id_token);
      localStorage.setItem('user_id', profile.user_id);
      showLoggedInUser(profile);
    }
  });
}

/*
* Logout user
*/
function logout(){
  $.ajax({
    type: 'GET',
    url: 'https://' + AUTH0_DOMAIN + '/v2/logout'
  }).then(function(data){
    localStorage.removeItem('id_token');
    localStorage.removeItem('user_id');
    $('.login-box').show();
    $('.logged-in-box').hide(); 
  }).fail(function(err){
    alert('error'+err);
  });
}


/*
* Link Accounts.
*/
function linkPasswordAccount(connection){
  localStorage.setItem('linking','linking');
  var opts = {
    rememberLastLogin: false,
    dict: {
      signin: {
        title: 'Link another account'
      }
    }
  };
  if (connection){
    opts.connections = [connection];
  }
  //open lock in signin mode, with the customized options for linking
  lock.showSignin(opts);
}

/*
* Link using Passwordless SMS connection
*/
function linkPasswordlessSMS(){
  // Initialize Passwordless Lock instance
  var lock = new Auth0LockPasswordless( AUTH0_CLIENT_ID, AUTH0_DOMAIN );

  var opts = { 
    autoclose: true, 
    rememberLastLogin: false,
    dict:{
      phone: {
        headerText: "Enter your phone to sign in <br>or create an account to link to."
      }
    }
  };
  // Open the lock in SMS mode with the ability to handle the authentication in page
  lock.sms( opts, function (err, profile, id_token) {
    if (!err){
      linkAccount(id_token);
    }
  });
}

/*
* Link using Passwordless Email Code
*/
function linkPasswordlessEmailCode(){
  // Initialize Passwordless Lock instance
  var lock = new Auth0LockPasswordless( AUTH0_CLIENT_ID, AUTH0_DOMAIN );
  var opts = { 
    autoclose: true, 
    rememberLastLogin: false,
    dict:{
      email: {
        headerText: "Enter your email to sign in or sign up to the account to link to."
      }
    }
  };
  // Open the lock in Email Code mode with the ability to handle
  // the authentication in page
  lock.emailcode( opts, function(err, profile, id_token) {
    if (!err) {
      linkAccount(id_token);
    }
  });
}

/*
* Link using Passwordless Email Magic Link
*/
function linkPasswordlessEmailLink(){
  localStorage.setItem('linking','linking');
  // Initialize Passwordless Lock instance
  var lock = new Auth0LockPasswordless( AUTH0_CLIENT_ID, AUTH0_DOMAIN );

  // Open the lock in Email Code mode with the ability to handle
  // the authentication in page
  lock.magiclink();
}

function reloadProfile(){
  lock.getProfile(localStorage.getItem('id_token'), function(err, profile) {
    if (err) {
      alert('There was an error getting profile. ' + err);
    } else {
      showLoggedInUser(profile);
    }
  });
}

/*
* Link account
*/
function linkAccount(secondaryJWT){
  // At this point you could fetch the secondary account's user_metadata for merging with the primary account.
  // Otherwise, it will be lost after linking the accounts
  var primaryJWT = localStorage.getItem('id_token');
  var primaryUserId = localStorage.getItem('user_id');
  $.ajax({
    type: 'POST',
    url: 'https://' + AUTH0_DOMAIN +'/api/v2/users/' + primaryUserId + '/identities',
    data: {
      link_with: secondaryJWT
    },
    headers: {
      'Authorization': 'Bearer ' + primaryJWT
    }
  }).then(function(identities){
    alert('linked!');
    reloadProfile();
  }).fail(function(jqXHR){
    alert('Error linking Accounts: ' + jqXHR.status + " " + jqXHR.responseText);
  });
}

/*
* Unlink account
*/
function unlinkAccount(secondaryProvider, secondaryUserId){
  var primaryUserId = localStorage.getItem('user_id');
  var primaryJWT = localStorage.getItem('id_token');
  $.ajax({
    type: 'DELETE',
    url: 'https://' + AUTH0_DOMAIN +'/api/v2/users/' + primaryUserId +
         '/identities/' + secondaryProvider + '/' + secondaryUserId,
    headers: {
      'Authorization': 'Bearer ' + primaryJWT
    }
  }).then(function(identities){
    alert('unlinked!');
    showLinkedAccounts(identities);
  }).fail(function(jqXHR){
    alert('Error unlinking Accounts: ' + jqXHR.status + ' ' + jqXHR.responseText);
  });
}

/*
* Display profile properties of logged in user
*/
function showLoggedInUser(profile){
  $('.login-box').hide();
  $('.logged-in-box').show();
  $('.nickname').text(profile.nickname);
  $('.profile').text(JSON.stringify(profile,null,2));
  $('.avatar').attr('src', profile.picture);
  showLinkedAccounts(profile.identities);
}

/*
* Returns true if the identity is the same of the root profile
*/
function isRootIdentity(identity){
  var user_id = localStorage.getItem('user_id');
  return identity.provider === user_id.split('|')[0] && identity.user_id === user_id.split('|')[1];
}

/*
* Displays Linked Accounts as table rows in UI
*/
function showLinkedAccounts(identities){
  $('table.accounts tbody tr').remove();
  if (identities.length > 1){
    $.each(identities,function(index,identity){
      if (!isRootIdentity(identity)){
        $('table.accounts tbody').append(
          `<tr>
            <td>${identity.connection}</td>
            <td>${identity.isSocial}</td>
            <td>${identity.provider}</td>
            <td>${identity.user_id}</td>
            <td><pre>${JSON.stringify(identity.profileData,null,2)}</pre></td>
            <td><button onclick="unlinkAccount('${identity.provider}','${identity.user_id}')" class="btn btn-danger">Unlink</button></td>
          </tr>`);
      }
    });
  } else {
    $('table.accounts tbody').append('<tr><td colspan="6">No linked accounts yet...</td></tr>');
  }
}

$(document).ready(function() {
  var hash = lock.parseHash();
  //handle redirection from iDP after login
  if (hash) {
    window.location.hash = ''; //clean hash
    console.log('hash',hash);
    if (hash.error) {
      console.log('There was an error logging in ' + hash.error );
    } else {
      if (localStorage.getItem('linking') === 'linking'){
        //login to 2nd account for linking
        localStorage.removeItem('linking');
        linkAccount(hash.id_token, hash.profile.sub);
      } else {
        // the hash comes from the site's first time login
        lock.getProfile(hash.id_token, function(err, profile) {
          if (err) {
            console.log('There was an error logging in. ' + err);
          } else {
            // Save the JWT token.
            localStorage.setItem('id_token', hash.id_token);
            localStorage.setItem('user_id', profile.user_id);
            showLoggedInUser(profile);
          }
        });
      }
    }
  } else {
    //handle case of already logged-in user
    reloadProfile();
  }
});
