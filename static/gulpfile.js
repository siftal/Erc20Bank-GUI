var gulp = require('gulp');
var browserSync = require('browser-sync').create();

function handleError (error) {
  console.log(error.toString())
  this.emit('end')
}

gulp.task('heya', function() {
  console.log('I live! Gulp is alive!');
});


gulp.task('browserSync', function() {
  browserSync.init({
    server: {
      baseDir: '.'
    },
  })
})


gulp.task('watch',['browserSync'], function(){
  gulp.watch('*.html', browserSync.reload);
  gulp.watch('app/app.js', browserSync.reload);
  gulp.watch('templates/*.html', browserSync.reload)
  gulp.watch('css/*.css', browserSync.reload)
})
