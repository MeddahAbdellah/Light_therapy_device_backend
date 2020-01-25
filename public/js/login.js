var emailRegex = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

function checkLength( o, n, min, max ) {
  if ( o.val().length > max || o.val().length < min ) {
    o.addClass("error");
    alert( "Length of " + n + " must be between " +
      min + " and " + max + "." );
    return false;
  } else {
    return true;
  }
}

function checkRegexp( o, regexp, n ) {
  if ( !( regexp.test( o.val() ) ) ) {
    o.addClass("error");
    alert( n );
    return false;
  } else {
    return true;
  }
}
$("[name='subscribe']").on("click",addUser);
$("[name='login']").on("click",login);
function addUser() {
  $("*").removeClass("error");
  var valid = true;
  valid = valid && checkLength( $("[name='name']"), "name", 3, 20 );
  valid = valid && checkLength( $("[name='surname']"), "surname", 3, 20 );
  valid = valid && checkLength( $("[name='email']"), "email", 6, 150 );
  valid = valid && checkLength( $("[name='password']"), "password", 5, 16 );
  valid = valid && ($("[name='password']").val() == $("[name='confirm_password']").val());
  if($("[name='password']").val() != $("[name='confirm_password']").val()){
    alert("Passwords Don't match");
    $("confirm_password").addClass("error");
  }
  valid = valid && checkRegexp( $("[name='name']"), /([a-zA-Z])+$/i, "User Name may consist of a-z letters" );
  valid = valid && checkRegexp( $("[name='surname']"), /([a-zA-Z])+$/i, "User Surname may consist of a-z letters" );
  valid = valid && checkRegexp( $("[name='email']"), emailRegex, "wrong mail format eg. ui@jquery.com" );
  valid = valid && checkRegexp( $("[name='password']"), /^([0-9a-zA-Z])+$/, "Password field only allow : a-z 0-9" );
  if(valid){
    $.ajax({
      type:"POST",
      url:"/subscribe",
      data:{user_name:$("[name='name']").val(),
            user_surname:$("[name='surname']").val(),
            user_email:$("[name='email']").val(),
            user_password:$("[name='password']").val()},
      success:function(res){
        window.location="/login";
      },
      error:function(err){
        console.error(err);
      }
    });
  }
}
function login(){
  $("*").removeClass("error");
  var valid = true;
  valid = valid && checkLength( $("[name='email']"), "email", 6, 150 );
  valid = valid && checkLength( $("[name='password']"), "password", 5, 16 );
  valid = valid && checkRegexp( $("[name='email']"), emailRegex, "wrong mail format eg. ui@jquery.com" );
  valid = valid && checkRegexp( $("[name='password']"), /^([0-9a-zA-Z])+$/, "Password field only allow : a-z 0-9" );
  if(valid){
    $.ajax({
      type:"POST",
      url:"/login",
      data:{email:$("[name='email']").val(),password:$("[name='password']").val()},
      success:function(res){
       console.log(res);
	if(res=="E-mail Or Password incorrect.")alert("E-mail Or Password incorrect.");
	else goToDashboard(res[0],"/");
      },
      error:function(err){
        console.error(err);
      }
    });
  }
}

function goToDashboard(info,route){
  console.log(info.user_id);
  localStorage.clear();
  localStorage.setItem("user_id",info.user_id);
  localStorage.setItem("user_name",info.user_name);
  localStorage.setItem("user_surname",info.user_surname);
  localStorage.setItem("user_email",info.user_email);
  window.location=route;
}
