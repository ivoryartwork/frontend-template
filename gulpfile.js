var fs = require('fs');
var path = require('path');
var gulp = require('gulp');
var connect = require('gulp-connect');
var uglify = require('gulp-uglify');
var cleanCss = require('gulp-clean-css');
var sass = require('gulp-sass');
var rename = require('gulp-rename');
var concat = require('gulp-concat');

// Load all gulp plugins automatically
// and attach them to the `plugins` object
var plugins = require('gulp-load-plugins')();

// Temporary solution until gulp 4
// https://github.com/gulpjs/gulp/issues/355
var runSequence = require('run-sequence');

var pkg = require('./package.json');
var dirs = pkg['h5bp-configs'].directories;

// ---------------------------------------------------------------------
// | Helper tasks                                                      |
// ---------------------------------------------------------------------

// ---------------------------------------------------------------------
// | css file tasks                                                      |
// ---------------------------------------------------------------------

//编译sass，压缩，重命名main.css,并拷贝到dist/css中
gulp.task('compile:css', function () {
    var banner = '/*! ' + pkg.name + ' v' + pkg.version +
        ' | ' + pkg.license.type + ' License' +
        ' | ' + pkg.homepage + ' */\n\n';
    gulp.src(dirs.src + "/css/main.scss")
        .pipe(sass())
        .pipe(cleanCss())
        .pipe(rename({suffix: '.min'}))
        .pipe(plugins.header(banner))
        .pipe(plugins.autoprefixer({
            browsers: ['last 2 versions', 'ie >= 8', '> 1%'],
            cascade: false
        }))
        .pipe(gulp.dest(dirs.dist + "/css"));
});

// ---------------------------------------------------------------------
// | js file tasks                                                      |
// ---------------------------------------------------------------------

//校验js
gulp.task('lint:js', function () {
    return gulp.src([
        'gulpfile.js',
        dirs.src + '/js/*.js',
        dirs.test + '/*.js'
    ]).pipe(plugins.jscs())
        .pipe(plugins.jshint())
        .pipe(plugins.jshint.reporter('jshint-stylish'))
        .pipe(plugins.jshint.reporter('fail'));
});

//合并,压缩，重命名,并拷贝到dist/js中
gulp.task('compile:js', function () {
    gulp.src(dirs.src + "/js/*.js")
        .pipe(concat('main.js'))
        .pipe(uglify())
        .pipe(rename({suffix: '.min'}))
        .pipe(gulp.dest(dirs.dist + "/js"));
});

gulp.task('compile', [
    'compile:css',
    'compile:js'
]);

// ---------------------------------------------------------------------
// | copy files tasks                                                      |
// ---------------------------------------------------------------------
gulp.task('copy', [
    'copy:index.html',
    'copy:license',
    'copy:libs',
]);

gulp.task('copy:index.html', function () {
    return gulp.src(dirs.src + '/index.html')
        .pipe(plugins.replace(/{{JQUERY_VERSION}}/g, pkg.devDependencies.jquery))
        .pipe(gulp.dest(dirs.dist));
});

gulp.task('copy:license', function () {
    return gulp.src('LICENSE.txt')
        .pipe(gulp.dest(dirs.dist));
});

gulp.task('copy:libs', [
    'copy:jquery',
    'copy:normalize'
]);

gulp.task('copy:jquery', function () {
    return gulp.src(['node_modules/jquery/dist/jquery.min.js'])
        .pipe(plugins.rename('jquery-' + pkg.devDependencies.jquery + '.min.js'))
        .pipe(gulp.dest(dirs.dist + '/js/vendor'));
});

gulp.task('copy:normalize', function () {
    return gulp.src('node_modules/normalize.css/normalize.css')
        .pipe(gulp.dest(dirs.dist + '/css'));
});

// ---------------------------------------------------------------------
// | zip files tasks                                                      |
// ---------------------------------------------------------------------
gulp.task('archive:create_archive_dir', function () {
    fs.mkdirSync(path.resolve(dirs.archive), '0755');
});

gulp.task('archive:zip', function (done) {

    var archiveName = path.resolve(dirs.archive, pkg.name + '_v' + pkg.version + '.zip');
    var archiver = require('archiver')('zip');
    var files = require('glob').sync('**/*.*', {
        'cwd': dirs.dist,
        'dot': true // include hidden files
    });
    var output = fs.createWriteStream(archiveName);

    archiver.on('error', function (error) {
        done();
        throw error;
    });

    output.on('close', done);

    files.forEach(function (file) {

        var filePath = path.resolve(dirs.dist, file);

        // `archiver.bulk` does not maintain the file
        // permissions, so we need to add files individually
        archiver.append(fs.createReadStream(filePath), {
            'name': file,
            'mode': fs.statSync(filePath).mode
        });

    });

    archiver.pipe(output);
    archiver.finalize();

});

// ---------------------------------------------------------------------
// | watch files tasks                                                      |
// ---------------------------------------------------------------------
gulp.task('watch', function () {
    gulp.watch(dirs.src + '/js/*.js', ['compile:js']);
    gulp.watch(dirs.src + '/css/*.scss', ['compile:css']);
});

// ---------------------------------------------------------------------
// | clean files tasks                                                      |
// ---------------------------------------------------------------------

gulp.task('clean', function (done) {
    require('del')([
        dirs.archive,
        dirs.dist
    ]).then(function () {
        done();
    });
});


// ---------------------------------------------------------------------
// | Main tasks                                                        |
// ---------------------------------------------------------------------

gulp.task('webserver', ['build', 'watch'], function () {
    connect.server({
        livereload: true,
        port: 2333
    });
});

gulp.task('archive', function (done) {
    runSequence(
        'build',
        'archive:create_archive_dir',
        'archive:zip',
        done);
});

gulp.task('build', function (done) {
    return runSequence(
        ['clean', 'lint:js'],
        'compile', 'copy',
        done);
});

gulp.task('default', ['build']);
