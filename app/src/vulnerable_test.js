
// Vulnerable file for testing
import fs from 'fs';

function dangerous(input) {
    // Rule: javascript.lang.security.audit.path-traversal.path-traversal-join
    const filePath = "/tmp/" + input;
    fs.readFileSync(filePath);

    // Rule: javascript.browser.security.insecure-document-method.insecure-document-method
    document.body.innerHTML = input;
}
