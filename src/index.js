const express = require('express');
const yargs = require('yargs');
const fs = require('fs');
const pathLib = require('path');
const sharp = require('sharp');

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
    mp4: 'video/mp4',
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
	createAsset(dir, req, res);
	return;
    }
    
    if (req.query.gallery) {
	createGalleryPage(dir, req, res);
	return;
    }

    createRawPage(dir, req, res);
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});

function createRawPage(dir, req, res) {
    let fullPath = createFullPath(dir);
    if (fs.statSync(fullPath).isDirectory()) {
	let files = fs.readdirSync(fullPath);
	files.sort(fileSort.bind(null, fullPath));

	let html = "<html><body>"
	    + '<head><link rel="icon" href="favicon.ico" /></head>'
	    + `<a href="./?gallery=true">View Gallery</a><br /><br />`
            + `<img src="/assets/up.jpg" style="width:15px" /> <a href='..'>..</a><br /><br />`
	    + files.map(createLink.bind(null, fullPath, dir)).join('<br />')
	    + "</body></html>";
	res.send(html);
    }
    else {
	return createFile(fullPath, req, res);
    }
}

function createGalleryPage(dir, req, res) {
    let fullPath = createFullPath(dir);
    if (fs.statSync(fullPath).isDirectory()) {
	let files = fs.readdirSync(fullPath);
	files.sort(fileSort.bind(null, fullPath));

	if (req.query.shuffle) {
	    let firstFile = 0;
	    for (let i = 0; i < files.length; ++i) {
		let partPath = pathLib.join(dir, files[i]);
		if (!fs.statSync(createFullPath(partPath)).isDirectory()) {
		    firstFile = i;
		    break;
		}
	    }
	    let dirFiles = files.slice(0, firstFile);
	    let fileFiles = files.slice(firstFile);
	    shuffle(fileFiles);
	    files = dirFiles.concat(fileFiles);
	}
	let html = "<html><body>"
	    + '<head><link rel="icon" href="favicon.ico" /><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>'
	    + `<a href="./">View List</a><br /><br />`
	    + `<a href="./?gallery=true&shuffle=true">Shuffle</a><br /><br />`
            + `<img src="/assets/up.jpg" style="width:15px" /> <a href="../?gallery=true">..</a><br /><br />`
	    + files.map(createImage.bind(null, fullPath, dir)).join('<br />')
	    + "</body></html>";
	res.send(html);
    }
    else {
	return createFile(fullPath, req, res);
    }
}

function createAsset(path, req, res) {
    let fullpath = pathLib.join(__dirname, path);
    createFile(fullpath, req, res);
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
    let stats;
    try {
	stats = fs.statSync(fullPath);
    }
    catch (e) {
	return '';
    }
    let relPath = pathLib.join(curr, path);
    let shortPath = path;
    if (path.length > 40) {
	shortPath = path.substring(0,40) + "...";
    }
    if (stats.isDirectory()) {
	let dirStats;
	try {
	    dirStats = fs.readdirSync(fullPath);
	    dirStats.sort(fileSort.bind(null, fullPath));
	    let firstImage = null;
	    for (i = 0; i < dirStats.length; ++i) {
		if (isImage(dirStats[i])) {
		    firstImage = pathLib.join(relPath, dirStats[i]);
		    break;
		}
	    }
	    if (firstImage) {
		return `<a href="${relPath}/?gallery=true"><img src="${firstImage}?width=100" style="width:70px;"><br />${path}/</a><br />`;
	    }
	    return `<img src="/assets/dir.jpg" style="width:15px" /> <a href="${relPath}/?gallery=true">${path}/</a>`;
	}
	catch(e) {}
    }

    if (isImage(path)) {
	return `<a href="${relPath}"><img src="${relPath}?width=600" style="height=400px;max-width:400px;width:expression(this.width>400?100%:true);" alt="${shortPath}" /></a><br />`;
    }
    else {
	return `<img src="/assets/file.jpg" style="width:15px" /> <a href="${relPath}/?gallery=true">${path}</a>`;
    }
}

function createFullPath(path) {
    return pathLib.join(rootDir, path);
}

function createFile(path, req, res) {
    let extension = pathLib.extname(path).slice(1).toLowerCase();

    if (extension === 'mp4') {
	let movie_mp4 = fs.readFileSync(path);
	let total = movie_mp4.length;
	let range = req.headers.range;
	let positions;
	if (!range) {
	    positions = [0, 0];
	}
	else {
	    positions = range.replace(/bytes=/, "").split("-");
	}
	let start = parseInt(positions[0], 10);
	let end = positions[1] ? parseInt(positions[1], 10) : total - 1;
	let chunksize = (end - start) + 1;
        res.writeHead(206, {
	    "Content-Range": "bytes " + start + "-" + end + "/" + total,
            "Accept-Ranges": "bytes",
            "Content-Length": chunksize,
            "Content-Type": "video/mp4"
        });
        res.end(movie_mp4.slice(start, end + 1), "binary");
    }
    else {
	let type = mime[extension] || 'text/plain';
	let s = fs.createReadStream(path);

	s.on('open', function () {
            res.set('Content-Type', type);
	    if (isImage(path) && req && !isNaN(req.query.width)) {
		let transform = sharp();
		s.pipe(transform.resize(parseInt(req.query.width), null)).pipe(res);
	    }
	    else {
		s.pipe(res);
	    }
	});
	s.on('error', function (err) {
	    console.log(err);
            res.set('Content-Type', 'text/plain');
            res.status(404).end('Not found');
	});
    }
}

function isImage(path) {
    return imageExts.indexOf(pathLib.extname(path).toLowerCase()) >= 0;
}

function shuffle(array) {
  var currentIndex = array.length, temporaryValue, randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}
