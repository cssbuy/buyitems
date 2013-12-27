module.exports = function(grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        uglify: {
            options: {
                banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
            },
            buyitems: {
                src: ['src/js/jquery-1.10.2.min.js', 'src/js/underscore.js', 'src/js/backbone.js', 'src/js/buyitems.js'],
                dest: 'dist/js/buyitems.js'
            }
        },
        cssmin: {
            minify: {
                expand: true,
                cwd: 'src/css/',
                src: ['*.css', '!*.min.css'],
                dest: 'dist/css/',
                ext: '.css'
            },
            combine: {
                files: {
                    'dist/css/buyitems.css': ['src/css/bootstrap.min.css', 'src/css/buyitems.css']
                }
            }
        },
        watch: {
            scripts: {
                files: ['src/js/buyitems.js'],
                tasks: ['uglify'],
                options: {
                    spawn: false
                }
            },
            css: {
                files: ['src/css/buyitems.css'],
                tasks: ['cssmin'],
                options: {
                    spawn: false
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-watch');

    grunt.registerTask('default', ['cssmin', 'uglify', 'watch']);
};