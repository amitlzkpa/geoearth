require('dotenv').config();
const gulp = require('gulp');
const rename = require('gulp-rename');
const jsdoc = require('gulp-jsdoc3');
const exec = require('child_process').exec;




async function serve() {

  exec('node server.js', function (err, stdout, stderr) {
    console.log(stdout);
    console.log(stderr);
  });

}


async function build() {

  await gulp.src(['src/**/*.*' ])
        // .pipe(rename({suffix: '.min'}))
        .pipe(gulp.dest('./public/build'));

  await gulp.src(['assets/**/*.*' ])
        .pipe(gulp.dest('./public/assets'));

  await gulp.src(['page/**/*.*' ])
        .pipe(gulp.dest('./public'));

}


async function docs() {

  var config = require('./jsdocConfig.json');
  gulp.src(['./src/**.js'], {read: false})
    .pipe(jsdoc(config));

}


async function dev() {

	await serve();
	await build();
  await docs();

  gulp.watch([
    'src/**',
    'assets/**',
    'page/**',
    'tutorials/**',
    'README.md',
    'server.js'
    ], async function() {
  	await build();
    await docs();
  });

}


async function main() {

  await serve();
	await build();
  await docs();

}



exports.serve = serve;
exports.docs = docs;
exports.build = build;
exports.dev = dev;
exports.default = main;