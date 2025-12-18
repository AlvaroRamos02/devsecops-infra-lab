
// app/src/auth/login/vuln.js
// Depth: src -> auth -> login
function login(user) {
    eval("console.log('Login attempt for ' + user)"); // SAST: Eval injection
}
