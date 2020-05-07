const express = require('express');
const yargs = require('yargs');
const fs = require('fs');
const pathLib = require('path');

const app = express();
const port = 8000;

const imageExts = ['png', 'jpg', 'gif', 'jpeg'];
const mime = {
    html: 'text/html',
    txt: 'text/plain',
    css: 'text/css',
    gif: 'image/gif',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    svg: 'image/svg+xml',
    js: 'application/javascript'
};

const argv = yargs
    .option('root', {
	alias: 'r',
	description: 'root directory of file browser',
	type: 'string'
    })
    .help()
    .alias('help', 'h')
    .argv;

let rootDir = __dirname;
let currentDir = rootDir;
if (argv.root) {
    rootDir = argv.root;
}

app.get('*', (req, res) => {
    let dir = req.params[0];
    createPage(dir, res);
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});

function createPage(dir, res) {
    let fullPath = createFullPath(dir);
    console.log(`Displaying ${fullPath}`);
    if (fs.statSync(fullPath).isDirectory()) {
	let files = fs.readdirSync(fullPath);
	files.sort(fileSort.bind(null, fullPath));

	let html = "<html><body>"
            + `<a href='..'>..</a><br />`
	    + files.map(createLink.bind(null, fullPath, dir)).join('<br />')
	    + "</body></html>";
	res.send(html);
    }
    else {
	return createFile(fullPath, res);
    }
}

function fileSort(fullPath, lhs, rhs) {
    let lhsf = pathLib.join(fullPath, lhs);
    let rhsf = pathLib.join(fullPath, rhs);
    let lhsfs = fs.statSync(lhsf);
    let rhsfs = fs.statSync(rhsf);
    if (lhsfs.isDirectory() && !rhsfs.isDirectory()) {
	return -1;
    }
    else if (!lhsfs.isDirectory() && rhsfs.isDirectory()) {
	return 1;
    }
    else return lhsf - rhsf;
}

function createLink(root, curr, path) {
    let fullPath = pathLib.join(root, path);
    let stats = fs.statSync(fullPath);
    let relPath = pathLib.join(curr, path);
    if (stats.isDirectory()) {
	return `<a href="${relPath}/">${path}/</a>`;
    }
    return `<a href="${relPath}">${path}</a>`;
}

function createFullPath(path) {
    return pathLib.join(rootDir, path);
}

function createFile(path, res) {
    let type = mime[pathLib.extname(path).slice(1)] || 'text/plain';
    let s = fs.createReadStream(path);

    s.on('open', function () {
        res.set('Content-Type', type);
        s.pipe(res);
    });
    s.on('error', function (err) {
	console.log(err);
        res.set('Content-Type', 'text/plain');
        res.status(404).end('Not found');
    });
}
