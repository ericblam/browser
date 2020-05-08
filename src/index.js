const express = require('express');
const yargs = require('yargs');
const fs = require('fs');
const pathLib = require('path');

const app = express();
const port = 8000;

const imageExts = ['.png', '.jpg', '.gif', '.jpeg'];
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
    if (dir === '/favicon.ico') {
	// createFile('/mnt/c/dev/browser/src/favicon.ico', res);
	return;
    }

    if (dir.startsWith('/assets')) {
	createAsset(dir, res);
	return;
    }
    
    if (req.query.gallery) {
	createGalleryPage(dir, res);
	return;
    }

    createRawPage(dir, res);
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});

function createRawPage(dir, res) {
    let fullPath = createFullPath(dir);
    // console.log(`Displaying ${fullPath}`);
    if (fs.statSync(fullPath).isDirectory()) {
	let files = fs.readdirSync(fullPath);
	files.sort(fileSort.bind(null, fullPath));

	let html = "<html><body>"
	    + '<head><link rel="icon" href="favicon.ico" /></head>'
	    + '<a href="./?gallery=true">View Gallery</a><br /><br />'
            + `<img src="/assets/up.jpg" style="width:15px" /> <a href='..'>..</a><br /><br />`
	    + files.map(createLink.bind(null, fullPath, dir)).join('<br />')
	    + "</body></html>";
	res.send(html);
    }
    else {
	return createFile(fullPath, res);
    }
}

function createGalleryPage(dir, res) {
    let fullPath = createFullPath(dir);
    // console.log(`Displaying ${fullPath}`);
    if (fs.statSync(fullPath).isDirectory()) {
	let files = fs.readdirSync(fullPath);
	files.sort(fileSort.bind(null, fullPath));

	let html = "<html><body>"
	    + '<head><link rel="icon" href="favicon.ico" /><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>'
	    + '<a href="./?gallery=\"false\"">View List</a><br /><br />'
            + `<a href='..'>..</a><br /><br />`
	    + files.map(createImage.bind(null, fullPath, dir)).join('<br />')
	    + "</body></html>";
	res.send(html);
    }
    else {
	return createFile(fullPath, res);
    }
}

function createAsset(path, res) {
    let fullpath = pathLib.join(__dirname, path);
    createFile(fullpath, res);
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
    else return lhs.localeCompare(rhs, undefined, {numeric: true});
}

function createLink(root, curr, path) {
    let fullPath = pathLib.join(root, path);
    let stats = fs.statSync(fullPath);
    let relPath = pathLib.join(curr, path);
    if (path.length > 40) {
	path = path.substring(0,40) + "...";
    }
    if (stats.isDirectory()) {
	return `<img src="/assets/dir.jpg" style="width:15px" /> <a href="${relPath}/">${path}/</a>`;
    }
    return `<img src="/assets/file.jpg" style="width:15px" /> <a href="${relPath}">${path}</a>`;
}

function createImage(root, curr, path) {
    let fullPath = pathLib.join(root, path);
    let stats = fs.statSync(fullPath);
    let relPath = pathLib.join(curr, path);
    if (stats.isDirectory()) {
	let dirStats = fs.readdirSync(fullPath);
	dirStats.sort(fileSort.bind(null, fullPath));
	let firstImage = null;
	for (i = 0; i < dirStats.length; ++i) {
	    if (imageExts.indexOf(pathLib.extname(dirStats[i])) >= 0) {
		firstImage = pathLib.join(relPath, dirStats[i]);
		break;
	    }
	}
	if (firstImage) {
	    return `<a href="${relPath}/"><img src="${firstImage}" style="width:70px;"><br />${path}/</a><br />`;
	}
	return `<img src="/assets/dir.jpg" style="width:15px" /> <a href="${relPath}/">${path}/</a>`;
    }

    if (imageExts.indexOf(pathLib.extname(path)) >= 0) {
	return `<a href="${relPath}"><img src="${relPath}" style="height=600px;max-width:600px;width:expression(this.width>500?500:true);" /></a><br />`;
    }
    else {
	return `<img src="/assets/file.jpg" style="width:15px" /> <a href="${relPath}/">${path}</a>`;
    }
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
