require('dotenv').config();
const gulp = require('gulp');
const rename = require('gulp-rename');
const connect = require('gulp-connect');
const jsdoc = require('gulp-jsdoc3');



async function build() {

  await gulp.src('src/**/*.*')
      	// .pipe(rename({suffix: '.min'}))
        .pipe(gulp.dest('build'));

};



async function startServer() {
	await connect.server({
    root: '.',
    livereload: true
	});
}


async function generateDocs() {

  var config = require('./jsdocConfig.json');
  gulp.src(['./src/**.js'], {read: false})
    .pipe(jsdoc(config));

}



async function dev() {

	await startServer();
	await build();
  await generateDocs();

  gulp.watch('src/**', async function() {
  	await build();
    await generateDocs();
  });

};



async function main() {

	await build();

};



exports.generateDocs = generateDocs;
exports.build = build;
exports.dev = dev;
exports.default = main;