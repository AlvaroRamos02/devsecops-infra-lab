
// app/src/utils/vuln.js
// Depth: src -> utils
function helper(cmd) {
    const exec = require('child_process').exec;
    exec(cmd); // SAST: Command Injection
}
